from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
import os
import subprocess
import tempfile
import time
import uuid


MAX_CAPTURED_OUTPUT_BYTES = 1024 * 1024
MAX_WORKSPACE_BYTES = 32 * 1024 * 1024
OUTPUT_POLL_INTERVAL_SECONDS = 0.005


@dataclass(frozen=True)
class LanguageSpec:
    image: str
    filename: str
    compile_command: list[str] | None
    run_command: list[str]


@dataclass(frozen=True)
class RunResult:
    status: str
    stdout: str = ""
    stderr: str = ""


@dataclass(frozen=True)
class ContainerResult:
    returncode: int
    stdout: str = ""
    stderr: str = ""
    output_limit_exceeded: bool = False


@dataclass(frozen=True)
class PreparedProgram:
    spec: LanguageSpec
    workspace: Path

    def run(
        self,
        stdin: str,
        *,
        time_limit_seconds: float = 2.0,
    ) -> RunResult:
        run_result = _run_container(
            self.spec.image,
            self.workspace,
            self.spec.run_command,
            stdin=stdin,
            timeout_seconds=time_limit_seconds,
            workspace_read_only=True,
        )

        if run_result is None:
            return RunResult(status="time_limit_exceeded")

        if run_result.output_limit_exceeded:
            return RunResult(status="output_limit_exceeded")

        if run_result.returncode != 0:
            if _docker_error(run_result.stderr):
                return RunResult(
                    status="runner_error",
                    stderr=run_result.stderr,
                )

            return RunResult(
                status="runtime_error",
                stdout=run_result.stdout,
                stderr=run_result.stderr,
            )

        return RunResult(
            status="ok",
            stdout=run_result.stdout,
            stderr=run_result.stderr,
        )


LANGUAGES: dict[str, LanguageSpec] = {
    "python": LanguageSpec(
        image="python:3.12-alpine",
        filename="solution.py",
        compile_command=None,
        run_command=["python", "solution.py"],
    ),
    "javascript": LanguageSpec(
        image="node:22-alpine",
        filename="solution.js",
        compile_command=None,
        run_command=["node", "solution.js"],
    ),
    "cpp": LanguageSpec(
        image="gcc:14",
        filename="solution.cpp",
        compile_command=[
            "g++",
            "-O2",
            "-std=c++17",
            "solution.cpp",
            "-o",
            "solution",
        ],
        run_command=["./solution"],
    ),
    "java": LanguageSpec(
        image="eclipse-temurin:21-jdk-alpine",
        filename="Main.java",
        compile_command=["javac", "Main.java"],
        run_command=["java", "-Xmx128m", "Main"],
    ),
}


def _docker_error(stderr: str) -> bool:
    lowered = stderr.lower()

    return any(
        marker in lowered
        for marker in (
            "cannot connect to the docker daemon",
            "is the docker daemon running",
            "no such image",
            "pull access denied",
            "error response from daemon",
        )
    )


def _force_remove_container(container_name: str) -> None:
    subprocess.run(
        ["docker", "rm", "-f", container_name],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )


def _read_output_file(file) -> str:
    file.seek(0)
    return file.read(MAX_CAPTURED_OUTPUT_BYTES).decode(
        "utf-8",
        errors="replace",
    )


def _workspace_size(workspace: Path) -> int:
    total = 0

    for item in workspace.rglob("*"):
        try:
            if item.is_file():
                total += item.stat().st_size
        except FileNotFoundError:
            continue

        if total > MAX_WORKSPACE_BYTES:
            break

    return total


