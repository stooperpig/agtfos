import {
    AttackGroup, AttackGroupType, AttackResult, Counter, CounterMap, CounterType, GameState, Phase, PlayerTurnStatus,
    Replay, ReplayAttackElement, ReplayAttackResultMap, ReplayElements, Scenario, StackMap, WeaponEffect, WeaponEffectEntry, WeaponType,
} from "../shared/types/game-types";
import { isCrew, isMonster, isWeapon } from "../shared/utils/counter-utils";
import { getRandomIndex, roll6SidedDie, rollX6SidedDie, shuffleArray } from "../shared/utils/dice-utils";
import { readReplay, readScenario, writeReplay } from "../utils/file-utils";
import { ReplayType } from "../types/server-types";
import { checkEngagement } from "../shared/utils/movement-utils";
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

const buildTargetBasedAttackGroups = (attackGroups: AttackGroup[]): { [key: string]: AttackGroup[] } => {
    const targetGroups: { [key: string]: AttackGroup[] } = {};

    attackGroups.forEach(attackGroup => {
        attackGroup.targetCounterIds.forEach(counterId => {
            if (!targetGroups[counterId]) {
                targetGroups[counterId] = [attackGroup];
            } else {
                targetGroups[counterId].push(attackGroup);
            }
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

const getReplayAttackElement = (attackReplayElements: ReplayAttackElement[], attackGroup: AttackGroup): ReplayAttackElement => {
    let replayAttackElement = attackReplayElements.find(element => element.attackGroup === attackGroup);
    if (!replayAttackElement) {
        replayAttackElement = {
            attackGroup: attackGroup,
            attackResultMap: {}
        };
        attackReplayElements.push(replayAttackElement);
    }

    return replayAttackElement!;
}

const updateReplayResults = (attackResultMap: ReplayAttackResultMap, targetCounterId: string, attackResult: AttackResult, numberOfDice: number, roll: number, message: string): void => {
    let replayAttackResultEntry = attackResultMap[targetCounterId];
    if (!replayAttackResultEntry) {
        replayAttackResultEntry = [{
            attackResult: attackResult,
            numberOfDice: numberOfDice,
            roll: roll,
            message: message

        }];
        attackResultMap[targetCounterId] = replayAttackResultEntry;
    } else {
        replayAttackResultEntry.push({
            attackResult: attackResult,
            numberOfDice: numberOfDice,
            roll: roll,
            message: message
        });
    }
}

export const handleGrowAttacks = (attackReplayElements: ReplayAttackElement[], attackGroups: AttackGroup[], counterMap: CounterMap, weaponEffectMap: { [key: string]: WeaponEffectEntry },
    attackResults: { [key: string]: AttackResult[] }, scenario: Scenario, usedWeaponIds: Set<string>): void => {
    console.log("handleGrowAttacks");
    attackGroups.forEach((attackGroup) => {
        attackGroup.attackingCounterIds.forEach(counterId => {
            const counter = counterMap[counterId];
            if (counter && isWeapon(counter) && weaponEffectMap[counter.weaponType!].effect === WeaponEffect.GROW) {
                const replayAttackElement = getReplayAttackElement(attackReplayElements, attackGroup);
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
                                updateReplayResults(replayAttackElement.attackResultMap, target.id, AttackResult.GROW, 0, 0, "");
                                break;
                            case CounterType.EGG:
                            case CounterType.FRAGMENT:
                                updateAttackResults(attackResults, target.id, AttackResult.GROW);
                                convertMonsterCounter(target, CounterType.BABY, scenario);
                                usedWeaponIds.add(counter.id);
                                updateReplayResults(replayAttackElement.attackResultMap, target.id, AttackResult.GROW, 0, 0, "");
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
                const replayAttackElement = getReplayAttackElement(attackReplayElements, attackGroup);
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
                                updateReplayResults(replayAttackElement.attackResultMap, target.id, AttackResult.SHRINK, 0, 0, "Bitch shrank");
                                break;

                            case CounterType.BABY:
                            case CounterType.FRAGMENT:
                                updateAttackResults(attackResults, target.id, AttackResult.SHRINK);
                                convertMonsterCounter(target, CounterType.EGG, scenario);
                                updateReplayResults(replayAttackElement.attackResultMap, target.id, AttackResult.SHRINK, 0, 0, "Bitch shrank");
                                break;
                            case CounterType.EGG:
                                updateAttackResults(attackResults, target.id, AttackResult.KILL);
                                updateReplayResults(replayAttackElement.attackResultMap, target.id, AttackResult.SHRINK, 0, 0, "Bitch shrank");
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
    const targetBasedAttackGroups = buildTargetBasedAttackGroups(attackGroups);
    const targetIds = Object.keys(targetBasedAttackGroups);
    targetIds.forEach(targetId => {
        if (hasResult(attackResults, targetId, AttackResult.KILL)) {
            return;
        }

        let totalDice = 0;
        const groups = targetBasedAttackGroups[targetId];

        groups.flatMap(group => group.attackingCounterIds).forEach(attackerId => {
            const attacker = counterMap[attackerId];
            if (isWeapon(attacker)) {
                const weaponEffect = weaponEffectMap[attacker.weaponType!];
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
        const target = counterMap[targetId];
        if (target && target.constitution && roll >= target.constitution) {
            updateAttackResults(attackResults, targetId, AttackResult.KILL);
            groups.forEach(group => {
                const replayAttackElement = getReplayAttackElement(attackReplayElements, group);
                updateReplayResults(replayAttackElement.attackResultMap, target.id, AttackResult.KILL, totalDice, roll, "Bitch be dead");
            });
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
                const replayAttackElement = getReplayAttackElement(attackReplayElements, attackGroup);
                attackGroup.targetCounterIds.forEach((targetId) => {
                    if (hasResult(attackResults, targetId, AttackResult.KILL)) {
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
                            const areaAttackGroup = attackGroups.find(group => group.type === AttackGroupType.AREA && group.areaId === areaId && group.areaId !== attackGroup.areaId);
                            updateReplayResults(replayAttackElement.attackResultMap, target.id, AttackResult.FRAGMENT, 0, 0, `Bitch blown into ${roll} fragments`);
                            for (let i = 0; i < roll - 1; i++) {
                                const fragment = createFragment(returnValue++, scenario);
                                counterMap[fragment.id] = fragment;
                                fragment.areaId = target.areaId;
                                fragment.coord = target.coord;
                                const stack = stackMap[target.areaId!];
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

    return returnValue;
}

export const handleStunAttacks = (attackReplayElements: ReplayAttackElement[], attackGroups: AttackGroup[], counterMap: CounterMap, weaponEffectMap: { [key: string]: WeaponEffectEntry },
    attackResults: { [key: string]: AttackResult[] }, usedWeaponIds: Set<string>): void => {
    console.log("handleStunAttacks");
    const targetBasedAttackGroups = buildTargetBasedAttackGroups(attackGroups);
    const targetIds = Object.keys(targetBasedAttackGroups);
    targetIds.forEach(targetId => {
        if (hasResult(attackResults, targetId, AttackResult.KILL)) {
            return;
        }

        let totalDice = 0;
        const groups = targetBasedAttackGroups[targetId];

        groups.flatMap(group => group.attackingCounterIds).forEach(attackerId => {
            const attacker = counterMap[attackerId];
            if (isWeapon(attacker)) {
                const weaponEffect = weaponEffectMap[attacker.weaponType!];
                switch (weaponEffect.effect) {
                    case WeaponEffect.FIVE_DICE_TO_STUN:
                        totalDice += 5;
                        usedWeaponIds.add(attacker.id);
                        break;
                }
            }
        });

        //issue; target could be in multipe attack groups so need to apply to result to all the replay groups
        //const replayAttackElement = getReplayAttackElement(attackReplayElements, attackGroup);
        const roll = rollX6SidedDie(totalDice);
        const target = counterMap[targetId];
        if (target && target.constitution && roll >= target.constitution) {
            updateAttackResults(attackResults, targetId, AttackResult.STUN);
            groups.forEach(group => {
                const replayAttackElement = getReplayAttackElement(attackReplayElements, group);
                updateReplayResults(replayAttackElement.attackResultMap, target.id, AttackResult.STUN, totalDice, roll, "Bitch be stunned");
            });
        }
    });
}

export const crewAttack = (data: any, postMessage: (data: any) => void): void => {
    try {
        const gameState = data as GameState;
        const scenario = readScenario(gameState.scenarioId);

        const replay = createReplay(gameState);
        gameState.replay = replay;
        const attackReplayElements = replay.replayElements.attackElements;

        //gameState.replay = replayElements;

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

        updateWeaponEffects(gameState, usedWeaponIds);
        updateNonReusableWeapons(gameState, usedWeaponIds, scenario);
        handleDroppedWeapons(gameState, attackResults, scenario);

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