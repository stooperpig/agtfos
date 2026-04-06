import { GameState, PlayerTurnStatus } from "../../../shared/types/game-types";
import { ActionAddAction, ActionClearPlan, ActionDeselectCounter, ActionDropWeapon, ActionGrabWeapon, ActionMoveToCoord, ActionPhaseComplete, ActionRefreshGame, ActionSelectArea, ActionSelectCounter, ActionSetStatusMessage, ActionType, ActionUpdateConnectedClientCount } from "../../types/action-types";

export const processClearPlan = (state: GameState, action: ActionClearPlan): void => {
    const counterIds = action.payload.counterIds;
    const counters = counterIds.map(counterId => state.counterMap[counterId]);

    const areaIdSet = new Set<string>();
    counters.forEach((counter, index) => {
        console.log(`clearing plan for ${counter.id}. ${counter.actions ? `has ${counter.actions.length} actions` : 'no actions'}`);
        if (counter.actions && counter.actions.length > 0) {
            const action = counter.actions[0];
            console.log(`first action is ${action.type}`);
            if (action.type === ActionType.DROP_WEAPON) {
                const dropAction = action as ActionGrabWeapon;
                state.stackMap[counter.areaId!].counterIds = state.stackMap[counter.areaId!].counterIds.filter(counterId => counterId !== counter.id);
                state.stackMap[dropAction.payload.fromAreaId].counterIds.push(counter.id);
                counter.areaId = dropAction.payload.fromAreaId;
                counter.coord = dropAction.payload.fromCoord;
                areaIdSet.add(dropAction.payload.fromAreaId);

                if (counter.actions.length > 1 && counter.actions[1].type === ActionType.GRAB_WEAPON) {
                    const secondAction = counter.actions[1] as ActionGrabWeapon;
                    console.log(`second action is ${secondAction.type}`);
                    console.log(`adding weapon back to stack`);
                    const weaponCounter = state.counterMap[counter.weaponCounterId!];
                    counter.weaponCounterId = undefined;
                    weaponCounter.ownerCounterId = undefined;
                    weaponCounter.areaId = secondAction.payload.fromAreaId;
                    weaponCounter.coord = secondAction.payload.fromCoord;
                    weaponCounter.actions = weaponCounter.actions?.filter(a => a.type !== ActionType.GRAB_WEAPON) || [];
                    state.stackMap[secondAction.payload.fromAreaId].counterIds.push(weaponCounter.id);
                }

                const weaponCounter = state.counterMap[dropAction.payload.weaponCounterId];
                if (weaponCounter.ownerCounterId === undefined) {
                    state.stackMap[dropAction.payload.fromAreaId].counterIds = state.stackMap[dropAction.payload.fromAreaId].counterIds.filter(counterId => counterId !== dropAction.payload.weaponCounterId);
                    counter.weaponCounterId = dropAction.payload.weaponCounterId;
                    weaponCounter.ownerCounterId = counter.id;
                    counter.actions = [];
                    weaponCounter.actions = [];
                } else {
                    counter.actions = counter.actions.slice(1);
                }
            } else if (action.type === ActionType.GRAB_WEAPON) {
                const grabAction = action as ActionGrabWeapon;
                state.stackMap[counter.areaId!].counterIds = state.stackMap[counter.areaId!].counterIds.filter(counterId => counterId !== counter.id);
                state.stackMap[grabAction.payload.fromAreaId].counterIds.push(counter.id);
                counter.areaId = grabAction.payload.fromAreaId;
                counter.coord = grabAction.payload.fromCoord;
                areaIdSet.add(grabAction.payload.fromAreaId);
                counter.actions = [];
                console.log(`adding weapon back to stack`);
                const weaponCounter = state.counterMap[counter.weaponCounterId!];
                counter.weaponCounterId = undefined;
                weaponCounter.ownerCounterId = undefined;
                weaponCounter.areaId = grabAction.payload.fromAreaId;
                weaponCounter.coord = grabAction.payload.fromCoord;
                weaponCounter.actions = weaponCounter.actions?.filter(a => a.type !== ActionType.GRAB_WEAPON) || [];
                state.stackMap[grabAction.payload.fromAreaId].counterIds.push(weaponCounter.id);
                console.log(`counter ${counter.id} actions: ${counter.actions.length}`);
            } else if (action.type === ActionType.MOVE_TO_COORD) {
                const moveAction = action as ActionMoveToCoord;
                state.stackMap[counter.areaId!].counterIds = state.stackMap[counter.areaId!].counterIds.filter(counterId => counterId !== counter.id);
                state.stackMap[moveAction.payload.fromAreaId!].counterIds.push(counter.id);
                counter.areaId = moveAction.payload.fromAreaId;
                counter.coord = moveAction.payload.fromCoords[index];
                areaIdSet.add(moveAction.payload.fromAreaId);
                counter.actions = [];
                console.log(`counter ${counter.id} actions: ${counter.actions.length}`);
            }
        } else {
            counter.actions = [];
        }

        counter.usedMovementAllowance = 0;
    });

    if (areaIdSet.size > 1) {
        state.selectedCounterIds = [];
    }
}

export const processDeselectCounter = (state: GameState, action: ActionDeselectCounter): void => {
    const { counterId } = action.payload;
    state.selectedCounterIds = state.selectedCounterIds.filter(id => id !== counterId);
}

