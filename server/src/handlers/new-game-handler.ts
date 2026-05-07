import { Counter, CounterType, GameMode, GameState, NewGamePlayer, Phase, Player, PlayerTurnStatus, Replay, ReplayState, Scenario, WeaponEffect, WeaponType } from "../shared/types/game-types";
import { isCrew, isMonster, isWeapon } from "../shared/utils/counter-utils";
import { getRandomIndex, shuffleArray } from "../shared/utils/dice-utils";

export const createReplay = (gameState: GameState): Replay => {
    return {
        startingState: {
            counterMap: { ...gameState.counterMap },
            stackMap: { ...gameState.stackMap }
        },
        replayElements: {
            movementElements: [],
            attackElements: []
        },
        index: -1,
        playing: false,
        show: false
    };
}

export const createNewGame = (newPlayers: NewGamePlayer[], scenario: Scenario, debug: boolean = false): GameState => {
    // console.log(JSON.stringify(scenario.board.areaDefinitionMap));

    const players: Player[] = newPlayers.map(player => {
        return {
            id: player.id!,
            name: player.name!,
            active: true,
            showReports: false,
            turnStatus: PlayerTurnStatus.STARTED,
            color: player.color!,
            index: player.index
        }
    });

    const game: GameState = {
        connectedClients: 0,
        currentPlayerId: "",
        id: "",
        debug: debug,
        isGameOver: false,
        gameMode: GameMode.NORMAL,
        refreshGame: false,
        turn: 0,
        phase: Phase.GRAB_WEAPON,
        players: players,
        scenarioId: scenario.id,
        stackMap: {},
        nextCounterId: 0,
        counterMap: {},
        weaponEffectMap: {},
        mapScale: 0.5,
        selectedCounterIds: [],
        monsterTurnStatus: PlayerTurnStatus.STARTED,
        attackGroups: []
    }

    generateCrewCounters(game, scenario)
    assignCrewToPlayers(game);
    placeCrew(game, scenario);

    generateMonsterCounters(game, scenario);
    placeMonsters(game, scenario);

    generateWeaponCounters(game, scenario);
    placeWeapons(game, scenario);
    createWeaponEffectsMap(game, scenario);

    return game;
}

const weaponEffectChits: WeaponEffect[] = [
    WeaponEffect.FIVE_DICE_TO_KILL,
    WeaponEffect.FIVE_DICE_TO_STUN,
    WeaponEffect.FIVE_DICE_TO_STUN,
    WeaponEffect.FOUR_DICE_TO_KILL,
    WeaponEffect.FOUR_DICE_TO_KILL,
    WeaponEffect.THREE_DICE_TO_KILL,
    WeaponEffect.THREE_DICE_TO_KILL,
    WeaponEffect.NO_EFFECT,
    WeaponEffect.NO_EFFECT,
    WeaponEffect.GROW,
    WeaponEffect.SHRINK,
    WeaponEffect.ONE_DIE_FRAGMENTS,
    WeaponEffect.ONE_DIE_FRAGMENTS,
    WeaponEffect.ONE_DIE_FRAGMENTS,
    WeaponEffect.ONE_DIE_FRAGMENTS
];

export const createWeaponEffectsMap = (gameState: GameState, scenario: Scenario) => {
    const shuffledWeaponEffectChits = shuffleArray(weaponEffectChits);
    const entries = Object.entries(scenario.weaponMap);
    entries.forEach(([weaponType, weaponData]) => {
        gameState.weaponEffectMap[weaponType] = {
            effect: shuffledWeaponEffectChits.pop()!,
            discovered: true
        }
    });
}

export const generateWeaponCounters = (game: GameState, scenario: Scenario) => {
    const entries = Object.entries(scenario.weaponMap);
    entries.forEach(([weaponType, weaponData]) => {
        for (let i = 0; i < weaponData.count; i++) {
            const id = game.nextCounterId++;
            const counter: Counter = {
                id: id.toString(),
                type: CounterType.WEAPON,
                weaponType: weaponType as WeaponType,
                name: weaponType,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: weaponData.imageName,
                stunned: false,
                usedMovementAllowance: 0,
                //actions: [],
                engaged: false,
                spotted: false,
                moved: false,
                attacking: false
            }
            game.counterMap[counter.id] = counter;
        }
    });
}

export const placeWeapons = (game: GameState, scenario: Scenario) => {
    const weapons = Object.values(game.counterMap).filter(counter => isWeapon(counter));
    const areas = Object.values(scenario.board.areaDefinitionMap);
    weapons.forEach(counter => {
        const possibleArea = areas.filter(area => area.weaponStacks.some(weaponStack => weaponStack.type === counter.weaponType));
        if (possibleArea.length > 0) {
            const area = possibleArea[getRandomIndex(possibleArea.length)];
            const weaponStack = area.weaponStacks.find(weaponStack => weaponStack.type === counter.weaponType);
            if (!weaponStack) {
                return;
            }
            counter.coord = weaponStack.coord;
            counter.areaId = area.id;
            let stack = game.stackMap[area.id];
            if (stack) {
                stack.counterIds.push(counter.id);
            } else {
                stack = {
                    id: area.id,
                    counterIds: [counter.id]
                };
                game.stackMap[area.id] = stack;
            }
        }
    })
}

export const assignCrewToPlayers = (game: GameState) => {
    const crewCounters = Object.values(game.counterMap).filter(counter => isCrew(counter));
    crewCounters.forEach((counter, index) => {
        const player = game.players[index % game.players.length];
        counter.playerId = player.id;
    });
}

