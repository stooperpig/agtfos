import EventEmitter from "events";
import { Colony, ColonyMap, Coord, ExplorationData, GameMode, GameState, MapInfo, Planet, PlanetType, Player, PlayerColor, PlayerType, SpectralClass, StarMap, TaskForceMap } from "../../src/shared/types/game-types";
import { createColonyBuilder, createGameStateBuilder, createPlanetBuilder, createPlayerBuilder, createStarBuilder, createTaskForceBuilder } from "../../src/shared/utils/builder-utils";
import { planBotPlayerMove, findClosestUnexploredStarBySpectralClass, handleColonization, handleTurnZero, putGame, rankPlanets, splitOutScouts } from "../../src/utils/bot-plan-movement";
import http, { IncomingMessage } from 'http';
import * as botPlayer from '../../src/utils/bot-plan-movement';
import { ThreatGraph } from "../../src/shared/types/threat-types";
import { consoleLogger } from "../../src/utils/logger";

beforeAll(() => {
    consoleLogger.debug = jest.fn();
    consoleLogger.info = jest.fn();
    consoleLogger.warn = jest.fn();
    consoleLogger.error = jest.fn();
    jest.spyOn(console, "log").mockImplementation(() => { });
});

describe('splitOutScouts', () => {
    it('splits scouts into new task forces of 2 or 1', () => {
        const player: Player = createPlayerBuilder("p1", "player1", 0, "1", PlayerColor.BLUE, PlayerType.BOT).setEntryCoord({ x: 0, y: 0 }).setNextTaskForceId(1).build();
        const taskForceMap: TaskForceMap = { "TF-1-0-0": createTaskForceBuilder("TF-1-0-0", player.id, player.teamId, { x: 1, y: 1 }).setScouts(3).setEscorts(1).build() };


        splitOutScouts(taskForceMap, player);

        expect(taskForceMap['TF-1-0-0'].scouts).toEqual(0);
        expect(taskForceMap['TF-1-0-1'].scouts).toEqual(2);
        expect(taskForceMap['TF-1-0-2'].scouts).toEqual(1);
    });

    it('does not split if task force is only scouts and contains 2 scout', () => {
        const player: Player = createPlayerBuilder("p1", "player1", 0, "1", PlayerColor.BLUE, PlayerType.BOT).setEntryCoord({ x: 0, y: 0 }).setNextTaskForceId(1).build();
        const taskForceMap: TaskForceMap = { "TF-1-0-0": createTaskForceBuilder("TF-1-0-0", player.id, player.teamId, { x: 1, y: 1 }).setScouts(2).build() };


        splitOutScouts(taskForceMap, player);

        expect(Object.keys(taskForceMap).length).toEqual(1);
        expect(taskForceMap['TF-1-0-0'].scouts).toEqual(2);
    });

    it('does not split if there are no scouts', () => {
        const player: Player = createPlayerBuilder("p1", "player1", 0, "1", PlayerColor.BLUE, PlayerType.BOT).setEntryCoord({ x: 0, y: 0 }).setNextTaskForceId(1).build();
        const taskForceMap: TaskForceMap = { "TF-1-0-0": createTaskForceBuilder("TF-1-0-0", player.id, player.teamId, { x: 1, y: 1 }).setEscorts(2).build() };


        splitOutScouts(taskForceMap, player);

        expect(Object.keys(taskForceMap).length).toEqual(1);
    });

    it('splits multiple task forces with scouts', () => {
        const player: Player = createPlayerBuilder("p1", "player1", 0, "1", PlayerColor.BLUE, PlayerType.BOT).setEntryCoord({ x: 0, y: 0 }).setNextTaskForceId(2).build();
        const taskForceMap: TaskForceMap = {
            "TF-1-0-0": createTaskForceBuilder("TF-1-0-0", player.id, player.teamId, { x: 1, y: 1 }).setScouts(3).build(),
            "TF-1-0-1": createTaskForceBuilder("TF-1-0-1", player.id, player.teamId, { x: 1, y: 1 }).setScouts(1).setEscorts(1).build()
        };


        splitOutScouts(taskForceMap, player);

        expect(taskForceMap['TF-1-0-0'].scouts).toEqual(2);
        expect(taskForceMap['TF-1-0-1'].scouts).toEqual(0);
        expect(taskForceMap['TF-1-0-2'].scouts).toEqual(1);
        expect(taskForceMap['TF-1-0-3'].scouts).toEqual(1);
        expect(Object.keys(taskForceMap).length).toEqual(4);
    });
});

