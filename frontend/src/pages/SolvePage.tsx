import Navbar from "../components/Navbar";

type Problem = {
  id: number;
  title: string;
  difficulty: number;
  solved: boolean;
};

const problems: Problem[] = [
  {
    id: 1,
    title: "Quick Sorting",
    difficulty: 3,
    solved: true,
  },
  {
    id: 2,
    title: "String Processing",
    difficulty: 1,
    solved: false,
  },
  {
    id: 3,
    title: "Binary Search Basics",
    difficulty: 2,
    solved: false,
  },
];

export default function SolvePage() {
  return (
    <>
      <Navbar />

      <main>
        <h1>Problems</h1>

        {problems.map((problem) => (
          <div key={problem.id}>
            <span>{problem.title}</span>

            <span>
              {"★".repeat(problem.difficulty)}
            </span>

            {problem.solved && <span>✓</span>}
          </div>
        ))}
      </main>
    </>
  );
}