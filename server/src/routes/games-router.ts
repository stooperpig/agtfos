import express, { Request, Response } from 'express';
import { deleteGame, deleteReplay, doesGameExist, readGame, readGameList, readGames, readReplay, readScenario, writeGames, writeReplay } from '../utils/file-utils';
import { GameEntry, GameStatus, NewGamePlayer } from '../shared/types/game-types';
import { planBotPhase } from '../utils/bot-plan-movement';
import { addGame, markDirty, retrieveGame } from '../cache/game-cache';
import { pushAction } from '../utils/push-actions';
import { createNewGame, createReplay } from '../handlers/new-game-handler';
import { ActionHandlers, enqueue } from '../handlers/games-router-handlers';
import { Action } from '../shared/types/action-types';
import { ReplayType } from '../types/server-types';

const router = express.Router();
export default router;

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

router.get('/:gameId/replay', (req: Request, res: Response) => {
    try {
        const gameId = req.params.gameId;
        
        if (gameId === undefined) {
            res.status(500);
            res.send({ message: 'Error: gameId is required part of uri' });
        } else {
            const replay = readReplay(gameId, ReplayType.POST );
            res.setHeader('Content-Type', 'application/json');
            res.send(replay);
        }
    } catch (error) {
        console.log(error);
        res.status(500);
        res.send({ message: 'Error: Retreiving replay failed' });
    }
});

router.get('/:gameId/player/:playerId', (req: Request, res: Response) => {
    try {
        const gameId = req.params.gameId;
        const playerId = req.params.playerId;

        if (gameId === undefined) {
            res.status(500);
            res.send({ message: 'Error: gameId is required part of uri' });
        } else if (playerId === undefined) {
            res.status(500);
            res.send({ message: 'Error: playerId is required part of uri' });
        } else {
            const game = retrieveGame(gameId);
            game.currentPlayerId = playerId;

            const player = game.players.find(player => player.id === playerId);
            if (player === undefined) {
                res.status(500);
                res.send({ message: `Error: player ${playerId} is not in game state` });
                return;
            }

            res.setHeader('Content-Type', 'application/json');
            res.send(game);
        }
    } catch (error) {
        console.log(error);
        res.status(500);
        res.send({ message: 'Error: Retreiving game failed' });
    }
})

router.put('/:gameId/action', async function (req: Request, res: Response) {
    try {
        const gameId = req.params.gameId as string;
        const socketId = req.body.socketId as string;
        const action = req.body.action as Action;

        const gameState = retrieveGame(gameId);

        const result = await enqueue(() => {
            return ActionHandlers[action.type](gameState, action);
        });

        if (result !== undefined) {
            console.log("Action failed: " + result);
            res.status(500);
            res.json({ message: result });
            return;
        }

        markDirty(gameId);
        pushAction(JSON.stringify(action), socketId);

        res.json({ message: "success" });
    } catch (error) {
        console.log("Action failed: " + error);
        res.status(500);
        res.json({ message: 'Error: Action failed' });
    }
});

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

router.patch('/:gameId/debug', function (req: Request, res: Response) {
    try {
        const gameId = req.params.gameId;
        const debug = req.body.debug as boolean;

        if (debug === undefined) {
            res.status(400).send({ message: 'Debug flag is required' });
            return;
        }

        const gameData = retrieveGame(gameId);
        gameData.debug = debug;
        markDirty(gameId);

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

        // Object.values(scenario.board.areaDefinitionMap).forEach(area => {
        //     area.weaponStacks.forEach((stack, index) => {
        //         stack.coord = getPolygonCentroid(stack.polygon!);
        //         delete stack.polygon;
        //     });
        //     area.coord = getPolygonCentroid(area.polygon);
        //     delete area.crewStackPolygon
        //     delete area.monsterStackPolygon
        // });

        // console.log(JSON.stringify(scenario.board.areaDefinitionMap));

        // return;

        const gameState = createNewGame(newPlayers, scenario, debugMode);
        const replay = createReplay(gameState);

        gameState.id = gameId;

        addGame(gameId, gameState);
        writeReplay(gameId, replay, ReplayType.PRE);

        console.log(`Created gameId: ${gameId}`);

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

        //todo:need to add the planning for the bot player   

        res.send({ message: 'Create game successful', gameId: gameState.id });
    } catch (error) {
        console.log(error);
        res.status(500);
        res.send({ message: 'Error: Create game failed' });
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
        deleteReplay(gameId, ReplayType.PRE);
        deleteReplay(gameId, ReplayType.POST);

        res.send({ message: 'Successfully deleted game' });
    } catch (error) {
        console.log(error);
        res.status(500);
        res.send({ message: 'Error: Delete game failed' });
    }
});