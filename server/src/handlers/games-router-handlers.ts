import { randomUUID } from "crypto";
import { addGame, flush, markDirty, retrieveGame } from "../cache/game-cache";
import { processAddCounterToAttackGroup, processCreateAttackGroup, processDeleteAttackGroup, processDropWeapon, processGrabWeapon, processGrowMonster, processLayEgg, processMoveToCoord, processNextPhase, processPhaseComplete, processRemoveCounterFromAttackGroup } from "../shared/state/reducers/game-reducers";
import { Action, ActionAddCountersToAttackGroup, ActionCreateAttackGroup, ActionDeleteAttackGroup, ActionDropWeapon, ActionGrabWeapon, ActionGrowMonster, ActionLayEgg, ActionMoveToCoord, ActionNextPhase, ActionPhaseComplete, ActionRefreshGame, ActionRemoveCounterFromAttackGroup, ActionType } from "../shared/types/action-types";
import { GameState, Phase, PlayerTurnStatus } from "../shared/types/game-types";
import { actionValidators } from "../state/action-validators";
import { TaskIds } from "../tasks/tasks";
import { Task, TaskType } from "../types/server-types";
import { pushAction } from "../utils/push-actions";
import { startTask } from "../workers/async-task-queue";
import { isCrew, isMonster } from "../shared/utils/counter-utils";

export const handlePhase = (gameId: string, socketId: string, action: Action): string | undefined => {
    console.log("handlePhase: ", action);

    const state = retrieveGame(gameId);

    console.log("before first state update")
    state.players.forEach(player => {
        console.log("Player:", player.name, "Turn status:", player.turnStatus);
    });

    pushAction(JSON.stringify(action), socketId);
    processPhaseComplete(state, action as ActionPhaseComplete);

    console.log("after first state update")
    state.players.forEach(player => {
        console.log("Player:", player.name, "Turn status:", player.turnStatus);
    });

    const allPlayersHaveFinished = state.players.find(player => player.turnStatus !== PlayerTurnStatus.FINISHED && player.active) === undefined;
    if (allPlayersHaveFinished) {
        console.log("All players have finished, moving to next phase");

        let nextPhase: Phase = Phase.GRAB_WEAPON;
        let playerStatus = PlayerTurnStatus.STARTED;

        switch (state.phase) {
            case Phase.GRAB_WEAPON:
                nextPhase = Phase.CREW_MOVE;
                break;
            case Phase.CREW_MOVE:
                nextPhase = Phase.CREW_ATTACK;
                break;
            case Phase.CREW_ATTACK:
                nextPhase = Phase.CREW_ATTACK_REPLAY;
                playerStatus = PlayerTurnStatus.FINISHED;
                handleTask(state, 'handlCrewAttack', TaskIds.CREW_ATTACK);
                break;
            case Phase.CREW_ATTACK_REPLAY:
                nextPhase = Phase.MONSTER_MOVE;
                playerStatus = PlayerTurnStatus.FINISHED;
                handleTask(state, 'handleMonsterMove', TaskIds.MONSTER_MOVE);
                break;
            case Phase.MONSTER_MOVE:
                nextPhase = Phase.MONSTER_MOVE_REPLAY;
                break;
            case Phase.MONSTER_MOVE_REPLAY:
                nextPhase = Phase.MONSTER_ATTACK;
                playerStatus = PlayerTurnStatus.FINISHED;
                handleTask(state, 'handleMonsterAttack', TaskIds.MONSTER_ATTACK);
                break;
            case Phase.MONSTER_ATTACK:
                nextPhase = Phase.MONSTER_ATTACK_REPLAY;
                break;
            case Phase.MONSTER_ATTACK_REPLAY:
                nextPhase = Phase.GRAB_WEAPON;
                break;
        }

        const nextPhaseAction: ActionNextPhase = {
            type: ActionType.NEXT_PHASE,
            payload: {
                phase: nextPhase,
                playerStatus
            },
        };

        processNextPhase(state, nextPhaseAction);

        console.log("Push next phase action:", nextPhaseAction);
        pushAction(JSON.stringify(nextPhaseAction));

        markDirty(gameId);
    } else {
        markDirty(gameId);
    }

    console.log("after all state updates")
    state.players.forEach(player => {
        console.log("Player:", player.name, "Turn status:", player.turnStatus);
    });

    return undefined;
}

