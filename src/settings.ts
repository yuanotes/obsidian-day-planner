import { DAY_PLANNER_DEFAULT_CONTENT } from "./constants";
import { DayPlannerMode } from "./types";

export class DayPlannerSettings {
  customFolder: string = "Day Planners";
  mode: DayPlannerMode = DayPlannerMode.DAILY;
  notesToDates: NoteForDate[] = [];
  completePastItems: boolean = true;
  circularProgress: boolean = false;
  nowAndNextInStatusBar: boolean = false;
  showTaskNotification: boolean = false;
  timelineZoomLevel: string = "2";
  timelineIcon: string = "calendar-with-checkmark";
  breakLabel: string = "BREAK";
  endLabel: string = "END";
  startHour: number = 6;
  timelineDateFormat: string = "LLLL";
  centerNeedle: boolean = true;
  plannerHeading: string = DAY_PLANNER_DEFAULT_CONTENT;
  plannerHeadingLevel: number = 1;
}

export class NoteForDate {
  notePath: string;
  date: string;

  constructor(notePath: string, date: string) {
    this.notePath = notePath;
    this.date = date;
  }
}

export class NoteForDateQuery {
  exists(source: NoteForDate[]): boolean {
    return this.active(source) !== undefined;
  }

  active(source: NoteForDate[]): NoteForDate {
    const now = new Date().toDateString();
    return source && source.filter((ntd) => ntd.date === now)[0];
  }
}