def _run_container(
    image: str,
    workspace: Path,
    command: list[str],
    *,
    stdin: str = "",
    timeout_seconds: float,
    workspace_read_only: bool = False,
) -> ContainerResult | None:
    container_name = f"fsp-judge-{uuid.uuid4().hex[:12]}"
    mount_mode = "ro" if workspace_read_only else "rw"

    docker_command = [
        "docker",
        "run",
        "--rm",
        "-i",
        "--pull=never",
        "--name",
        container_name,
        "--network",
        "none",
        "--memory",
        "256m",
        "--cpus",
        "1.0",
        "--pids-limit",
        "64",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges",
        "--read-only",
        "--tmpfs",
        "/tmp:rw,noexec,nosuid,size=32m",
        "--ulimit",
        "nofile=64:64",
        "-v",
        f"{workspace}:/workspace:{mount_mode}",
        "-w",
        "/workspace",
        image,
        *command,
    ]

    try:
        with tempfile.TemporaryFile() as stdout_file, tempfile.TemporaryFile() as stderr_file:
            process = subprocess.Popen(
                docker_command,
                stdin=subprocess.PIPE,
                stdout=stdout_file,
                stderr=stderr_file,
            )

            try:
                if process.stdin is not None:
                    try:
                        process.stdin.write(stdin.encode("utf-8"))
                    except BrokenPipeError:
                        pass
                    finally:
                        process.stdin.close()

                started_at = time.monotonic()
                output_limit_exceeded = False
                timed_out = False

                while process.poll() is None:
                    output_size = (
                        os.fstat(stdout_file.fileno()).st_size
                        + os.fstat(stderr_file.fileno()).st_size
                    )

                    if output_size > MAX_CAPTURED_OUTPUT_BYTES:
                        output_limit_exceeded = True
                        break

                    if time.monotonic() - started_at > timeout_seconds:
                        timed_out = True
                        break

                    time.sleep(OUTPUT_POLL_INTERVAL_SECONDS)

                final_output_size = (
                    os.fstat(stdout_file.fileno()).st_size
                    + os.fstat(stderr_file.fileno()).st_size
                )
                output_limit_exceeded = (
                    output_limit_exceeded
                    or final_output_size > MAX_CAPTURED_OUTPUT_BYTES
                )

                if output_limit_exceeded or timed_out:
                    _force_remove_container(container_name)

                    try:
                        process.wait(timeout=2)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait()

                if timed_out:
                    return None

                stdout = _read_output_file(stdout_file)
                stderr = _read_output_file(stderr_file)

                if output_limit_exceeded:
                    return ContainerResult(
                        returncode=process.returncode or 1,
                        stdout=stdout,
                        stderr=stderr,
                        output_limit_exceeded=True,
                    )

                return ContainerResult(
                    returncode=process.returncode or 0,
                    stdout=stdout,
                    stderr=stderr,
                )
            finally:
                if process.poll() is None:
                    _force_remove_container(container_name)
                    process.kill()
                    process.wait()
    except FileNotFoundError:
        return ContainerResult(
            returncode=127,
            stderr="Docker CLI not found",
        )


def _compile_program(
    spec: LanguageSpec,
    workspace: Path,
) -> RunResult | None:
    if spec.compile_command is None:
        return None

    compile_result = _run_container(
        spec.image,
        workspace,
        spec.compile_command,
        timeout_seconds=12.0,
    )

    if compile_result is None:
        return RunResult(status="compilation_timeout")

    if compile_result.output_limit_exceeded:
        return RunResult(status="output_limit_exceeded")

    if compile_result.returncode != 0:
        if _docker_error(compile_result.stderr):
            return RunResult(
                status="runner_error",
                stderr=compile_result.stderr,
            )

        return RunResult(
            status="compilation_error",
            stdout=compile_result.stdout,
            stderr=compile_result.stderr,
        )

    if _workspace_size(workspace) > MAX_WORKSPACE_BYTES:
        return RunResult(status="output_limit_exceeded")

    return None


@contextmanager
def prepare_code(
    language: str,
    code: str,
) -> Iterator[PreparedProgram | RunResult]:
    spec = LANGUAGES.get(language)

    if spec is None:
        yield RunResult(status="unsupported_language")
        return

    with tempfile.TemporaryDirectory(prefix="fsp-judge-") as temp_dir:
        workspace = Path(temp_dir)
        source_file = workspace / spec.filename
        source_file.write_text(code, encoding="utf-8")

        compile_error = _compile_program(spec, workspace)

        if compile_error is not None:
            yield compile_error
            return

        yield PreparedProgram(
            spec=spec,
            workspace=workspace,
        )


def run_code(
    language: str,
    code: str,
    stdin: str,
    *,
    time_limit_seconds: float = 2.0,
) -> RunResult:
    with prepare_code(language, code) as prepared:
        if isinstance(prepared, RunResult):
            return prepared

        return prepared.run(
            stdin,
            time_limit_seconds=time_limit_seconds,
        )
