import {
    AttackGroup,
    AttackGroupType,
    Counter,
    CounterMap,
    CounterType,
    GameState,
    Phase,
    PlayerTurnStatus,
    Replay,
    ReplayAttackElement,
    ReplayElements,
    ReplayMovementElement,
    Scenario,
    WeaponEffect,
    WeaponType,
} from "../shared/types/game-types";
import { isCrew, isMonster, isWeapon } from "../shared/utils/counter-utils";
import { getRandomIndex, roll6SidedDie, rollX6SidedDie, shuffleArray } from "../shared/utils/dice-utils";
import { readReplay, readScenario, writeReplay } from "../utils/file-utils";
import { ReplayType } from "../types/server-types";
import { checkEngagement } from "../shared/utils/movement-utils";
import { getMonsterImageName } from "../handlers/new-game-handler";

function blockingSleep(ms: number) {
    const sab = new SharedArrayBuffer(4);
    const int32 = new Int32Array(sab);
    Atomics.wait(int32, 0, 0, ms);
}

enum AttackResult {
    STUN = "STUN",
    KILL = "KILL",
    GROW = "GROW",
    SHRINK = "SHRINK",
    FRAGMENT = "FRAGMENT",
}

const convertMonsterCounter = (counter: Counter, newType: CounterType, scenario: Scenario): void => {
    const monsterTypeData = scenario.monsterSettings.monsterPropertyMap[newType];
    counter.type = newType;
    counter.movementAllowance = monsterTypeData.movementAllowance;
    counter.attackDice = monsterTypeData.attackDice;
    counter.constitution = monsterTypeData.constitution;
    counter.imageName = getMonsterImageName(parseInt(counter.id), newType, scenario.monsterSettings.monsterImageCountMap[newType]);
};

const updateAttackResults = (attackResults: { [key: string]: AttackResult[] }, counterId: string, result: AttackResult): void => {
    const existingResults = attackResults[counterId];
    if (existingResults) {
        existingResults.push(result);
    } else {
        attackResults[counterId] = [result];
    }
}

const hasResult = (attackResults: { [key: string]: AttackResult[] }, counterId: string, result: AttackResult): boolean => {
    const existingResults = attackResults[counterId];
    return existingResults && existingResults.includes(result);
};

const buildTargetBasedAttackGroups = (attackGroups: AttackGroup[]): { [key: string]: string[] } => {
    const targetGroups: { [key: string]: string[] } = {};

    attackGroups.forEach(attackGroup => {
        attackGroup.targetCounterIds.forEach(counterId => {
            if (!targetGroups[counterId]) {
                targetGroups[counterId] = [];
            }
            targetGroups[counterId].push(...attackGroup.attackingCounterIds);
        });
    });

    return targetGroups;
};

const createFragment = (id: number, scenario: Scenario): Counter => {
    const monsterTypeData = scenario.monsterSettings.monsterPropertyMap[CounterType.FRAGMENT];

    return {
        id: id.toString(),
        type: CounterType.FRAGMENT,
        name: `AGT-${id}`,
        movementAllowance: monsterTypeData.movementAllowance,
        attackDice: monsterTypeData.attackDice,
        constitution: monsterTypeData.constitution,
        imageName: getMonsterImageName(id, CounterType.EGG, scenario.monsterSettings.monsterImageCountMap[CounterType.EGG]),
        stunned: false,
        usedMovementAllowance: 0,
        engaged: false,
        spotted: false,
        moved: false,
        attacking: false
    }
};

