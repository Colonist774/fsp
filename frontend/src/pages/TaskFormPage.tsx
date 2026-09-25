import {
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";

type TestCase = {
  input_data: string;
  expected_output: string;
};

type TaskOrganizerRead = {
  id: number;
  title: string;
  difficulty: number;
  description: string;
  input: string;
  output: string;
  constraints: string;
  examples: TestCase[];
  tests: TestCase[];
};

function createEmptyCase(): TestCase {
  return {
    input_data: "",
    expected_output: "",
  };
}

export default function TaskFormPage() {
  const { competitionId, taskId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(taskId);

  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState(1);
  const [description, setDescription] = useState("");
  const [inputFormat, setInputFormat] = useState("");
  const [outputFormat, setOutputFormat] = useState("");
  const [constraints, setConstraints] = useState("");
  const [examples, setExamples] = useState<TestCase[]>([
    createEmptyCase(),
  ]);
  const [tests, setTests] = useState<TestCase[]>([
    createEmptyCase(),
  ]);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPage() {
      const token = localStorage.getItem("token");

      if (!token || !competitionId) {
        setAllowed(false);
        setIsLoading(false);
        return;
      }

      try {
        const meResponse = await fetch(
          "http://127.0.0.1:8000/api/me",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!meResponse.ok) {
          setAllowed(false);
          return;
        }

        const me = await meResponse.json();

        if (me.role !== "organizer") {
          setAllowed(false);
          return;
        }

        setAllowed(true);

        if (!isEditing || !taskId) {
          return;
        }

        const response = await fetch(
          `http://127.0.0.1:8000/api/organizer/competitions/${competitionId}/tasks/${taskId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          setError("Не удалось загрузить задачу");
          return;
        }

        const task: TaskOrganizerRead = await response.json();

        setTitle(task.title);
        setDifficulty(task.difficulty);
        setDescription(task.description);
        setInputFormat(task.input);
        setOutputFormat(task.output);
        setConstraints(task.constraints);
        setExamples(
          task.examples.length > 0
            ? task.examples
            : [createEmptyCase()],
        );
        setTests(
          task.tests.length > 0
            ? task.tests
            : [createEmptyCase()],
        );
      } catch {
        setError("Не удалось подключиться к серверу");
      } finally {
        setIsLoading(false);
      }
    }

    loadPage();
  }, [competitionId, taskId, isEditing]);

  function updateCase(
    setter: Dispatch<SetStateAction<TestCase[]>>,
    index: number,
    field: keyof TestCase,
    value: string,
  ) {
    setter((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: value }
          : item,
      ),
    );
  }

  function removeCase(
    setter: Dispatch<SetStateAction<TestCase[]>>,
    index: number,
  ) {
    setter((current) =>
      current.length === 1
        ? current
        : current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = localStorage.getItem("token");

    if (!token || !competitionId) {
      setError("Требуется авторизация");
      return;
    }

    if (tests.length < 1 || tests.length > 100) {
      setError("Количество тестов должно быть от 1 до 100");
      return;
    }

    if (examples.length < 1) {
      setError("Добавьте хотя бы один пример");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(
        isEditing
          ? `http://127.0.0.1:8000/api/organizer/competitions/${competitionId}/tasks/${taskId}`
          : `http://127.0.0.1:8000/api/organizer/competitions/${competitionId}/tasks`,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            difficulty,
            description: description.trim(),
            input: inputFormat.trim(),
            output: outputFormat.trim(),
            constraints: constraints.trim(),
            examples,
            tests,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : "Не удалось сохранить задачу",
        );
        return;
      }

      navigate(`/contests/${competitionId}`);
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsSaving(false);
    }
  }

  if (allowed === false) {
    return (
      <>
        <Navbar />
        <main className="page task-form-page">
          <div className="auth-error">Недостаточно прав</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="page task-form-page">
        <div className="task-form-heading">
          <div>
            <h1>
              {isEditing ? "Редактировать задачу" : "Создать задачу"}
            </h1>
            <p>
              Условие и тесты можно редактировать и после начала соревнования.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/contests/${competitionId}`)}
          >
            Назад
          </button>
        </div>

        {!isLoading && allowed && (
          <form className="task-author-form" onSubmit={handleSubmit}>
            <section className="task-author-section">
              <h2>Основная информация</h2>

              <label>
                <span>Название задачи</span>
                <input
                  value={title}
                  minLength={3}
                  maxLength={200}
                  required
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>

              <label className="task-author-difficulty">
                <span>Сложность</span>
                <select
                  value={difficulty}
                  onChange={(event) =>
                    setDifficulty(Number(event.target.value))
                  }
                >
                  <option value={1}>1 звезда</option>
                  <option value={2}>2 звезды</option>
                  <option value={3}>3 звезды</option>
                  <option value={4}>4 звезды</option>
                  <option value={5}>5 звёзд</option>
                </select>
              </label>

              <label>
                <span>Условие</span>
                <textarea
                  value={description}
                  rows={10}
                  maxLength={20000}
                  required
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                />
              </label>

              <div className="task-author-two-columns">
                <label>
                  <span>Формат входных данных</span>
                  <textarea
                    value={inputFormat}
                    rows={5}
                    maxLength={10000}
                    onChange={(event) =>
                      setInputFormat(event.target.value)
                    }
                  />
                </label>

                <label>
                  <span>Формат выходных данных</span>
                  <textarea
                    value={outputFormat}
                    rows={5}
                    maxLength={10000}
                    onChange={(event) =>
                      setOutputFormat(event.target.value)
                    }
                  />
                </label>
              </div>

              <label>
                <span>Ограничения</span>
                <textarea
                  value={constraints}
                  rows={4}
                  maxLength={10000}
                  placeholder="Например: 1 ≤ n ≤ 100000"
                  onChange={(event) =>
                    setConstraints(event.target.value)
                  }
                />
              </label>
            </section>

            <section className="task-author-section">
              <div className="task-author-section-heading">
                <div>
                  <h2>Примеры</h2>
                  <p>Эти данные будут видны участникам в условии.</p>
                </div>

                <button
                  type="button"
                  disabled={examples.length >= 10}
                  onClick={() =>
                    setExamples((current) => [
                      ...current,
                      createEmptyCase(),
                    ])
                  }
                >
                  + Добавить пример
                </button>
              </div>

              <div className="task-author-cases">
                {examples.map((example, index) => (
                  <div className="task-author-case" key={index}>
                    <div className="task-author-case-heading">
                      <strong>Пример {index + 1}</strong>
                      {examples.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeCase(setExamples, index)
                          }
                        >
                          Удалить
                        </button>
                      )}
                    </div>

                    <div className="task-author-two-columns">
                      <label>
                        <span>Ввод</span>
                        <textarea
                          value={example.input_data}
                          rows={6}
                          onChange={(event) =>
                            updateCase(
                              setExamples,
                              index,
                              "input_data",
                              event.target.value,
                            )
                          }
                        />
                      </label>

                      <label>
                        <span>Вывод</span>
                        <textarea
                          value={example.expected_output}
                          rows={6}
                          onChange={(event) =>
                            updateCase(
                              setExamples,
                              index,
                              "expected_output",
                              event.target.value,
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="task-author-section">
              <div className="task-author-section-heading">
                <div>
                  <h2>Тесты для проверки</h2>
                  <p>
                    Скрыты от участников. Можно добавить от 1 до 100 тестов.
                  </p>
                </div>

                <div className="task-author-test-actions">
                  <span>{tests.length} / 100</span>
                  <button
                    type="button"
                    disabled={tests.length >= 100}
                    onClick={() =>
                      setTests((current) => [
                        ...current,
                        createEmptyCase(),
                      ])
                    }
                  >
                    + Добавить тест
                  </button>
                </div>
              </div>

              <div className="task-author-cases">
                {tests.map((test, index) => (
                  <div className="task-author-case" key={index}>
                    <div className="task-author-case-heading">
                      <strong>Тест {index + 1}</strong>
                      {tests.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeCase(setTests, index)
                          }
                        >
                          Удалить
                        </button>
                      )}
                    </div>

                    <div className="task-author-two-columns">
                      <label>
                        <span>Входные данные</span>
                        <textarea
                          value={test.input_data}
                          rows={6}
                          onChange={(event) =>
                            updateCase(
                              setTests,
                              index,
                              "input_data",
                              event.target.value,
                            )
                          }
                        />
                      </label>

                      <label>
                        <span>Ожидаемый вывод</span>
                        <textarea
                          value={test.expected_output}
                          rows={6}
                          onChange={(event) =>
                            updateCase(
                              setTests,
                              index,
                              "expected_output",
                              event.target.value,
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {error && <div className="auth-error">{error}</div>}

            <button
              className="auth-submit task-author-submit"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? "Сохранение..." : "Сохранить задачу"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
