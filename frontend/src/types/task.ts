export type Task = {
  readonly id: number;
  title: string;
  difficulty: number;
  solved: boolean;

  description: string;
  input: string;
  output: string;
};