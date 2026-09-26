export type ContestStatus = "draft" | "active" | "past" | "future";
export type CompetitionLevel =
  | "russia"
  | "all_russian"
  | "interregional"
  | "regional_championship"
  | "regional";
export type CompetitionFormat = "online" | "offline" | "hybrid";
export type CompetitionConductMode = "platform" | "external";

export type Contest = {
  readonly id: number;
  title: string;
  description: string;
  rules: string;
  level: CompetitionLevel;
  discipline: string;
  format: CompetitionFormat;
  conduct_mode: CompetitionConductMode;
  venue: string | null;
  start_at: string;
  end_at: string;
  registration_deadline: string;
  publish_tasks_after_finish: boolean;
  status: ContestStatus;
  registration_open: boolean;
  is_registered: boolean;
  participation_finished: boolean;
  registered_count: number;
  published_at: string | null;
  created_by_user_id: number | null;
  created_at: string;
};
