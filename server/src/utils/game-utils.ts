import cloneDeep from "lodash.clonedeep";
import { GameState, Replay } from "../shared/types/game-types";

export const createReplay = (gameState: GameState): Replay => {
    return {
        startingState: {
            counterMap: cloneDeep(gameState.counterMap),
            stackMap: cloneDeep(gameState.stackMap)
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