export const handleTask = (state: GameState, label: string, taskId: TaskType) => {
     const task: Task = {
        payload: state,
        type: taskId,
        callBack: (msg: any) => {
            console.log(`${label} received message from task for game: ${msg.payload.gameId} status: ${msg.status}`);
            if (msg.status === 'notifyClient') {
                const newState = msg.payload.gameState as GameState;
                addGame(newState.id, newState);
                flush(newState.id);

                const action = {
                    type: "REFRESH_GAME",
                    payload: true
                };

                pushAction(JSON.stringify(action));
                console.log(`${label}: received message from task for game: ${msg.payload.gameId} PushAction: ${JSON.stringify(action)}`);
            } else if (msg.status === 'done') {
                console.log(`${label}: received message from task for game: ${msg.payload.gameId} has finished`);
            };
        }
    };

    startTask(task);
}

export const handleAttackGroup = (gameId: string, socketId: string, action: Action): string | undefined => {
    console.log("handleAttackGroup: ", action);

    const state = retrieveGame(gameId);

    switch (action.type) {
        case ActionType.CREATE_ATTACK_GROUP:
            const createAttackGroupAction: ActionCreateAttackGroup = action as ActionCreateAttackGroup;
            processCreateAttackGroup(state, createAttackGroupAction);
            pushAction(JSON.stringify(action), socketId);
            break;
        case ActionType.ADD_COUNTERS_TO_ATTACK_GROUP:
            //todo: need validation (like does group still exist, and counter is not already in a group)
            const addCounterToAttackGroupAction: ActionAddCountersToAttackGroup = action as ActionAddCountersToAttackGroup;
            processAddCounterToAttackGroup(state, addCounterToAttackGroupAction);
            pushAction(JSON.stringify(action), socketId);
            break;
        case ActionType.REMOVE_COUNTER_FROM_ATTACK_GROUP:
            //todo: need validation (like does group still exist, and counter is the group)
            const removeCounterFromAttackGroupAction: ActionRemoveCounterFromAttackGroup = action as ActionRemoveCounterFromAttackGroup;
            processRemoveCounterFromAttackGroup(state, removeCounterFromAttackGroupAction);
            pushAction(JSON.stringify(action), socketId);
            break;
        case ActionType.DELETE_ATTACK_GROUP:
            const deleteAttackGroupAction: ActionDeleteAttackGroup = action as ActionDeleteAttackGroup;
            processDeleteAttackGroup(state, deleteAttackGroupAction);
            pushAction(JSON.stringify(action), socketId);
            break;
    }

    markDirty(gameId);

    return undefined;
}

const handleMoveToCoord = (state: GameState, action: Action): string | undefined => {
    const validator = actionValidators[ActionType.MOVE_TO_COORD];
    if (validator) {
        const validationResult = validator(state, action.payload)
        if (validationResult) {
            return validationResult;
        }
    }
    processMoveToCoord(state, action as ActionMoveToCoord);
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
    return undefined;
}

export const ActionHandlers: { [key: string]: (gameState: GameState, action: Action) => string | undefined } = {
    [ActionType.MOVE_TO_COORD]: handleMoveToCoord,
    [ActionType.GRAB_WEAPON]: handleGrabWeapon,
    [ActionType.DROP_WEAPON]: handleDropWeapon,
};

let last = Promise.resolve()

export const enqueue = (fn: () => any) => {
    const next = last.then(() => fn())
    last = next.catch(() => { }) // keep chain alive
    return next
}