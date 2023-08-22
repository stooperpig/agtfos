import { GameState } from "../../types/game-types";


export const processLoadGame = (state: GameState, payload: any): GameState => {
    const newState: GameState = payload as GameState;
    return { ...newState };
}