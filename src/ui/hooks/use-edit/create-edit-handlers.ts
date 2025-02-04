import type { Moment } from "moment/moment";
import { getDateFromPath } from "obsidian-daily-notes-interface";
import type { Readable, Writable } from "svelte/store";
import { get } from "svelte/store";

import { WorkspaceFacade } from "../../../service/workspace-facade";
import type { DayPlannerSettings } from "../../../settings";
import type { LocalTask, WithTime } from "../../../task-types";
import { createTask } from "../../../util/task-utils";

import type { EditOperation } from "./types";
import { EditMode } from "./types";

export interface UseEditHandlersProps {
  startEdit: (operation: EditOperation) => void;
  // todo: make dynamic, since it can change?
  day: Moment;
  workspaceFacade: WorkspaceFacade;
  cursorMinutes: Readable<number>;
  editOperation: Writable<EditOperation | undefined>;
  settings: Readable<DayPlannerSettings>;
}

export function createEditHandlers({
  day,
  workspaceFacade,
  startEdit,
  cursorMinutes,
  editOperation,
  settings,
}: UseEditHandlersProps) {
  function handleContainerMouseDown() {
    const newTask = createTask({
      day,
      startMinutes: get(cursorMinutes),
      settings: get(settings),
    });

    startEdit({
      task: { ...newTask, isGhost: true },
      mode: EditMode.CREATE,
      day,
    });
  }

  function handleResizerMouseDown(task: WithTime<LocalTask>, mode: EditMode) {
    startEdit({ task, mode, day });
  }

  async function handleTaskMouseUp(task: LocalTask) {
    if (get(editOperation) || !task.location) {
      return;
    }

    const { path, position } = task.location;
    await workspaceFacade.revealLineInFile(path, position?.start?.line);
  }

  function handleGripMouseDown(task: WithTime<LocalTask>, mode: EditMode) {
    startEdit({ task, mode, day });
  }

  // todo: fix (should probably use "day")
  function handleUnscheduledTaskGripMouseDown(task: LocalTask) {
    const withAddedTime = {
      ...task,
      // todo: add a proper fix
      //  in what case does a task not have a location?
      startTime: task.location
        ? getDateFromPath(task.location.path, "day") || window.moment()
        : window.moment(),
    };

    startEdit({ task: withAddedTime, mode: EditMode.DRAG, day });
  }

  function handleMouseEnter() {
    editOperation.update(
      (previous) =>
        previous && {
          ...previous,
          day,
        },
    );
  }

  return {
    handleMouseEnter,
    handleGripMouseDown,
    handleContainerMouseDown,
    handleResizerMouseDown,
    handleTaskMouseUp,
    handleUnscheduledTaskGripMouseDown,
  };
}

export type EditHandlers = ReturnType<typeof createEditHandlers>;