describe('handleColonization', () => {
    const playerId = "p1";
    const teamId = "t1";
    const starId = "star1";

    it('adds population to an existing colony (non-BR planet)', () => {
        const colonyMap: ColonyMap = {
            "planet1": createColonyBuilder("planet1", 2, 5, PlanetType.MT, starId, playerId, teamId).build()
        };

        const planet = createPlanetBuilder("planet1", starId, 1, PlanetType.MT, 5).build();
        const taskForce = createTaskForceBuilder("tf1", playerId, teamId, { x: 0, y: 0 }).setColonyTransports(3).setColonyTransportsWithCet(1).build();

        handleColonization(taskForce, colonyMap, planet);

        expect(colonyMap["planet1"].population).toBe(5);
        expect(colonyMap["planet1"].changed).toBe(true);
        expect(taskForce.colonyTransports).toBe(0);
    });

    it('adds population to an existing colony (BR planet, uses colonyTransportsWithCet)', () => {
        const colonyMap: ColonyMap = {
            "planet1": createColonyBuilder("planet1", 1, 4, PlanetType.BR, starId, playerId, teamId).build()
        };
        const planet = createPlanetBuilder("planet1", starId, 1, PlanetType.BR, 4).build();
        const taskForce = createTaskForceBuilder("tf1", playerId, teamId, { x: 0, y: 0 }).setColonyTransports(2).setColonyTransportsWithCet(2).build();

        handleColonization(taskForce, colonyMap, planet);

        expect(colonyMap["planet1"].population).toBe(3);
        expect(colonyMap["planet1"].changed).toBe(true);
        expect(taskForce.colonyTransportsWithCet).toBe(0);
    });

    it('creates a new colony if none exists (non-BR planet)', () => {
        const colonyMap: ColonyMap = {};
        const planet = createPlanetBuilder("planet1", starId, 1, PlanetType.MT, 3).build();
        const taskForce = createTaskForceBuilder("tf1", playerId, teamId, { x: 0, y: 0 }).setColonyTransports(2).setColonyTransportsWithCet(1).build();

        handleColonization(taskForce, colonyMap, planet);

        expect(colonyMap["planet1"].population).toBe(3);
        expect(colonyMap["planet1"].maxPopulation).toBe(3);
        expect(colonyMap["planet1"].planetType).toBe(PlanetType.MT);
        expect(colonyMap["planet1"].starId).toBe(starId);
        expect(colonyMap["planet1"].playerId).toBe(playerId);
        expect(colonyMap["planet1"].teamId).toBe(teamId);
        expect(colonyMap["planet1"].changed).toBe(true);
        expect(taskForce.colonyTransports).toBe(0);
    });

    it('creates a new colony if none exists (BR planet, uses colonyTransportsWithCet)', () => {
        const colonyMap: ColonyMap = {};
        const planet = createPlanetBuilder("planet1", starId, 1, PlanetType.BR, 2).build();
        const taskForce = createTaskForceBuilder("tf1", playerId, teamId, { x: 0, y: 0 }).setColonyTransports(3).setColonyTransportsWithCet(2).build();

        handleColonization(taskForce, colonyMap, planet);

        expect(colonyMap["planet1"].population).toBe(2);
        expect(colonyMap["planet1"].planetType).toBe(PlanetType.BR);
        expect(taskForce.colonyTransportsWithCet).toBe(0);
        expect(taskForce.colonyTransports).toBe(3);
    });

    it('does not create a colony if no transports available for new colony', () => {
        const colonyMap: ColonyMap = {};
        const planet = createPlanetBuilder("planet1", starId, 1, PlanetType.MT, 3).build();
        const taskForce = createTaskForceBuilder("tf1", playerId, teamId, { x: 0, y: 0 }).setColonyTransportsWithCet(1).build();

        handleColonization(taskForce, colonyMap, planet);

        expect(Object.keys(colonyMap).length).toBe(1);
    });

    it('does not create a colony if no transports available for BR planet', () => {
        const colonyMap: ColonyMap = {};
        const planet = createPlanetBuilder("planet1", starId, 1, PlanetType.BR, 2).build();
        const taskForce = createTaskForceBuilder("tf1", playerId, teamId, { x: 0, y: 0 }).build();

        handleColonization(taskForce, colonyMap, planet);

        expect(Object.keys(colonyMap).length).toBe(0);
    });

    it('does not add population if existing colony is at max population', () => {
        const colonyMap: ColonyMap = {
            "planet1": createColonyBuilder("planet1", 5, 5, PlanetType.MT, starId, playerId, teamId).build()
        };
        const planet = createPlanetBuilder("planet1", starId, 1, PlanetType.MT, 5).build();
        const taskForce = createTaskForceBuilder("tf1", playerId, teamId, { x: 0, y: 0 }).setColonyTransports(2).setColonyTransportsWithCet(1).build();

        handleColonization(taskForce, colonyMap, planet);

        expect(colonyMap["planet1"].population).toBe(5);
        expect(taskForce.colonyTransports).toBe(2);
    });

    it('does not add population if existing colony is captured', () => {
        const playerId = "p1";
        const teamId = "t1";
        const starId = "star1";
        const colonyMap: ColonyMap = {
            "planet1":
                createColonyBuilder("planet1", 2, 5, PlanetType.MT, starId, playerId, teamId)
                    .setCaptured(true)
                    .setOriginalPlayerId("player2")
                    .setOriginalTeamId("team2")
                    .build()
        };
        const planet = createPlanetBuilder("planet1", starId, 1, PlanetType.MT, 5).build();
        const taskForce = createTaskForceBuilder("tf1", playerId, teamId, { x: 0, y: 0 }).setColonyTransports(3).setColonyTransportsWithCet(1).build();

        handleColonization(taskForce, colonyMap, planet);

        expect(colonyMap["planet1"].population).toBe(2);
        expect(taskForce.colonyTransports).toBe(3);
    });

    it('adds only up to max population for existing colony (non-BR)', () => {
        const playerId = "p1";
        const teamId = "t1";
        const starId = "star1";
        const colonyMap: ColonyMap = {
            "planet1": createColonyBuilder("planet1", 4, 5, PlanetType.MT, starId, playerId, teamId).build()
        };
        const planet = createPlanetBuilder("planet1", starId, 1, PlanetType.MT, 5).build();
        const taskForce = createTaskForceBuilder("tf1", playerId, teamId, { x: 0, y: 0 }).setColonyTransports(3).build();

        handleColonization(taskForce, colonyMap, planet);

        expect(colonyMap["planet1"].population).toBe(5);
        expect(taskForce.colonyTransports).toBe(2);
    });

    it('adds only up to max population for existing colony (BR)', () => {
        const playerId = "p1";
        const teamId = "t1";
        const starId = "star1";
        const colonyMap: ColonyMap = {
            "planet1": createColonyBuilder("planet1", 3, 4, PlanetType.BR, starId, playerId, teamId).build()
        };
        const planet = createPlanetBuilder("planet1", starId, 1, PlanetType.BR, 4).build();
        const taskForce = createTaskForceBuilder("tf1", playerId, teamId, { x: 0, y: 0 }).setColonyTransportsWithCet(5).build();

        handleColonization(taskForce, colonyMap, planet);

        expect(colonyMap["planet1"].population).toBe(4);
        expect(taskForce.colonyTransportsWithCet).toBe(4);
    });

    it('creates a new colony with less than max population if not enough transports (non-BR)', () => {
        const playerId = "p1";
        const teamId = "t1";
        const starId = "star1";
        const colonyMap: ColonyMap = {};
        const planet = createPlanetBuilder("planet1", starId, 1, PlanetType.MT, 5).build();
        const taskForce = createTaskForceBuilder("tf1", playerId, teamId, { x: 0, y: 0 }).setColonyTransports(2).build();

        handleColonization(taskForce, colonyMap, planet);

        expect(colonyMap["planet1"].population).toBe(2);
        expect(colonyMap["planet1"].maxPopulation).toBe(5);
        expect(taskForce.colonyTransports).toBe(0);
    });

    it('creates a new colony with less than max population if not enough transports (BR)', () => {
        const playerId = "p1";
        const teamId = "t1";
        const starId = "star1";
        const colonyMap: ColonyMap = {};
        const planet = createPlanetBuilder("planet1", starId, 1, PlanetType.BR, 4).build();
        const taskForce = createTaskForceBuilder("tf1", playerId, teamId, { x: 0, y: 0 }).setColonyTransportsWithCet(1).build();

        handleColonization(taskForce, colonyMap, planet);

        expect(colonyMap["planet1"].population).toBe(1);
        expect(colonyMap["planet1"].maxPopulation).toBe(4);
        expect(taskForce.colonyTransportsWithCet).toBe(0);
    });

});