export const crewAttack = (data: any, postMessage: (data: any) => void): void => {
    try {
        const gameState = data as GameState;
        const scenario = readScenario(gameState.scenarioId);

        const replayElements: ReplayElements = {
            movementElements: [] as ReplayMovementElement[],
            attackElements: [] as ReplayAttackElement[]
        };

        //gameState.replay = replayElements;

        console.log(
            `crewAttack: starting for game: ${data.id} phase: ${gameState.phase}`,
        );

        resetCounters(gameState);

        const attackGroups = gameState.attackGroups.filter((attackGroup) =>
            isValidAttackGroup(attackGroup),
        );

        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds: Set<string> = new Set();

        //handle grow
        attackGroups.forEach((attackGroup) => {
            attackGroup.attackingCounterIds.forEach(counterId => {
                const counter = gameState.counterMap[counterId];
                if (counter && isWeapon(counter) && gameState.weaponEffectMap[counter.weaponType!].effect === WeaponEffect.GROW) {
                    attackGroup.targetCounterIds.forEach((targetId) => {
                        if (hasResult(attackResults, targetId, AttackResult.GROW)) {
                            return;
                        }
                        const target = gameState.counterMap[targetId];
                        if (target) {
                            switch (target.type) {
                                case CounterType.BABY:
                                    updateAttackResults(attackResults, target.id, AttackResult.GROW);
                                    convertMonsterCounter(target, CounterType.ADULT, scenario);
                                    usedWeaponIds.add(counter.id);
                                    break;
                                case CounterType.EGG:
                                case CounterType.FRAGMENT:
                                    updateAttackResults(attackResults, target.id, AttackResult.GROW);
                                    convertMonsterCounter(target, CounterType.BABY, scenario);
                                    usedWeaponIds.add(counter.id);
                                    break;
                                default:
                                    break;
                            }
                        }
                    });
                }
            });
        });

        //handle shrink
        attackGroups.forEach((attackGroup) => {
            attackGroup.attackingCounterIds.forEach(counterId => {
                const counter = gameState.counterMap[counterId];
                if (counter && isWeapon(counter) && gameState.weaponEffectMap[counter.weaponType!].effect === WeaponEffect.SHRINK) {
                    attackGroup.targetCounterIds.forEach((targetId) => {
                        if (hasResult(attackResults, targetId, AttackResult.SHRINK) || hasResult(attackResults, targetId, AttackResult.KILL)) {
                            return;
                        }
                        usedWeaponIds.add(counter.id);
                        const target = gameState.counterMap[targetId];
                        if (target) {
                            switch (target.type) {
                                case CounterType.ADULT:
                                    updateAttackResults(attackResults, target.id, AttackResult.SHRINK);
                                    convertMonsterCounter(target, CounterType.BABY, scenario);
                                    break;

                                case CounterType.BABY:
                                case CounterType.FRAGMENT:
                                    updateAttackResults(attackResults, target.id, AttackResult.SHRINK);
                                    convertMonsterCounter(target, CounterType.EGG, scenario);
                                    break;
                                case CounterType.EGG:
                                    updateAttackResults(attackResults, target.id, AttackResult.KILL);
                                    break;
                                default:
                                    break;
                            }
                        }
                    });
                }
            });
        });

        //dice to kill
        const targetBasedAttackGroups = buildTargetBasedAttackGroups(attackGroups);
        const targetIds = Object.keys(targetBasedAttackGroups);
        targetIds.forEach(targetId => {
            if (hasResult(attackResults, targetId, AttackResult.KILL)) {
                return;
            }

            let totalDice = 0;
            const attackerIds = targetBasedAttackGroups[targetId];

            attackerIds.forEach(attackerId => {
                const attacker = gameState.counterMap[attackerId];
                if (isWeapon(attacker)) {
                    const weaponEffect = gameState.weaponEffectMap[attacker.weaponType!];
                    switch (weaponEffect.effect) {
                        case WeaponEffect.FIVE_DICE_TO_KILL:
                            usedWeaponIds.add(attacker.id);
                            totalDice += 5;
                            break;
                        case WeaponEffect.FOUR_DICE_TO_KILL:
                            usedWeaponIds.add(attacker.id);
                            totalDice += 4;
                            break;
                        case WeaponEffect.THREE_DICE_TO_KILL:
                            usedWeaponIds.add(attacker.id);
                            totalDice += 3;
                            break;
                    }
                } else {
                    totalDice += attacker.attackDice;
                }
            });

            const roll = rollX6SidedDie(totalDice);
            const target = gameState.counterMap[targetId];
            if (target && target.constitution && roll >= target.constitution) {
                updateAttackResults(attackResults, targetId, AttackResult.KILL);
            }
        });

        //one dice frag
        attackGroups.forEach((attackGroup) => {
            attackGroup.attackingCounterIds.forEach((counterId) => {
                const counter = gameState.counterMap[counterId];
                if (counter && isWeapon(counter) && gameState.weaponEffectMap[counter.weaponType!].effect === WeaponEffect.ONE_DIE_FRAGMENTS) {
                    attackGroup.targetCounterIds.forEach((targetId) => {
                        if (hasResult(attackResults, targetId, AttackResult.KILL)) {
                            return;
                        }
                        const target = gameState.counterMap[targetId];
                        if (target && isMonster(target)) {
                            usedWeaponIds.add(counter.id);
                            updateAttackResults(attackResults, targetId, AttackResult.FRAGMENT);
                            convertMonsterCounter(target, CounterType.FRAGMENT, scenario);
                            const roll = roll6SidedDie();
                            if (roll > 1) {
                                const areaId = target.areaId;
                                // if there is area attack group for the target's current area and it's not the current attack group
                                // then add the fragments to that attack group's target ids.
                                const areaAttackGroup = attackGroups.find(group => group.type === AttackGroupType.AREA && group.areaId === areaId && group.areaId !== attackGroup.areaId);
                                for (let i = 0; i < roll - 1; i++) {
                                    const fragment = createFragment(gameState.nextCounterId++, scenario);
                                    gameState.counterMap[fragment.id] = fragment;
                                    fragment.areaId = target.areaId;
                                    fragment.coord = target.coord;
                                    const stack = gameState.stackMap[target.areaId!];
                                    stack.counterIds.push(fragment.id);
                                    if (areaAttackGroup) {
                                        areaAttackGroup.targetCounterIds.push(fragment.id);
                                    }
                                }
                            }
                        }
                    });
                }
            });
        });

        //stun
        targetIds.forEach(targetId => {
            if (hasResult(attackResults, targetId, AttackResult.KILL)) {
                return;
            }

            let totalDice = 0;
            const attackerIds = targetBasedAttackGroups[targetId];

            attackerIds.forEach(attackerId => {
                const attacker = gameState.counterMap[attackerId];
                if (isWeapon(attacker)) {
                    const weaponEffect = gameState.weaponEffectMap[attacker.weaponType!];
                    switch (weaponEffect.effect) {
                        case WeaponEffect.FIVE_DICE_TO_STUN:
                            totalDice += 5;
                            usedWeaponIds.add
                            break;
                    }
                }
            });

            const roll = rollX6SidedDie(totalDice);
            const target = gameState.counterMap[targetId];
            if (target && target.constitution && roll >= target.constitution) {
                updateAttackResults(attackResults, targetId, AttackResult.STUN);
            }
        });

        updateWeaponEffects(gameState, usedWeaponIds);
        updateNonReusableWeapons(gameState, usedWeaponIds, scenario);
        handleDroppedWeapons(gameState, attackResults, scenario);

        gameState.attackGroups = [];
        gameState.phase = Phase.CREW_ATTACK_REPLAY;
        gameState.players.forEach((player) => {
            player.turnStatus = PlayerTurnStatus.STARTED;
        });

        postMessage({
            status: "notifyClient",
            payload: { gameId: gameState.id, gameState },
        });
        postMessage({ status: "done", payload: { gameId: gameState.id } });
    } catch (error) {
        console.error(`crewAttack: error for game: ${data.id}`, error);
        postMessage({ status: "error", payload: { gameId: data.id, error } });
    }
};

