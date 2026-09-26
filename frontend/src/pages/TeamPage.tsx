import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

type CurrentUser = {
  id: number;
  username: string;
};

type TeamMember = {
  user_id: number;
  username: string;
  full_name: string | null;
  is_captain: boolean;
};

type Team = {
  id: number;
  name: string;
  captain_user_id: number;
  members: TeamMember[];
};

export default function TeamPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [memberUsername, setMemberUsername] = useState("");
  const [editingName, setEditingName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCaptain =
    team !== null &&
    currentUser !== null &&
    team.captain_user_id === currentUser.id;

  async function readError(response: Response, fallback: string) {
    const data = await response.json().catch(() => null);

    return typeof data?.detail === "string"
      ? data.detail
      : fallback;
  }

  async function loadTeam() {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Требуется авторизация");
      setIsLoading(false);
      return;
    }

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [meResponse, teamResponse] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/me", { headers }),
        fetch("http://127.0.0.1:8000/api/me/team", { headers }),
      ]);

      if (!meResponse.ok || !teamResponse.ok) {
        setError("Не удалось загрузить команду");
        return;
      }

      const me: CurrentUser = await meResponse.json();
      const teamData: Team | null = await teamResponse.json();

      setCurrentUser(me);
      setTeam(teamData);
      setEditingName(teamData?.name ?? "");
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTeam();
  }, []);

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = localStorage.getItem("token");
    const name = newTeamName.trim();

    if (!token || !name) {
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/teams",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name }),
        },
      );

      if (!response.ok) {
        setError(await readError(response, "Не удалось создать команду"));
        return;
      }

      const created: Team = await response.json();
      setTeam(created);
      setEditingName(created.name);
      setNewTeamName("");
      window.dispatchEvent(new Event("profile-updated"));
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsCreating(false);
    }
  }

  async function saveTeamName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!team) {
      return;
    }

    const token = localStorage.getItem("token");
    const name = editingName.trim();

    if (!token || !name) {
      return;
    }

    setIsEditing(true);
    setError(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/teams/${team.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name }),
        },
      );

      if (!response.ok) {
        setError(await readError(response, "Не удалось изменить команду"));
        return;
      }

      const updated: Team = await response.json();
      setTeam(updated);
      setEditingName(updated.name);
      window.dispatchEvent(new Event("profile-updated"));
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsEditing(false);
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!team) {
      return;
    }

    const token = localStorage.getItem("token");
    const username = memberUsername.trim();

    if (!token || !username) {
      return;
    }

    setIsAddingMember(true);
    setError(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/teams/${team.id}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ username }),
        },
      );

      if (!response.ok) {
        setError(
          await readError(response, "Не удалось добавить участника"),
        );
        return;
      }

      const updated: Team = await response.json();
      setTeam(updated);
      setMemberUsername("");
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsAddingMember(false);
    }
  }

  async function removeMember(member: TeamMember) {
    if (!team) {
      return;
    }

    if (
      !window.confirm(
        `Удалить ${member.username} из команды?`,
      )
    ) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    setBusyUserId(member.user_id);
    setError(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/teams/${team.id}/members/${member.user_id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        setError(
          await readError(response, "Не удалось удалить участника"),
        );
        return;
      }

      const updated: Team = await response.json();
      setTeam(updated);
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setBusyUserId(null);
    }
  }

  async function transferCaptaincy(member: TeamMember) {
    if (!team) {
      return;
    }

    if (
      !window.confirm(
        `Передать капитанство пользователю ${member.username}?`,
      )
    ) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    setBusyUserId(member.user_id);
    setError(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/teams/${team.id}/captain/${member.user_id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        setError(
          await readError(response, "Не удалось передать капитанство"),
        );
        return;
      }

      const updated: Team = await response.json();
      setTeam(updated);
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setBusyUserId(null);
    }
  }

  async function leaveTeam() {
    if (!team) {
      return;
    }

    if (
      !window.confirm(
        isCaptain && team.members.length === 1
          ? "Покинуть команду? Так как вы её единственный участник, команда будет удалена."
          : "Вы уверены, что хотите покинуть команду?",
      )
    ) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    setIsLeaving(true);
    setError(null);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/me/team",
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        setError(
          await readError(response, "Не удалось покинуть команду"),
        );
        return;
      }

      setTeam(null);
      setEditingName("");
      window.dispatchEvent(new Event("profile-updated"));
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsLeaving(false);
    }
  }

  if (isLoading) {
    return null;
  }

  return (
    <>
      <Navbar />

      <main className="page team-page">
        <button
          className="page-back"
          type="button"
          onClick={() => navigate(-1)}
        >
          ← Назад
        </button>

        <h1>Команда</h1>

        {error && <div className="auth-error team-error">{error}</div>}

        {!team ? (
          <section className="team-empty">
            <h2>Вы еще не состоите в команде</h2>
            <p>
              Создайте новую команду. Вы автоматически станете её
              капитаном.
            </p>

            <form className="team-create-form" onSubmit={createTeam}>
              <input
                value={newTeamName}
                minLength={2}
                maxLength={100}
                placeholder="Название команды"
                disabled={isCreating}
                onChange={(event) =>
                  setNewTeamName(event.target.value)
                }
              />
              <button
                type="submit"
                disabled={isCreating || !newTeamName.trim()}
              >
                {isCreating ? "Создание..." : "Создать команду"}
              </button>
            </form>
          </section>
        ) : (
          <section className="team-card">
            <div className="team-header">
              <div>
                <span>Название команды</span>
                <h2>{team.name}</h2>
              </div>

              {isCaptain && (
                <form
                  className="team-rename-form"
                  onSubmit={saveTeamName}
                >
                  <input
                    value={editingName}
                    minLength={2}
                    maxLength={100}
                    disabled={isEditing}
                    onChange={(event) =>
                      setEditingName(event.target.value)
                    }
                  />
                  <button
                    type="submit"
                    disabled={
                      isEditing ||
                      !editingName.trim() ||
                      editingName.trim() === team.name
                    }
                  >
                    {isEditing ? "Сохранение..." : "Изменить"}
                  </button>
                </form>
              )}
            </div>

            <div className="team-members-heading">
              <div>
                <h3>Участники</h3>
                <span>{team.members.length}</span>
              </div>

              {isCaptain && (
                <form
                  className="team-add-member"
                  onSubmit={addMember}
                >
                  <input
                    value={memberUsername}
                    minLength={3}
                    maxLength={50}
                    placeholder="Имя пользователя"
                    disabled={isAddingMember}
                    onChange={(event) =>
                      setMemberUsername(event.target.value)
                    }
                  />
                  <button
                    type="submit"
                    disabled={
                      isAddingMember || !memberUsername.trim()
                    }
                  >
                    {isAddingMember ? "Добавление..." : "Добавить"}
                  </button>
                </form>
              )}
            </div>

            <div className="team-members-list">
              {team.members.map((member) => (
                <div className="team-member-row" key={member.user_id}>
                  <div className="team-member-identity">
                    <strong>
                      {member.full_name || member.username}
                    </strong>
                    {member.full_name && (
                      <span>@{member.username}</span>
                    )}
                  </div>

                  <div className="team-member-role">
                    {member.is_captain && <span>Капитан</span>}
                  </div>

                  {isCaptain && !member.is_captain && (
                    <div className="team-member-actions">
                      <button
                        type="button"
                        disabled={busyUserId === member.user_id}
                        onClick={() => transferCaptaincy(member)}
                      >
                        Передать капитанство
                      </button>
                      <button
                        className="team-member-remove"
                        type="button"
                        disabled={busyUserId === member.user_id}
                        onClick={() => removeMember(member)}
                      >
                        Удалить
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="team-footer">
              <button
                className="team-leave"
                type="button"
                disabled={isLeaving}
                onClick={leaveTeam}
              >
                {isLeaving ? "Выход..." : "Покинуть команду"}
              </button>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
