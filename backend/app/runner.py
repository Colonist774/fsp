from dataclasses import dataclass
from pathlib import Path
import subprocess
import tempfile
import uuid


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


def _run_container(
    image: str,
    workspace: Path,
    command: list[str],
    *,
    stdin: str = "",
    timeout_seconds: float,
) -> subprocess.CompletedProcess[str] | None:
    container_name = f"fsp-judge-{uuid.uuid4().hex[:12]}"

    docker_command = [
        "docker",
        "run",
        "--rm",
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
        f"{workspace}:/workspace:rw",
        "-w",
        "/workspace",
        image,
        *command,
    ]

    try:
        return subprocess.run(
            docker_command,
            input=stdin,
            text=True,
            capture_output=True,
            timeout=timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired:
        subprocess.run(
            ["docker", "rm", "-f", container_name],
            capture_output=True,
            text=True,
            check=False,
        )
        return None
    except FileNotFoundError:
        return subprocess.CompletedProcess(
            args=docker_command,
            returncode=127,
            stdout="",
            stderr="Docker CLI not found",
        )


def run_code(
    language: str,
    code: str,
    stdin: str,
    *,
    time_limit_seconds: float = 2.0,
) -> RunResult:
    spec = LANGUAGES.get(language)

    if spec is None:
        return RunResult(status="unsupported_language")

    with tempfile.TemporaryDirectory(prefix="fsp-judge-") as temp_dir:
        workspace = Path(temp_dir)
        source_file = workspace / spec.filename
        source_file.write_text(code, encoding="utf-8")

        if spec.compile_command is not None:
            compile_result = _run_container(
                spec.image,
                workspace,
                spec.compile_command,
                timeout_seconds=12.0,
            )

            if compile_result is None:
                return RunResult(status="compilation_timeout")

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

        run_result = _run_container(
            spec.image,
            workspace,
            spec.run_command,
            stdin=stdin,
            timeout_seconds=time_limit_seconds,
        )

        if run_result is None:
            return RunResult(status="time_limit_exceeded")

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
