import { ActionGrowMonster, ActionLayEgg, ActionMoveToCoord, ActionType } from "../shared/types/action-types";
import { AttackGroup, AttackGroupType, Coord, Counter, CounterMap, CounterType, GameState, Phase, PlayerTurnStatus, ReplayMovementElement, Scenario, StackMap } from "../shared/types/game-types";
import { isCrew, isMonster } from "../shared/utils/counter-utils";
import { shuffleArray } from "../shared/utils/dice-utils";
import { processGrowMonster, processLayEgg, processMoveToCoord } from "../shared/state/reducers/game-reducers";
import { readDiceTable, readScenario } from "../utils/file-utils";
import { DiceTableData } from "../types/server-types";
import { getMonsterImageName } from "../handlers/new-game-handler";
import { getAdjacentAreas, getLosAreas, getShortestPath } from "../utils/map-utils";
import { randomUUID } from "crypto";
import { createReplay } from "../utils/game-utils";
import { checkEngagement } from "../shared/utils/movement-utils";

const removeKilledCounters = (gameState: GameState) => {
    const killedCounters = Object.values(gameState.counterMap).filter(c => c.killed);
    killedCounters.forEach(counter => {
        console.log(`monsterMove: removing killed counter ${counter.id}`);
        delete gameState.counterMap[counter.id];
        const stack = counter.areaId ? gameState.stackMap[counter.areaId] : undefined;
        if (stack) {
            stack.counterIds = stack.counterIds.filter(counterId => counterId !== counter.id);
        }
    });
}

export const monsterMove = (data: any, postMessage: (data: any) => void): void => {
    try {
        const diceTable = readDiceTable(.8);

        const gameState = data as GameState;
        const scenario = readScenario(gameState.scenarioId);

        removeKilledCounters(gameState);
        resetCounters(gameState);

        const replay = createReplay(gameState);
        const replayMovementElements = replay.replayElements.movementElements;

        handleGrow(gameState, scenario, replayMovementElements);
        handleMove(gameState, scenario, diceTable, replayMovementElements);

        gameState.replay = replay;
        gameState.replay.show = replay.replayElements.movementElements.length > 0;
        gameState.phase = Phase.MONSTER_MOVE_REPLAY;
        gameState.players.forEach(player => {
            player.turnStatus = PlayerTurnStatus.STARTED;
        });

        postMessage({ status: "notifyClient", payload: { gameId: gameState.id, gameState } });
        postMessage({ status: "done", payload: { gameId: gameState.id } });
    } catch (error) {
        console.error(`monsterPhase: error for game: ${data.id}`, error);
        postMessage({ status: "error", payload: { gameId: data.id, error } });
    }
}

const resetCounters = (gameState: GameState) => {
    console.log(`Resetting counters for game ${gameState.id}`);
    const counters = Object.values(gameState.counterMap);
    counters.forEach(counter => {
        if (isMonster(counter)) {
            counter.usedMovementAllowance = 0;
            counter.attacking = false;
            counter.engaged = false;
        } else if (isCrew(counter)) {
            counter.stunned = false;
            counter.engaged = false;
        }
    });
}

const scoreCrew = (crew: Counter, counterMap: CounterMap): number => {
    //need to comprehend weapon value
    if (crew.weaponCounterId !== undefined) {
        const weapon = counterMap[crew.weaponCounterId];
        if (weapon) {
            return Math.max(crew.attackDice, weapon.attackDice || 0) / crew.constitution;
        }
    }
    return crew.attackDice / crew.constitution;
}

