import type { Moment } from "moment";
import type { AttendeePartStat } from "node-ical";
import type { Pos } from "obsidian";

import type { getHorizontalPlacing } from "./overlap/horizontal-placing";
import type { IcalConfig } from "./settings";

export interface TaskLocation {
  path: string;
  position: Pos;
}

export interface TaskTokens {
  symbol: string;
  status?: string;
}

export interface FileLine {
  text: string;
  line: number;
  task: boolean;
}

export type WithPlacing<T> = T & {
  placing: ReturnType<typeof getHorizontalPlacing>;
};

export type BaseTask = {
  id: string;
  startTime: Moment;
  isAllDayEvent?: boolean;
};

export type WithTime<T> = T & {
  durationMinutes: number;
};

export type RemoteTask = BaseTask & {
  calendar: IcalConfig;
  summary: string;
  rsvpStatus: AttendeePartStat;
  description?: string;
};

export interface LocalTask extends TaskTokens, BaseTask {
  text: string;
  lines?: Array<FileLine>;

  // todo: move out to InMemoryTask
  location?: TaskLocation;
  isGhost?: boolean;

  // todo: move to Time
  durationMinutes: number;
}

export type Task = LocalTask | RemoteTask;

export type TimeBlock = Omit<WithTime<BaseTask>, "startMinutes">;

export function isRemote<T extends Task>(task: T): task is T & RemoteTask {
  return Object.hasOwn(task, "calendar");
}

export function isLocal(task: Task): task is LocalTask {
  return Object.hasOwn(task, "location");
}
