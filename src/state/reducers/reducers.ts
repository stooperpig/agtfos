import { SELECT_LOCATION, LOAD_GAME, SET_CURRENT_LOCATION_ID, SELECT_COUNTER, MOVE_TO_LOCATION } from "../../constants/action-constants";
import { InitialState } from "../../constants/initial-state";
import { GameState } from "../../types/game-types";
import { processLoadGame, processSetCurrentLocationId, processSelectLocation, processSelectCounter, processMoveToLocation } from "./game-reducers";

export const rootReducer = (state = InitialState, action: any): GameState => {
    switch (action.type) {
        case LOAD_GAME:
            return processLoadGame(state, action.payload);
        case MOVE_TO_LOCATION:
            return processMoveToLocation(state, action.payload);
        case SET_CURRENT_LOCATION_ID:
            return processSetCurrentLocationId(state, action.payload);
        case SELECT_COUNTER: 
            return processSelectCounter(state, action.payload);
        case SELECT_LOCATION:
                return processSelectLocation(state, action.payload);            
        default:
            return { ...state };
    }
}