export const handleDroppedWeapons = (gameState: GameState, attackResults: { [key: string]: AttackResult[] }, scenario: Scenario) => {
    const keys = Object.keys(attackResults);
    keys.forEach(key => {
        const counter = gameState.counterMap[key];
        if (counter && isCrew(counter) && hasResult(attackResults, key, AttackResult.KILL) && counter.weaponCounterId) {
            const areaId = counter.areaId;
            const stack = gameState.stackMap[areaId!];
            const weapon = gameState.counterMap[counter.weaponCounterId];
            weapon.areaId = areaId;
            weapon.coord = counter.coord;
            stack.counterIds.push(counter.weaponCounterId);
            counter.weaponCounterId = undefined;
        }
    });
};

export const updateWeaponEffects = (gameState: GameState, usedWeaponIds: Set<string>) => {
    usedWeaponIds.forEach(counterId => {
        const counter = gameState.counterMap[counterId];
        if (counter && isWeapon(counter)) {
            const effectEntry = gameState.weaponEffectMap[counter.weaponType!];
            if (effectEntry && !effectEntry.discovered) {
                effectEntry.discovered = true;
            }
        }
    });
};

export const updateNonReusableWeapons = (gameState: GameState, usedWeaponIds: Set<string>, scenario: Scenario) => {
    usedWeaponIds.forEach(counterId => {
        const counter = gameState.counterMap[counterId];
        if (counter && isWeapon(counter)) {
            const weaponData = scenario.weaponMap[counter.weaponType!];
            if (weaponData && !weaponData.reuseable) {
                const ownerCounter = gameState.counterMap[counter.ownerCounterId!];
                ownerCounter.weaponCounterId = undefined;
                counter.ownerCounterId = undefined;

                const areas = Object.values(scenario.board.areaDefinitionMap);
                const possibleArea = areas.filter(area => area.weaponStacks.some(weaponStack => weaponStack.type === counter.weaponType));
                if (possibleArea.length > 0) {
                    const area = possibleArea[getRandomIndex(possibleArea.length)];
                    const weaponStack = area.weaponStacks.find(weaponStack => weaponStack.type === counter.weaponType);
                    if (!weaponStack) {
                        return;
                    }
                    counter.coord = weaponStack.coord;
                    counter.areaId = area.id;
                    let stack = gameState.stackMap[area.id];
                    if (stack) {
                        stack.counterIds.push(counter.id);
                    } else {
                        stack = {
                            id: area.id,
                            counterIds: [counter.id]
                        };
                        gameState.stackMap[area.id] = stack;
                    }
                }
            }
        }
    });
};

