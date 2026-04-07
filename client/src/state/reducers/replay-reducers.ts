import cloneDeep from "lodash.clonedeep";
import { Action, ActionDropWeapon, ActionGrabWeapon, ActionMoveToCoord, ActionRefreshReplay, ActionReplayPlay, ActionReplayShow, ActionType } from "../../shared/types/action-types";
import { GameState, Phase, Replay, ReplayAttackElement, ReplayMovementElement, ReplayState } from "../../shared/types/game-types"

export const processReplayStart = (state: GameState) => {
    const replay = state.replay;
    if (replay) {
        replay.playing = false;
        replay.index = -1;
        updateReplay(replay, -1, state.phase);
    }
}

export const processReplayEnd = (state: GameState) => {
    const replay = state.replay;
    if (replay) {
        const max = state.phase === Phase.ATTACK ? replay.replayElements.movementElements?.length - 1 : replay.replayElements.attackElements.length - 1;
        replay.playing = false;
        updateReplay(replay, max, state.phase);
    }
}

export const processReplayPlay = (state: GameState, action: ActionReplayPlay) => {
    const replay = state.replay;
    if (replay) {
        replay.playing = action.payload;
    }
}

export const processReplayPause = (state: GameState) => {
    const replay = state.replay;
    if (replay) {
        replay.playing = false
    }
}

export const processReplayStepForward = (state: GameState) => {
    const replay = state.replay;
    if (replay !== undefined) {
        const max = state.phase === Phase.ATTACK ? replay.replayElements.movementElements?.length : replay.replayElements.attackElements.length;
        if (replay.index <= max) {
            updateReplay(replay, replay.index + 1, state.phase);
        }
    }
}

export const processReplayStepBackward = (state: GameState) => {
    const replay = state.replay;
    if (replay) {
        if (replay.index >= 0) {
            updateReplay(replay, replay.index - 1, state.phase);
        }
    }
}

export const processReplaySetShow = (state: GameState, action: ActionReplayShow) => {
    if (state.replay) {
        state.replay.show = action.payload;
        state.replay.playing = false;
    }
}

export const processRefreshReplay = (state: GameState, action: ActionRefreshReplay): void => {
    state.replay = action.payload;
}

const updateReplay = (replay: Replay, newIndex: number, phase: Phase): void => {
    if (replay) {
        //todo: index ranges from -1 (ie. startingstate) to 0 >= x <= max of the replay elements
        const max = phase === Phase.ATTACK ? replay.replayElements.movementElements?.length - 1 : replay.replayElements.attackElements.length - 1;

        if (newIndex === -1) {
            replay.index = -1;
            replay.activeState = cloneDeep(replay.startingState);
        } else {
            if (newIndex > replay.index) {
                for (let i = replay.index + 1; i <= newIndex; i++) {
                    if (phase === Phase.ATTACK) {
                        const replayElement = replay.replayElements.movementElements[i];
                        applyMovementAction(replay.activeState!, replayElement);
                    } else {
                        const replayElement = replay.replayElements.attackElements[i];
                        applyAttackAction(replay.activeState!, replayElement);
                    }
                }
            } else if (newIndex < replay.index) {
                // TODO: apply actions in reverse order
                replay.activeState = cloneDeep(replay.startingState);
                for (let i = 0; i <= newIndex; i++) {
                    if (phase === Phase.ATTACK) {
                        const replayElement = replay.replayElements.movementElements[i];
                        applyMovementAction(replay.activeState!, replayElement);
                    } else {
                        const replayElement = replay.replayElements.attackElements[i];
                        applyAttackAction(replay.activeState!, replayElement);
                    }
                }
            }
        }

        replay.index = newIndex;
        if (replay.index >= (replay.replayElements.movementElements?.length - 1)) {
            replay.playing = false;
        }
    }
}

const applyAttackAction = (activeState: ReplayState, replayAttackElement: ReplayAttackElement): void => {
    // TODO: apply action to state
    // return activeState;
}