const handleMove = (gameState: GameState, scenario: Scenario, diceTable: DiceTableData, replayMovementElements: ReplayMovementElement[]): void => {
    console.log(`Planning monster movement phase for game ${gameState.id}`);
    const crewCounters = Object.values(gameState.counterMap).filter(counter => isCrew(counter));
    const monsterCounters = Object.values(gameState.counterMap).filter(counter => isMonster(counter));

    const crewScores = crewCounters.map(crew => ({ crew, score: scoreCrew(crew, gameState.counterMap) }));
    crewScores.sort((a, b) => b.score - a.score);
    crewScores.forEach(crewScore => {
        console.log(`Crew ${crewScore.crew.id} has score ${crewScore.score} in area ${crewScore.crew.areaId}`);
        const areaId = crewScore.crew.areaId!;

        const attackGroup: AttackGroup = {
            id: randomUUID(),
            areaId: areaId,
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: [crewScore.crew.id],
            attackingCounterIds: [],
            collateralCounterIds: [],
            dice: 0,
            goalDice: diceTable[crewScore.crew.constitution]
        };

        //look in same area (range 0)
        updateAttackGroup(attackGroup, areaId, gameState.counterMap, gameState.stackMap, 0);

        //look in adjacent areas (adj)
        const adjAreas = getAdjacentAreas(areaId, scenario.board.areaDefinitionMap);
        for (let i = 0; i < adjAreas.length && attackGroup.goalDice > attackGroup.dice; ++i) {
            const adjAreaId = adjAreas[i];
            updateAttackGroup(attackGroup, adjAreaId, gameState.counterMap, gameState.stackMap, 1);
        };

        //look at los areas
        const losAreas = getLosAreas(areaId, scenario.board.areaDefinitionMap);
        for (let i = 0; i < losAreas.length && attackGroup.goalDice > attackGroup.dice; ++i) {
            const losAreaId = losAreas[i];
            updateAttackGroup(attackGroup, losAreaId, gameState.counterMap, gameState.stackMap, 2);
        };

        moveAttackingMonsters(attackGroup, areaId, gameState, scenario, replayMovementElements);
    });

    const remainingMonstersToMove = monsterCounters.filter(monster => !monster.stunned && !monster.attacking && monster.movementAllowance > 0);
    remainingMonstersToMove.forEach(monster => {
        console.log(`Monster ${monster.id} has ${monster.movementAllowance} movement allowance remaining`);

        let fromAreaId = monster.areaId!;
        let fromCoord = monster.coord!;

        //look in adjacent areas (adj)
        const adjAreas = getAdjacentAreas(monster.areaId!, scenario.board.areaDefinitionMap);
        let done = moveMonsterTowardsCrew(gameState, monster, adjAreas, fromAreaId!, fromCoord, scenario, gameState.counterMap, gameState.stackMap, replayMovementElements);

        if (done) {
            return;
        }

        //look at los areas
        const losAreas = getLosAreas(monster.areaId!, scenario.board.areaDefinitionMap);
        done = moveMonsterTowardsCrew(gameState, monster, losAreas, fromAreaId!, fromCoord, scenario, gameState.counterMap, gameState.stackMap, replayMovementElements);

        if (done) {
            return;
        }

        //random walk
        randomMoveMonster(gameState, monster, fromAreaId!, fromCoord, scenario, replayMovementElements);
    });
}

const moveMonsterTowardsCrew = (gameState: GameState, monster: Counter, areaIds: string[], fromAreaId: string, fromCoord: Coord, scenario: Scenario, counterMap: CounterMap, stackMap: StackMap, replayMovementElements: ReplayMovementElement[]): boolean => {
    console.log(`Moving monster ${monster.id} towards crew`);
    let done = false;
    const shuffledAreaIds = shuffleArray(areaIds);
    for (let i = 0; i < shuffledAreaIds.length && !done; ++i) {
        const areaId = shuffledAreaIds[i];
        const adjArea = scenario.board.areaDefinitionMap[areaId];
        const stack = stackMap[areaId];
        if (stack === undefined) {
            console.log(`Stack ${areaId} not found in area ${areaId}`);
            continue;
        }
        const containsCrew = stack.counterIds.some(counterId => counterMap[counterId].type === CounterType.CREW);
        if (containsCrew) {
            console.log(`Found crew in area ${areaId}`);
            moveMonsterToArea(gameState, monster, areaId, scenario, replayMovementElements);
            done = true;
        }
    };

    return done;
}

