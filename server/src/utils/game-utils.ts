import { GameState, Replay } from "../shared/types/game-types";

export const createReplay = (gameState: GameState): Replay => {
    return {
        startingState: {
            counterMap: { ...gameState.counterMap },
            stackMap: { ...gameState.stackMap }
        },
        replayElements: {
            movementElements: [],
            attackElements: []
        },
        index: -1,
        playing: false,
        show: false
    };
}