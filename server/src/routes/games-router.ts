import express, { Request, Response } from 'express';
import { deleteGame, deleteMap, doesGameExist, readCards, readGame, readGameList, readGames, readScenario, writeGame, writeGames } from '../utils/file-utils';
import { PutGameData, Task } from '../types/server-types';
import { pushMessage } from './message-router';

import { Player, GameState, GameEntry, GameStatus, NewGamePlayer, PlayerTurnStatus, SaveGameData, GameMode, Phase, Scenario, Counter, CounterType, WeaponType, CounterActionType } from '../shared/types/game-types';
import { planBotPhase } from '../utils/bot-plan-movement';
import { startTask } from '../workers/task-queue';
import { CREW_STACK_ID_SUFFIX, MONSTER_STACK_ID_SUFFIX, WEAPON_STACK_ID_SUFFIX } from '../shared/constants/game-constants';
import { isCrew, isMonster, isWeapon } from '../shared/utils/counter-utils';

const router = express.Router();
export default router;

//retrieve list of games
router.get('/list/:playerId', function (req: Request, res: Response) {
    try {
        const playerId = req.params.playerId;
        const gameList = readGameList();
        const playerGames = gameList.games.filter(game => {
            return game.players.some(player => player.id === playerId);
        });

        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(playerGames));
    } catch (error) {
        console.log(error);
        res.status(500);
        res.send({ message: 'Error: Retreiving games failed' });
    }
});

const getGame = (req: Request, res: Response) => {
    try {
        const gameId = req.params.gameId;
        const playerId = req.params.playerId;
        const version = req.params.version ? req.params.version : undefined;

        if (gameId === undefined) {
            res.status(500);
            res.send({ message: 'Error: gameId is required part of uri' });
        } else if (playerId === undefined) {
            res.status(500);
            res.send({ message: 'Error: playerId is required part of uri' });
        } else {
            const game = readGame(gameId, version);
            game.currentPlayerId = playerId;

            const player = game.players.find(player => player.id === playerId);
            if (player === undefined) {
                res.status(500);
                res.send({ message: `Error: player ${playerId} is not in game state` });
                return;
            }

            if (game.phase === Phase.MOVE) {
                const stackMap = game.stackMap
                const counters = Object.values(game.counterMap).filter(counter => isCrew(counter));
                counters.forEach(counter => {
                    if (counter.actions.length > 0) {
                        const lastAction = counter.actions[counter.actions.length - 1];
                        console.log(JSON.stringify(counter));
                        console.log(JSON.stringify(lastAction));
                        if (lastAction.type === CounterActionType.MOVE) {
                            let stack = stackMap[counter.phaseStartingStackId!];
                            console.log(JSON.stringify(stack));
                            stack.counterIds = stack.counterIds.filter(id => id !== counter.id);
                            stack = stackMap[lastAction.toStackId!];
                            if (stack === undefined) {
                                stack = { id: lastAction.toStackId!, counterIds: [] };
                                stackMap[lastAction.toStackId!] = stack;
                            }
                            stack.counterIds.push(counter.id);

                            const moveActions = counter.actions.filter(action => action.type === CounterActionType.MOVE);
                            counter.usedMovementAllowance = moveActions.length;
                        }
                    }
                });
            }

            res.setHeader('Content-Type', 'application/json');
            res.send(game);
        }
    } catch (error) {
        console.log(error);
        res.status(500);
        res.send({ message: 'Error: Retreiving game failed' });
    }
}

//retrieve game
router.get('/:gameId/player/:playerId', getGame);
router.get('/:gameId/player/:playerId/version/:version?', getGame);

//determine if specific game exists
router.head('/:gameId', function (req: Request, res: Response) {
    try {
        const gameId = req.query.gameId as string;

        if (doesGameExist(gameId)) {
            res.status(200);
        } else {
            res.status(404);
        }

        res.send({});
    } catch (error) {
        console.log(error);
        res.status(500);
        res.send({ message: 'Error: Retreiving game failed' });
    }
});

// Toggle debug flag for a game
router.patch('/:gameId/debug', function (req: Request, res: Response) {
    try {
        const gameId = req.params.gameId;
        const debug = req.body.debug as boolean;

        if (debug === undefined) {
            res.status(400).send({ message: 'Debug flag is required' });
            return;
        }

        const gameData = readGame(gameId);
        gameData.debug = debug;
        writeGame(gameData);

        const gameList = readGameList();
        const gameEntry = gameList.games.find(game => game.id === gameId);
        if (gameEntry) {
            gameEntry.debug = debug;
            writeGames(gameList);
        }

        res.send({ success: true });
    } catch (error) {
        console.error('Error toggling debug flag:', error);
        res.status(500).send({ message: 'Failed to toggle debug flag' });
    }
});

