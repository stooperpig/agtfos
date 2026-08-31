import cloneDeep from "lodash.clonedeep";
import { InitialGameState } from "../constants/initial-state";
import { GameState } from "../shared/types/game-types";
import {
    processDropWeapon,
    processGrabWeapon,
    processMoveToCoord, processRefreshGame, processSelectCounter, processSelectArea, processSelectTargetArea, processSetStatusMessage, processUpdateClientCount,
    processDeselectCounter, processPhaseComplete,
    processNextPhase,
    processCreateAttackGroup,
    processRemoveCountersFromAttackGroup,
    processAddCountersToAttackGroup,
    processDeleteAttackGroup,
    processLoadGame,
    } from "../shared/state/reducers/game-reducers";

import { produce } from "immer";
import { processRefreshReplay, processClearAnimation, processReplayEnd, processReplayPause, processReplayPlay, processReplaySetShow, processReplayStart, processReplayStepBackward, processReplayStepForward } from "./reducers/replay-reducers";
import { Action, ActionType } from "../shared/types/action-types";

export const rootReducer = (state = InitialGameState, action: Action): GameState => {
    switch (action.type) {
        case ActionType.GRAB_WEAPON:
            return reduce(state, action, processGrabWeapon);
        case ActionType.DESELECT_COUNTER:
            return reduce(state, action, processDeselectCounter);
        case ActionType.PHASE_COMPLETE:
            return reduce(state, action, processPhaseComplete);
        case ActionType.DROP_WEAPON:
            return reduce(state, action, processDropWeapon);
        case ActionType.LOAD_GAME:
            return processLoadGame(state, action.payload); //this replaces current state with action payload
        case ActionType.UPDATE_CONNECTED_CLIENT_COUNT:
            return reduce(state, action, processUpdateClientCount);
        case ActionType.REFRESH_GAME:
            return reduce(state, action, processRefreshGame);
        case ActionType.SELECT_COUNTER:
            return reduce(state, action, processSelectCounter);
        case ActionType.SELECT_AREA:
            return reduce(state, action, processSelectArea);
        case ActionType.SELECT_TARGET_AREA:
            return reduce(state, action, processSelectTargetArea);
        case ActionType.MOVE_TO_COORD:
            return reduce(state, action, processMoveToCoord);
        case ActionType.SET_STATUS_MESSAGE:
            return reduce(state, action, processSetStatusMessage);
        case ActionType.REPLAY_PAUSE:
            return reduce(state, action, processReplayPause);
        case ActionType.REPLAY_PLAY:
            return reduce(state, action, processReplayPlay);
        case ActionType.REPLAY_SHOW:
            return reduce(state, action, processReplaySetShow);
        case ActionType.REPLAY_STEP_BACKWARD:
            return reduce(state, action, processReplayStepBackward);
        case ActionType.REPLAY_STEP_FORWARD:
            return reduce(state, action, processReplayStepForward);
        case ActionType.REPLAY_START:
            return reduce(state, action, processReplayStart);
        case ActionType.REPLAY_END:
            return reduce(state, action, processReplayEnd);
        case ActionType.REFRESH_REPLAY:
            return reduce(state, action, processRefreshReplay);
        case ActionType.CLEAR_REPLAY_ANIMATION:
            return reduce(state, action, processClearAnimation);
        case ActionType.NEXT_PHASE:
            return reduce(state, action, processNextPhase);
        case ActionType.CREATE_ATTACK_GROUP:
            return reduce(state, action, processCreateAttackGroup);
        case ActionType.REMOVE_COUNTERS_FROM_ATTACK_GROUP:
            return reduce(state, action, processRemoveCountersFromAttackGroup);
        case ActionType.ADD_COUNTERS_TO_ATTACK_GROUP:
            return reduce(state, action, processAddCountersToAttackGroup);
        case ActionType.DELETE_ATTACK_GROUP:
            return reduce(state, action, processDeleteAttackGroup);
        default:
            console.log('Unknown action type:', action.type);
            return state;
    }
}

const DEBUG = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reduce = (state: GameState, action: Action, reducer: (state: GameState, action: any) => void): GameState => {
    //use deep cloning for debugging otherwise use Immer
    if (DEBUG) {
        const clonedState = cloneDeep(state);
        //console.log(clonedState === state, clonedState.taskForceMap === state.taskForceMap);
        reducer(clonedState, action);
        return clonedState;
    } else {
        const newState = produce(state, draftState => {
            reducer(draftState, action);
        });

        return newState;
    }
}