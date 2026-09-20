import { useParams } from "react-router-dom";
import { tasks } from "../data/tasks";
import Navbar from "../components/Navbar";

export default function TaskPage() {
  const { id } = useParams();

  const task = tasks.find((task) => task.id === Number(id));

  if (!task) {
    return <h1>Задача не найдена</h1>;
  }

  return (
    <>
        <Navbar/>
        <main>
        <h1>{task.title}</h1>

        <p>{task.description}</p>

        <h2>Входные данные</h2>
        <p>{task.input}</p>

        <h2>Выходные данные</h2>
        <p>{task.output}</p>

        <textarea />
        </main>
    </>
  );
}