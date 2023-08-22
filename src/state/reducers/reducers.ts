import { LOAD_GAME } from "../../constants/action-constants";
import { InitialState } from "../../constants/initial-state";
import { GameState } from "../../types/game-types";
import { processLoadGame } from "./game-reducers";

export const rootReducer = (state = InitialState, action: any): GameState => {
    switch (action.type) {
        case LOAD_GAME:
            return processLoadGame(state, action.payload);
        default:
            return { ...state };
    }
}