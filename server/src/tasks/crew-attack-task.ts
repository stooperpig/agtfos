import {
    AttackGroup, AttackGroupType, AttackResult, Counter, CounterMap, CounterType, GameState, Phase, PlayerTurnStatus,
    ReplayAttackElement, Scenario, StackMap, WeaponEffect, WeaponEffectEntry,
    WeaponType
} from "../shared/types/game-types";
import { isCrew, isMonster, isWeapon } from "../shared/utils/counter-utils";
import { getRandomIndex, roll6SidedDie, rollX6SidedDie } from "../shared/utils/dice-utils";
import { readScenario } from "../utils/file-utils";
import { getMonsterImageName } from "../handlers/new-game-handler";
import { createReplay } from "../utils/game-utils";

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

const buildTargetBasedAttackingIds = (attackGroups: AttackGroup[], collateral: boolean = false): { [key: string]: string[] } => {
    const targetGroups: { [key: string]: string[] } = {};

    attackGroups.forEach(attackGroup => {
        if (collateral) {
            if (!attackGroup.collateralCounterIds || attackGroup.collateralCounterIds.length === 0) {
                return;
            }

            attackGroup.collateralCounterIds.forEach(targetCounterId => {
                if (!targetGroups[targetCounterId]) {
                    targetGroups[targetCounterId] = [...attackGroup.attackingCounterIds];
                } else {
                    targetGroups[targetCounterId].push(...attackGroup.attackingCounterIds);
                }
            });
        } else {
            attackGroup.targetCounterIds.forEach(targetCounterId => {
                if (!targetGroups[targetCounterId]) {
                    targetGroups[targetCounterId] = [...attackGroup.attackingCounterIds];
                } else {
                    targetGroups[targetCounterId].push(...attackGroup.attackingCounterIds);
                }
            });
        }
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
        imageName: getMonsterImageName(id, CounterType.FRAGMENT, scenario.monsterSettings.monsterImageCountMap[CounterType.FRAGMENT]),
        stunned: false,
        usedMovementAllowance: 0,
        engaged: false,
        spotted: false,
        moved: false,
        attacking: false,
        killed: false
    }
};

export const updateReplayElements = (replayAttackElements: ReplayAttackElement[], areaId: string, attackingCounterIds: string[], targetCounterIds: string[], attackResult: AttackResult, numberOfDice: number, roll: number, message: string): void => {
    const replayAttackElement: ReplayAttackElement = {
        areaId: areaId,
        attackingCounterIds: attackingCounterIds,
        targetCounterIds: targetCounterIds,
        result: {
            attackResult,
            numberOfDice: numberOfDice,
            roll: roll,
            message: message
        }
    };
    replayAttackElements.push(replayAttackElement);
}

export const handleGrowAttacks = (attackReplayElements: ReplayAttackElement[], attackGroups: AttackGroup[], counterMap: CounterMap, weaponEffectMap: { [key: string]: WeaponEffectEntry },
    attackResults: { [key: string]: AttackResult[] }, scenario: Scenario, usedWeaponIds: Set<string>): void => {
    console.log("handleGrowAttacks");
    attackGroups.forEach((attackGroup) => {
        attackGroup.attackingCounterIds.forEach(counterId => {
            const counter = counterMap[counterId];
            if (counter && isWeapon(counter) && weaponEffectMap[counter.weaponType!].effect === WeaponEffect.GROW) {
                attackGroup.targetCounterIds.forEach((targetId) => {
                    if (hasResult(attackResults, targetId, AttackResult.GROW)) {
                        return;
                    }
                    const target = counterMap[targetId];
                    if (target) {
                        switch (target.type) {
                            case CounterType.BABY:
                                updateAttackResults(attackResults, target.id, AttackResult.GROW);
                                convertMonsterCounter(target, CounterType.ADULT, scenario);
                                usedWeaponIds.add(counter.id);
                                updateReplayElements(attackReplayElements, target.areaId!, [counterId], attackGroup.targetCounterIds, AttackResult.GROW, 0, 0, "Bitch be grown");
                                break;
                            case CounterType.EGG:
                            case CounterType.FRAGMENT:
                                updateAttackResults(attackResults, target.id, AttackResult.GROW);
                                convertMonsterCounter(target, CounterType.BABY, scenario);
                                usedWeaponIds.add(counter.id);
                                updateReplayElements(attackReplayElements, target.areaId!, [counterId], attackGroup.targetCounterIds, AttackResult.GROW, 0, 0, "Bitch be grown");
                                break;
                            default:
                                break;
                        }
                    }
                });
            }
        });
    });
}

export const handleShrinkAttacks = (attackReplayElements: ReplayAttackElement[], attackGroups: AttackGroup[], counterMap: CounterMap, weaponEffectMap: { [key: string]: WeaponEffectEntry },
    attackResults: { [key: string]: AttackResult[] }, scenario: Scenario, usedWeaponIds: Set<string>): void => {
    console.log("handleShrinkAttacks");
    attackGroups.forEach((attackGroup) => {
        attackGroup.attackingCounterIds.forEach(counterId => {
            const counter = counterMap[counterId];
            if (counter && isWeapon(counter) && weaponEffectMap[counter.weaponType!].effect === WeaponEffect.SHRINK) {
                attackGroup.targetCounterIds.forEach((targetId) => {
                    if (hasResult(attackResults, targetId, AttackResult.SHRINK) || hasResult(attackResults, targetId, AttackResult.KILL)) {
                        return;
                    }
                    usedWeaponIds.add(counter.id);
                    const target = counterMap[targetId];
                    if (target) {
                        switch (target.type) {
                            case CounterType.ADULT:
                                updateAttackResults(attackResults, target.id, AttackResult.SHRINK);
                                convertMonsterCounter(target, CounterType.BABY, scenario);
                                updateReplayElements(attackReplayElements, target.areaId!, [counterId], attackGroup.targetCounterIds, AttackResult.SHRINK, 0, 0, "Bitch be shrunken");
                                break;

                            case CounterType.BABY:
                            case CounterType.FRAGMENT:
                                updateAttackResults(attackResults, target.id, AttackResult.SHRINK);
                                convertMonsterCounter(target, CounterType.EGG, scenario);
                                updateReplayElements(attackReplayElements, target.areaId!, [counterId], attackGroup.targetCounterIds, AttackResult.SHRINK, 0, 0, "Bitch be shrunken");
                                break;
                            case CounterType.EGG:
                                updateAttackResults(attackResults, target.id, AttackResult.KILL);
                                updateReplayElements(attackReplayElements, target.areaId!, [counterId], attackGroup.targetCounterIds, AttackResult.SHRINK, 0, 0, "Bitch be shrunken");
                                break;
                            default:
                                break;
                        }
                    }
                });
            }
        });
    });
}

export const handleToKillAttacks = (attackReplayElements: ReplayAttackElement[], attackGroups: AttackGroup[], counterMap: CounterMap, weaponEffectMap: { [key: string]: WeaponEffectEntry },
    attackResults: { [key: string]: AttackResult[] }, usedWeaponIds: Set<string>): void => {
    console.log("handleToKillAttacks");
    let targetBasedAttackingIds = buildTargetBasedAttackingIds(attackGroups);
    let targetIds = Object.keys(targetBasedAttackingIds);
    targetIds.forEach(targetId => {
        if (hasResult(attackResults, targetId, AttackResult.KILL)) {
            return;
        }

        let totalDice = 0;
        const attackingIds = targetBasedAttackingIds[targetId];
        if (!attackingIds || attackingIds.length === 0) {
            return;
        }

        const actualAttackingIds: string[] = [];
        let alreadyHasGasGrenadeAttack = false;

        attackingIds.forEach(attackerId => {
            const attacker = counterMap[attackerId];
            if (isWeapon(attacker)) {
                if (attacker.weaponType === WeaponType.GAS_GRENADE) {
                    if (alreadyHasGasGrenadeAttack) {
                        return;
                    }
                    alreadyHasGasGrenadeAttack = true;
                }
                const weaponEffect = weaponEffectMap[attacker.weaponType!];
                switch (weaponEffect.effect) {
                    case WeaponEffect.FIVE_DICE_TO_KILL:
                        usedWeaponIds.add(attacker.id);
                        actualAttackingIds.push(attackerId);
                        totalDice += 5;
                        break;
                    case WeaponEffect.FOUR_DICE_TO_KILL:
                        usedWeaponIds.add(attacker.id);
                        actualAttackingIds.push(attackerId);
                        totalDice += 4;
                        break;
                    case WeaponEffect.THREE_DICE_TO_KILL:
                        usedWeaponIds.add(attacker.id);
                        actualAttackingIds.push(attackerId);
                        totalDice += 3;
                        break;
                }
            } else {
                totalDice += attacker.attackDice;
                actualAttackingIds.push(attackerId);
            }
        });

        const roll = rollX6SidedDie(totalDice);
        const target = counterMap[targetId];
        if (roll >= target.constitution) {
            updateAttackResults(attackResults, targetId, AttackResult.KILL);
            target.killed = true;
            updateReplayElements(attackReplayElements, target.areaId!, actualAttackingIds, [targetId], AttackResult.KILL, totalDice, roll, "Bitch be dead");
        } else if (actualAttackingIds.length > 0) {
            updateReplayElements(attackReplayElements, target.areaId!, actualAttackingIds, [targetId], AttackResult.NO_EFFECT, totalDice, roll, "No Effect from kill attack");
        }
    });

    targetBasedAttackingIds = buildTargetBasedAttackingIds(attackGroups, true);
    targetIds = Object.keys(targetBasedAttackingIds);
    targetIds.forEach(targetId => {
        if (hasResult(attackResults, targetId, AttackResult.KILL)) {
            return;
        }

        const actualAttackingIds: string[] = [];
        const attackingIds = targetBasedAttackingIds[targetId];
        let totalDice = 0;
        attackingIds.forEach(attackerId => {
            const attacker = counterMap[attackerId];
            if (attacker.weaponType === WeaponType.CAN_OF_ROCKET_FUEL) {
                actualAttackingIds.push(attacker.id);
                totalDice += 5;
            }
        });

        if (actualAttackingIds.length > 0) {
            const roll = rollX6SidedDie(totalDice);
            const target = counterMap[targetId];
            if (roll >= target.constitution) {
                updateAttackResults(attackResults, targetId, AttackResult.KILL);
                target.collaterallyStunned = true;
                updateReplayElements(attackReplayElements, target.areaId!, actualAttackingIds, [targetId], AttackResult.KILL, totalDice, roll, "Crew be killed");
            } else if (actualAttackingIds.length > 0) {
                updateReplayElements(attackReplayElements, target.areaId!, actualAttackingIds, [targetId], AttackResult.NO_EFFECT, 5, roll, "No Effect from stun attack");
            }
        }
    });
}

export const handleFragmentationAttacks = (attackReplayElements: ReplayAttackElement[], attackGroups: AttackGroup[], counterMap: CounterMap, weaponEffectMap: { [key: string]: WeaponEffectEntry },
    attackResults: { [key: string]: AttackResult[] }, scenario: Scenario, usedWeaponIds: Set<string>, nextCounterId: number, stackMap: StackMap): number => {
    let returnValue = nextCounterId;
    console.log("handleFragmentationAttacks");
    attackGroups.forEach((attackGroup) => {
        attackGroup.attackingCounterIds.forEach((counterId) => {
            const counter = counterMap[counterId];
            if (counter && isWeapon(counter) && weaponEffectMap[counter.weaponType!].effect === WeaponEffect.ONE_DIE_FRAGMENTS) {
                attackGroup.targetCounterIds.forEach((targetId) => {
                    if (hasResult(attackResults, targetId, AttackResult.KILL) || hasResult(attackResults, targetId, AttackResult.FRAGMENT)) {
                        return;
                    }
                    const target = counterMap[targetId];
                    if (target && isMonster(target)) {
                        usedWeaponIds.add(counter.id);
                        updateAttackResults(attackResults, targetId, AttackResult.FRAGMENT);
                        convertMonsterCounter(target, CounterType.FRAGMENT, scenario);
                        const roll = roll6SidedDie();
                        if (roll > 1) {
                            const areaId = target.areaId;
                            // if there is area attack group for the target's current area and it's not the current attack group
                            // then add the fragments to that attack group's target ids.
                            const otherAreaAttackGroups = attackGroups.filter(group => group.type === AttackGroupType.AREA && group.areaId === areaId && group.areaId !== attackGroup.areaId);
                            for (let i = 0; i < roll - 1; i++) {
                                const fragment = createFragment(returnValue++, scenario);
                                counterMap[fragment.id] = fragment;
                                fragment.areaId = target.areaId;
                                fragment.coord = target.coord;
                                const stack = stackMap[target.areaId!];
                                stack.counterIds.push(fragment.id);
                                if (otherAreaAttackGroups.length > 0) {
                                    otherAreaAttackGroups.forEach(group => group.targetCounterIds.push(fragment.id));
                                }
                                updateAttackResults(attackResults, fragment.id, AttackResult.FRAGMENT);
                            }
                        }

                        updateReplayElements(attackReplayElements, target.areaId!, [counter.id], [targetId], AttackResult.FRAGMENT, 0, roll, `Bitch blown into ${roll} fragment${roll === 1 ? '' : 's'}`);
                    }
                });
            }
        });
    });

    return returnValue;
}

export const handleStunAttacks = (attackReplayElements: ReplayAttackElement[], attackGroups: AttackGroup[], counterMap: CounterMap, weaponEffectMap: { [key: string]: WeaponEffectEntry },
    attackResults: { [key: string]: AttackResult[] }, usedWeaponIds: Set<string>): void => {
    console.log("handleStunAttacks");
    let targetBasedAttackingIds = buildTargetBasedAttackingIds(attackGroups);
    let targetIds = Object.keys(targetBasedAttackingIds);
    targetIds.forEach(targetId => {
        if (hasResult(attackResults, targetId, AttackResult.KILL)) {
            return;
        }

        let totalDice = 0;
        const attackingIds = targetBasedAttackingIds[targetId];
        if (!attackingIds || attackingIds.length === 0) {
            return;
        }

        const actualAttackingIds: string[] = [];
        attackingIds.forEach(attackerId => {
            const attacker = counterMap[attackerId];
            if (isWeapon(attacker)) {
                const weaponEffect = weaponEffectMap[attacker.weaponType!];
                switch (weaponEffect.effect) {
                    case WeaponEffect.FIVE_DICE_TO_STUN:
                        totalDice += 5;
                        usedWeaponIds.add(attacker.id);
                        actualAttackingIds.push(attacker.id);
                        break;
                }
            }
        });

        const roll = rollX6SidedDie(totalDice);
        const target = counterMap[targetId];
        if (roll >= target.constitution) {
            updateAttackResults(attackResults, targetId, AttackResult.STUN);
            if (isCrew(target)) {
                target.collaterallyStunned = true;
            } else {
                target.stunned = true;
            }
            updateReplayElements(attackReplayElements, target.areaId!, actualAttackingIds, [targetId], AttackResult.STUN, totalDice, roll, "Bitch be stunned");
        } else if (actualAttackingIds.length > 0) {
            updateReplayElements(attackReplayElements, target.areaId!, actualAttackingIds, [targetId], AttackResult.NO_EFFECT, totalDice, roll, "No Effect from stun attack");
        }
    });

    targetBasedAttackingIds = buildTargetBasedAttackingIds(attackGroups, true);
    targetIds = Object.keys(targetBasedAttackingIds);
    targetIds.forEach(targetId => {
        //see if any of the attacking ids is a gas grenade
        const actualAttackingIds: string[] = [];
        const attackingIds = targetBasedAttackingIds[targetId];
        attackingIds.forEach(attackerId => {
            const attacker = counterMap[attackerId];
            if (attacker.weaponType === WeaponType.GAS_GRENADE) {
                actualAttackingIds.push(attacker.id);
            }
        });

        if (actualAttackingIds.length > 0) {
            //gas grenade effects are not multiplied
            const roll = rollX6SidedDie(5);
            const target = counterMap[targetId];
            if (roll >= target.constitution) {
                updateAttackResults(attackResults, targetId, AttackResult.STUN);
                target.collaterallyStunned = true;
                updateReplayElements(attackReplayElements, target.areaId!, actualAttackingIds, [targetId], AttackResult.STUN, 5, roll, "Crew be stunned");
            } else if (actualAttackingIds.length > 0) {
                updateReplayElements(attackReplayElements, target.areaId!, actualAttackingIds, [targetId], AttackResult.NO_EFFECT, 5, roll, "No Effect from stun attack");
            }
        }
    });
}

export const handleNoEffectAttacks = (attackReplayElements: ReplayAttackElement[], attackGroups: AttackGroup[], counterMap: CounterMap, weaponEffectMap: { [key: string]: WeaponEffectEntry },
    attackResults: { [key: string]: AttackResult[] }, usedWeaponIds: Set<string>): void => {
    console.log("handleStunAttacks");
    const targetBasedAttackingIds = buildTargetBasedAttackingIds(attackGroups);
    const targetIds = Object.keys(targetBasedAttackingIds);
    targetIds.forEach(targetId => {
        if (hasResult(attackResults, targetId, AttackResult.KILL)) {
            return;
        }

        const attackingIds = targetBasedAttackingIds[targetId];
        if (!attackingIds || attackingIds.length === 0) {
            return;
        }

        const actualAttackingIds: string[] = [];
        attackingIds.forEach(attackerId => {
            const attacker = counterMap[attackerId];
            if (isWeapon(attacker)) {
                const weaponEffect = weaponEffectMap[attacker.weaponType!];
                switch (weaponEffect.effect) {
                    case WeaponEffect.NO_EFFECT:
                        usedWeaponIds.add(attacker.id);
                        actualAttackingIds.push(attacker.id);
                        break;
                }
            }
        });

        if (actualAttackingIds.length > 0) {
            const target = counterMap[targetId];
            updateReplayElements(attackReplayElements, target.areaId!, actualAttackingIds, [targetId], AttackResult.NO_EFFECT, 0, 0, "No Effect");
        }
    });
}

export const crewAttack = (data: any, postMessage: (data: any) => void): void => {
    try {
        const gameState = data as GameState;
        const scenario = readScenario(gameState.scenarioId);

        const replay = createReplay(gameState);
        const attackReplayElements: ReplayAttackElement[] = replay.replayElements.attackElements;

        console.log(`crewAttack: starting for game: ${data.id} phase: ${gameState.phase}`);

        resetCounters(gameState);

        const attackGroups = gameState.attackGroups.filter((attackGroup) =>
            isValidAttackGroup(attackGroup),
        );

        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds: Set<string> = new Set();

        handleGrowAttacks(attackReplayElements, attackGroups, gameState.counterMap, gameState.weaponEffectMap, attackResults, scenario, usedWeaponIds);
        handleShrinkAttacks(attackReplayElements, attackGroups, gameState.counterMap, gameState.weaponEffectMap, attackResults, scenario, usedWeaponIds)
        handleToKillAttacks(attackReplayElements, attackGroups, gameState.counterMap, gameState.weaponEffectMap, attackResults, usedWeaponIds);
        gameState.nextCounterId = handleFragmentationAttacks(attackReplayElements, attackGroups, gameState.counterMap, gameState.weaponEffectMap, attackResults, scenario, usedWeaponIds, gameState.nextCounterId, gameState.stackMap);
        handleStunAttacks(attackReplayElements, attackGroups, gameState.counterMap, gameState.weaponEffectMap, attackResults, usedWeaponIds);
        handleNoEffectAttacks(attackReplayElements, attackGroups, gameState.counterMap, gameState.weaponEffectMap, attackResults, usedWeaponIds);

        updateWeaponEffects(gameState, usedWeaponIds);
        updateNonReusableWeapons(gameState, usedWeaponIds, scenario);
        handleDroppedWeapons(gameState, attackResults, scenario);

        gameState.replay = replay;
        replay.replayElements.attackElements.sort((a, b) => a.areaId.localeCompare(b.areaId));
        replay.show = replay.replayElements.attackElements.length > 0;
        gameState.attackGroups = [];
        gameState.phase = Phase.CREW_ATTACK_REPLAY;
        gameState.players.forEach((player) => {
            player.turnStatus = PlayerTurnStatus.STARTED;
        });

        postMessage({ status: "notifyClient", payload: { gameId: gameState.id, gameState } });
        postMessage({ status: "done", payload: { gameId: gameState.id } });
    } catch (error) {
        console.error(`crewAttack: error for game: ${data.id}`, error);
        postMessage({ status: "error", payload: { gameId: data.id, error } });
    }
};

export const handleDroppedWeapons = (gameState: GameState, attackResults: { [key: string]: AttackResult[] }, scenario: Scenario) => {
    console.log("handleDroppedWeapons");
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
    console.log("updateWeaponEffects");
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
    console.log("updateNonReusableWeapons");
    usedWeaponIds.forEach(counterId => {
        const counter = gameState.counterMap[counterId];
        if (counter && isWeapon(counter)) {
            const weaponData = scenario.weaponMap[counter.weaponType!];
            if (weaponData && !weaponData.reusable) {
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

const resetCounters = (gameState: GameState) => {
    console.log(`Resetting counters for game ${gameState.id}`);
    const counters = Object.values(gameState.counterMap);
    counters.forEach((counter) => {
        if (isCrew(counter)) {
            counter.usedMovementAllowance = 0;
            counter.stunned = false;
            counter.engaged = false;
            counter.killed = false;
        }
    });
};