const moveMonsterToArea = (gameState: GameState, monster: Counter, areaId: string, scenario: Scenario, replayMovementElements: ReplayMovementElement[]) => {
    console.log(`Moving monster ${monster.id} to area ${areaId}`);
    if (monster.areaId !== areaId) {
        const path = getShortestPath(scenario.board.areaDefinitionMap, monster.areaId!, areaId);
        if (path === undefined) {
            console.log(`Monster ${monster.id} cannot reach ${areaId}`);
            return;
        }

        console.log(`Monster ${monster.id} is in area ${monster.areaId}, path to ${areaId}:`, JSON.stringify(path));

        let fromAreaId = monster.areaId!;
        let fromCoord = monster.coord!;
        for (let i = 1; i < path.length && monster.movementAllowance >= i && !monster.engaged; i++) {
            const toAreaId = path[i];
            console.log(`Monster ${monster.id} will move to area ${fromAreaId} from ${toAreaId}`);
            const toArea = scenario.board.areaDefinitionMap[toAreaId];
            const toCoord = toArea.coord!;
            const action: ActionMoveToCoord = {
                type: ActionType.MOVE_TO_COORD,
                payload: {
                    counterIds: [monster.id],
                    fromAreaId: fromAreaId!,
                    fromCoords: [fromCoord],
                    toAreaId,
                    toCoord,
                    movementCost: 1,
                    engaged: checkEngagement(gameState.stackMap[toAreaId], monster.type, gameState.counterMap)
                }
            };

            processMoveToCoord(gameState, action);

            const replayMovementElement: ReplayMovementElement = {
                type: ActionType.MOVE_TO_COORD,
                counterId: monster.id,
                fromAreaId: fromAreaId!,
                fromCoord: fromCoord,
                toAreaId: toAreaId,
                toCoord: toCoord,
                movementCost: 1,
                engaged: action.payload.engaged,
                spottedData: {}
            };
            replayMovementElements.push(replayMovementElement);

            fromAreaId = monster.areaId!;
            fromCoord = monster.coord!;
        }
    } else {
        console.log(`Monster ${monster.id} is already in area ${areaId}`);
    }
}

const randomMoveMonster = (gameState: GameState, monster: Counter, fromAreaId: string, fromCoord: Coord, scenario: Scenario, replayMovementElements: ReplayMovementElement[]) => {
    console.log(`Randomly moving monster ${monster.id}`);
    const visited = new Set<string>();
    visited.add(fromAreaId!);
    for (let i = 0; i < monster.movementAllowance && !monster.engaged; i++) {
        const fromArea = scenario.board.areaDefinitionMap[fromAreaId];
        const apertures = fromArea.apertures.filter(aperture => !visited.has(aperture.areaId));
        if (apertures.length === 0) {
            break;
        }
        const toAreaId = apertures[Math.floor(Math.random() * apertures.length)].areaId;
        const toCoord = scenario.board.areaDefinitionMap[toAreaId].coord!;
        console.log(`Monster ${monster.id} moves from ${fromAreaId} to ${toAreaId}`);
        const action: ActionMoveToCoord = {
            type: ActionType.MOVE_TO_COORD,
            payload: {
                counterIds: [monster.id],
                fromAreaId: fromAreaId!,
                fromCoords: [fromCoord],
                toAreaId,
                toCoord,
                movementCost: 1,
                engaged: checkEngagement(gameState.stackMap[toAreaId], monster.type, gameState.counterMap)
            }
        };

        processMoveToCoord(gameState, action);

        const replayMovementElement: ReplayMovementElement = {
            type: ActionType.MOVE_TO_COORD,
            counterId: monster.id,
            fromAreaId: fromAreaId!,
            fromCoord: fromCoord,
            toAreaId: toAreaId,
            toCoord: toCoord,
            movementCost: 1,
            engaged: action.payload.engaged,
            spottedData: {}
        };
        replayMovementElements.push(replayMovementElement);

        fromAreaId = toAreaId;
        fromCoord = toCoord;
        visited.add(toAreaId);
    }
}

