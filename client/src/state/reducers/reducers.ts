import cloneDeep from "lodash.clonedeep";
import { LOAD_GAME, REFRESH_GAME, SELECT_LOCATION, SET_STATUS_MESSAGE, UPDATE_CONNECTED_CLIENT_COUNT, SELECT_COUNTER, MOVE_TO_LOCATION, CLEAR_PLAN, GRAB_WEAPON, DROP_WEAPON, TRADE_WEAPON } from "../../constants/action-constants";
import { InitialGameState } from "../../constants/initial-state";
import { GameState } from "../../shared/types/game-types";
import {
    processClearPlan,
    processDropWeapon,
    processGrabWeapon,
    processMoveToLocation, processRefreshGame, processSelectCounter, processSelectLocation, processSetStatusMessage, processTradeWeapon, processUpdateClientCount

} from "./game-reducers";

import { Action } from "../../types/game-types";
import { produce } from "immer";

export const rootReducer = (state = InitialGameState, action: Action): GameState => {
    switch (action.type) {
        case CLEAR_PLAN:
            return reduce(state, action, processClearPlan);
        case GRAB_WEAPON:
            return reduce(state, action, processGrabWeapon);
        case DROP_WEAPON:
            return reduce(state, action, processDropWeapon);
        case TRADE_WEAPON:
            return reduce(state, action, processTradeWeapon);
        case LOAD_GAME:
            return action.payload;
        case UPDATE_CONNECTED_CLIENT_COUNT:
            return reduce(state, action, processUpdateClientCount);
        case REFRESH_GAME:
            return reduce(state, action, processRefreshGame);
        case SELECT_COUNTER:
            return reduce(state, action, processSelectCounter);
        case SELECT_LOCATION:
            return reduce(state, action, processSelectLocation);
        case MOVE_TO_LOCATION:
            return reduce(state, action, processMoveToLocation);
        case SET_STATUS_MESSAGE:
            return reduce(state, action, processSetStatusMessage);
    }

    return state;
}

const DEBUG = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reduce = (state: GameState, action: Action, reducer: (state: GameState, payload: any) => void): GameState => {
    //use deep cloning for debugging otherwise use Immer
    if (DEBUG) {
        const clonedState = cloneDeep(state);
        //console.log(clonedState === state, clonedState.taskForceMap === state.taskForceMap);
        reducer(clonedState, action.payload);
        return clonedState;
    } else {
        const newState = produce(state, draftState => {
            reducer(draftState, action.payload);
        });

        return newState;
    }
}