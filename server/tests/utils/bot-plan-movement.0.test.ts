import { GameMode, GameState, MapInfo, PlanetType, Player, PlayerColor, PlayerType } from "../../src/shared/types/game-types";
import { createColonyBuilder, createGameStateBuilder, createPlayerBuilder, createTaskForceBuilder, createThreatGraphBuilder } from "../../src/shared/utils/builder-utils";
import { planBotMovement } from "../../src/utils/bot-plan-movement";

import * as fileUtils from '../../src/utils/file-utils';
import * as botPlanMovement from '../../src/utils/bot-plan-movement';
//import * as botPlayerProduction from '../../src/utils/bot-plan-production';
import { ThreatGraph } from "../../src/shared/types/threat-types";
import { consoleLogger } from "../../src/utils/logger";

beforeAll(() => {
    consoleLogger.debug = jest.fn();
    consoleLogger.info = jest.fn();
    consoleLogger.warn = jest.fn();
    consoleLogger.error = jest.fn();
    jest.spyOn(console, "log").mockImplementation(() => { });
});

describe('executeBotPlayers', () => {
    beforeEach(() => jest.restoreAllMocks());
    const mapInfo: MapInfo = {
        rows: 10,
        columns: 10,
        gasClouds: [],
        starMap: {},
        entryHexes: []
    };

    const threatGrpah: ThreatGraph = {};

    // it('should execute bot player production turn and call putGame with correct data', async () => {
    //     const player = createPlayerBuilder("bot1", "BOT", 0, "t1", PlayerColor.BLUE, PlayerType.BOT)
    //         .setProduction({ colonyProductionMap: {}, technologyResearchMap: {} })
    //         .build();

    //     const gameState: GameState = createGameStateBuilder("game1", "player1", GameMode.NORMAL)
    //         .setTeams([{ name: "t1", players: [player] }])
    //         .setIsProductionYear(true)
    //         .setTurn(1)
    //         .build();

    //     const threatGraph: ThreatGraph = createThreatGraphBuilder().build();

    //     const readMapSpy = jest.spyOn(fileUtils, "readMap").mockReturnValue(mapInfo);
    //     const readGameSpy = jest.spyOn(fileUtils, "readGame").mockReturnValue(gameState);
    //     //const readStarGraphSpy = jest.spyOn(fileUtils, "readStarGraph").mockReturnValue(starGraph);
    //     const putGameSpy = jest.spyOn(botPlanMovement, "putGame").mockResolvedValue({ ok: true });
    //     //const executeBotPlayerProductionSpy = jest.spyOn(botPlayerProduction, 'executeBotPlayerProduction').mockImplementation(() => { });

    //     planBotMovement(gameState, mapInfo, player);

    //     //expect(executeBotPlayerProductionSpy).toHaveBeenCalledWith(gameState.colonyMap, gameState.taskForceMap, player, threatGraph, mapInfo.starMap, gameState.explorationData, gameState.turn);
    //     expect(putGameSpy).toHaveBeenCalledWith('game1', player.id, expect.objectContaining({
    //         completedTurn: true,
    //         taskForces: [],
    //         colonies: []
    //     }));

    //     readMapSpy.mockRestore();
    //     readGameSpy.mockRestore();
    //     //readStarGraphSpy.mockRestore();
    //     putGameSpy.mockRestore();
    //     //executeBotPlayerProductionSpy.mockRestore();
    // });

    it('should execute bot player move turn ', async () => {
        const player = createPlayerBuilder("bot2", "BOT", 0, "t2", PlayerColor.WHITE, PlayerType.BOT).build();
        const player2 = createPlayerBuilder("bill", "HUMAN", 0, "t1", PlayerColor.WHITE, PlayerType.HUMAN).build();
        const changedTaskForce = createTaskForceBuilder("tf1", player.id, player.teamId, { x: 1, y: 1 }).setChanged(true).build();
        const deletedTaskForce = createTaskForceBuilder("tf2", player.id, player.teamId, { x: 2, y: 2 }).setDeleted(true).build();
        const changedColony = createColonyBuilder("c1", 1, 5, PlanetType.MT, "star1", player.id, player.teamId).setChanged(true).build();

        const gameState: GameState = createGameStateBuilder("game2", "player2", GameMode.NORMAL)
            .setTeams([{ name: "t2", players: [player] }, { name: "t1", players: [player2] }])
            .setIsProductionYear(false)
            .setTurn(2)
            .setTaskForceMap({ tf1: changedTaskForce, tf2: deletedTaskForce })
            .setColonyMap({ c1: changedColony })
            .build();

        const readMapSpy = jest.spyOn(fileUtils, "readMap").mockReturnValue(mapInfo);
        const readGameSpy = jest.spyOn(fileUtils, "readGame").mockReturnValue(gameState);
        //const readStarGraphSpy = jest.spyOn(fileUtils, "readStarGraph").mockReturnValue(starGraph);
        //const putGameSpy = jest.spyOn(botPlanMovement, "putGame").mockResolvedValue({ ok: true });
        const executeBotPlayerMoveSpy = jest.spyOn(botPlanMovement, 'planBotPlayerMove').mockImplementation((
            gameState: GameState,
            mapInfo: MapInfo,
            threatGraph: ThreatGraph,
            player: Player
        ) => { return undefined });

        const expectedSaveData = {
            "colonies": [
                {
                    "advancedMissileBases": 0,
                    "attacked": false,
                    "besieged": false,
                    "captured": false,
                    "capturedTurn": 0,
                    "changed": true,
                    "deleted": false,
                    "id": "c1",
                    "industrialUnits": 1,
                    "maxPopulation": 5,
                    "missileBases": 0,
                    "naturalMetalization": false,
                    "planetType": "MT",
                    "planetaryForceScreen": false,
                    "playerId": "bot2",
                    "population": 1,
                    "reduced": false,
                    "roboticIndustrialUnits": 0,
                    "starId": "star1",
                    "teamId": "t2",
                },
            ],
            "completedTurn": true,
            "nextTaskForceId": 0,
            "taskForceDestinations": undefined,
            "taskForces": [
                {
                    "attackShips": 0,
                    "changed": true,
                    "colonyTransports": 0,
                    "colonyTransportsWithCet": 0,
                    "coord": {
                        "x": 1,
                        "y": 1,
                    },
                    "deleted": false,
                    "dreadnaughts": 0,
                    "escorts": 0,
                    "id": "tf1",
                    "playerId": "bot2",
                    "reduceColony": false,
                    "scouts": 0,
                    "teamId": "t2",
                },
                {
                    "attackShips": 0,
                    "changed": false,
                    "colonyTransports": 0,
                    "colonyTransportsWithCet": 0,
                    "coord": {
                        "x": 2,
                        "y": 2,
                    },
                    "deleted": true,
                    "dreadnaughts": 0,
                    "escorts": 0,
                    "id": "tf2",
                    "playerId": "bot2",
                    "reduceColony": false,
                    "scouts": 0,
                    "teamId": "t2",
                },
            ]
        };

        const saveGameData = planBotMovement(gameState, mapInfo, player);

        expect(executeBotPlayerMoveSpy).toHaveBeenCalledWith(gameState, mapInfo, threatGrpah, player);
        expect(saveGameData).toEqual(expectedSaveData);
        // expect(putGameSpy).toHaveBeenCalledWith('game2', player.id, expect.objectContaining({
        //     completedTurn: true,
        //     taskForces: [changedTaskForce, deletedTaskForce],
        //     colonies: [changedColony]
        // }));

        readMapSpy.mockRestore();
        readGameSpy.mockRestore();
        //readStarGraphSpy.mockRestore();
        //putGameSpy.mockRestore();
        executeBotPlayerMoveSpy.mockRestore();
    });

    // it('should do nothing if there are no bot players', async () => {
    //     const humanPlayer = createPlayerBuilder("human1", "Human", 0, "t1", PlayerColor.GREEN, PlayerType.HUMAN).build();
    //     const gameState: GameState = createGameStateBuilder("game3", "human1", GameMode.NORMAL)
    //         .setTeams([{ name: "t1", players: [humanPlayer] }])
    //         .setIsProductionYear(false)
    //         .setTurn(1)
    //         .build();

    //     const readMapSpy = jest.spyOn(fileUtils, "readMap").mockReturnValue(mapInfo);
    //     const readGameSpy = jest.spyOn(fileUtils, "readGame").mockReturnValue(gameState);
    //     //const readStarGraphSpy = jest.spyOn(fileUtils, "readStarGraph").mockReturnValue(starGraph);
    //     const putGameSpy = jest.spyOn(botPlanMovement, "putGame").mockResolvedValue({ ok: true });
    //     const executeBotPlayerMoveSpy = jest.spyOn(botPlanMovement, 'planBotPlayerMove');
    //     //const executeBotPlayerProductionSpy = jest.spyOn(botPlayerProduction, 'executeBotPlayerProduction');

    //     const saveGameData = planBotMovement(gameState, mapInfo, humanPlayer);

    //     expect(executeBotPlayerMoveSpy).not.toHaveBeenCalled();
    //     //  expect(executeBotPlayerProductionSpy).not.toHaveBeenCalled();
    //     expect(putGameSpy).not.toHaveBeenCalled();
    //     expect(saveGameData).toEqual({});

    //     readMapSpy.mockRestore();
    //     readGameSpy.mockRestore();
    //     //readStarGraphSpy.mockRestore();
    //     putGameSpy.mockRestore();
    //     executeBotPlayerMoveSpy.mockRestore();
    //     //executeBotPlayerProductionSpy.mockRestore();
    // });
});