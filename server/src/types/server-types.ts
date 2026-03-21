import { GameEntry, SaveGameData, ScenarioEntry } from '../shared/types/game-types'

export interface GameList {
    nextId: number
    games: GameEntry[]
}

export interface ScenarioList {
    nextId: number
    scenarios: ScenarioEntry[]
}

export interface PutGameData {
    gameId: string
    playerId: string
    saveGameData: SaveGameData
}

export type TaskType = "PUT_GAME";

export type JobStatus = "done" | "callback" | "error";

export interface WorkerMessage {
    status: string
    jobId: string
    message?: any
}

export interface Task {
    type: string
    payload: any
    callBack?: (data: any) => void
}

export interface Job {
    id: string
    type: string
    payload: any
}