export const isValidAttackGroup = (attackGroup: AttackGroup): boolean => {
    return (
        attackGroup.attackingCounterIds.length > 0 &&
        attackGroup.targetCounterIds.length > 0
    );
};



// if (gameState.phase === Phase.MOVE) {
//     const replayMovementElements = executeMovementPhase(gameState);
//     console.log(`Created ${replayMovementElements.length} replay movement elements for game ${gameState.id}`);
//     replayElements.movementElements = replayMovementElements;
// } else {
//     const replayAttackElements = executeAttackPhaseActions(gameState);
//     console.log(`Created ${replayAttackElements.length} replay attack elements`);
//     replayElements.attackElements = replayAttackElements;
// }

//resetCounters(gameState); //don't clear crew that was just stunned in this attack (collateral); need second flag; we want to keep the stunned from prior to the attack for display in th replay? maybe not, move to start of task?

// gameState.turn = gameState.phase === Phase.MOVE ? gameState.turn : gameState.turn + 1;
// gameState.phase = gameState.phase === Phase.MOVE ? Phase.ATTACK : Phase.MOVE;
// gameState.players.forEach(player => {
//     player.turnStatus = PlayerTurnStatus.STARTED;
// });

// const postReplay: Replay = {
//     startingState: preReplay.startingState,
//     activeState: preReplay.startingState,
//     replayElements,
//     index: -1,
//     playing: false,
//     show: false
// };
// writeReplay(gameState.id, postReplay, ReplayType.POST);

// preReplay.startingState.counterMap = gameState.counterMap;
// preReplay.startingState.stackMap = gameState.stackMap;
// writeReplay(gameState.id, preReplay, ReplayType.PRE);

const resetCounters = (gameState: GameState) => {
    console.log(`Resetting counters for game ${gameState.id}`);
    const counters = Object.values(gameState.counterMap);
    counters.forEach((counter) => {
        if (isCrew(counter)) {
            counter.usedMovementAllowance = 0;
            counter.stunned = false;
            counter.engaged = false;
        }
    });
};

// const executeAttackPhaseActions = (gameState: GameState): ReplayAttackElement[] => {
//     console.log(`Executing attack phase for game ${gameState.id}`);

//     //clear engaged flag for all counters
//     Object.values(gameState.counterMap).forEach(counter => {
//         counter.engaged = false;
//     });
//     return [];
// }

// const executeMovementPhase = (gameState: GameState): ReplayMovementElement[] => {
//     console.log(`Executing movement phase for game ${gameState.id}`);
//     const replayMovementElements: ReplayMovementElement[] = [];
//     //const crewAndMonsterCounters = Object.values(gameState.counterMap).filter(counter => !isWeapon(counter));
//     const crewAndMonsterCounters = Object.values(gameState.counterMap);
//     crewAndMonsterCounters.forEach(counter => {
//         counter.engaged = false;
//     });

