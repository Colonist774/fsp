import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

type LoginPageProps = {
  onLogin: () => void;
};

type LoginResponse = {
  access_token?: string;
  detail?: string;
};

export default function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedUsername = username.trim();

    if (!normalizedUsername || !password) {
      setError("Заполните имя пользователя и пароль");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: normalizedUsername,
            password,
          }),
        },
      );

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : "Не удалось войти",
        );
        return;
      }

      if (!data.access_token) {
        setError("Сервер не вернул токен");
        return;
      }

      localStorage.setItem("token", data.access_token);
      onLogin();
      navigate("/", { replace: true });
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand">ФСП</div>
        <h1>Вход</h1>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Имя пользователя</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              disabled={isLoading}
              required
            />
          </label>

          <label>
            <span>Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              disabled={isLoading}
              required
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button
            className="auth-submit"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Вход..." : "Войти"}
          </button>
        </form>

        <p className="auth-switch">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </section>
    </main>
  );
}
