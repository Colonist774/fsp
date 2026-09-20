import Navbar from "../components/Navbar";
import ProblemRow from "../components/ProblemRow";

type Task = {
  id: number;
  title: string;
  difficulty: number;
  solved: boolean;
};

const problems: Task[] = [
  {
    id: 1,
    title: "Быстрая сортировка",
    difficulty: 3,
    solved: true,
  },
  {
    id: 2,
    title: "Работа со строками",
    difficulty: 1,
    solved: false,
  },
  {
    id: 3,
    title: "Бинарный поиск",
    difficulty: 2,
    solved: false,
  },
];

export default function SolvePage() {
  return (
    <>
      <Navbar />

      <main>
        <h1>Решать</h1>

        {problems.map((task) => (
            <ProblemRow task={task}/>
        ))}
      </main>
    </>
  );
}