//process drop actions first
// const countersWithDropActions = crewAndMonsterCounters.filter(counter => counter.actions.some(action => action.type === ActionType.DROP_WEAPON));
// console.log(`Counters with drop actions: ${countersWithDropActions.length}`);
// countersWithDropActions.forEach(counter => {
//     console.log(`Counter ${counter.id} has drop action`)
//     const action = counter.actions.find(action => action.type === ActionType.DROP_WEAPON);
//     console.log(`Drop action: ${JSON.stringify(action)}`)
//     if (action) {
//         const dropAction = action as ActionDropWeapon;
//         processDropWeapon(gameState, dropAction);
//         const replayMovementElement: ReplayMovementElement = {
//             type: ActionType.DROP_WEAPON,
//             counterId: dropAction.payload.crewCounterId,
//             fromAreaId: dropAction.payload.fromAreaId,
//             fromCoord: dropAction.payload.fromCoord,
//             weaponCounterId: dropAction.payload.weaponCounterId,
//             movementCost: dropAction.payload.movementCost,
//             engagedData: {},
//             spottedData: {}
//         };
//         replayMovementElements.push(replayMovementElement);
//     }
// });

//process grab actions second
// const countersWithGrabActions = crewAndMonsterCounters.filter(counter => counter.actions.some(action => action.type === ActionType.GRAB_WEAPON));
// console.log(`Counters with grab actions: ${countersWithGrabActions.length}`);
// countersWithGrabActions.forEach(counter => {
//     console.log(`Counter ${counter.id} has grab action`)
//     const action = counter.actions.find(action => action.type === ActionType.GRAB_WEAPON);
//     console.log(`Grab action: ${JSON.stringify(action)}`)
//     if (action) {
//         const grabAction = action as ActionGrabWeapon;
//         processGrabWeapon(gameState, grabAction);
//         const replayMovementElement: ReplayMovementElement = {
//             type: ActionType.GRAB_WEAPON,
//             counterId: grabAction.payload.crewCounterId,
//             fromAreaId: grabAction.payload.fromAreaId,
//             fromCoord: grabAction.payload.fromCoord,
//             weaponCounterId: grabAction.payload.weaponCounterId,
//             movementCost: grabAction.payload.movementCost,
//             engagedData: {},
//             spottedData: {}
//         };
//         replayMovementElements.push(replayMovementElement);
//     }
// });

//process lay egg actions third
// const countersWithLayEggActions = crewAndMonsterCounters.filter(counter => counter.actions.some(action => action.type === ActionType.LAY_EGG));
// console.log(`Counters with lay egg actions: ${countersWithLayEggActions.length}`);
// countersWithLayEggActions.forEach(counter => {
//     console.log(`Counter ${counter.id} has lay egg action`)
//     const action = counter.actions.find(action => action.type === ActionType.LAY_EGG);
//     console.log(`Lay egg action: ${JSON.stringify(action)}`)
//     if (action) {
//         const layEggAction = action as ActionLayEgg;
//         processLayEgg(gameState, layEggAction);
//         const replayMovementElement: ReplayMovementElement = {
//             type: ActionType.LAY_EGG,
//             counterId: layEggAction.payload.counterId,
//             fromAreaId: layEggAction.payload.fromAreaId,
//             fromCoord: layEggAction.payload.fromCoord,
//             weaponCounterId: undefined,
//             movementCost: 0,
//             engagedData: {},
//             spottedData: {},
//             newCounterId: layEggAction.payload.newCounterId,
//             movementAllowance: layEggAction.payload.movementAllowance,
//             attackDice: layEggAction.payload.attackDice,
//             constitution: layEggAction.payload.constitution,
//             imageName: layEggAction.payload.imageName
//         };
//         replayMovementElements.push(replayMovementElement);
//     }
// });

