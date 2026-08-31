import cloneDeep from "lodash.clonedeep";
import { AttackGroup, Counter, CounterType, GameState, Phase, PlayerTurnStatus } from "../../../shared/types/game-types";
import {
    Action, ActionAddCountersToAttackGroup, ActionCreateAttackGroup, ActionDeleteAttackGroup, ActionDeselectCounter, ActionDropWeapon,
    ActionGrabWeapon, ActionGrowMonster, ActionLayEgg, ActionMoveToCoord, ActionNextPhase, ActionPhaseComplete, ActionRefreshGame, ActionRemoveCountersFromAttackGroup, 
    ActionSelectArea, ActionSelectCounter,
    ActionSetStatusMessage, ActionType, ActionUpdateConnectedClientCount,
    SelectLocationMode
} from "../../types/action-types";
import { isCrew } from "../../utils/counter-utils";
import { randomUUID } from 'crypto';

export const processCreateAttackGroup = (state: GameState, action: ActionCreateAttackGroup): void => {
    const { areaId, type: attackGroupType, attackGroupId, attackingCounterIds, targetCounterIds } = action.payload;
    const attackGroup: AttackGroup = {
        id: attackGroupId,
        areaId,
        type: attackGroupType,
        targetCounterIds: targetCounterIds || [],
        attackingCounterIds: attackingCounterIds || [],
        collateralCounterIds: [],
        goalDice: 0,
        dice: 0
    };

    state.attackGroups.push(attackGroup);
}

export const processDeleteAttackGroup = (state: GameState, action: ActionDeleteAttackGroup): void => {
    const { attackGroupId } = action.payload;
    state.attackGroups = state.attackGroups.filter(group => group.id !== attackGroupId);
}

export const processRemoveCountersFromAttackGroup = (state: GameState, action: ActionRemoveCountersFromAttackGroup): void => {
    const { attackGroupId, counterIds } = action.payload;
    const attackGroup = state.attackGroups.find(group => group.id === attackGroupId);
    if (attackGroup) {
        attackGroup.targetCounterIds = attackGroup.targetCounterIds.filter(id => !counterIds.includes(id));
        attackGroup.attackingCounterIds = attackGroup.attackingCounterIds.filter(id => !counterIds.includes(id));
        attackGroup.collateralCounterIds = attackGroup.collateralCounterIds.filter(id => !counterIds.includes(id));
    }
}

