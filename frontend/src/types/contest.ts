export type ContestStatus = "active" | "past" | "future";

export type Contest = {
    readonly id: number;
    title: string;
    startAt: string;
    endAt: string;
};