const moveAttackingMonsters = (attackGroup: AttackGroup, areaId: string, gameState: GameState, scenario: Scenario, replayMovementElements: ReplayMovementElement[]) => {
    attackGroup.attackingCounterIds.forEach(counterId => {
        console.log(`Monster ${counterId} is attacking crew ${attackGroup.targetCounterIds}`);
        const monsterCounter = gameState.counterMap[counterId];
        moveMonsterToArea(gameState, monsterCounter, areaId, scenario, replayMovementElements);
    });
}

const updateAttackGroup = (attackGroup: AttackGroup, areaId: string, counterMap: CounterMap, stackMap: StackMap, range: number): void => {
    console.log(`Updating attack group in area ${areaId} range ${range}`);
    const stack = stackMap[areaId];
    if (stack === undefined) {
        console.log(`Stack ${areaId} not found in area ${areaId}`);
        return;
    }

    let monsters: Counter[];
    if (range < 2) {
        monsters = stack.counterIds.map(counterId => counterMap[counterId]).filter(counter => isMonster(counter) && !counter.attacking && !counter.stunned && counter.movementAllowance >= range && counter.attackDice > 0);
    } else {
        monsters = stack.counterIds.map(counterId => counterMap[counterId]).filter(counter => isMonster(counter) && !counter.attacking && !counter.stunned && counter.movementAllowance >= range && counter.attackDice > 0);
    }

    console.log(`Found ${monsters.length} monsters in area ${areaId}`);
    if (monsters.length > 0) {
        // Add monsters to the attack group to get target dice number. 
        for (let i = 0; i < monsters.length; ++i) {
            const monster = monsters[i];
            if (attackGroup.goalDice <= attackGroup.dice) {
                break;
            }

            attackGroup.attackingCounterIds.push(monster.id);
            attackGroup.dice += monster.attackDice;
            monster.attacking = true;
        }
    }
}

const handleGrow = (gameState: GameState, scenario: Scenario, replayMovementElements: ReplayMovementElement[]): void => {
    console.log(`Handling monster grow for game ${gameState.id}`);
    const monsterCounters = Object.values(gameState.counterMap).filter(counter => isMonster(counter));
    const eggPotential = calculateGrowthPotential(monsterCounters, [CounterType.EGG, CounterType.FRAGMENT], CounterType.BABY, scenario.monsterSettings.monsterMaxMap[CounterType.BABY]);
    const babyPotential = calculateGrowthPotential(monsterCounters, [CounterType.BABY], CounterType.ADULT, scenario.monsterSettings.monsterMaxMap[CounterType.ADULT]);
    const adultPotential = calculateGrowthPotential(monsterCounters, [CounterType.ADULT], CounterType.EGG, scenario.monsterSettings.monsterMaxMap[CounterType.EGG]);
    console.log(`Growth potential: egg:${eggPotential}, baby:${babyPotential}, adult:${adultPotential}`);
    if (eggPotential >= babyPotential && eggPotential >= adultPotential) {
        growType(gameState, [CounterType.EGG, CounterType.FRAGMENT], CounterType.BABY, eggPotential, scenario, replayMovementElements);
    } else if (babyPotential >= babyPotential && babyPotential >= adultPotential) {
        growType(gameState, [CounterType.BABY], CounterType.ADULT, babyPotential, scenario, replayMovementElements);
    } else {
        gameState.nextCounterId = addEggs(gameState, adultPotential, scenario, gameState.nextCounterId, replayMovementElements);
    }
}

