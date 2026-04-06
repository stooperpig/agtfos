import { addGame, flush } from "../cache/game-cache";
import { processAddAction, processClearPlan, processDropWeapon, processGrabWeapon, processMoveToCoord, processPhaseComplete } from "../shared/state/reducers/game-reducers";
import { Action, ActionAddAction, ActionClearPlan, ActionDropWeapon, ActionGrabWeapon, ActionMoveToCoord, ActionPhaseComplete, ActionType } from "../shared/types/action-types";
import { GameState, PlayerTurnStatus } from "../shared/types/game-types";
import { actionValidators } from "../state/action-validators";
import { TaskIds } from "../tasks/tasks";
import { Task } from "../types/server-types";
import { pushAction } from "../utils/push-actions";
import { startTask } from "../workers/async-task-queue";

const handleMoveToCoord = (state: GameState, action: Action): string | undefined => {
    const validator = actionValidators[ActionType.MOVE_TO_COORD];
    if (validator) {
        const validationResult = validator(state, action.payload)
        if (validationResult) {
            return validationResult;
        }
    }
    processMoveToCoord(state, action as ActionMoveToCoord);
    const addActionAction: ActionAddAction = { type: ActionType.ADD_ACTION, payload: { counterIds: (action as ActionMoveToCoord).payload.counterIds, actionToAdd: action } };
    processAddAction(state, addActionAction);
    return undefined;
}

const handleDropWeapon = (state: GameState, action: Action): string | undefined => {
    const validator = actionValidators[ActionType.DROP_WEAPON];
    if (validator) {
        const validationResult = validator(state, action.payload)
        if (validationResult) {
            return validationResult;
        }
    }
    processDropWeapon(state, action as ActionDropWeapon);
    const addActionAction: ActionAddAction = { type: ActionType.ADD_ACTION, payload: { counterIds: [(action as ActionDropWeapon).payload.crewCounterId], actionToAdd: action } };
    processAddAction(state, addActionAction);
    return undefined;
}
const handleClearPlan = (state: GameState, action: Action): string | undefined => {
    const validator = actionValidators[ActionType.CLEAR_PLAN];
    if (validator) {
        const validationResult = validator(state, action.payload)
        if (validationResult) {
            return validationResult;
        }
    }
    processClearPlan(state, action as ActionClearPlan);
    return undefined;
}

const handleGrabWeapon = (state: GameState, action: Action): string | undefined => {
    const validator = actionValidators[ActionType.GRAB_WEAPON];
    if (validator) {
        const validationResult = validator(state, action.payload)
        if (validationResult) {
            return validationResult;
        }
    }
    processGrabWeapon(state, action as ActionGrabWeapon);
    const addActionAction: ActionAddAction = { type: ActionType.ADD_ACTION, payload: { counterIds: [(action as ActionGrabWeapon).payload.crewCounterId], actionToAdd: action } };
    processAddAction(state, addActionAction);
    return undefined;
}

const handlePhaseComplete = (state: GameState, action: Action): string | undefined => {
    const validator = actionValidators[ActionType.PHASE_COMPLETE];
    if (validator) {
        const validationResult = validator(state, action.payload)
        if (validationResult) {
            return validationResult;
        }
    }

    processPhaseComplete(state, action as ActionPhaseComplete);

    const allPlayersHaveFinished = state.players.find(player => player.turnStatus !== PlayerTurnStatus.FINISHED && player.active) === undefined;

    if (allPlayersHaveFinished) {
        const task: Task = {
            payload: state,
            type: TaskIds.RUN_PHASE,
            callBack: (msg: any) => {
                console.log(`handleNextPhase: received message from task for game: ${msg.payload.gameId} status: ${msg.status}`); // -> ${JSON.stringify(msg)}`);
                if (msg.status === 'notifyClient') {
                    const newState = msg.payload.gameState as GameState;
                    addGame(newState.id, newState);
                    flush(newState.id);

                    const action = {
                        type: "REFRESH_GAME",
                        payload: true
                    };
                    
                    pushAction(JSON.stringify(action));
                    console.log(`handleNextPhase: received message from task for game: ${msg.payload.gameId} PushAction: ${JSON.stringify(action)}`);

                    //const gameList = readGameList();
                    //const gameEntry = gameList.games.find(game => game.id === msg.gameId);
                    // if (gameEntry) {

                    // }
                } else if (msg.status === 'done') {
                    console.log(`handleNextPhase: received message from task for game: ${msg.payload.gameId} has finished`);
                };
            }
        };

        startTask(task);
    }

    return undefined;
}

export const ActionHandlers: { [key: string]: (gameState: GameState, action: Action) => string | undefined } = {
    [ActionType.MOVE_TO_COORD]: handleMoveToCoord,
    [ActionType.GRAB_WEAPON]: handleGrabWeapon,
    [ActionType.DROP_WEAPON]: handleDropWeapon,
    [ActionType.CLEAR_PLAN]: handleClearPlan,
    [ActionType.PHASE_COMPLETE]: handlePhaseComplete
};

let last = Promise.resolve()

export const enqueue = (fn: () => any) => {
    const next = last.then(() => fn())
    last = next.catch(() => { }) // keep chain alive
    return next
}