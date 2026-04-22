import { Action } from '../shared/types/action-types'
import { GameEntry, GameState, ScenarioEntry } from '../shared/types/game-types'
import { TaskIds } from '../tasks/tasks'

export interface GameList {
    nextId: number
    games: GameEntry[]
}

export interface ScenarioList {
    nextId: number
    scenarios: ScenarioEntry[]
}

// export interface PutGameData {
//     gameId: string
//     playerId: string
//     saveGameData: SaveGameData
// }

// export interface Action {
//     type: string
//     payload: any
// }

export interface ActionData {
    gameId: string
    socketId: string
    action: Action
}

export interface DiceTableData {
    [key: string]: number
}

export interface ReserveWeaponData {
    gameId: string
    counterId: string
    weaponCounterId: string
}

export type JobStatus = "done" | "callback" | "error";

export interface WorkerMessage {
    status: string
    jobId: string
    message?: any
}

export interface Task {
    type: TaskType
    payload: any
    callBack?: (data: any) => void
}

export interface Job {
    id: string
    type: TaskType
    payload: any
}

export type TaskType = typeof TaskIds[keyof typeof TaskIds];

export type GameContainerMap = {
    [K: string]: GameContainer;
};

export type GameContainer = {
    state: GameState
    saveTimeout: NodeJS.Timeout | null
    isDirty: boolean
    lastSave: number
}

export enum ReplayType {
    PRE = "pre",
    POST = "post"
}