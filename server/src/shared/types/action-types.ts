import { Coord, GameState, Replay } from "./game-types";

export interface Action {
    type: ActionType;
    payload?: any;
}

export enum ActionType {
    CLEAR_PLAN = 'CLEAR_PLAN',
    GRAB_WEAPON = 'GRAB_WEAPON',
    DESELECT_COUNTER = 'DESELECT_COUNTER',
    PHASE_COMPLETE = 'PHASE_COMPLETE',
    DROP_WEAPON = 'DROP_WEAPON',
    LOAD_GAME = 'LOAD_GAME',
    UPDATE_CONNECTED_CLIENT_COUNT = 'UPDATE_CONNECTED_CLIENT_COUNT',
    REFRESH_GAME = 'REFRESH_GAME',
    SELECT_COUNTER = 'SELECT_COUNTER',
    SELECT_AREA = 'SELECT_AREA',
    MOVE_TO_COORD = 'MOVE_TO_COORD',
    SET_STATUS_MESSAGE = 'SET_STATUS_MESSAGE',
    REPLAY_PAUSE = 'REPLAY_PAUSE',
    REPLAY_PLAY = 'REPLAY_PLAY',
    REPLAY_SHOW = 'REPLAY_SHOW',
    REPLAY_STEP_BACKWARD = 'REPLAY_STEP_BACKWARD',
    REPLAY_STEP_FORWARD = 'REPLAY_STEP_FORWARD',
    // REPLAY_STOP = 'REPLAY_STOP',
    REPLAY_START = 'REPLAY_START',
    REPLAY_END  = 'REPLAY_END', 
    //REPLAY_SET_INDEX = 'REPLAY_SET_INDEX',
    REFRESH_REPLAY = 'REFRESH_REPLAY',
    ADD_ACTION = 'ADD_ACTION',
    SET_SPOTTED_OR_ENAGED = 'SET_SPOTTED_OR_ENAGED'
}

type SetSpottedOrEnagedPayload = {
    counterIds: string[];
    spotted: boolean;
    enaged: boolean;
};

export interface ActionSetSpottedOrEnaged extends Action {
    type: ActionType.SET_SPOTTED_OR_ENAGED;
    payload: SetSpottedOrEnagedPayload;
}

type AddActionPayload = {
    counterIds: string[]
    actionToAdd: Action;
};

export interface ActionAddAction extends Action {
    type: ActionType.ADD_ACTION;
    payload: AddActionPayload;
}

// type InitializeCounterPayload = {
//     counterId: string,
//     areaId?: string,
//     coord?: Coord,
//     stunned: boolean,
//     weaponCounterId?: string,
//     usedMovementAllowance: 0
//     ownerCounterId?: string;
// };

// export interface ActionInitializeCounter extends Action {
//     type: ActionType.INITIALIZE_COUNTER;
//     payload: InitializeCounterPayload;
// }

type ClearActionPayload = {
    counterIds: string[];
};

export interface ActionClearPlan extends Action {
    type: ActionType.CLEAR_PLAN;
    payload: ClearActionPayload;
}

type GrabWeaponActionPayload = {
    crewCounterId: string;
    weaponCounterId: string;
    fromAreaId: string;
    fromCoord: Coord;
    movementCost: number;
};

export interface ActionGrabWeapon extends Action {
    type: ActionType.GRAB_WEAPON;
    payload: GrabWeaponActionPayload;
}

type DeselectCounterActionPayload = {
    counterId: string;
};

export interface ActionDeselectCounter extends Action {
    type: ActionType.DESELECT_COUNTER;
    payload: DeselectCounterActionPayload;
}

type PhaseCompletePayload = {
    playerId: string;
};

export interface ActionPhaseComplete extends Action {
    type: ActionType.PHASE_COMPLETE;
    payload: PhaseCompletePayload;
};

type DropWeaponPayload = {
    crewCounterId: string;
    weaponCounterId: string;
    fromAreaId: string;
    fromCoord: Coord;
    movementCost: number;
};

export interface ActionDropWeapon extends Action {
    type: ActionType.DROP_WEAPON;
    payload: DropWeaponPayload;
}

type LoadGamePayload = GameState;

export interface ActionLoadGame extends Action {
    type: ActionType.LOAD_GAME;
    payload: LoadGamePayload;
}

type UpdateConnectedClientCountPayload = number;

export interface ActionUpdateConnectedClientCount extends Action {
    type: ActionType.UPDATE_CONNECTED_CLIENT_COUNT;
    payload: UpdateConnectedClientCountPayload;
}

type RefreshGamePayload = boolean;

export interface ActionRefreshGame extends Action {
    type: ActionType.REFRESH_GAME;
    payload: RefreshGamePayload;
}

type SelectCounterPayload = string;

export interface ActionSelectCounter extends Action {
    type: ActionType.SELECT_COUNTER;
    payload: SelectCounterPayload;
}

type SelectAreaPayload = {
    areaId: string;
    clearSelectedCounterIds: boolean;
};

export interface ActionSelectArea extends Action {
    type: ActionType.SELECT_AREA;
    payload: SelectAreaPayload;
};

type MoveToCoordPayload = {
    counterIds: string[];
    fromAreaId: string;
    fromCoords: Coord[];
    toAreaId: string;
    toCoord: Coord;
    movementCost: number;
};

export interface ActionMoveToCoord extends Action {
    type: ActionType.MOVE_TO_COORD;
    payload: MoveToCoordPayload;
}

type SetStatusMessagePayload = string;

export interface ActionSetStatusMessage extends Action {
    type: ActionType.SET_STATUS_MESSAGE;
    payload: SetStatusMessagePayload;
}

type ReplayShowPayload = boolean;

export interface ActionReplayShow extends Action {
    type: ActionType.REPLAY_SHOW;
    payload: ReplayShowPayload;
}

// type ReplaySetIndexPayload = number;

// export interface ActionReplaySetIndex extends Action {
//     type: ActionType.REPLAY_SET_INDEX;
//     payload: ReplaySetIndexPayload;
// }

type ReplayStepBackwardPayload = void;

export interface ActionReplayStepBackward extends Action {
    type: ActionType.REPLAY_STEP_BACKWARD;
    payload: ReplayStepBackwardPayload;
}

// type ReplayStopPayload = void;

// export interface ActionReplayStop extends Action {
//     type: ActionType.REPLAY_STOP;
//     payload: ReplayStopPayload;
// }

type ReplayPausePayload = void;

export interface ActionReplayPause extends Action {
    type: ActionType.REPLAY_PAUSE;
    payload: ReplayPausePayload;
}

type ActionReplayPlayPayload = boolean;

export interface ActionReplayPlay extends Action {
    type: ActionType.REPLAY_PLAY;
    payload: ActionReplayPlayPayload;
}

type ActionRefreshReplayPayload = Replay;

export interface ActionRefreshReplay extends Action {
    type: ActionType.REFRESH_REPLAY;
    payload: ActionRefreshReplayPayload;
}

type ActionReplayStartPayload = void;

export interface ActionReplayStart extends Action {
    type: ActionType.REPLAY_START;
    payload: ActionReplayStartPayload;
}

type ActionReplayEndPayload = void;

export interface ActionReplayEnd extends Action {
    type: ActionType.REPLAY_END;
    payload: ActionReplayEndPayload;
}