router.post('/', function (req: Request, res: Response) {
    try {
        console.log(JSON.stringify(req.body));

        const newPlayers = req.body.players as NewGamePlayer[];
        const scenarioId = req.body.scenarioId as string;
        const scenario = readScenario(scenarioId);

        const gameList = readGameList();

        const gameId = gameList.nextId.toString();
        ++gameList.nextId;

        const debugMode = req.body.debug === true;

        // Object.values(scenario.board.locationMap).forEach(location => {
        //     location.weaponStacks = [];
        //     location.weaponStackPolygons?.forEach((polygon, index) => {
        //         location.weaponStacks.push({
        //             id: index.toString(),
        //             type: WeaponType.KNIFE,
        //             polygon: polygon
        //         });
        //     });
        //     delete location.weaponStackPolygons;
        //     delete location.weaponStackIds;
        //     delete location.crewStackId;
        //     delete location.monsterStackId;
        // });

        // console.log(JSON.stringify(scenario.board.locationMap));

        const gameState = createNewGame(newPlayers, scenario, debugMode);

        gameState.id = gameId;

        console.log(`Created gameId: ${gameId}`);

        writeGame(gameState);
        //writeMap(gameId, mapData);

        const gameEntry: GameEntry = {
            id: gameState.id,
            status: GameStatus.ACTIVE,
            turn: 0,
            debug: debugMode,
            players: gameState.players.map(player => {
                return {
                    color: player.color,
                    id: player.id,
                    index: player.index,
                    name: player.name,
                    status: player.turnStatus,
                }
            })
        }

        gameList.games = [...gameList.games, gameEntry];
        writeGames(gameList);

        const planData = planBotPhase(gameState, scenario);
        //todo agtfos: updateGameState(gameState, planData);
        writeGame(gameState);

        res.send({ message: 'Create game successful', gameId: gameState.id });
    } catch (error) {
        console.log(error);
        res.status(500);
        res.send({ message: 'Error: Create game failed' });
    }
});

router.put('/:gameId/player/:playerId', function (req: Request, res: Response) {
    try {
        const gameId = req.params.gameId as string;
        const playerId = req.params.playerId as string;

        if (gameId == null || playerId == null) {
            res.status(500);
            res.send({ message: 'Error: You must provide gameId and playerId parameters' });
            return;
        }

        console.log(JSON.stringify(req.body));
        const saveGameData = req.body as SaveGameData;

        const payLoad: PutGameData = {
            gameId,
            playerId,
            saveGameData
        };

        const task: Task = {
            payload: payLoad,
            type: "PUT_GAME",
            callBack: putGameTaskCallBack
        };

        startTask(task);

        res.send({ message: 'Save game submitted to queue' });
    } catch (error) {
        console.log(error);
        res.status(500);
        res.send({ message: 'Error: Saving game failed' });
    }
});

router.delete('/:gameId', function (req: Request, res: Response) {
    try {
        const gameId = req.params.gameId;

        if (gameId === undefined) {
            res.status(500);
            res.send({ message: 'Error: gameId is required part of uri' });
            return;
        }

        const games = readGames();
        games.games = games.games.filter(game => game.id !== gameId);
        writeGames(games);

        deleteGame(gameId);
        deleteMap(gameId);

        res.send({ message: 'Successfully deleted game' });
    } catch (error) {
        console.log(error);
        res.status(500);
        res.send({ message: 'Error: Delete game failed' });
    }
});

const putGameTaskCallBack = (msg: any) => {
    console.log(`game-router post handler: received message from task for game: ${msg.gameId} -> ${JSON.stringify(msg)}`);
    if (msg.status === 'notifyClient') {
        const action = {
            type: "REFRESH_GAME",
            payload: true
        };
        pushMessage(JSON.stringify(action));
        console.log(`game-router post handler: received message from task for game: ${msg.gameId} PushMessage: ${JSON.stringify(action)}`);

        const gameList = readGameList();
        const gameEntry = gameList.games.find(game => game.id === msg.gameId);
        if (gameEntry) {
            gameEntry.turn = msg.turn;
            if (msg.gameOver) {
                gameEntry.status = GameStatus.FINISHED;
            }
            writeGames(gameList);
        }
    } else if (msg.status === 'done') {
        console.log(`game-router post handler: received message from task for game: ${msg.gameId} has finished`);
    };
}

const createNewGame = (newPlayers: NewGamePlayer[], scenario: Scenario, debug: boolean = false): GameState => {
    console.log(JSON.stringify(scenario.board.locationMap));

    const players: Player[] = newPlayers.map(player => {
        return {
            id: player.id!,
            name: player.name!,
            active: true,
            showReports: false,
            turnStatus: PlayerTurnStatus.NONE,
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
        phase: Phase.MOVE,
        players: players,
        scenarioId: scenario.id,
        stackMap: {},
        nextCounterId: 0,
        counterMap: {},
        weaponEffectMap: {},
        mapScale: 0.5,
        selectedCounterIds: [],
        monsterTurnStatus: PlayerTurnStatus.NONE
    }

    generateCrewCounters(game, scenario)
    assignCrewToPlayers(game);
    placeCrew(game, scenario);

    generateMonsterCounters(game, scenario);
    placeMonsters(game, scenario);

    generateWeaponCounters(game, scenario);
    placeWeapons(game, scenario);

    return game;
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
                actions: []
            }
            game.counterMap[counter.id] = counter;
        }
    });
}