const addEggs = (gameState: GameState, addCount: number, scenario: Scenario, startingId: number, replayMovementElements: ReplayMovementElement[]): number => {
    console.log(`Adding ${addCount} eggs`);
    const effectCounters = Object.values(gameState.counterMap).filter(counter => counter.type === CounterType.ADULT);
    const monsterTypeData = scenario.monsterSettings.monsterPropertyMap[CounterType.EGG];
    console.log(`Effect counters: ${effectCounters.length}`);
    const shuffledEffectCounters = shuffleArray(effectCounters);
    for (let i = 0; i < shuffledEffectCounters.length && i < addCount; i++) {
        const counter = shuffledEffectCounters[i];
        const id = startingId++;
        console.log(`Adding EGG counter id ${id} to stack ${counter.areaId}`);
        const action: ActionLayEgg = {
            type: ActionType.LAY_EGG,
            payload: {
                counterId: counter.id,
                fromAreaId: counter.areaId!,
                fromCoord: counter.coord!,
                newCounterId: id.toString(),
                movementAllowance: monsterTypeData.movementAllowance,
                attackDice: monsterTypeData.attackDice,
                constitution: monsterTypeData.constitution,
                imageName: getMonsterImageName(startingId, CounterType.EGG, scenario.monsterSettings.monsterImageCountMap[CounterType.EGG])
            }
        };

        processLayEgg(gameState, action);

        const replayElement: ReplayMovementElement = {
            type: ActionType.LAY_EGG,
            counterId: action.payload.counterId,
            fromAreaId: action.payload.fromAreaId,
            fromCoord: action.payload.fromCoord,
            toAreaId: undefined,
            toCoord: undefined,
            movementCost: 0,
            nextType: CounterType.EGG,
            newCounterId: action.payload.newCounterId,
            movementAllowance: action.payload.movementAllowance,
            attackDice: action.payload.attackDice,
            constitution: action.payload.constitution,
            imageName: action.payload.imageName,
            engaged: false,
            spottedData: {}
        };
        replayMovementElements.push(replayElement);
    }

    return startingId;
}

const growType = (gameState: GameState, currentTypes: CounterType[], nextType: CounterType, growCount: number, scenario: Scenario, replayMovementElements: ReplayMovementElement[]): void => {
    console.log(`Growing ${currentTypes} to ${nextType}`);
    const effectCounters = Object.values(gameState.counterMap).filter(counter => currentTypes.includes(counter.type));
    const monsterTypeData = scenario.monsterSettings.monsterPropertyMap[nextType];
    console.log(`Effect counters: ${effectCounters.length}`);
    const shuffledEffectCounters = shuffleArray(effectCounters);
    for (let i = 0; i < shuffledEffectCounters.length && i < growCount; i++) {
        console.log(`Growing counter ${shuffledEffectCounters[i].id} at ${shuffledEffectCounters[i].areaId} from ${shuffledEffectCounters[i].type} to ${nextType}`);
        const action: ActionGrowMonster = {
            type: ActionType.GROW_MONSTER,
            payload: {
                counterId: shuffledEffectCounters[i].id,
                fromAreaId: shuffledEffectCounters[i].areaId!,
                fromCoord: shuffledEffectCounters[i].coord!,
                nextType: nextType,
                movementAllowance: monsterTypeData.movementAllowance,
                attackDice: monsterTypeData.attackDice,
                constitution: monsterTypeData.constitution,
                imageName: getMonsterImageName(parseInt(shuffledEffectCounters[i].id), nextType, scenario.monsterSettings.monsterImageCountMap[nextType])
            }
        };

        processGrowMonster(gameState, action);

        const replayElement: ReplayMovementElement = {
            type: ActionType.GROW_MONSTER,
            counterId: action.payload.counterId,
            fromAreaId: action.payload.fromAreaId,
            fromCoord: action.payload.fromCoord,
            toAreaId: undefined,
            toCoord: undefined,
            movementCost: 0,
            nextType: action.payload.nextType,
            newCounterId: undefined,
            movementAllowance: action.payload.movementAllowance,
            attackDice: action.payload.attackDice,
            constitution: action.payload.constitution,
            imageName: action.payload.imageName,
            engaged: false,
            spottedData: {}
        };
        replayMovementElements.push(replayElement);
    }
}

const calculateGrowthPotential = (counters: Counter[], currentTypes: CounterType[], nextType: CounterType, maxNextType: number): number => {
    const currentCount = counters.reduce((acc, counter) => {
        if (counter.stunned) {
            return acc;
        }

        if (currentTypes.includes(counter.type)) {
            acc++;
        }

        return acc;
    }, 0);

    const nextCount = counters.reduce((acc, counter) => {
        if (counter.type === nextType) {
            acc++
        }
        return acc;
    }, 0);

    const potential = Math.min(maxNextType - nextCount, currentCount);

    return potential;
}