const applyMovementAction = (activeState: ReplayState, replayMovementElement: ReplayMovementElement): void => {
    switch (replayMovementElement.type) {
        case ActionType.MOVE_TO_COORD:
            const moveAction: ActionMoveToCoord = {
                type: ActionType.MOVE_TO_COORD,
                payload: {
                    counterIds: [replayMovementElement.counterId],
                    fromAreaId: replayMovementElement.fromAreaId,
                    fromCoords: [replayMovementElement.fromCoord],
                    toAreaId: replayMovementElement.toAreaId!,
                    toCoord: replayMovementElement.toCoord!,
                    movementCost: replayMovementElement.movementCost
                }
            };
            moveCounter(activeState, moveAction);
            Object.keys(replayMovementElement.engagedData).forEach(counterId => {
                const engaged = replayMovementElement.engagedData[counterId];
                const counter = activeState.counterMap[counterId];
                if (counter) {
                    counter.engaged = engaged;
                }
            });

            //todo: handle spotted data next
            break;
        case ActionType.GRAB_WEAPON:
            const grabWeaponAction: ActionGrabWeapon = {
                type: ActionType.GRAB_WEAPON,
                payload: {
                    crewCounterId: replayMovementElement.counterId,
                    weaponCounterId: replayMovementElement.weaponCounterId!,
                    fromAreaId: replayMovementElement.fromAreaId,
                    fromCoord: replayMovementElement.fromCoord!,
                    movementCost: replayMovementElement.movementCost
                }
            };
            grabWeapon(activeState, grabWeaponAction);
            break;
        case ActionType.DROP_WEAPON:
            const dropWeaponAction: ActionDropWeapon = {
                type: ActionType.DROP_WEAPON,
                payload: {
                    crewCounterId: replayMovementElement.counterId,
                    weaponCounterId: replayMovementElement.weaponCounterId!,
                    fromAreaId: replayMovementElement.toAreaId!,
                    fromCoord: replayMovementElement.toCoord!,
                    movementCost: replayMovementElement.movementCost
                }
            };
            dropWeapon(activeState, dropWeaponAction);
            break;
    }
}

const moveCounter = (activeState: ReplayState, moveAction: ActionMoveToCoord): void => {
    const { counterIds, fromAreaId, fromCoords, toAreaId, toCoord } = moveAction.payload;

    if (fromAreaId !== toAreaId) {
        const fromStack = activeState.stackMap[fromAreaId];
        if (fromStack === undefined) {
            return;
        }
        fromStack.counterIds = fromStack.counterIds.filter(counterId => !counterIds.includes(counterId));

        let toStack = activeState.stackMap[toAreaId];
        if (toStack === undefined) {
            toStack = {
                id: toAreaId,
                counterIds: [...counterIds]
            };
            activeState.stackMap[toAreaId] = toStack;
        } else {
            toStack.counterIds.push(...counterIds);
        }
    }

    const counters = counterIds.map(counterId => activeState.counterMap[counterId]);

    counters.forEach(counter => {
        const movementCost = fromAreaId !== toAreaId ? 1 : 0;
        counter.coord = toCoord;
        if (fromAreaId !== toAreaId) {
            counter.usedMovementAllowance += movementCost;
            counter.areaId = toAreaId;
        }
    });
}

const grabWeapon = (activeState: ReplayState, grabWeaponAction: ActionGrabWeapon): void => {
    const { crewCounterId, weaponCounterId, fromAreaId } = grabWeaponAction.payload;
    const crewCounter = activeState.counterMap[crewCounterId];
    const weaponCounter = activeState.counterMap[weaponCounterId];
    crewCounter.weaponCounterId = weaponCounterId;
    weaponCounter.ownerCounterId = crewCounterId;
    weaponCounter.areaId = fromAreaId;
    weaponCounter.coord = crewCounter.coord;
    const stack = activeState.stackMap[fromAreaId];
    stack.counterIds = stack.counterIds.filter(counterId => counterId !== weaponCounterId);
}

const dropWeapon = (state: ReplayState, dropWeaponAction: ActionDropWeapon): void => {
    const { crewCounterId } = dropWeaponAction.payload;
    const crewCounter = state.counterMap[crewCounterId];
    const weaponCounter = state.counterMap[crewCounter.weaponCounterId!];
    crewCounter.weaponCounterId = undefined;
    weaponCounter.ownerCounterId = undefined;
    weaponCounter.areaId = crewCounter.areaId;
    weaponCounter.coord = crewCounter.coord;
    const stack = state.stackMap[crewCounter.areaId!];
    stack.counterIds.push(weaponCounter.id);
}