//process grow monster actions fourth
// const countersWithGrowMonsterActions = crewAndMonsterCounters.filter(counter => counter.actions.some(action => action.type === ActionType.GROW_MONSTER));
// console.log(`Counters with grow monster actions: ${countersWithGrowMonsterActions.length}`);
// countersWithGrowMonsterActions.forEach(counter => {
//     console.log(`Counter ${counter.id} has grow monster action`)
//     const action = counter.actions.find(action => action.type === ActionType.GROW_MONSTER);
//     console.log(`Grow monster action: ${JSON.stringify(action)}`)
//     if (action) {
//         const growMonsterAction = action as ActionGrowMonster;
//         processGrowMonster(gameState, growMonsterAction);
//         const replayMovementElement: ReplayMovementElement = {
//             type: ActionType.GROW_MONSTER,
//             counterId: growMonsterAction.payload.counterId,
//             fromAreaId: growMonsterAction.payload.fromAreaId,
//             fromCoord: growMonsterAction.payload.fromCoord,
//             weaponCounterId: undefined,
//             movementCost: 0,
//             engagedData: {},
//             spottedData: {},
//             nextType: growMonsterAction.payload.nextType,
//             movementAllowance: growMonsterAction.payload.movementAllowance,
//             attackDice: growMonsterAction.payload.attackDice,
//             constitution: growMonsterAction.payload.constitution,
//             imageName: growMonsterAction.payload.imageName
//         };
//         replayMovementElements.push(replayMovementElement);
//     }
// });

//process all actions but will basically ignore the drops/grabs since they have already been processed
// let processedAction = true;
// let index = 0;
// let count = 0;
// while (processedAction && count < 10) {
//     ++count;
//     processedAction = false;
// console.log(`Processing action index ${index}`);
// for (let i = 0; i < crewAndMonsterCounters.length; i++) {
//     const counter = crewAndMonsterCounters[i];
//     if (!counter.engaged && counter.actions && counter.actions.length > index) {
//         console.log(`Counter ${counter.id} has ${counter.actions.length} actions`);
//         processedAction = true;
//         const action = counter.actions[index];
//         console.log(`processing action ${index} for counter ${counter.id}`);
//         if (action.type === ActionType.MOVE_TO_COORD) {
//             const moveToAction = action as ActionMoveToCoord;
//             processMoveToCoord(gameState, moveToAction);
//             const index = moveToAction.payload.counterIds.indexOf(counter.id);
//             const replayMovementElement: ReplayMovementElement = {
//                 type: ActionType.MOVE_TO_COORD,
//                 counterId: counter.id,
//                 fromAreaId: moveToAction.payload.fromAreaId,
//                 fromCoord: moveToAction.payload.fromCoords[index],
//                 toAreaId: moveToAction.payload.toAreaId,
//                 toCoord: moveToAction.payload.toCoord,
//                 weaponCounterId: undefined,
//                 engagedData: {},
//                 spottedData: {},
//                 movementCost: moveToAction.payload.movementCost
//             };
//             replayMovementElements.push(replayMovementElement);

//             const engagedCounterIds = checkEngagement(gameState.counterMap[counter.id].areaId, counter.type, gameState.counterMap, gameState.stackMap);
//             console.log(`Engaged counters: ${engagedCounterIds.length}`);
//             if (engagedCounterIds.length > 0) {
//                 engagedCounterIds.push(counter.id);

//                 replayMovementElement.engagedData =
//                     engagedCounterIds.reduce((acc: { [key: string]: boolean }, key: string) => {
//                         acc[key] = true;
//                         return acc;
//                     }, {} as { [key: string]: boolean });

//                 engagedCounterIds.forEach(engagedCounterId => {
//                     console.log(`Engaged counter: ${engagedCounterId}`);
//                     const activeCounter = gameState.counterMap[engagedCounterId];
//                     activeCounter.engaged = true;

//                     // const planningCounter = currentCrewAndMonsterCounters.find(counter => counter.id === engagedCounterId);
//                     // if (planningCounter && planningCounter.actions && planningCounter.actions.length - 1 > index) {
//                     //     planningCounter.actions.splice(index + 1);
//                     // }
//                 });
//             }
//         }
//     }
// }

// if (processedAction) {
//     shuffleArray(crewAndMonsterCounters);
//     index++;
// }
//  }
//     return replayMovementElements;
// }

//need function to determine spotted status of areas
//will call before a move to coord and after in order to create delta of counters in the areas for the replay element.