export const placeCrew = (game: GameState, scenario: Scenario) => {
    const crewCounters = Object.values(game.counterMap).filter(counter => isCrew(counter));
    crewCounters.forEach(counter => {
        const scenarioCrew = scenario.crew.find(scenarioCrew => scenarioCrew.name === counter.name);
        if (scenarioCrew) {
            const areaCount = scenarioCrew.startingAreaIds.length;
            const areaIndex = getRandomIndex(areaCount);
            const areaId = scenarioCrew.startingAreaIds[areaIndex];
            const area = scenario.board.areaDefinitionMap[areaId];
            counter.areaId = areaId;
            counter.coord = area.coord;
            let stack = game.stackMap[areaId];
            if (stack) {
                stack.counterIds.push(counter.id);
            } else {
                stack = {
                    id: areaId,
                    counterIds: [counter.id]
                };
                game.stackMap[areaId] = stack;
            }
        }
    });
}

export const generateCrewCounters = (game: GameState, scenario: Scenario) => {
    scenario.crew.forEach(scenarioCrew => {
        const counter: Counter = {
            id: (game.nextCounterId++).toString(),
            type: scenarioCrew.type,
            name: scenarioCrew.name,
            movementAllowance: scenarioCrew.movementAllowance,
            attackDice: scenarioCrew.attackDice,
            constitution: scenarioCrew.constitution,
            imageName: scenarioCrew.imageName,
            stunned: false,
            usedMovementAllowance: 0,
            //actions: [],
            engaged: false,
            spotted: false,
            moved: false,
            attacking: false
        }
        game.counterMap[counter.id] = counter;
    });
}

export const generateMonsterCounters = (game: GameState, scenario: Scenario) => {
    const length = scenario.monsterSettings.startingCounts.length;
    const index = getRandomIndex(length);
    const startingCounts = scenario.monsterSettings.startingCounts[index];
    let monsterTypeData = scenario.monsterSettings.monsterPropertyMap[CounterType.ADULT];
    for (let i = 0; i < startingCounts.adults; i++) {
        const id = game.nextCounterId++;
        const counter: Counter = {
            id: id.toString(),
            type: CounterType.ADULT,
            name: `AGT-${id}`,
            movementAllowance: monsterTypeData.movementAllowance,
            attackDice: monsterTypeData.attackDice,
            constitution: monsterTypeData.constitution,
            imageName: getMonsterImageName(id, CounterType.ADULT, scenario.monsterSettings.monsterImageCountMap[CounterType.ADULT]),
            stunned: false,
            usedMovementAllowance: 0,
            //actions: [],
            engaged: false,
            spotted: false,
            moved: false,
            attacking: false
        }
        game.counterMap[counter.id] = counter;
    }
    monsterTypeData = scenario.monsterSettings.monsterPropertyMap[CounterType.EGG];
    for (let i = 0; i < startingCounts.eggs; i++) {
        const id = game.nextCounterId++;
        const counter: Counter = {
            id: id.toString(),
            type: CounterType.EGG,
            name: `AGT-${id}`,
            movementAllowance: monsterTypeData.movementAllowance,
            attackDice: monsterTypeData.attackDice,
            constitution: monsterTypeData.constitution,
            imageName: getMonsterImageName(id, CounterType.EGG, scenario.monsterSettings.monsterImageCountMap[CounterType.EGG]),
            stunned: false,
            usedMovementAllowance: 0,
            //actions: [],
            engaged: false,
            spotted: false,
            moved: false,
            attacking: false
        }
        game.counterMap[counter.id] = counter;
    }
    monsterTypeData = scenario.monsterSettings.monsterPropertyMap[CounterType.BABY];
    for (let i = 0; i < startingCounts.babies; i++) {
        const id = game.nextCounterId++;
        const counter: Counter = {
            id: id.toString(),
            type: CounterType.BABY,
            name: `AGT-${id}`,
            movementAllowance: monsterTypeData.movementAllowance,
            attackDice: monsterTypeData.attackDice,
            constitution: monsterTypeData.constitution,
            imageName: getMonsterImageName(id, CounterType.BABY, scenario.monsterSettings.monsterImageCountMap[CounterType.BABY]),
            stunned: false,
            usedMovementAllowance: 0,
            //actions: [],
            engaged: false,
            spotted: false,
            moved: false,
            attacking: false
        }
        game.counterMap[counter.id] = counter;
    }
}

export const placeMonsters = (game: GameState, scenario: Scenario) => {
    const monsters = Object.values(game.counterMap).filter(counter => isMonster(counter));
    monsters.forEach(counter => {
        const areaId = scenario.monsterSettings.startingMonsterAreaIds[getRandomIndex(scenario.monsterSettings.startingMonsterAreaIds.length)];
        const area = scenario.board.areaDefinitionMap[areaId];
        counter.areaId = areaId;
        counter.coord = area.coord;
        let stack = game.stackMap[areaId];
        if (stack) {
            stack.counterIds.push(counter.id);
        } else {
            stack = {
                id: areaId,
                counterIds: [counter.id]
            };
            game.stackMap[areaId] = stack;
        }
    });
}



export const getMonsterImageName = (id: number, type: CounterType, imageCount: number): string => {
    switch (type) {
        case CounterType.EGG:
            return `Egg-${(id % imageCount) + 1}`;
        case CounterType.BABY:
            return `Baby-${(id % imageCount) + 1}`;
        case CounterType.ADULT:
            return `Adult-${(id % imageCount) + 1}`;
        default:
            return 'unknown';
    }
}