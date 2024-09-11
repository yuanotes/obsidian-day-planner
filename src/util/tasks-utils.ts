import { difference, differenceBy, mergeWith } from "lodash/fp";
import type { Moment } from "moment/moment";
import {
  DEFAULT_DAILY_NOTE_FORMAT,
  getDateFromPath,
} from "obsidian-daily-notes-interface";

import {
  type DayToEditableTasks,
  type DayToTasks,
  type Diff,
  isRemote,
  type Task,
  type TasksForDay,
  type UnscheduledTask,
} from "../types";

import {
  isEqualTask,
  updateTaskScheduledDay,
  updateTaskText,
} from "./task-utils";

export function getEmptyRecordsForDay(): TasksForDay {
  return { withTime: [], noTime: [] };
}

export function getTasksWithTime(tasks: DayToEditableTasks) {
  return Object.values(tasks).flatMap(({ withTime }) => withTime);
}

export function removeTask(task: Task, tasks: TasksForDay) {
  return {
    ...tasks,
    noTime: tasks.noTime.filter((t) => t.id !== task.id),
    withTime: tasks.withTime.filter((t) => t.id !== task.id),
  };
}

export function addTaskWithTime(task: Task, tasks: TasksForDay) {
  return {
    ...tasks,
    withTime: [...tasks.withTime, task],
  };
}

export function moveToTimed(task: Task, tasks: TasksForDay) {
  const withRemoved = removeTask(task, tasks);
  return { ...withRemoved, withTime: [...withRemoved.withTime, task] };
}

export function getDayKey(day: Moment) {
  return day.format(DEFAULT_DAILY_NOTE_FORMAT);
}

export function moveTaskToDay(baseline: DayToTasks, task: Task, day: Moment) {
  const sourceKey = getDayKey(task.startTime);
  const destKey = getDayKey(day);
  const source = baseline[sourceKey];
  const dest = baseline[destKey];

  return {
    ...baseline,
    [sourceKey]: removeTask(task, source),
    [destKey]: addTaskWithTime(task, dest),
  };
}

export function moveTaskToColumn(
  day: Moment,
  task: Task,
  baseline: DayToTasks,
) {
  if (day.isSame(task.startTime, "day")) {
    const key = getDayKey(task.startTime);

    return {
      ...baseline,
      [key]: moveToTimed(task, baseline[key]),
    };
  }

  return moveTaskToDay(baseline, task, day);
}

// TODO: remove duplication
export function getTasksWithUpdatedDayProp(tasks: DayToEditableTasks) {
  return Object.entries(tasks)
    .flatMap(([dayKey, tasks]) =>
      tasks.withTime.map((task) => ({ dayKey, task })),
    )
    .filter(({ dayKey, task }) => {
      const dateFromPath = task.location?.path
        ? getDateFromPath(task.location?.path, "day")
        : null;

      // todo: remove path from comparison, only take into account the prop
      // todo: this is not going to work for obsidian-tasks if the task is inside a daily note
      return (
        !task.isGhost && dayKey !== getDayKey(task.startTime) && !dateFromPath
      );
    });
}

export function getTasksInDailyNotesWithUpdatedDay(
  tasks: DayToTasks,
): Array<{ dayKey: string; task: Task }> {
  return Object.entries(tasks)
    .flatMap(([dayKey, tasks]) =>
      tasks.withTime.map((task) => ({ dayKey, task })),
    )
    .filter((pair): pair is { dayKey: string; task: Task } => {
      const { task, dayKey } = pair;

      if (isRemote(task)) {
        return false;
      }

      const dateFromPath = task.location?.path
        ? getDateFromPath(task.location?.path, "day")
        : null;

      return Boolean(
        !task.isGhost && dayKey !== getDayKey(task.startTime) && dateFromPath,
      );
    });
}

function getPristine(flatBaseline: Task[], flatNext: Task[]) {
  return flatNext.filter((task) =>
    flatBaseline.find((baselineTask) => isEqualTask(task, baselineTask)),
  );
}

function getCreatedTasks(base: Task[], next: Task[]) {
  return differenceBy((task) => task.id, next, base);
}

function getTasksWithUpdatedTime(base: Task[], next: Task[]) {
  const pristine = getPristine(base, next);

  return difference(next, pristine).filter((task) => !task.isGhost);
}

function getEditableTasks(dayToTasks: DayToTasks) {
  const filteredEntries = Object.entries(dayToTasks).map(
    ([dayKey, tasks]) =>
      [
        dayKey,
        {
          noTime: tasks.noTime.filter(
            (task): task is UnscheduledTask => !isRemote(task),
          ),
          withTime: tasks.withTime.filter(
            (task): task is Task => !isRemote(task),
          ),
        },
      ] as const,
  );

  return Object.fromEntries<{ withTime: Task[]; noTime: UnscheduledTask[] }>(
    filteredEntries,
  );
}

export function getDiff(base: DayToTasks, next: DayToTasks) {
  const editableBase = getEditableTasks(base);
  const editableNext = getEditableTasks(next);

  return {
    updatedTime: getTasksWithUpdatedTime(
      getTasksWithTime(editableBase),
      getTasksWithTime(editableNext),
    ),
    updatedDay: getTasksWithUpdatedDayProp(editableNext),
    moved: getTasksInDailyNotesWithUpdatedDay(editableNext),
    created: getCreatedTasks(
      getTasksWithTime(editableBase),
      getTasksWithTime(editableNext),
    ),
  };
}

export function updateText(diff: Diff) {
  return {
    created: diff.created.map(updateTaskText),
    updated: [
      ...diff.updatedTime.map(updateTaskText),
      ...diff.updatedDay.map(({ dayKey, task }) =>
        updateTaskText(updateTaskScheduledDay(task, dayKey)),
      ),
    ],
  };
}

export const mergeTasks = mergeWith((value, sourceValue) => {
  return Array.isArray(value) ? value.concat(sourceValue) : undefined;
});
