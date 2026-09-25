import { useEffect, useState, type FormEvent } from "react";
import Navbar from "../components/Navbar";

type TeamStatus = "member" | "looking" | "solo";

type CurrentUser = {
  username: string;
  email: string | null;
  bio: string | null;
  full_name: string | null;
  hide_full_name: boolean;
  locality: string | null;
  hide_locality: boolean;
  education_org: string | null;
  sports_disciplines: string | null;
  team_status: TeamStatus;
  team_name: string | null;
};

type ApiResponse = CurrentUser & {
  detail?: string;
};

export default function EditProfilePage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [fullName, setFullName] = useState("");
  const [hideFullName, setHideFullName] = useState(false);
  const [locality, setLocality] = useState("");
  const [hideLocality, setHideLocality] = useState(false);
  const [educationOrg, setEducationOrg] = useState("");
  const [sportsDisciplines, setSportsDisciplines] = useState("");
  const [teamStatus, setTeamStatus] = useState<TeamStatus>("solo");
  const [teamName, setTeamName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const token = localStorage.getItem("token");

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/me",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          setError("Не удалось загрузить профиль");
          return;
        }

        const user: CurrentUser = await response.json();

        setUsername(user.username);
        setEmail(user.email ?? "");
        setBio(user.bio ?? "");
        setFullName(user.full_name ?? "");
        setHideFullName(user.hide_full_name);
        setLocality(user.locality ?? "");
        setHideLocality(user.hide_locality);
        setEducationOrg(user.education_org ?? "");
        setSportsDisciplines(user.sports_disciplines ?? "");
        setTeamStatus(user.team_status);
        setTeamName(user.team_name ?? "");
      } catch {
        setError("Не удалось подключиться к серверу");
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = localStorage.getItem("token");
    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedTeamName = teamName.trim();

    if (!token) {
      setError("Требуется авторизация");
      return;
    }

    if (normalizedUsername.length < 3) {
      setError("Имя пользователя должно содержать минимум 3 символа");
      return;
    }

    if (!normalizedEmail) {
      setError("Введите email");
      return;
    }

    if (teamStatus === "member" && !normalizedTeamName) {
      setError("Укажите название команды");
      return;
    }

    setError(null);
    setSaved(false);
    setIsSaving(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/me/profile",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            username: normalizedUsername,
            email: normalizedEmail,
            bio: bio.trim() || null,
            full_name: fullName.trim() || null,
            hide_full_name: hideFullName,
            locality: locality.trim() || null,
            hide_locality: hideLocality,
            education_org: educationOrg.trim() || null,
            sports_disciplines: sportsDisciplines.trim() || null,
            team_status: teamStatus,
            team_name:
              teamStatus === "member" ? normalizedTeamName : null,
          }),
        },
      );

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : "Не удалось сохранить изменения",
        );
        return;
      }

      setUsername(data.username);
      setEmail(data.email ?? "");
      setBio(data.bio ?? "");
      setFullName(data.full_name ?? "");
      setHideFullName(data.hide_full_name);
      setLocality(data.locality ?? "");
      setHideLocality(data.hide_locality);
      setEducationOrg(data.education_org ?? "");
      setSportsDisciplines(data.sports_disciplines ?? "");
      setTeamStatus(data.team_status);
      setTeamName(data.team_name ?? "");
      setSaved(true);
      window.dispatchEvent(new Event("profile-updated"));
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="page profile-edit-page">
        <h1>Редактировать профиль</h1>

        <form className="profile-edit-form" onSubmit={handleSubmit}>
          <label>
            <span>Имя пользователя</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={3}
              maxLength={50}
              disabled={isLoading || isSaving}
              required
            />
          </label>

          <label>
            <span>ФИО</span>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              maxLength={200}
              disabled={isLoading || isSaving}
            />
          </label>

          <label className="profile-edit-checkbox">
            <input
              type="checkbox"
              checked={hideFullName}
              onChange={(event) => setHideFullName(event.target.checked)}
              disabled={isLoading || isSaving}
            />
            <span>Скрыть ФИО от других участников</span>
          </label>

          <label>
            <span>Населённый пункт</span>
            <input
              type="text"
              value={locality}
              onChange={(event) => setLocality(event.target.value)}
              maxLength={120}
              disabled={isLoading || isSaving}
            />
          </label>

          <label className="profile-edit-checkbox">
            <input
              type="checkbox"
              checked={hideLocality}
              onChange={(event) => setHideLocality(event.target.checked)}
              disabled={isLoading || isSaving}
            />
            <span>Скрыть населённый пункт от других участников</span>
          </label>

          <label>
            <span>Образовательная организация</span>
            <input
              type="text"
              value={educationOrg}
              onChange={(event) => setEducationOrg(event.target.value)}
              maxLength={200}
              disabled={isLoading || isSaving}
            />
          </label>

          <label>
            <span>Спортивные дисциплины</span>
            <input
              type="text"
              value={sportsDisciplines}
              onChange={(event) =>
                setSportsDisciplines(event.target.value)
              }
              maxLength={255}
              disabled={isLoading || isSaving}
            />
          </label>

          <label>
            <span>Bio</span>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Можете рассказать о себе, своих навыках, целях и оставить контакт для обратной связи. Так вами могут заинтересоваться команды."
              maxLength={1000}
              rows={7}
              disabled={isLoading || isSaving}
            />
          </label>

          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              disabled={isLoading || isSaving}
              required
            />
            <small className="profile-edit-email-about">
              email необходим для связи при проведении соревнований, его
              видит только администрация ФСП
            </small>
          </label>

          <label>
            <span>Статус команды</span>
            <select
              value={teamStatus}
              onChange={(event) => {
                const value = event.target.value as TeamStatus;
                setTeamStatus(value);

                if (value !== "member") {
                  setTeamName("");
                }
              }}
              disabled={isLoading || isSaving}
            >
              <option value="member">В команде</option>
              <option value="looking">В поиске</option>
              <option value="solo">Не заинтересован</option>
            </select>
          </label>

          {teamStatus === "member" && (
            <label>
              <span>Название команды</span>
              <input
                type="text"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                maxLength={100}
                disabled={isLoading || isSaving}
                required
              />
            </label>
          )}

          {error && <div className="auth-error">{error}</div>}
          {saved && (
            <div className="profile-save-success">
              Изменения сохранены
            </div>
          )}

          <button
            className="auth-submit profile-save-button"
            type="submit"
            disabled={isLoading || isSaving}
          >
            {isSaving ? "Сохранение..." : "Сохранить"}
          </button>
        </form>
      </main>
    </>
  );
}