export const placeWeapons = (game: GameState, scenario: Scenario) => {
    const weapons = Object.values(game.counterMap).filter(counter => isWeapon(counter));
    const locations = Object.values(scenario.board.locationMap);
    weapons.forEach(counter => {
        const possibleLocations = locations.filter(location => location.weaponStacks.some(weaponStack => weaponStack.type === counter.weaponType));
        if (possibleLocations.length > 0) {
            const location = possibleLocations[randomNumber(possibleLocations.length) - 1];
            const weaponStack = location.weaponStacks.find(weaponStack => weaponStack.type === counter.weaponType);
            if (!weaponStack) {
                return;
            }
            const stackId = location.id + WEAPON_STACK_ID_SUFFIX + '-' + weaponStack.id;
            counter.phaseStartingStackId = stackId;
            let stack = game.stackMap[stackId];
            if (stack) {
                stack.counterIds.push(counter.id);
            } else {
                stack = {
                    id: stackId,
                    counterIds: [counter.id]
                };
                game.stackMap[stackId] = stack;
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
            const locationCount = scenarioCrew.startingLocationIds.length;
            const locationIndex = randomNumber(locationCount) - 1;
            const locationId = scenarioCrew.startingLocationIds[locationIndex];
            const stackId = locationId + CREW_STACK_ID_SUFFIX;
            counter.phaseStartingStackId = stackId;
            let stack = game.stackMap[stackId];
            if (stack) {
                stack.counterIds.push(counter.id);
            } else {
                stack = {
                    id: stackId,
                    counterIds: [counter.id]
                };
                game.stackMap[stackId] = stack;
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
            actions: []
        }
        game.counterMap[counter.id] = counter;
    });
}

export const generateMonsterCounters = (game: GameState, scenario: Scenario) => {
    const length = scenario.monsterSettings.startingCounts.length;
    const index = randomNumber(length) - 1;
    const startingCounts = scenario.monsterSettings.startingCounts[index];
    for (let i = 0; i < startingCounts.adults; i++) {
        const id = game.nextCounterId++;
        const counter: Counter = {
            id: id.toString(),
            type: CounterType.ADULT,
            name: `AGT-${id}`,
            movementAllowance: 2,
            attackDice: 4,
            constitution: 16,
            imageName: `Adult-${(id % scenario.monsterSettings.adultImageCount) + 1}`,
            stunned: false,
            usedMovementAllowance: 0,
            actions: []
        }
        game.counterMap[counter.id] = counter;
    }
    for (let i = 0; i < startingCounts.eggs; i++) {
        const id = game.nextCounterId++;
        const counter: Counter = {
            id: id.toString(),
            type: CounterType.EGG,
            name: `AGT-${id}`,
            movementAllowance: 2,
            attackDice: 2,
            constitution: 8,
            imageName: `Egg-${(id % scenario.monsterSettings.eggImageCount) + 1}`,
            stunned: false,
            usedMovementAllowance: 0,
            actions: []
        }
        game.counterMap[counter.id] = counter;
    }
    for (let i = 0; i < startingCounts.babies; i++) {
        const id = game.nextCounterId++;
        const counter: Counter = {
            id: id.toString(),
            type: CounterType.BABY,
            name: `AGT-${id}`,
            movementAllowance: 1,
            attackDice: 1,
            constitution: 4,
            imageName: `Baby-${(id % scenario.monsterSettings.babyImageCount) + 1}`,
            stunned: false,
            usedMovementAllowance: 0,
            actions: []
        }
        game.counterMap[counter.id] = counter;
    }
}

export const placeMonsters = (game: GameState, scenario: Scenario) => {
    const monsters = Object.values(game.counterMap).filter(counter => isMonster(counter));
    monsters.forEach(counter => {
        const locationId = scenario.monsterSettings.startingMonsterLocationIds[randomNumber(scenario.monsterSettings.startingMonsterLocationIds.length) - 1];
        const stackId = locationId + MONSTER_STACK_ID_SUFFIX;
        counter.phaseStartingStackId = stackId;
        let stack = game.stackMap[stackId];
        if (stack) {
            stack.counterIds.push(counter.id);
        } else {
            stack = {
                id: stackId,
                counterIds: [counter.id]
            };
            game.stackMap[stackId] = stack;
        }
    });
}

const randomNumber = (max: number) => {
    return Math.floor(Math.random() * max) + 1;
}