describe('handleTurnZero', () => {
    const player = createPlayerBuilder("p1", "player1", 0, "t1", PlayerColor.BLUE, PlayerType.BOT)
        .setEntryCoord({ x: 0, y: 0 })
        .build();

    function makeStar(name: string, coord: Coord, spectralClass: SpectralClass) {
        return createStarBuilder(name, coord, spectralClass)
            .build();
    }

    it('sets task force destination to closest unexplored star by spectral class', () => {
        const teamId = player.teamId;
        const taskForce = createTaskForceBuilder("tf1", player.id, teamId, { x: 0, y: 0 }).setScouts(1).build();
        const stars = [
            makeStar("star1", { x: 2, y: 2 }, SpectralClass.G),
            makeStar("star2", { x: 5, y: 5 }, SpectralClass.M)
        ];
        const starMap: StarMap = {
            star1: stars[0],
            star2: stars[1]
        };
        const mapData: MapInfo = {
            rows: 10,
            columns: 10,
            gasClouds: [],
            starMap,
            entryHexes: []
        };

        const explorationData: ExplorationData = {};
        handleTurnZero([taskForce], stars, mapData, player, 0, explorationData);

        // Should set destination to star1 (SpectralClass.G is first in priority)
        expect(taskForce.destinationCoord).toEqual({ x: 2, y: 2 });
        expect(taskForce.destinationStarId).toBe("star1");
        expect(taskForce.changed).toBe(true);
        expect(taskForce.path).toBeDefined();
        expect(taskForce.eta).toBeDefined();
    });

    it('does nothing if all stars are already explored', () => {
        const teamId = player.teamId;
        const taskForce = createTaskForceBuilder("tf1", player.id, teamId, { x: 0, y: 0 }).setScouts(1).build();
        const stars = [
            makeStar("star1", { x: 2, y: 2 }, SpectralClass.G),
            makeStar("star2", { x: 5, y: 5 }, SpectralClass.M)
        ];
        const starMap: StarMap = {
            star1: stars[0],
            star2: stars[1]
        };
        const mapData: MapInfo = {
            rows: 10,
            columns: 10,
            gasClouds: [],
            starMap,
            entryHexes: []
        };

        const explorationData: ExplorationData = {
            "star1": [teamId],
            "star2": [teamId]
        };

        handleTurnZero([taskForce], stars, mapData, player, 0, explorationData);

        // Should not set any destination
        expect(taskForce.destinationCoord).toBeUndefined();
        expect(taskForce.destinationStarId).toBeUndefined();
        expect(taskForce.changed).toEqual(false);
        expect(taskForce.path).toBeUndefined();
        expect(taskForce.eta).toBeUndefined();
    });

    it('prioritizes spectral class order when choosing destination', () => {
        const teamId = player.teamId;
        const taskForce = createTaskForceBuilder("tf1", player.id, teamId, { x: 0, y: 0 }).setScouts(1).build();
        // Only SpectralClass.M is unexplored, SpectralClass.G is explored
        const stars = [
            makeStar("star1", { x: 2, y: 2 }, SpectralClass.G),
            makeStar("star2", { x: 5, y: 5 }, SpectralClass.M)
        ];
        const starMap: StarMap = {
            star1: stars[0],
            star2: stars[1]
        };
        const mapData: MapInfo = {
            rows: 10,
            columns: 10,
            gasClouds: [],
            starMap,
            entryHexes: []
        };

        const explorationData: ExplorationData = {
            "star1": [teamId]
        };

        handleTurnZero([taskForce], stars, mapData, player, 0, explorationData);

        // Should set destination to star2 (SpectralClass.M)
        expect(taskForce.destinationCoord).toEqual({ x: 5, y: 5 });
        expect(taskForce.destinationStarId).toBe("star2");
        expect(taskForce.changed).toBe(true);
        expect(taskForce.path).toBeDefined();
        expect(taskForce.eta).toBeDefined();
    });

    it('does nothing if no task forces are provided', () => {
        const stars = [
            makeStar("star1", { x: 2, y: 2 }, SpectralClass.G),
            makeStar("star2", { x: 5, y: 5 }, SpectralClass.M)
        ];
        const starMap: StarMap = {
            star1: stars[0],
            star2: stars[1]
        };
        const mapData: MapInfo = {
            rows: 10,
            columns: 10,
            gasClouds: [],
            starMap,
            entryHexes: []
        };

        const explorationData: ExplorationData = {};

        // Should not throw
        expect(() => handleTurnZero([], stars, mapData, player, 0, explorationData)).not.toThrow();
    });
});

