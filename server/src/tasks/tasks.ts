import { TaskType } from "../types/server-types";
import { crewAttack } from "./crew-attack-task";
import { monsterAttack } from "./monster-attack-task";
import { monsterMove } from "./monster-move-task";

export const TaskIds = {
    CREW_ATTACK: "CREW_ATTACK",
    MONSTER_MOVE: "MONSTER_MOVE",
    MONSTER_ATTACK: "MONSTER_ATTACK"
} as const;

//warning: the task functions should not import anything from the queue or queue-worker file to avoid circular dependencies
export const TaskFunctionMap: {[K in TaskType]: (data: any, postMessage: (data: any) => void) => void} = {
    [TaskIds.CREW_ATTACK]: crewAttack,
    [TaskIds.MONSTER_MOVE]: monsterMove,
    [TaskIds.MONSTER_ATTACK]: monsterAttack
};