export const processAddCountersToAttackGroup = (state: GameState, action: ActionAddCountersToAttackGroup): void => {
    const { attackGroupId, targetCounterIds, attackingCounterIds, collateralCounterIds } = action.payload;
    const attackGroup = state.attackGroups.find(group => group.id === attackGroupId);
    if (attackGroup) {
        if (targetCounterIds && targetCounterIds.length > 0) {
            attackGroup.targetCounterIds.push(...targetCounterIds);
        }
        if (attackingCounterIds && attackingCounterIds.length > 0) {
            attackGroup.attackingCounterIds.push(...attackingCounterIds);
        }
        if (collateralCounterIds && collateralCounterIds.length > 0) {
            collateralCounterIds.forEach(id => {
                if (!attackGroup.collateralCounterIds.includes(id)) {
                    attackGroup.collateralCounterIds.push(id);
                }
            });
        }
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

    //crewCounter.actions.push(action);
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

// export const processAddAction = (state: GameState, action: ActionAddAction): void => {
//     const { counterIds, actionToAdd } = action.payload;

//     const counters = counterIds.map(counterId => state.counterMap[counterId]);

//     counters.forEach((counter, index) => {
//         switch (actionToAdd.type) {
//             case ActionType.MOVE_TO_COORD: {
//                 const moveToCoordAction = actionToAdd as ActionMoveToCoord;
//                 const singleCounterAction: ActionMoveToCoord = {
//                     type: ActionType.MOVE_TO_COORD,
//                     payload: {
//                         counterIds: [counter.id],
//                         fromAreaId: moveToCoordAction.payload.fromAreaId,
//                         fromCoords: [moveToCoordAction.payload.fromCoords[index]],
//                         toAreaId: moveToCoordAction.payload.toAreaId,
//                         toCoord: moveToCoordAction.payload.toCoord,
//                         movementCost: moveToCoordAction.payload.movementCost
//                     }
//                 };
//                 counter.actions.push(singleCounterAction);
//                 break;
//             }
//             case ActionType.GRAB_WEAPON: {
//                 counter.actions.push(actionToAdd);
//                 break;
//             }
//             case ActionType.DROP_WEAPON: {
//                 counter.actions.push(actionToAdd);
//                 break;
//             }
//             case ActionType.GROW_MONSTER: {
//                 //counter.actions.push(actionToAdd);
//                 break;
//             }
//             case ActionType.LAY_EGG: {
//                 //counter.actions.push(actionToAdd);
//                 break;
//             }
//         }
//     });
// }

export const processGrowMonster = (state: GameState, action: ActionGrowMonster): void => {
    const { counterId, nextType, movementAllowance, attackDice, constitution, imageName } = action.payload;

    const counter = state.counterMap[counterId];
    counter.movementAllowance = movementAllowance;
    counter.attackDice = attackDice;
    counter.constitution = constitution;
    counter.imageName = imageName;
    counter.type = nextType;
}

export const processLayEgg = (state: GameState, action: ActionLayEgg): void => {
    const { counterId, newCounterId, movementAllowance, attackDice, constitution, imageName, fromAreaId, fromCoord } = action.payload;

    //const parentCounter = state.counterMap[counterId];

    const newCounter: Counter = {
        id: newCounterId.toString(),
        name: `AGT-${newCounterId}`,
        type: CounterType.EGG,
        areaId: fromAreaId,
        coord: fromCoord,
        stunned: false,
        movementAllowance: movementAllowance,
        attackDice: attackDice,
        constitution: constitution,
        imageName: imageName,
        usedMovementAllowance: 0,
        ///actions: [],
        engaged: false,
        spotted: false,
        moved: false,
        attacking: false,
        killed: false
    };

    state.counterMap[newCounter.id] = newCounter;

    const stack = state.stackMap[newCounter.areaId!];
    if (stack) {
        stack.counterIds.push(newCounter.id);
    }
}

export const processMoveToCoord = (state: GameState, action: ActionMoveToCoord): void => {
    const { counterIds, fromAreaId, fromCoords, toAreaId, toCoord, movementCost, engaged } = action.payload;

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

    counterIds.forEach(counterId => {
        const counter = state.counterMap[counterId];
        counter.coord = toCoord;
        if (fromAreaId !== toAreaId) {
            counter.usedMovementAllowance += movementCost;
            counter.areaId = toAreaId;
            counter.engaged = engaged;
        }
    });
}

export const processPhaseComplete = (state: GameState, action: ActionPhaseComplete): void => {
    const { playerId } = action.payload;
    const player = state.players.find(player => player.id === playerId);
    if (player) {
        player.turnStatus = PlayerTurnStatus.FINISHED;
    }
}

export const processNextPhase = (state: GameState, action: ActionNextPhase): void => {
    const { phase, playerStatus } = action.payload;

    if (phase === Phase.GRAB_WEAPON) {
        state.turn += 1;
    }

    state.phase = phase;

    state.players.forEach(player => {
        player.turnStatus = playerStatus;
    });
}

export const processRefreshGame = (state: GameState, action: ActionRefreshGame): void => {
    state.refreshGame = action.payload;
}

export const processSelectTargetArea = (state: GameState, action: ActionSelectArea): void => {
    const { areaId } = action.payload;
    state.currentTargetAreaId = areaId;
    state.statusMessage = undefined;
}

export const processSelectArea = (state: GameState, action: ActionSelectArea): void => {
    const { areaId, clearSelectedCounterIds, selectMode } = action.payload;
    state.currentAreaId = areaId;
    if (clearSelectedCounterIds) {
        state.selectedCounterIds = [];
        if (selectMode === SelectLocationMode.DOUBLE) {
            const stack = state.stackMap[areaId];
            if (stack && stack.counterIds.length > 0) {
                stack.counterIds.forEach(counterId => {
                    const counter = state.counterMap[counterId];
                    if (counter && isCrew(counter) && counter.playerId === state.currentPlayerId) {
                        state.selectedCounterIds.push(counterId);
                    }
                });
            }
        }
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

// export const processUpdateCrewAttackPlans = (state: GameState, action: ActionUpdateCrewAttackPlans): void => {
//     const { actions } = action.payload;
//     //state.crewAttackPlans = actions;
// }

// export const processUpdateMonsterPlans = (state: GameState, action: ActionUpdateMonsterPlans): void => {
//     const { actionsMap, nextCounterId } = action.payload;
//     Object.entries(actionsMap).forEach(([monsterId, actions]) => {
//         const monster = state.counterMap[monsterId];
//         if (monster) {
//             monster.actions = actions as Action[];
//         }
//     });
//     state.nextCounterId = parseInt(nextCounterId);
// }

export const processUpdateClientCount = (state: GameState, action: ActionUpdateConnectedClientCount): void => {
    const count = action.payload;
    state.connectedClients = count;
}

export const processLoadGame = (state: GameState, data: GameState): GameState => {
    if (data.replay && data.replay.activeState === undefined) {
        if (data.phase === 'CREW_ATTACK_REPLAY' || data.phase === 'MONSTER_ATTACK_REPLAY') {
            data.replay.activeState = cloneDeep({
                counterMap: data.counterMap,
                stackMap: data.stackMap
            });
        } else {
            data.replay.activeState = cloneDeep(data.replay.startingState);
        }
    }
    
    return data;
}

//create builders
// const createNewStack = (id: string): Stack => {
//     return {
//         id,
//         counterIds: []
//     }
// }