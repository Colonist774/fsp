export type TaskExample = {
  input_data: string;
  expected_output: string;
};

export type Task = {
  readonly id: number;
  title: string;
  difficulty: number;
  solved: boolean;

  description: string;
  input: string;
  output: string;
  constraints: string;
  examples: TaskExample[];
};