describe('putGame', () => {
    let requestSpy: jest.SpyInstance;

    beforeEach(() => {
        requestSpy = jest.spyOn(http, 'request');
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('test', async () => {
        const fakeResponse = { success: true };
        const responseBody = JSON.stringify(fakeResponse);

        const res = new EventEmitter() as IncomingMessage;
        res.statusCode = 200;
        res.setEncoding = jest.fn();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const req = new EventEmitter() as any;
        req.write = jest.fn();
        req.end = jest.fn();

        requestSpy.mockImplementation((options, callback) => {
            callback(res);
            return req;
        });

        const promise = putGame('game123', 'player456', { nextTaskForceId: 0, completedTurn: false, colonies: [], taskForces: [] });

        res.emit('data', responseBody);
        res.emit('end');

        await expect(promise).resolves.toEqual(fakeResponse);
    });

    // it('should reject if JSON parsing fails', async () => {
    //     const res = new EventEmitter() as IncomingMessage;
    //     res.statusCode = 200;
    //     res.setEncoding = jest.fn();

    //     // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //     const req = new EventEmitter() as any;
    //     req.write = jest.fn();
    //     req.end = jest.fn();

    //     requestSpy.mockImplementation((options, callback) => {
    //         callback(res);
    //         return req;
    //     });

    //     const promise = putGame('game123', 'player456', { completedTurn: false, colonies: [], taskForces: [] });

    //     res.emit('data', 'not json');
    //     res.emit('end');

    //     await expect(promise).rejects.toThrow('Failed to parse response');
    // });

    it('should reject if request errors out', async () => {

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const req = new EventEmitter() as any;
        req.write = jest.fn();
        req.end = jest.fn();

        requestSpy.mockImplementation(() => req);

        const promise = putGame('game123', 'player456', { nextTaskForceId: 0, completedTurn: false, colonies: [], taskForces: [] });

        req.emit('error', new Error('Network error'));

        await expect(promise).rejects.toThrow('Network error');
    });
});

describe('executeBotPlayerMove', () => {
    const player = createPlayerBuilder("p1", "player1", 0, "t1", PlayerColor.BLUE, PlayerType.BOT)
        .setEntryCoord({ x: 0, y: 0 })
        .build();

    function makeStar(name: string, coord: Coord, spectralClass: SpectralClass, planets: Planet[] = [], exploredBy: string[] = []) {
        return createStarBuilder(name, coord, spectralClass)
            .setPlanets(planets)
            .build();
    }

    function makeMapData(stars: StarMap): MapInfo {
        return {
            rows: 10,
            columns: 10,
            gasClouds: [],
            starMap: stars,
            entryHexes: []
        };
    }

    it('should call handleTurnZero on turn 0', () => {
        const spy = jest.spyOn(botPlayer, 'handleTurnZero');
        const star = makeStar("star1", { x: 2, y: 2 }, SpectralClass.G);
        const mapData = makeMapData({ star1: star });
        const game: GameState = createGameStateBuilder("g1", "p1", GameMode.NORMAL)
            .setTeams([{ name: "t1", players: [player] }])
            .setTaskForceMap({
                tf1: createTaskForceBuilder("tf1", player.id, player.teamId, { x: 0, y: 0 }).setScouts(1).build()
            })
            .setColonyMap({})
            .setTurn(0)
            .build();
        const threatGraph: ThreatGraph = {};

        planBotPlayerMove(game, mapData, threatGraph, player);

        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('should set destination for idle scout-only task force to closest unexplored star', () => {
        const star1 = makeStar("star1", { x: 2, y: 2 }, SpectralClass.G);
        const star2 = makeStar("star2", { x: 5, y: 5 }, SpectralClass.M);
        const mapData = makeMapData({ star1, star2 });
        const tf = createTaskForceBuilder("tf1", player.id, player.teamId, { x: 0, y: 0 }).setScouts(1).build();
        const game: GameState = createGameStateBuilder("g1", "p1", GameMode.NORMAL)
            .setTeams([{ name: "t1", players: [player] }])
            .setTaskForceMap({ tf1: tf })
            .setColonyMap({})
            .setTurn(1)
            .build();

        const threatGraph: ThreatGraph = {
            "star1": {
                edges: [
                    { starId: "star2", distance: 1 }
                ],
                starId: "star1",
                localThreat: 0,
                localStrength: 0,
                remoteThreat: 0,
                remoteStrength: 0,
                localThreatRawShipAverage: 0,
                localThreatShipCount: 0,
                colonyStrength: 0,
                colonyThreat: 0
            },
            "star2": {
                edges: [
                    { starId: "star1", distance: 1 }
                ],
                starId: "star2",
                localThreat: 0,
                localStrength: 0,
                remoteThreat: 0,
                remoteStrength: 0,
                localThreatRawShipAverage: 0,
                localThreatShipCount: 0,
                colonyStrength: 0,
                colonyThreat: 0
            }
        };

        planBotPlayerMove(game, mapData, threatGraph, player);

        expect(tf.destinationCoord).toEqual({ x: 2, y: 2 });
        expect(tf.destinationStarId).toBe("star1");
        expect(tf.changed).toBe(true);
        expect(tf.path).toBeDefined();
        expect(tf.eta).toBeDefined();
    });

    it('should set destination for idle mixed ship task force to closest unexplored star with path', () => {
        const star1 = makeStar("star1", { x: 2, y: 2 }, SpectralClass.G);
        const star2 = makeStar("star2", { x: 5, y: 5 }, SpectralClass.M);
        const mapData = makeMapData({ star1, star2 });
        const tf = createTaskForceBuilder("tf1", player.id, player.teamId, { x: 0, y: 0 }).setScouts(1).setEscorts(1).build();
        const game: GameState = createGameStateBuilder("g1", "p1", GameMode.NORMAL)
            .setTeams([{ name: "t1", players: [player] }])
            .setTaskForceMap({ tf1: tf })
            .setColonyMap({})
            .setEncounterReport([])
            .setTurn(1)
            .build();

        const threatGraph: ThreatGraph = {
            "star1": {
                edges: [
                    { starId: "star2", distance: 1 }
                ],
                starId: "star1",
                localThreat: 0,
                localStrength: 0,
                remoteThreat: 0,
                remoteStrength: 0,
                localThreatRawShipAverage: 0,
                localThreatShipCount: 0,
                colonyStrength: 0,
                colonyThreat: 0
            },
            "star2": {
                edges: [
                    { starId: "star1", distance: 1 }
                ],
                starId: "star2",
                localThreat: 0,
                localStrength: 0,
                remoteThreat: 0,
                remoteStrength: 0,
                localThreatRawShipAverage: 0,
                localThreatShipCount: 0,
                colonyStrength: 0,
                colonyThreat: 0
            }
        };

        planBotPlayerMove(game, mapData, threatGraph, player);

        expect(tf.destinationCoord).toEqual({ x: 2, y: 2 });
        expect(tf.destinationStarId).toBe("star1");
        expect(tf.changed).toBe(true);
        expect(tf.path).toBeDefined();
        expect(tf.eta).toBeDefined();
    });

    it('should colonize a planet if task force with transports is at a suitable planet', () => {
        const planet = createPlanetBuilder("planet1", "star1", 1, PlanetType.TR, 5).build();
        const star = makeStar("star1", { x: 2, y: 2 }, SpectralClass.G, [planet], [player.teamId]);
        const mapData = makeMapData({ star1: star });
        const tf = createTaskForceBuilder("tf1", player.id, player.teamId, { x: 2, y: 2 }).setColonyTransports(3).build();
        const game: GameState = createGameStateBuilder("g1", "p1", GameMode.NORMAL)
            .setTeams([{ name: "t1", players: [player] }])
            .setTaskForceMap({ tf1: tf })
            .setColonyMap({})
            .setTurn(1)
            .build();

        const threatGraph: ThreatGraph = {
            "star1": {
                edges: [
                    { starId: "star2", distance: 1 }
                ],
                starId: "star1",
                localThreat: 0,
                localStrength: 0,
                remoteThreat: 0,
                remoteStrength: 0,
                localThreatRawShipAverage: 0,
                localThreatShipCount: 0,
                colonyStrength: 0,
                colonyThreat: 0
            },
            "star2": {
                edges: [
                    { starId: "star1", distance: 1 }
                ],
                starId: "star2",
                localThreat: 0,
                localStrength: 0,
                remoteThreat: 0,

                remoteStrength: 0,
                localThreatRawShipAverage: 0,
                localThreatShipCount: 0,
                colonyStrength: 0,
                colonyThreat: 0
            }
        };

        planBotPlayerMove(game, mapData, threatGraph, player);

        // Should have created a new colony in game.colonyMap
        const colony = Object.values(game.colonyMap).find(c => c.id === "planet1");
        expect(colony).toBeDefined();
        expect(colony?.population).toBe(3);
        expect(tf.colonyTransports).toBe(0);
    });

    it('should delete task force if no ships remain after colonization', () => {
        const planet = createPlanetBuilder("planet1", "star1", 1, PlanetType.TR, 2).build();
        const star = makeStar("star1", { x: 2, y: 2 }, SpectralClass.G, [planet], [player.teamId]);
        const mapData = makeMapData({ star1: star });
        const tf = createTaskForceBuilder("tf1", player.id, player.teamId, { x: 2, y: 2 }).setColonyTransports(2).build();
        const game: GameState = createGameStateBuilder("g1", "p1", GameMode.NORMAL)
            .setTeams([{ name: "t1", players: [player] }])
            .setTaskForceMap({ tf1: tf })
            .setColonyMap({})
            .setTurn(1)
            .build();

        const threatGraph: ThreatGraph = {
            "star1": {
                edges: [
                    { starId: "star2", distance: 1 }
                ],
                starId: "star1",
                localThreat: 0,
                localStrength: 0,
                remoteThreat: 0,
                remoteStrength: 0,
                localThreatRawShipAverage: 0,
                localThreatShipCount: 0,
                colonyStrength: 0,
                colonyThreat: 0
            },
            "star2": {
                edges: [
                    { starId: "star1", distance: 1 }
                ],
                starId: "star2",
                localThreat: 0,
                localStrength: 0,
                remoteThreat: 0,
                remoteStrength: 0,
                localThreatRawShipAverage: 0,
                localThreatShipCount: 0,
                colonyStrength: 0,
                colonyThreat: 0
            }
        };

        planBotPlayerMove(game, mapData, threatGraph, player);

        expect(tf.deleted).toBe(true);
    });

    it('should not move warship task force if besieging enemy colony', () => {
        const star = makeStar("star1", { x: 2, y: 2 }, SpectralClass.G);
        const mapData = makeMapData({ star1: star });
        const tf = createTaskForceBuilder("tf1", player.id, player.teamId, { x: 2, y: 2 }).setEscorts(1).build();
        const enemyColony = createColonyBuilder("planet1", 1, 5, PlanetType.MT, "star1", "enemy", "enemyTeam").build();
        const game: GameState = createGameStateBuilder("g1", "p1", GameMode.NORMAL)
            .setTeams([{ name: "t1", players: [player] }])
            .setTaskForceMap({ tf1: tf })
            .setColonyMap({ planet1: enemyColony })
            .setTurn(1)
            .build();

        const threatGraph: ThreatGraph = {
            "star1": {
                edges: [
                    { starId: "star2", distance: 1 }
                ],
                starId: "star1",
                localThreat: 0,
                localStrength: 0,
                remoteThreat: 0,
                remoteStrength: 0,
                localThreatRawShipAverage: 0,
                localThreatShipCount: 0,
                colonyStrength: 0,
                colonyThreat: 0
            },
            "star2": {
                edges: [
                    { starId: "star1", distance: 1 }
                ],
                starId: "star2",
                localThreat: 0,
                localStrength: 0,
                remoteThreat: 0,
                remoteStrength: 0,
                localThreatRawShipAverage: 0,
                localThreatShipCount: 0,
                colonyStrength: 0,
                colonyThreat: 0
            }
        };

        planBotPlayerMove(game, mapData, threatGraph, player);

        expect(tf.destinationCoord).toBeUndefined();
        expect(tf.changed).not.toBe(true);
    });

    it('should not move warship task force if garrisoning captured colony', () => {
        const star = makeStar("star1", { x: 2, y: 2 }, SpectralClass.G);
        const mapData = makeMapData({ star1: star });
        const tf = createTaskForceBuilder("tf1", player.id, player.teamId, { x: 2, y: 2 }).setEscorts(1).build();
        const colony = createColonyBuilder("planet1", 1, 5, PlanetType.MT, "star1", player.id, player.teamId).setCaptured(true).build();
        const game: GameState = createGameStateBuilder("g1", "p1", GameMode.NORMAL)
            .setTeams([{ name: "t1", players: [player] }])
            .setTaskForceMap({ tf1: tf })
            .setColonyMap({ planet1: colony })
            .setTurn(1)
            .build();

        const threatGraph: ThreatGraph = {
            "star1": {
                edges: [
                    { starId: "star2", distance: 1 }
                ],
                starId: "star1",
                localThreat: 0,
                localStrength: 0,
                remoteThreat: 0,
                remoteStrength: 0,
                localThreatRawShipAverage: 0,
                localThreatShipCount: 0,
                colonyStrength: 0,
                colonyThreat: 0
            },
            "star2": {
                edges: [
                    { starId: "star1", distance: 1 }
                ],
                starId: "star2",
                localThreat: 0,
                localStrength: 0,
                remoteThreat: 0,
                remoteStrength: 0,
                localThreatRawShipAverage: 0,
                localThreatShipCount: 0,
                colonyStrength: 0,
                colonyThreat: 0
            }
        };

        planBotPlayerMove(game, mapData, threatGraph, player);

        expect(tf.destinationCoord).toBeUndefined();
        expect(tf.changed).not.toBe(true);
    });

    it('should split out scouts from task forces with more than 2 scouts', () => {
        const star = makeStar("star1", { x: 2, y: 2 }, SpectralClass.G);
        const mapData = makeMapData({ star1: star });
        const tf = createTaskForceBuilder("tf1", player.id, player.teamId, { x: 0, y: 0 }).setScouts(4).build();
        const game: GameState = createGameStateBuilder("g1", "p1", GameMode.NORMAL)
            .setTeams([{ name: "t1", players: [player] }])
            .setTaskForceMap({ tf1: tf })
            .setColonyMap({})
            .setTurn(1)
            .build();

        const threatGraph: ThreatGraph = {
            "star1": {
                edges: [
                    { starId: "star2", distance: 1 }
                ],
                starId: "star1",
                localThreat: 0,
                localStrength: 0,
                remoteThreat: 0,
                remoteStrength: 0,
                localThreatRawShipAverage: 0,
                localThreatShipCount: 0,
                colonyStrength: 0,
                colonyThreat: 0
            },
            "star2": {
                edges: [
                    { starId: "star1", distance: 1 }
                ],
                starId: "star2",
                localThreat: 0,
                localStrength: 0,
                remoteThreat: 0,
                remoteStrength: 0,
                localThreatRawShipAverage: 0,
                localThreatShipCount: 0,
                colonyStrength: 0,
                colonyThreat: 0
            }
        };

        planBotPlayerMove(game, mapData, threatGraph, player);

        // Should have added new task forces to game.taskForceMap
        const newTaskForces = Object.values(game.taskForceMap).filter(t => t.id !== "tf1");
        expect(newTaskForces.length).toBeGreaterThan(0);
        expect(tf.scouts).toBeLessThan(4);
    });
});

describe('rankPlanets', () => {
    // Helper function to create a planet with given properties
    const createPlanet = (type: PlanetType, naturalMetalization: boolean = false): Planet => ({
        id: 'test-planet',
        naturalMetalization,
        orbit: 1,
        starId: 'test-star',
        type,
        maxPopulation: 10,
        uninhabitable: false
    });

    it('should prioritize planets with natural metalization', () => {
        const planetWithMetal = createPlanet(PlanetType.TR, true);
        const planetWithoutMetal = createPlanet(PlanetType.BR, false);

        // Planet with natural metal should be ranked higher regardless of type
        expect(rankPlanets(planetWithMetal, planetWithoutMetal, false)).toBe(1);
        expect(rankPlanets(planetWithoutMetal, planetWithMetal, false)).toBe(-1);
    });

    it('should rank planets correctly with CET=false', () => {
        const brPlanet = createPlanet(PlanetType.BR);
        const trPlanet = createPlanet(PlanetType.TR);
        const stPlanet = createPlanet(PlanetType.ST);
        const mtPlanet = createPlanet(PlanetType.MT);

        // Test CET=false (BR=60, TR=90, ST=80, MT=70)
        expect(rankPlanets(trPlanet, brPlanet, false)).toBe(1);  // TR > BR
        expect(rankPlanets(stPlanet, brPlanet, false)).toBe(1);  // ST > BR
        expect(rankPlanets(mtPlanet, brPlanet, false)).toBe(1);  // MT > BR
        expect(rankPlanets(trPlanet, stPlanet, false)).toBe(1);  // TR > ST
        expect(rankPlanets(trPlanet, mtPlanet, false)).toBe(1);  // TR > MT
        expect(rankPlanets(stPlanet, mtPlanet, false)).toBe(1);  // ST > MT
    });

    it('should rank planets correctly with CET=true', () => {
        const brPlanet = createPlanet(PlanetType.BR);
        const trPlanet = createPlanet(PlanetType.TR);
        const stPlanet = createPlanet(PlanetType.ST);
        const mtPlanet = createPlanet(PlanetType.MT);

        // Test CET=true (BR=100, TR=90, ST=80, MT=70)
        expect(rankPlanets(brPlanet, trPlanet, true)).toBe(1);   // BR > TR
        expect(rankPlanets(trPlanet, stPlanet, true)).toBe(1);   // TR > ST
        expect(rankPlanets(stPlanet, mtPlanet, true)).toBe(1);   // ST > MT
        expect(rankPlanets(brPlanet, mtPlanet, true)).toBe(1);   // BR > MT
    });

    it('should return 0 for planets with equal value', () => {
        const planet1 = createPlanet(PlanetType.TR);
        const planet2 = createPlanet(PlanetType.TR);

        expect(rankPlanets(planet1, planet2, false)).toBe(0);
        expect(rankPlanets(planet1, planet2, true)).toBe(0);
    });
});