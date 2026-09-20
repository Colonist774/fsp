from app.runner import run_code


CASES = {
    "python": """
a, b = map(int, input().split())
print(a + b)
""".strip(),
    "javascript": """
const fs = require("fs");
const [a, b] = fs.readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);
console.log(a + b);
""".strip(),
    "cpp": """
#include <iostream>
using namespace std;

int main() {
    long long a, b;
    cin >> a >> b;
    cout << a + b << "\\n";
    return 0;
}
""".strip(),
    "java": """
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        long a = scanner.nextLong();
        long b = scanner.nextLong();
        System.out.println(a + b);
    }
}
""".strip(),
}


def main() -> None:
    for language, code in CASES.items():
        result = run_code(
            language=language,
            code=code,
            stdin="2 3\n",
        )

        print(
            f"{language:10} "
            f"status={result.status:20} "
            f"stdout={result.stdout.strip()!r}"
        )

        if result.stderr:
            print(result.stderr.strip())


if __name__ == "__main__":
    main()