export const processDropWeapon = (state: GameState, action: ActionDropWeapon): void => {
    const { crewCounterId } = action.payload;
    const crewCounter = state.counterMap[crewCounterId];
    const weaponCounter = state.counterMap[crewCounter.weaponCounterId!];
    crewCounter.weaponCounterId = undefined;
    weaponCounter.ownerCounterId = undefined;
    weaponCounter.areaId = crewCounter.areaId;
    weaponCounter.coord = crewCounter.coord;
    const stack = state.stackMap[crewCounter.areaId!];
    stack.counterIds.push(weaponCounter.id);

    crewCounter.actions.push(action);
    //weaponCounter.actions.push(action);
    //crewCounter.actions.push({ type: CounterActionType.GRAB_WEAPON, fromAreaId: crewCounter.areaId!, fromCoord: crewCounter.coord!, weaponCounterId: weaponCounter.id, movementCost: 0 });
}

export const processGrabWeapon = (state: GameState, action: ActionGrabWeapon): void => {
    const { crewCounterId, weaponCounterId, fromAreaId } = action.payload;
    const crewCounter = state.counterMap[crewCounterId];
    const weaponCounter = state.counterMap[weaponCounterId];
    crewCounter.weaponCounterId = weaponCounterId;
    weaponCounter.ownerCounterId = crewCounterId;
    weaponCounter.areaId = fromAreaId;
    weaponCounter.coord = crewCounter.coord;
    const stack = state.stackMap[fromAreaId];
    stack.counterIds = stack.counterIds.filter(counterId => counterId !== weaponCounterId);

    //crewCounter.actions.push(action);

    // const weaponAction = { ...action, payload: { ...action.payload, fromCoord: weaponCounter.coord } };
    // weaponCounter.actions.push(weaponAction);
    //crewCounter.actions.push({ type: CounterActionType.GRAB_WEAPON, fromAreaId: crewCounter.areaId!, fromCoord: crewCounter.coord!, weaponCounterId: weaponCounterId, movementCost: 0 });
}

export const processAddAction = (state: GameState, action: ActionAddAction): void => {
    const { counterIds, actionToAdd } = action.payload;

    const counters = counterIds.map(counterId => state.counterMap[counterId]);

    counters.forEach((counter, index) => {
        switch (actionToAdd.type) {
            case ActionType.MOVE_TO_COORD: {
                const moveToCoordAction = actionToAdd as ActionMoveToCoord;
                const singleCounterAction: ActionMoveToCoord = {
                    type: ActionType.MOVE_TO_COORD,
                    payload: {
                        counterIds: [counter.id],
                        fromAreaId: moveToCoordAction.payload.fromAreaId,
                        fromCoords: [moveToCoordAction.payload.fromCoords[index]],
                        toAreaId: moveToCoordAction.payload.toAreaId,
                        toCoord: moveToCoordAction.payload.toCoord
                    }
                };
                counter.actions.push(singleCounterAction);
                break;
            }
            case ActionType.GRAB_WEAPON: {
                counter.actions.push(actionToAdd);
                break;
            }
            case ActionType.DROP_WEAPON: {
                counter.actions.push(actionToAdd);
                break;
            }
        }
    });
}

export const processMoveToCoord = (state: GameState, action: ActionMoveToCoord): void => {
    const { counterIds, fromAreaId, fromCoords, toAreaId, toCoord } = action.payload;

    if (toCoord === undefined || counterIds === undefined || counterIds.length === 0) {
        return;
    }

    if (fromAreaId !== toAreaId) {
        const fromStack = state.stackMap[fromAreaId];
        if (fromStack === undefined) {
            return;
        }
        fromStack.counterIds = fromStack.counterIds.filter(counterId => !counterIds.includes(counterId));

        let toStack = state.stackMap[toAreaId];
        if (toStack === undefined) {
            toStack = {
                id: toAreaId,
                counterIds: [...counterIds]
            };
            state.stackMap[toAreaId] = toStack;
        } else {
            toStack.counterIds.push(...counterIds);
        }
    }

    const counters = counterIds.map(counterId => state.counterMap[counterId]);

    counters.forEach(counter => {
        const movementCost = fromAreaId !== toAreaId ? 1 : 0;
        counter.coord = toCoord;
        if (fromAreaId !== toAreaId) {
            counter.usedMovementAllowance += movementCost;
            counter.areaId = toAreaId;
        }
    });
}

export const processPhaseComplete = (state: GameState, action: ActionPhaseComplete): void => {
    const { playerId } = action.payload;
    if (playerId === state.currentPlayerId) {
        const player = state.players.find(player => player.id === playerId);
        if (player) {
            player.turnStatus = PlayerTurnStatus.FINISHED;
        }
    }
}

export const processRefreshGame = (state: GameState, action: ActionRefreshGame): void => {
    state.refreshGame = action.payload;
}

export const processSelectArea = (state: GameState, action: ActionSelectArea): void => {
    const { areaId, clearSelectedCounterIds } = action.payload;
    state.currentAreaId = areaId;
    if (clearSelectedCounterIds) {
        state.selectedCounterIds = [];
    }
    state.statusMessage = undefined;
}

export const processSetStatusMessage = (state: GameState, action: ActionSetStatusMessage): void => {
    state.statusMessage = action.payload;
}

export const processSelectCounter = (state: GameState, action: ActionSelectCounter): void => {
    const counterId = action.payload;

    if (!state.selectedCounterIds) {
        state.selectedCounterIds = [];
    }

    if (state.selectedCounterIds.includes(counterId)) {
        state.selectedCounterIds = state.selectedCounterIds.filter(id => id !== counterId);
    } else {
        state.selectedCounterIds = [...state.selectedCounterIds, counterId];
    }
}

export const processUpdateClientCount = (state: GameState, action: ActionUpdateConnectedClientCount): void => {
    const count = action.payload;
    state.connectedClients = count;
}

//create builders
// const createNewStack = (id: string): Stack => {
//     return {
//         id,
//         counterIds: []
//     }
// }