import { TaskType } from "../types/server-types";
import { runPhase } from "./run-phase-task";

export const TaskIds = {
    RUN_PHASE: "RUN_PHASE"
} as const;

//warning: the task functions should not import anything from the queue or queue-worker file to avoid circular dependencies
export const TaskFunctionMap: {[K in TaskType]: (data: any, postMessage: (data: any) => void) => void} = {
    [TaskIds.RUN_PHASE]: runPhase
};