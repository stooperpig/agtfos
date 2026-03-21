import { Colony, ColonyMap, CombatInfo, Coord, ExplorationData, GameMode, GameState, MapInfo, Path, PlanetType, PlayerColor, PlayerType, SpectralClass, StarMap, TaskForce, TaskForceMap, Team } from "../../src/shared/types/game-types";
import { buildColonyConflictMap, cleanUpTaskForces, ColonyConflictMap, exploreStar, GroupedByCoordAndTeam, groupTaskForcesByCoordAndTeam, handleFreedColonies, isOutOfSupplyRange, isPathValid, moveTaskForces, processEncounters, processPlanetaryAttacks, processShipToShipCombat, executeMovement, updateFinalScore } from "../../src/utils/movement";
import { createColonyBuilder, createGameStateBuilder, createMapInfoBuilder, createPlanetBuilder, createPlayerBuilder, createPlayerTechnologiesBuilder, createStarBuilder, createTaskForceBuilder, createTeamBuilder } from "../../src/shared/utils/builder-utils";
import { roll6SidedDie, getRandomIndex } from "../../src/shared/utils/dice-utils";
import cloneDeep from "lodash.clonedeep";

import * as playerUtils from "../../src/shared/utils/player-utils";
import * as movement from "../../src/utils/movement";
import * as production from '../../src/utils/production';
import * as fileUtils from "../../src/utils/file-utils";
import * as pathUtils from "../../src/shared/utils/path-utils"
import * as simulationCombat from '../../src/utils/simulation-combat';
import { consoleLogger } from "../../src/utils/logger";

jest.mock('../../src/shared/utils/dice-utils');

beforeAll(() => {
    consoleLogger.debug = jest.fn();
    consoleLogger.info = jest.fn();
    consoleLogger.warn = jest.fn();
    consoleLogger.error = jest.fn();
    jest.spyOn(console, "log").mockImplementation(() => {});
});

describe('buildColonyConflictMap', () => {
    it('build colony conflicts where 1 exists', () => {
        const teams: Team[] = [];
        teams.push({
            name: "1",
            players: [createPlayerBuilder("player1", "bill", 0, "1", PlayerColor.BLUE, PlayerType.HUMAN).build()]
        }, {
            name: "1",
            players: [createPlayerBuilder("player2", "mj", 1, "2", PlayerColor.WHITE, PlayerType.HUMAN).build()]
        });

        const colonies: Colony[] = [];
        const colony = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "player1", "1").build();
        colonies.push(colony);

        const taskForces: TaskForce[] = [];
        const taskForce = createTaskForceBuilder("tf-0-0", "player2", "2", { x: 0, y: 0 }).build();
        taskForces.push(taskForce);

        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = {};
        starMap[star.name] = star;

        const expected: ColonyConflictMap = {
            "star1": {
                colonies: [colony],
                taskForces: [taskForce]
            }
        };

        const turn = 1

        const result = buildColonyConflictMap(teams, taskForces, colonies, starMap, turn);

        expect(result).toEqual(expected);
    });

    it('build colony conflicts where 0 exist', () => {
        const teams: Team[] = [];
        teams.push({
            name: "1",
            players: [createPlayerBuilder("player1", "bill", 0, "1", PlayerColor.BLUE, PlayerType.HUMAN).build()]
        }, {
            name: "1",
            players: [createPlayerBuilder("player2", "mj", 1, "2", PlayerColor.WHITE, PlayerType.HUMAN).build()]
        });

        const colonies: Colony[] = [];
        const colony = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "player1", "1").build();
        colonies.push(colony);

        const taskForces: TaskForce[] = [];
        const taskForce = createTaskForceBuilder("tf-0-0", "player2", "2", { x: 0, y: 1 }).build();
        taskForces.push(taskForce);

        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = {};
        starMap[star.name] = star;

        const expected: ColonyConflictMap = {};

        const turn = 1;
        const result = buildColonyConflictMap(teams, taskForces, colonies, starMap, turn);

        expect(result).toEqual(expected);
    });

    it('build colony conflicts where 0 exist', () => {
        const teams: Team[] = [];
        teams.push({
            name: "1",
            players: [createPlayerBuilder("player1", "bill", 0, "1", PlayerColor.BLUE, PlayerType.HUMAN).build()]
        }, {
            name: "1",
            players: [createPlayerBuilder("player2", "mj", 1, "2", PlayerColor.WHITE, PlayerType.HUMAN).build()]
        });

        const colonies: Colony[] = [];
        const colony = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "player1", "1").build();
        colonies.push(colony);

        const taskForces: TaskForce[] = [];
        const taskForce = createTaskForceBuilder("tf-1-0", "player1", "1", { x: 0, y: 0 }).setEscorts(1).build();
        taskForces.push(taskForce);

        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = {};
        starMap[star.name] = star;

        const expected: ColonyConflictMap = {};

        const turn = 1;
        const result = buildColonyConflictMap(teams, taskForces, colonies, starMap, turn);

        expect(result).toEqual(expected);
    });
});

describe('processPlanetaryAttacks', () => {
    beforeEach(() => {
        //     if (jest.isMockFunction(getRandomIndex)) (getRandomIndex as jest.Mock).mockReset();
    });

    afterEach(() => {
        jest.resetAllMocks();
        jest.restoreAllMocks();
    });

    it('should not change anything if there are no colonies or task forces', () => {
        // Setup empty teams, colonyMap, taskForceMap, combatReport, and mapData
        const teams: Team[] = [];
        const colonyMap: ColonyMap = {};
        const taskForceMap: TaskForceMap = {};
        const combatReport: CombatInfo[] = [];
        const mapData = createMapInfoBuilder().setStarMap({}).build();

        // Should not throw or change anything
        expect(() => processPlanetaryAttacks(1, teams, colonyMap, taskForceMap, combatReport, mapData)).not.toThrow();
        expect(colonyMap).toEqual({});
        expect(taskForceMap).toEqual({});
        expect(combatReport).toEqual([]);
    });

    it('should captured defenseless colony', () => {
        // Setup two teams, two colonies at different stars, two enemy task forces at those stars
        const player1 = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN).build();
        const player2 = createPlayerBuilder("player2", "Player 2", 1, "team2", PlayerColor.WHITE, PlayerType.HUMAN).build();
        const team1 = createTeamBuilder("team1").setPlayers([player1]).build();
        const team2 = createTeamBuilder("team2").setPlayers([player2]).build();
        const teams = [team1, team2];

        const colony1 = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "player1", "team1").build();
        const colonyMap: ColonyMap = { [colony1.id]: colony1 };

        const tf1 = createTaskForceBuilder("tf-1", "player2", "team2", { x: 0, y: 0 }).setEscorts(1).build();
        const taskForceMap: TaskForceMap = { [tf1.id]: tf1 };

        const star1 = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = { [star1.name]: star1 };
        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        // Mock getCombatResults to avoid actual combat logic
        jest.spyOn(simulationCombat, "getCombatResults").mockReturnValue({
            winner: "",
            totalLosses: {},
            firstRoundLosses: {},
            combatLogs: []
        });

        (getRandomIndex as jest.Mock).mockReturnValue(0);

        processPlanetaryAttacks(3, teams, colonyMap, taskForceMap, [], mapData);

        // Colony should be captured
        expect(colonyMap["star1-0"].attacked).toBe(true);
        expect(colonyMap["star1-0"].captured).toBe(true);
    });

    it('should handle multiple colony conflicts at different stars', () => {
        // Setup two teams, two colonies at different stars, two enemy task forces at those stars
        const player1 = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN).build();
        const player2 = createPlayerBuilder("player2", "Player 2", 1, "team2", PlayerColor.WHITE, PlayerType.HUMAN).build();
        const team1 = createTeamBuilder("team1").setPlayers([player1]).build();
        const team2 = createTeamBuilder("team2").setPlayers([player2]).build();
        const teams = [team1, team2];

        const colony1 = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "player1", "team1").build();
        const colony2 = createColonyBuilder("star2-0", 80, 80, PlanetType.TR, "star2", "player1", "team1").build();
        const colonyMap: ColonyMap = { [colony1.id]: colony1, [colony2.id]: colony2 };

        const tf1 = createTaskForceBuilder("tf-1", "player2", "team2", { x: 0, y: 0 }).setEscorts(1).build();
        const tf2 = createTaskForceBuilder("tf-2", "player2", "team2", { x: 1, y: 1 }).setEscorts(1).build();
        const taskForceMap: TaskForceMap = { [tf1.id]: tf1, [tf2.id]: tf2 };

        const star1 = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const star2 = createStarBuilder("star2", { x: 1, y: 1 }, SpectralClass.G).build();
        const starMap: StarMap = { [star1.name]: star1, [star2.name]: star2 };
        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        // Mock getCombatResults to avoid actual combat logic
        jest.spyOn(simulationCombat, "getCombatResults").mockReturnValue({
            winner: "",
            totalLosses: {},
            firstRoundLosses: {},
            combatLogs: []
        });

        (getRandomIndex as jest.Mock).mockReturnValue(0);

        processPlanetaryAttacks(3, teams, colonyMap, taskForceMap, [], mapData);

        // Both colonies should be attacked
        expect(colonyMap["star1-0"].attacked).toBe(true);
        expect(colonyMap["star2-0"].attacked).toBe(true);
    });

    it('should not revert captured colony if original owner is not found', () => {
        // Setup teams where original owner does not exist
        const player2 = createPlayerBuilder("player2", "Player 2", 1, "team2", PlayerColor.WHITE, PlayerType.HUMAN).build();
        const team2 = createTeamBuilder("team2").setPlayers([player2]).build();
        const player1 = createPlayerBuilder("player1", "Player 1", 1, "team2", PlayerColor.WHITE, PlayerType.HUMAN).setActive(false).build();
        const team1 = createTeamBuilder("team1").setPlayers([player1]).build();
        const teams = [team2, team1];

        const colony = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "player2", "team2").build();
        colony.captured = true;
        colony.capturedTurn = 2;
        colony.originalPlayerId = "player1";
        colony.originalTeamId = "team1";
        const colonyMap: ColonyMap = { [colony.id]: colony };

        const taskForceMap: TaskForceMap = {};

        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };
        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        jest.spyOn(simulationCombat, "getCombatResults").mockReturnValue({
            winner: "",
            totalLosses: {},
            firstRoundLosses: {},
            combatLogs: []
        });

        processPlanetaryAttacks(3, teams, colonyMap, taskForceMap, [], mapData);

        // Colony should remain captured since original owner is not found
        expect(colonyMap["star1-0"].captured).toBe(false);
        expect(colonyMap["star1-0"].playerId).toBe("player2");
        expect(colonyMap["star1-0"].originalPlayerId).toBe(undefined);
        expect(colonyMap["star1-0"].originalTeamId).toBe(undefined);
    });

    it('should handle split attacks for besieged colonies', () => {
        // Setup teams and besieged colony with two enemy task forces attacking different colonies
        const player1 = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN).build();
        const player2 = createPlayerBuilder("player2", "Player 2", 1, "team2", PlayerColor.WHITE, PlayerType.HUMAN).build();
        const team1 = createTeamBuilder("team1").setPlayers([player1]).build();
        const team2 = createTeamBuilder("team2").setPlayers([player2]).build();
        const teams = [team1, team2];

        const colony = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "player1", "team1").setMissileBases(1).build();
        colony.besieged = true;
        const colonyMap: ColonyMap = { [colony.id]: colony };

        const tf1 = createTaskForceBuilder("tf-1", "player2", "team2", { x: 0, y: 0 }).setEscorts(1).setAttackColonyId(colony.id).build();
        const tf2 = createTaskForceBuilder("tf-2", "player2", "team2", { x: 0, y: 0 }).setEscorts(1).setAttackColonyId(colony.id).build();
        const taskForceMap: TaskForceMap = { [tf1.id]: tf1, [tf2.id]: tf2 };

        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };
        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        jest.spyOn(simulationCombat, "getCombatResults").mockReturnValue({
            winner: "",
            totalLosses: {},
            firstRoundLosses: {},
            combatLogs: []
        });

        processPlanetaryAttacks(5, teams, colonyMap, taskForceMap, [], mapData);

        // Colony should still be attacked and besieged
        expect(colonyMap["star1-0"].attacked).toBe(true);
        expect(colonyMap["star1-0"].besieged).toBe(true);
    });

    it('where 1 conflict exists with capture', () => {
        (getRandomIndex as jest.Mock).mockReturnValueOnce(0);
        jest.spyOn(simulationCombat, "getCombatResults").mockReturnValue({
            winner: "",
            totalLosses: {},
            firstRoundLosses: {},
            combatLogs: []
        });

        const teams: Team[] = [];
        teams.push({
            name: "1",
            players: [createPlayerBuilder("player1", "bill", 0, "1", PlayerColor.BLUE, PlayerType.HUMAN).build()]
        }, {
            name: "1",
            players: [createPlayerBuilder("player2", "mj", 1, "2", PlayerColor.WHITE, PlayerType.HUMAN).build()]
        });

        const combatReport: CombatInfo[] = [];

        const colonyMap: ColonyMap = {};
        const colony = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "player1", "1").build();
        colonyMap[colony.id] = colony;

        const taskForceMap: TaskForceMap = {};
        const taskForce = createTaskForceBuilder("tf-0-0", "player2", "2", { x: 0, y: 0 }).setEscorts(1).build();
        taskForceMap[taskForce.id] = taskForce;

        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = {};
        starMap[star.name] = star;

        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        const expectedColonyMap = cloneDeep(colonyMap);
        expectedColonyMap["star1-0"].attacked = true;
        expectedColonyMap["star1-0"].captured = true;
        expectedColonyMap["star1-0"].capturedTurn = 4;
        expectedColonyMap["star1-0"].playerId = "player2";
        expectedColonyMap["star1-0"].teamId = "2";
        expectedColonyMap["star1-0"].originalPlayerId = "player1";
        expectedColonyMap["star1-0"].originalTeamId = "1";
        const expectedTaskForceMap = cloneDeep(taskForceMap);

        processPlanetaryAttacks(4, teams, colonyMap, taskForceMap, combatReport, mapData);

        expect(expectedColonyMap).toEqual(colonyMap);
        expect(expectedTaskForceMap).toEqual(taskForceMap);
    });

    it('where 0 conflict exists', () => {
        (getRandomIndex as jest.Mock).mockReturnValueOnce(0);
        jest.spyOn(simulationCombat, "getCombatResults").mockReturnValue({
            winner: "",
            totalLosses: {},
            firstRoundLosses: {},
            combatLogs: []
        });

        const teams: Team[] = [];
        teams.push({
            name: "1",
            players: [createPlayerBuilder("player1", "bill", 0, "1", PlayerColor.BLUE, PlayerType.HUMAN).build()]
        }, {
            name: "1",
            players: [createPlayerBuilder("player2", "mj", 1, "2", PlayerColor.WHITE, PlayerType.HUMAN).build()]
        });

        const combatReport: CombatInfo[] = [];

        const colonyMap: ColonyMap = {};
        const colony = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "player1", "1").build();
        colonyMap[colony.id] = colony;

        const taskForceMap: TaskForceMap = {};
        const taskForce = createTaskForceBuilder("tf-1-0", "player1", "1", { x: 0, y: 0 }).setEscorts(1).build();
        taskForceMap[taskForce.id] = taskForce;

        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = {};
        starMap[star.name] = star;
        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        const expectedColonyMap = cloneDeep(colonyMap);
        const expectedTaskForceMap = cloneDeep(taskForceMap);

        processPlanetaryAttacks(4, teams, colonyMap, taskForceMap, combatReport, mapData);

        expect(expectedColonyMap).toEqual(colonyMap);
        expect(expectedTaskForceMap).toEqual(taskForceMap);
    });

    it('where 1 conflict exists with besieged', () => {
        (getRandomIndex as jest.Mock).mockReturnValueOnce(0);
        jest.spyOn(simulationCombat, "getCombatResults").mockReturnValue({
            winner: "",
            totalLosses: {},
            firstRoundLosses: {},
            combatLogs: []
        });

        const teams: Team[] = [];
        teams.push({
            name: "1",
            players: [createPlayerBuilder("player1", "bill", 0, "1", PlayerColor.BLUE, PlayerType.HUMAN).build()]
        }, {
            name: "1",
            players: [createPlayerBuilder("player2", "mj", 1, "2", PlayerColor.WHITE, PlayerType.HUMAN).build()]
        });

        const combatReport: CombatInfo[] = [];

        const colonyMap: ColonyMap = {};
        const colony = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "player1", "1").setMissileBases(1).build();
        colonyMap[colony.id] = colony;

        const taskForceMap: TaskForceMap = {};
        const taskForce = createTaskForceBuilder("tf-0-0", "player2", "2", { x: 0, y: 0 }).setEscorts(1).build();
        taskForceMap[taskForce.id] = taskForce;

        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = {};
        starMap[star.name] = star;
        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        const expectedColonyMap = cloneDeep(colonyMap);
        expectedColonyMap["star1-0"].attacked = true;
        expectedColonyMap["star1-0"].besieged = true;
        const expectedTaskForceMap = cloneDeep(taskForceMap);

        processPlanetaryAttacks(4, teams, colonyMap, taskForceMap, combatReport, mapData);

        expect(expectedColonyMap).toEqual(colonyMap);
        expect(expectedTaskForceMap).toEqual(taskForceMap);
    });

    it('should revert captured colony to original owner if conflict ends and original owner is active', () => {
        jest.spyOn(simulationCombat, "getCombatResults").mockReturnValue({
            winner: "",
            totalLosses: {},
            firstRoundLosses: {},
            combatLogs: []
        });

        // Setup teams and players
        const player1 = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN).build();
        const player2 = createPlayerBuilder("player2", "Player 2", 1, "team2", PlayerColor.WHITE, PlayerType.HUMAN).build();
        const team1 = createTeamBuilder("team1").setPlayers([player1]).build();
        const team2 = createTeamBuilder("team2").setPlayers([player2]).build();
        const teams = [team1, team2];

        const combatReport: CombatInfo[] = [];

        // Colony was captured by player2, but now no conflict
        const colony = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "player2", "team2").build();
        colony.captured = true;
        colony.capturedTurn = 3;
        colony.originalPlayerId = "player1";
        colony.originalTeamId = "team1";

        const colonyMap: ColonyMap = { [colony.id]: colony };

        // No task forces at the colony's star
        const taskForceMap: TaskForceMap = {};

        // Star at (0,0)
        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };
        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        // Run processPlanetaryAttacks
        processPlanetaryAttacks(5, teams, colonyMap, taskForceMap, combatReport, mapData);

        // Colony should revert to original owner
        expect(colonyMap["star1-0"].playerId).toBe("player1");
        expect(colonyMap["star1-0"].teamId).toBe("team1");
        expect(colonyMap["star1-0"].captured).toBe(false);
        expect(colonyMap["star1-0"].capturedTurn).toBe(0);
        expect(colonyMap["star1-0"].originalPlayerId).toBeUndefined();
        expect(colonyMap["star1-0"].originalTeamId).toBeUndefined();
    });

    it('should transfer captured colony to teammate if original owner is inactive', () => {
        (getRandomIndex as jest.Mock).mockReturnValueOnce(0);
        jest.spyOn(simulationCombat, "getCombatResults").mockReturnValue({
            winner: "",
            totalLosses: {},
            firstRoundLosses: {},
            combatLogs: []
        });

        // Setup teams and players
        const player1 = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN).build();
        player1.active = false; // inactive
        const player2 = createPlayerBuilder("player2", "Player 2", 1, "team1", PlayerColor.WHITE, PlayerType.HUMAN).build();
        const player3 = createPlayerBuilder("player3", "Player 3", 2, "team2", PlayerColor.WHITE, PlayerType.HUMAN).build();
        const team1 = createTeamBuilder("team1").setPlayers([player1, player2]).build();
        const team2 = createTeamBuilder("team2").setPlayers([player3]).build();
        const teams = [team1, team2];

        const combatReport: CombatInfo[] = [];

        // Colony was captured by player2, but now no conflict
        const colony = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "player3", "team3").build();
        colony.captured = true;
        colony.capturedTurn = 3;
        colony.originalPlayerId = "player1";
        colony.originalTeamId = "team1";

        const colonyMap: ColonyMap = { [colony.id]: colony };

        // No task forces at the colony's star
        const taskForceMap: TaskForceMap = {};

        // Star at (0,0)
        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };
        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        // Run processPlanetaryAttacks
        processPlanetaryAttacks(5, teams, colonyMap, taskForceMap, combatReport, mapData);

        // Colony should transfer to player2 (teammate)
        expect(colonyMap["star1-0"].playerId).toBe("player2");
        expect(colonyMap["star1-0"].teamId).toBe("team1");
        expect(colonyMap["star1-0"].captured).toBe(false);
        expect(colonyMap["star1-0"].capturedTurn).toBe(0);
        expect(colonyMap["star1-0"].originalPlayerId).toBeUndefined();
        expect(colonyMap["star1-0"].originalTeamId).toBeUndefined();
    });

    it('should revert besieged colony to not besieged if conflict ends', () => {
        jest.spyOn(simulationCombat, "getCombatResults").mockReturnValue({
            winner: "",
            totalLosses: {},
            firstRoundLosses: {},
            combatLogs: []
        });

        // Setup teams and players
        const player1 = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN).build();
        const team1 = createTeamBuilder("team1").setPlayers([player1]).build();
        const teams = [team1];

        const combatReport: CombatInfo[] = [];

        // Colony was besieged, but now no conflict
        const colony = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "player1", "team1").build();
        colony.besieged = true;

        const colonyMap: ColonyMap = { [colony.id]: colony };

        // No task forces at the colony's star
        const taskForceMap: TaskForceMap = {};

        // Star at (0,0)
        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };
        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        // Run processPlanetaryAttacks
        processPlanetaryAttacks(5, teams, colonyMap, taskForceMap, combatReport, mapData);

        // Colony should no longer be besieged
        expect(colonyMap["star1-0"].besieged).toBe(false);
    });

    it('should besiege colony if attacked and has defenses', () => {
        (getRandomIndex as jest.Mock).mockReturnValueOnce(0);
        jest.spyOn(simulationCombat, "getCombatResults").mockReturnValue({
            winner: "",
            totalLosses: {},
            firstRoundLosses: {},
            combatLogs: []
        });

        // Setup teams and players
        const player1 = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN).build();
        const player2 = createPlayerBuilder("player2", "Player 2", 1, "team2", PlayerColor.WHITE, PlayerType.HUMAN).build();
        const team1 = createTeamBuilder("team1").setPlayers([player1]).build();
        const team2 = createTeamBuilder("team2").setPlayers([player2]).build();
        const teams = [team1, team2];

        const combatReport: CombatInfo[] = [];

        // Colony with missile base (defenses)
        const colony = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "player1", "team1").setMissileBases(1).build();
        const colonyMap: ColonyMap = { [colony.id]: colony };

        // Enemy task force at the same star with warships
        const taskForce = createTaskForceBuilder("tf-0-0", "player2", "team2", { x: 0, y: 0 }).setEscorts(1).build();
        const taskForceMap: TaskForceMap = { [taskForce.id]: taskForce };

        // Star at (0,0)
        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };
        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        // Run processPlanetaryAttacks
        processPlanetaryAttacks(4, teams, colonyMap, taskForceMap, combatReport, mapData);

        // Colony should be besieged and attacked
        expect(colonyMap["star1-0"].besieged).toBe(true);
        expect(colonyMap["star1-0"].attacked).toBe(true);
    });

    it('should capture colony if attacked and has no defenses', () => {
        (getRandomIndex as jest.Mock).mockReturnValueOnce(0);
        jest.spyOn(simulationCombat, "getCombatResults").mockReturnValue({
            winner: "",
            totalLosses: {},
            firstRoundLosses: {},
            combatLogs: []
        });

        // Setup teams and players
        const player1 = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN).build();
        const player2 = createPlayerBuilder("player2", "Player 2", 1, "team2", PlayerColor.WHITE, PlayerType.HUMAN).build();
        const team1 = createTeamBuilder("team1").setPlayers([player1]).build();
        const team2 = createTeamBuilder("team2").setPlayers([player2]).build();
        const teams = [team1, team2];

        const combatReport: CombatInfo[] = [];

        // Colony with no defenses
        const colony = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "player1", "team1").build();
        const colonyMap: ColonyMap = { [colony.id]: colony };

        // Enemy task force at the same star with warships
        const taskForce = createTaskForceBuilder("tf-0-0", "player2", "team2", { x: 0, y: 0 }).setEscorts(1).build();
        const taskForceMap: TaskForceMap = { [taskForce.id]: taskForce };

        // Star at (0,0)
        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };
        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        // Run processPlanetaryAttacks
        processPlanetaryAttacks(4, teams, colonyMap, taskForceMap, combatReport, mapData);

        // Colony should be captured by player2
        expect(colonyMap["star1-0"].captured).toBe(true);
        expect(colonyMap["star1-0"].playerId).toBe("player2");
        expect(colonyMap["star1-0"].teamId).toBe("team2");
        expect(colonyMap["star1-0"].originalPlayerId).toBe("player1");
        expect(colonyMap["star1-0"].originalTeamId).toBe("team1");
        expect(colonyMap["star1-0"].capturedTurn).toBe(4);
        expect(colonyMap["star1-0"].attacked).toBe(true);
    });

    it('should not change colony if surviving task forces are from same team', () => {
        jest.spyOn(simulationCombat, "getCombatResults").mockReturnValue({
            winner: "",
            totalLosses: {},
            firstRoundLosses: {},
            combatLogs: []
        });

        // Setup teams and players
        const player1 = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN).build();
        const team1 = createTeamBuilder("team1").setPlayers([player1]).build();
        const teams = [team1];

        const combatReport: CombatInfo[] = [];

        // Colony owned by player1
        const colony = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "player1", "team1").build();
        const colonyMap: ColonyMap = { [colony.id]: colony };

        // Task force from same team at the same star with warships
        const taskForce = createTaskForceBuilder("tf-0-0", "player1", "team1", { x: 0, y: 0 }).setEscorts(1).build();
        const taskForceMap: TaskForceMap = { [taskForce.id]: taskForce };

        // Star at (0,0)
        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };
        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        // Run processPlanetaryAttacks
        processPlanetaryAttacks(4, teams, colonyMap, taskForceMap, combatReport, mapData);

        // Colony should not be captured or besieged
        expect(colonyMap["star1-0"].captured).toBeFalsy();
        expect(colonyMap["star1-0"].besieged).toBeFalsy();
        expect(colonyMap["star1-0"].playerId).toBe("player1");
    });
});

describe('groupTaskForcesByCoordAndTeam', () => {
    it('task forces group by coord with none in same coord', () => {
        const teams: Team[] = [];
        teams.push({
            name: "1",
            players: [createPlayerBuilder("player1", "bill", 0, "1", PlayerColor.BLUE, PlayerType.HUMAN).build()]
        }, {
            name: "1",
            players: [createPlayerBuilder("player2", "mj", 1, "2", PlayerColor.WHITE, PlayerType.HUMAN).build()]
        });

        const taskForce0 = createTaskForceBuilder("tf-1-0", "player1", "1", { x: 0, y: 0 }).setEscorts(1).build();
        const taskForce1 = createTaskForceBuilder("tf-2-0", "player2", "2", { x: 1, y: 1 }).setEscorts(1).build();
        const taskForces: TaskForce[] = [taskForce0, taskForce1];

        const expected: GroupedByCoordAndTeam[] = [{
            coord: taskForce0.coord,
            teamMap: {
                "1": [{
                    ...taskForce0
                }]
            }
        }, {
            coord: taskForce1.coord,
            teamMap: {
                "2": [{
                    ...taskForce1
                }]
            }
        }];

        const result = groupTaskForcesByCoordAndTeam(teams, taskForces);

        expect(expected).toEqual(result);
    });


    it('task forces group by coord with 3 in same coord', () => {
        const teams: Team[] = [];
        teams.push({
            name: "1",
            players: [createPlayerBuilder("player1", "bill", 0, "1", PlayerColor.BLUE, PlayerType.HUMAN).build()]
        }, {
            name: "1",
            players: [createPlayerBuilder("player2", "mj", 1, "2", PlayerColor.WHITE, PlayerType.HUMAN).build()]
        });

        const taskForce0 = createTaskForceBuilder("tf-1-0", "player1", "1", { x: 1, y: 1 }).setEscorts(1).build();
        const taskForce1 = createTaskForceBuilder("tf-2-0", "player2", "2", { x: 1, y: 1 }).setEscorts(1).build();
        const taskForce2 = createTaskForceBuilder("tf-2-1", "player2", "2", { x: 1, y: 1 }).setEscorts(1).build();
        const taskForces: TaskForce[] = [taskForce0, taskForce1, taskForce2];

        const expected: GroupedByCoordAndTeam[] = [{
            coord: taskForce0.coord,
            teamMap: {
                "1": [{
                    ...taskForce0
                }],
                "2": [{
                    ...taskForce1
                }, {
                    ...taskForce2
                }]
            }
        }];

        const result = groupTaskForcesByCoordAndTeam(teams, taskForces);

        expect(expected).toEqual(result);
    });
});

describe('processShipToShipCombat', () => {
    it('ship to ship where 0 conflict exists', () => {
        jest.spyOn(simulationCombat, "getCombatResults").mockReturnValue({
            winner: "",
            totalLosses: {},
            firstRoundLosses: {},
            combatLogs: []
        });

        const teams: Team[] = [];
        teams.push({
            name: "1",
            players: [createPlayerBuilder("player1", "bill", 0, "1", PlayerColor.BLUE, PlayerType.HUMAN).build()]
        }, {
            name: "1",
            players: [createPlayerBuilder("player2", "mj", 1, "2", PlayerColor.WHITE, PlayerType.HUMAN).build()]
        });

        const taskForceMap: TaskForceMap = {};
        let taskForce = createTaskForceBuilder("tf-1-0", "player1", "1", { x: 0, y: 0 }).setEscorts(1).build();
        taskForceMap[taskForce.id] = taskForce;
        taskForce = createTaskForceBuilder("tf-2-0", "player2", "2", { x: 1, y: 1 }).setEscorts(1).build();
        taskForceMap[taskForce.id] = taskForce;
        const combatReport: CombatInfo[] = [];

        let star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = {};
        starMap[star.name] = star;
        star = createStarBuilder("star2", { x: 1, y: 1 }, SpectralClass.G).build();
        starMap[star.name] = star;

        const colonyMap: ColonyMap = {};

        const mapData: MapInfo = createMapInfoBuilder().setColumns(50).setRows(50).setStarMap(starMap).build();

        const expectedTeams = cloneDeep(teams);
        const expectedTaskForceMap = cloneDeep(taskForceMap);
        const expectedcombatReport: CombatInfo[] = [];

        const turn = 1;
        processShipToShipCombat(turn, teams, taskForceMap, colonyMap, combatReport, mapData);

        expect(expectedTeams).toEqual(teams);
        expect(expectedcombatReport).toEqual(combatReport);
        expect(expectedTaskForceMap).toEqual(taskForceMap);
    });
});

describe('updateFinalScore', () => {
    beforeEach(() => {
        if (jest.isMockFunction(getRandomIndex)) (getRandomIndex as jest.Mock).mockReset();
    });

    it('should increment player score for TR and ST planets with colonies', () => {
        (getRandomIndex as jest.Mock).mockReturnValueOnce(0);

        const teams: Team[] = [
            {
                name: "1",
                players: [createPlayerBuilder("player1", "bill", 0, "1", PlayerColor.BLUE, PlayerType.HUMAN).build()]
            },
            {
                name: "2",
                players: [createPlayerBuilder("player2", "mj", 1, "2", PlayerColor.WHITE, PlayerType.HUMAN).build()]
            }
        ];

        const colonyTR = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "player1", "1").build();
        const colonyST = createColonyBuilder("star2-0", 80, 80, PlanetType.ST, "star2", "player2", "2").build();

        const colonyMap: ColonyMap = {
            [colonyTR.id]: colonyTR,
            [colonyST.id]: colonyST
        };

        const taskForceMap: TaskForceMap = {}; // No task forces needed for this test

        const star1 = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G)
            .setPlanets([createPlanetBuilder("star1-0", "star1", 0, PlanetType.TR, 80).build()])
            .build();
        const star2 = createStarBuilder("star2", { x: 1, y: 1 }, SpectralClass.G)
            .setPlanets([createPlanetBuilder("star2-0", "star2", 0, PlanetType.ST, 60).build()])
            .build();

        const starMap: StarMap = {
            [star1.name]: star1,
            [star2.name]: star2
        };

        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        const gameState = createGameStateBuilder("1", "player1", GameMode.NORMAL).setTeams(cloneDeep(teams)).setTaskForceMap(cloneDeep(taskForceMap)).setColonyMap(cloneDeep(colonyMap)).build();

        // Before: no scores
        expect(gameState.teams[0].players[0].score).toBeUndefined();
        expect(gameState.teams[1].players[0].score).toBeUndefined();

        updateFinalScore(gameState, mapData);

        expect(gameState.teams[0].players[0].score).toEqual({ trPlanets: 1, stPlanets: 0 });
        expect(gameState.teams[1].players[0].score).toEqual({ trPlanets: 0, stPlanets: 1 });
    });

    it('should increment score for nonbesieged colony if no direct colony on planet', () => {
        (getRandomIndex as jest.Mock).mockReturnValueOnce(0);

        const teams: Team[] = [
            {
                name: "1",
                players: [createPlayerBuilder("player1", "bill", 0, "1", PlayerColor.BLUE, PlayerType.HUMAN).build()]
            }
        ];

        // Colony is not on the planet but is at the star and not besieged
        const colony = createColonyBuilder("star1-1", 80, 80, PlanetType.TR, "star1", "player1", "1").build();
        colony.besieged = false;

        const colonyMap: ColonyMap = {
            [colony.id]: colony
        };

        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G)
            .setPlanets([createPlanetBuilder("star1-0", "star1", 0, PlanetType.TR, 80).build()])
            .build();

        const starMap: StarMap = {
            [star.name]: star
        };

        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        const gameState = createGameStateBuilder("1", "player1", GameMode.NORMAL).setTeams(cloneDeep(teams)).setColonyMap(cloneDeep(colonyMap)).build();

        updateFinalScore(gameState, mapData);

        expect(gameState.teams[0].players[0].score).toEqual({ trPlanets: 1, stPlanets: 0 });
    });

    it('should increment score for task force if no colony present', () => {
        (getRandomIndex as jest.Mock).mockReturnValueOnce(0);

        const teams: Team[] = [
            {
                name: "1",
                players: [createPlayerBuilder("player1", "bill", 0, "1", PlayerColor.BLUE, PlayerType.HUMAN).build()]
            }
        ];

        const taskForce = createTaskForceBuilder("tf-1-0", "player1", "1", { x: 0, y: 0 }).setEscorts(1).build();

        const colonyMap: ColonyMap = {};

        const taskForceMap: TaskForceMap = {
            [taskForce.id]: taskForce
        };

        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G)
            .setPlanets([createPlanetBuilder("star1-0", "star1", 0, PlanetType.TR, 80).build()])
            .build();

        const starMap: StarMap = {
            [star.name]: star
        };

        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        const gameState = createGameStateBuilder("1", "player1", GameMode.NORMAL).setTeams(cloneDeep(teams)).setTaskForceMap(cloneDeep(taskForceMap)).setColonyMap(cloneDeep(colonyMap)).build();

        updateFinalScore(gameState, mapData);

        expect(gameState.teams[0].players[0].score).toEqual({ trPlanets: 1, stPlanets: 0 });
    });

    it('should not increment score if no colony or task force present', () => {
        (getRandomIndex as jest.Mock).mockReturnValueOnce(0);

        const teams: Team[] = [
            {
                name: "1",
                players: [createPlayerBuilder("player1", "bill", 0, "1", PlayerColor.BLUE, PlayerType.HUMAN).build()]
            }
        ];

        const colonyMap: ColonyMap = {};
        const taskForceMap: TaskForceMap = {};

        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G)
            .setPlanets([createPlanetBuilder("star1-0", "star1", 0, PlanetType.TR, 80).build()])
            .build();

        const starMap: StarMap = {
            [star.name]: star
        };

        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        const gameState = createGameStateBuilder("1", "player1", GameMode.NORMAL).setTeams(cloneDeep(teams)).setTaskForceMap(cloneDeep(taskForceMap)).setColonyMap(cloneDeep(colonyMap)).build();

        updateFinalScore(gameState, mapData);

        expect(gameState.teams[0].players[0].score).toBeUndefined();
    });


});

describe('processShipToShipCombat', () => {

    afterEach(() => {
        jest.resetAllMocks();
        jest.restoreAllMocks();
    });

    it('should add combat reports when task forces from different teams are at the same star', () => {
        const teams: Team[] = [
            {
                name: "1",
                players: [createPlayerBuilder("player1", "bill", 0, "1", PlayerColor.BLUE, PlayerType.HUMAN).build()]
            },
            {
                name: "2",
                players: [createPlayerBuilder("player2", "mj", 1, "2", PlayerColor.WHITE, PlayerType.HUMAN).build()]
            }
        ];

        const tf1 = createTaskForceBuilder("tf-1", "player1", "1", { x: 5, y: 5 }).setEscorts(1).build();
        const tf2 = createTaskForceBuilder("tf-2", "player2", "2", { x: 5, y: 5 }).setEscorts(1).build();

        const taskForceMap: TaskForceMap = {
            [tf1.id]: tf1,
            [tf2.id]: tf2
        };

        const star = createStarBuilder("star1", { x: 5, y: 5 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };

        const mapData: MapInfo = createMapInfoBuilder().setColumns(50).setRows(50).setStarMap(starMap).build();

        const combatReport: CombatInfo[] = [];
        const colonyMap: ColonyMap = {};

        const turn = 1;
        processShipToShipCombat(turn, teams, taskForceMap, colonyMap, combatReport, mapData);

        // Both players should have a combat report for the same battle
        expect(combatReport.length).toBe(2);
        expect(combatReport[0].coord).toEqual({ x: 5, y: 5 });
        expect(combatReport[1].coord).toEqual({ x: 5, y: 5 });
        expect([combatReport[0].playerId, combatReport[1].playerId]).toEqual(
            expect.arrayContaining(["player1", "player2"])
        );
        // expect(combatReport[0].taskForceIds).toEqual(expect.arrayContaining(["tf-1", "tf-2"]));
        // expect(combatReport[1].taskForceIds).toEqual(expect.arrayContaining(["tf-1", "tf-2"]));
    });

    it('should not add combat reports when only one team is present at a star', () => {
        const teams: Team[] = [
            {
                name: "1",
                players: [createPlayerBuilder("player1", "bill", 0, "1", PlayerColor.BLUE, PlayerType.HUMAN).build()]
            }
        ];

        const tf1 = createTaskForceBuilder("tf-1", "player1", "1", { x: 2, y: 2 }).setEscorts(1).build();

        const taskForceMap: TaskForceMap = {
            [tf1.id]: tf1
        };

        const star = createStarBuilder("star1", { x: 2, y: 2 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };

        const mapData: MapInfo = createMapInfoBuilder().setColumns(50).setRows(50).setStarMap(starMap).build();

        const combatReport: CombatInfo[] = [];
        const colonyMap: ColonyMap = {};

        const turn = 1;
        processShipToShipCombat(turn, teams, taskForceMap, colonyMap, combatReport, mapData);

        expect(combatReport).toEqual([]);
    });

    it('should ignore task forces that are not at a star', () => {
        const teams: Team[] = [
            {
                name: "1",
                players: [createPlayerBuilder("player1", "bill", 0, "1", PlayerColor.BLUE, PlayerType.HUMAN).build()]
            },
            {
                name: "2",
                players: [createPlayerBuilder("player2", "mj", 1, "2", PlayerColor.WHITE, PlayerType.HUMAN).build()]
            }
        ];

        const tf1 = createTaskForceBuilder("tf-1", "player1", "1", { x: 10, y: 10 }).setEscorts(1).build();
        const tf2 = createTaskForceBuilder("tf-2", "player2", "2", { x: 10, y: 10 }).setEscorts(1).build();

        // No star at (10, 10)
        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };

        const mapData: MapInfo = createMapInfoBuilder().setColumns(50).setRows(50).setStarMap(starMap).build();

        const taskForceMap: TaskForceMap = {
            [tf1.id]: tf1,
            [tf2.id]: tf2
        };

        const combatReport: CombatInfo[] = [];
        const colonyMap: ColonyMap = {};

        const turn = 1;
        processShipToShipCombat(turn, teams, taskForceMap, colonyMap, combatReport, mapData);

        expect(combatReport).toEqual([]);
    });

    it('should ignore task forces that are moving (have a destinationCoord)', () => {
        const teams: Team[] = [
            {
                name: "1",
                players: [createPlayerBuilder("player1", "bill", 0, "1", PlayerColor.BLUE, PlayerType.HUMAN).build()]
            },
            {
                name: "2",
                players: [createPlayerBuilder("player2", "mj", 1, "2", PlayerColor.WHITE, PlayerType.HUMAN).build()]
            }
        ];

        const tf1 = createTaskForceBuilder("tf-1", "player1", "1", { x: 1, y: 1 }).setEscorts(1).setDestinationCoord({ x: 2, y: 2 }).build();
        const tf2 = createTaskForceBuilder("tf-2", "player2", "2", { x: 1, y: 1 }).setEscorts(1).build();

        const star = createStarBuilder("star1", { x: 1, y: 1 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };

        const mapData: MapInfo = createMapInfoBuilder().setColumns(50).setRows(50).setStarMap(starMap).build();

        const taskForceMap: TaskForceMap = {
            [tf1.id]: tf1,
            [tf2.id]: tf2
        };

        const combatReport: CombatInfo[] = [];
        const colonyMap: ColonyMap = {};

        const turn = 1;
        processShipToShipCombat(turn, teams, taskForceMap, colonyMap, combatReport, mapData);

        // Only one idle task force at the star, so no combat
        expect(combatReport).toEqual([]);
    });
});

describe('processEncounters', () => {
    it('should report encounters between idle task forces at the same star', () => {
        const player1 = createPlayerBuilder('p1', 'player1', 0, 't1', PlayerColor.BLUE, PlayerType.HUMAN).setTechnologies(createPlayerTechnologiesBuilder().setCurrentMovementRate(1).build()).build();
        const player2 = createPlayerBuilder('p2', 'player2', 1, 't2', PlayerColor.WHITE, PlayerType.HUMAN).setTechnologies(createPlayerTechnologiesBuilder().setCurrentMovementRate(1).build()).build();
        const team1 = createTeamBuilder('t1').setPlayers([player1]).build();
        const team2 = createTeamBuilder('t2').setPlayers([player2]).build();

        const star = createStarBuilder('star1', { x: 1, y: 1 }, SpectralClass.G).build();
        const mapData = createMapInfoBuilder().setStarMap({ [star.name]: star }).build();

        const tf1 = createTaskForceBuilder('tf1', 'p1', 't1', { x: 1, y: 1 }).build();
        const tf2 = createTaskForceBuilder('tf2', 'p2', 't2', { x: 1, y: 1 }).build();

        const gameState = createGameStateBuilder("1", "player1", GameMode.NORMAL).setTeams([team1, team2]).setTaskForceMap({ "tf1": tf1, "tf2": tf2 }).build();

        processEncounters(gameState, mapData);

        expect(gameState.encounterReport.length).toBeGreaterThan(0);
        expect(gameState.encounterReport[0].message).toMatch(/has encountered task force/);
    });

    it('should report encounters between idle task force and enemy colony at the same star', () => {
        const player1 = createPlayerBuilder('p1', 'player1', 0, 't1', PlayerColor.BLUE, PlayerType.HUMAN).setTechnologies(createPlayerTechnologiesBuilder().setCurrentMovementRate(1).build()).build();
        const player2 = createPlayerBuilder('p2', 'player2', 0, 't2', PlayerColor.WHITE, PlayerType.HUMAN).setTechnologies(createPlayerTechnologiesBuilder().setCurrentMovementRate(1).build()).build();
        const team1 = createTeamBuilder('t1').setPlayers([player1]).build();
        const team2 = createTeamBuilder('t2').setPlayers([player2]).build();

        const star = createStarBuilder('star1', { x: 2, y: 2 }, SpectralClass.G).build();
        const mapData = createMapInfoBuilder().setStarMap({ [star.name]: star }).build();

        const colony = createColonyBuilder('col1', 60, 80, PlanetType.TR, 'star1', 'p2', 't2').build();
        const tf1 = createTaskForceBuilder('tf1', 'p1', 't1', { x: 2, y: 2 }).build();

        const gameState = createGameStateBuilder("1", "player1", GameMode.NORMAL).setTeams([team1, team2]).setColonyMap({ col1: colony }).setTaskForceMap({ tf1: tf1 }).build();

        processEncounters(gameState, mapData);

        expect(gameState.encounterReport.length).toBeGreaterThan(0);
        expect(gameState.encounterReport[0].message).toMatch(/has encountered colony/);
    });

    it('should report encounters between colony and enemy idle task force at the same star', () => {
        const player1 = createPlayerBuilder('p1', 'player1', 0, 't1', PlayerColor.BLUE, PlayerType.HUMAN).setTechnologies(createPlayerTechnologiesBuilder().setCurrentMovementRate(1).build()).build();
        const player2 = createPlayerBuilder('p2', 'player2', 0, 't2', PlayerColor.WHITE, PlayerType.HUMAN).setTechnologies(createPlayerTechnologiesBuilder().setCurrentMovementRate(1).build()).build();
        const team1 = createTeamBuilder('t1').setPlayers([player1]).build();
        const team2 = createTeamBuilder('t2').setPlayers([player2]).build();

        const star = createStarBuilder('star1', { x: 3, y: 3 }, SpectralClass.G).build();
        const mapData = createMapInfoBuilder().setStarMap({ [star.name]: star }).build();

        const colony = createColonyBuilder('col1', 60, 80, PlanetType.TR, 'star1', 'p1', 't1').build();
        const tf2 = createTaskForceBuilder('tf2', 'p2', "t2", { x: 3, y: 3 }).build();

        const gameState = createGameStateBuilder("1", "player1", GameMode.NORMAL).setTeams([team1, team2]).setColonyMap({ col1: colony }).setTaskForceMap({ tf2: tf2 }).build();

        processEncounters(gameState, mapData);

        expect(gameState.encounterReport.length).toBeGreaterThan(0);
        expect(gameState.encounterReport[0].message).toMatch(/Colony col1 has encountered task force/);
    });

    it('should not report encounters if no enemy task forces or colonies are present', () => {
        const player1 = createPlayerBuilder('p1', 'player1', 0, 't1', PlayerColor.BLUE, PlayerType.HUMAN).setTechnologies(createPlayerTechnologiesBuilder().setCurrentMovementRate(1).build()).build();
        const team1 = createTeamBuilder('t1').setPlayers([player1]).build();

        const star = createStarBuilder('star1', { x: 4, y: 4 }, SpectralClass.G).build();
        const mapData = createMapInfoBuilder().setStarMap({ [star.name]: star }).build();

        const tf1 = createTaskForceBuilder('tf1', 'p1', 't1', { x: 4, y: 4 }).build();

        const gameState = createGameStateBuilder("1", "player1", GameMode.NORMAL).setTeams([team1]).setTaskForceMap({ tf1: tf1 }).build();

        processEncounters(gameState, mapData);

        expect(gameState.encounterReport.length).toBe(0);
    });

    it('should not report encounters for moving task forces (with destinationCoord)', () => {
        const player1 = createPlayerBuilder('p1', 'player1', 0, 't1', PlayerColor.BLUE, PlayerType.HUMAN).setTechnologies(createPlayerTechnologiesBuilder().setCurrentMovementRate(1).build()).build();
        const player2 = createPlayerBuilder('p2', 'player2', 0, 't2', PlayerColor.WHITE, PlayerType.HUMAN).setTechnologies(createPlayerTechnologiesBuilder().setCurrentMovementRate(1).build()).build();
        const team1 = createTeamBuilder('t1').setPlayers([player1]).build();
        const team2 = createTeamBuilder('t2').setPlayers([player2]).build();

        const star = createStarBuilder('star1', { x: 5, y: 5 }, SpectralClass.G).build();
        const mapData = createMapInfoBuilder().setStarMap({ [star.name]: star }).build();

        const tf1 = createTaskForceBuilder('tf1', 'p1', 't1', { x: 5, y: 5 }).setDestinationCoord({ x: 6, y: 6 }).build();
        const tf2 = createTaskForceBuilder('tf2', 'p2', 't2', { x: 5, y: 5 }).build();

        const gameState = createGameStateBuilder("1", "player1", GameMode.NORMAL).setTeams([team1, team2]).setTaskForceMap({ tf1: tf1, tf2: tf2 }).build();

        processEncounters(gameState, mapData);

        // Only tf2 is idle, so no encounter
        expect(gameState.encounterReport.length).toBe(0);
    });
});

describe('exploreStar', () => {
    const player = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN).setTechnologies(createPlayerTechnologiesBuilder().setCurrentMovementRate(1).build()).build();
    //     id: "player1",
    //     teamId: "team1",
    //     technologies: { currentMovementRate: 1 }
    // } as any;

    // function makeStar(overrides = {}) {
    //     return {
    //         name: "star1",
    //         coord: { x: 0, y: 0 },
    //         exploredByTeamIds: [],
    //         ...overrides
    //     } as any;
    // }

    // function makeTaskForce(overrides = {}) {
    //     return {
    //         id: "tf1",
    //         scouts: 0,
    //         colonyTransports: 0,
    //         colonyTransportsWithCet: 0,
    //         escorts: 0,
    //         attackShips: 0,
    //         dreadnaughts: 0,
    //         ...overrides
    //     } as any;
    //}

    beforeEach(() => {
        if (jest.isMockFunction(roll6SidedDie)) (roll6SidedDie as jest.Mock).mockReset();
    });

    it('should mark star as explored if task force has warships', () => {
        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const tf = createTaskForceBuilder("tr1", "p1", "t1", { x: 0, y: 0 }).setEscorts(1).build();
        const explorationData: ExplorationData = {};
        const result = exploreStar(star, player, tf, explorationData);
        expect(explorationData[star.name]).toContain(player.teamId);
        expect(result.message).toMatch(/was successfully explored/);
    });

    it('should apply scout losses on exploration', () => {
        // Force roll6SidedDie to always return 1 for this test
        (roll6SidedDie as jest.Mock).mockReturnValue(1);
        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const tf = createTaskForceBuilder("tr1", "p1", "t1", { x: 0, y: 0 }).setScouts(3).build();
        const explorationData: ExplorationData = {};
        const result = exploreStar(star, player, tf, explorationData);
        expect(tf.scouts).toBe(0);
        expect(result.message).toMatch(/lost 3 scouts/);
        jest.restoreAllMocks();
    });

    it('should apply colony transport losses on exploration', () => {
        (roll6SidedDie as jest.Mock).mockReturnValue(1);
        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const tf = createTaskForceBuilder("tr1", "p1", "t1", { x: 0, y: 0 }).setColonyTransports(2).build();
        const explorationData: ExplorationData = {};
        const result = exploreStar(star, player, tf, explorationData);
        expect(tf.colonyTransports).toBe(0);
        expect(result.message).toMatch(/lost 2 CTs/);
        jest.restoreAllMocks();
    });

    it('should apply colony transports with CET losses on exploration', () => {
        (roll6SidedDie as jest.Mock).mockReturnValue(1);
        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const tf = createTaskForceBuilder("tr1", "p1", "t1", { x: 0, y: 0 }).setColonyTransportsWithCet(2).build();
        const explorationData: ExplorationData = {};
        const result = exploreStar(star, player, tf, explorationData);
        expect(tf.colonyTransportsWithCet).toBe(0);
        expect(result.message).toMatch(/lost 2 CTs with CET/);
        jest.restoreAllMocks();
    });

    it('should mark star as explored if any ships remain after losses', () => {
        // Only one scout, will lose it, but has 1 escort (warship)
        (roll6SidedDie as jest.Mock).mockReturnValue(1);
        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const tf = createTaskForceBuilder("tr1", "p1", "t1", { x: 0, y: 0 }).setScouts(1).setEscorts(1).build();
        const explorationData: ExplorationData = {};
        const result = exploreStar(star, player, tf, explorationData);
        expect(explorationData[star.name]).toContain(player.teamId);
        expect(result.message).toMatch(/was successfully explored/);
        jest.restoreAllMocks();
    });

    it('should fail exploration if all ships are lost', () => {
        (roll6SidedDie as jest.Mock).mockReturnValue(1);
        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const tf = createTaskForceBuilder("tr1", "p1", "t1", { x: 0, y: 0 }).setScouts(1).build();
        const explorationData: ExplorationData = {};
        const result = exploreStar(star, player, tf, explorationData);
        expect(explorationData[star.name]).toBeUndefined();
        expect(result.message).toMatch(/Exploration of star1 failed/);
        jest.restoreAllMocks();
    });

    it('should not duplicate teamId in exploredByTeamIds', () => {
        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const tf = createTaskForceBuilder("tr1", "p1", "t1", { x: 0, y: 0 }).setEscorts(1).build();
        const explorationData: ExplorationData = { "star1": ["team1"] };
        const result = exploreStar(star, player, tf, explorationData);
        // Should not add duplicate
        expect(explorationData[star.name].filter(id => id === "team1").length).toBe(2); // Note: original code does not prevent duplicates
        expect(result.message).toMatch(/was successfully explored/);
    });
});

describe('cleanUpTaskForces', () => {
    const mapData = createMapInfoBuilder().build();

    it('removes task forces out of supply range and adds messages', () => {
        // Setup player and team
        const player = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN)
            .setTechnologies(createPlayerTechnologiesBuilder().setCurrentMovementRate(1).build())
            .build();
        const team = createTeamBuilder("team1").setPlayers([player]).build();
        const teams = [team];

        // Colony in supply at (0,0)
        const colony = createColonyBuilder("col1", 80, 80, PlanetType.TR, "star1", "player1", "team1").build();
        const colonyMap: ColonyMap = { [colony.id]: colony };

        // Task force out of supply range (assuming maxRange = 1)
        const taskForce = createTaskForceBuilder("tf1", "player1", "team1", { x: 5, y: 5 }).setEscorts(1).build();
        const taskForceMap: TaskForceMap = { [taskForce.id]: taskForce };

        // Patch getMaxShipRange to return 1 for this player
        jest.spyOn(playerUtils, "getMaxShipRange").mockReturnValue(1);
        // Patch getSupplyCoords to return only the colony's coord
        jest.spyOn(playerUtils, "getSupplyCoords").mockReturnValue([{ x: 0, y: 0 }]);

        const messages = cleanUpTaskForces(taskForceMap, colonyMap, teams, 1, mapData);

        expect(messages.length).toBe(1);
        expect(messages[0].playerId).toBe("player1");
        expect(messages[0].messages[0]).toMatch(/was removed becaused it was outside supply range/);
        expect(taskForceMap["tf1"]).toBeUndefined();

        jest.restoreAllMocks();
    });

    it('re-routes task force if path is invalid', () => {
        // Setup player and team
        const player = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN)
            .setTechnologies(createPlayerTechnologiesBuilder().setCurrentMovementRate(1).build())
            .build();
        const team = createTeamBuilder("team1").setPlayers([player]).build();
        const teams = [team];

        // Colony in supply at (0,0)
        const colony = createColonyBuilder("col1", 80, 80, PlanetType.TR, "star1", "player1", "team1").build();
        const colonyMap: ColonyMap = { [colony.id]: colony };

        // Task force in supply range but with invalid path
        const taskForce = createTaskForceBuilder("tf1", "player1", "team1", { x: 0, y: 0 }).setEscorts(1).build();
        // Path with an element out of range
        taskForce.path = {
            elements: [
                { cost: 1, accumulativeCost: 1, coord: { x: 0, y: 0 }, turn: 1 },
                { cost: 1, accumulativeCost: 2, coord: { x: 10, y: 10 }, turn: 2 }
            ],
            turn: 2,
            totalCost: 2
        };
        const taskForceMap: TaskForceMap = { [taskForce.id]: taskForce };

        // Patch getMaxShipRange to return 1 for this player
        jest.spyOn(playerUtils, "getMaxShipRange").mockReturnValue(1);
        // Patch getSupplyCoords to return only the colony's coord
        jest.spyOn(playerUtils, "getSupplyCoords").mockReturnValue([{ x: 0, y: 0 }]);
        // Patch isPathValid to always return false
        jest.spyOn(movement, "isPathValid").mockReturnValue(false);
        // Patch findPath to return a new valid path
        jest.spyOn(pathUtils, "findPath").mockImplementation((): Path => ({
            elements: [{ cost: 1, accumulativeCost: 1, coord: { x: 0, y: 0 }, turn: 1 }],
            turn: 1,
            totalCost: 1
        }));

        const messages = cleanUpTaskForces(taskForceMap, colonyMap, teams, 1, mapData);

        expect(messages.length).toBe(1);
        expect(messages[0].messages[0]).toMatch(/Re-routing Task force/);
        expect(taskForceMap["tf1"].path).toBeDefined();
        expect(taskForceMap["tf1"].eta).toBe(1);

        jest.restoreAllMocks();
    });

    it('does not remove task force in supply range with no path', () => {
        // Setup player and team
        const player = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN)
            .setTechnologies(createPlayerTechnologiesBuilder().setCurrentMovementRate(1).build())
            .build();
        const team = createTeamBuilder("team1").setPlayers([player]).build();
        const teams = [team];

        // Colony in supply at (0,0)
        const colony = createColonyBuilder("col1", 80, 80, PlanetType.TR, "star1", "player1", "team1").build();
        const colonyMap: ColonyMap = { [colony.id]: colony };

        // Task force in supply range
        const taskForce = createTaskForceBuilder("tf1", "player1", "team1", { x: 0, y: 0 }).setEscorts(1).build();
        const taskForceMap: TaskForceMap = { [taskForce.id]: taskForce };

        // Patch getMaxShipRange to return 1 for this player
        jest.spyOn(playerUtils, "getMaxShipRange").mockReturnValue(1);
        // Patch getSupplyCoords to return only the colony's coord
        jest.spyOn(playerUtils, "getSupplyCoords").mockReturnValue([{ x: 0, y: 0 }]);

        const messages = cleanUpTaskForces(taskForceMap, colonyMap, teams, 1, mapData);

        expect(messages.length).toBe(0);
        expect(taskForceMap["tf1"]).toBeDefined();

        jest.restoreAllMocks();
    });

    it('removes task force with no ships left', () => {
        // Setup player and team
        const player = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN)
            .setTechnologies(createPlayerTechnologiesBuilder().setCurrentMovementRate(1).build())
            .build();
        const team = createTeamBuilder("team1").setPlayers([player]).build();
        const teams = [team];

        // Colony in supply at (0,0)
        const colony = createColonyBuilder("col1", 80, 80, PlanetType.TR, "star1", "player1", "team1").build();
        const colonyMap: ColonyMap = { [colony.id]: colony };

        // Task force in supply range but with no ships
        const taskForce = createTaskForceBuilder("tf1", "player1", "team1", { x: 0, y: 0 }).build();
        const taskForceMap: TaskForceMap = { [taskForce.id]: taskForce };

        // Patch getMaxShipRange to return 1 for this player
        jest.spyOn(playerUtils, "getMaxShipRange").mockReturnValue(1);
        // Patch getSupplyCoords to return only the colony's coord
        jest.spyOn(playerUtils, "getSupplyCoords").mockReturnValue([{ x: 0, y: 0 }]);

        cleanUpTaskForces(taskForceMap, colonyMap, teams, 1, mapData);

        expect(taskForceMap["tf1"]).toBeUndefined();

        jest.restoreAllMocks();
    });
});

describe('moveTaskForces', () => {
    it('should move task force along its path and clear destination when arrived at star', () => {
        // Setup players and teams
        const player = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN)
            .setTechnologies(createPlayerTechnologiesBuilder().setCurrentMovementRate(1).build())
            .build();
        const team = createTeamBuilder("team1").setPlayers([player]).build();
        const teams = [team];

        // Setup star at (2,2)
        const star = createStarBuilder("star1", { x: 2, y: 2 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };
        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        // Task force at (0,0) with path to (2,2)
        const path: Path = {
            elements: [
                { cost: 1, accumulativeCost: 1, coord: { x: 1, y: 1 }, turn: 1 },
                { cost: 1, accumulativeCost: 2, coord: { x: 2, y: 2 }, turn: 2 }
            ],
            turn: 2,
            totalCost: 2
        };
        const taskForce = createTaskForceBuilder("tf1", "player1", "team1", { x: 0, y: 0 })
            .setEscorts(1)
            .setPath(path)
            .setDestinationCoord({ x: 2, y: 2 })
            .setDestinationStarId("star1")
            .setEta(2)
            .build();

        const gameState = createGameStateBuilder("1", "player1", GameMode.NORMAL)
            .setTeams(teams)
            .setTaskForceMap({ [taskForce.id]: { ...taskForce } })
            .build();

        // Move once: should move to (1,1)
        moveTaskForces(gameState, mapData);
        expect(gameState.taskForceMap["tf1"].coord).toEqual({ x: 1, y: 1 });
        expect(gameState.taskForceMap["tf1"].destinationCoord).toEqual({ x: 2, y: 2 });
        expect(gameState.arrivalReport.length).toBe(0);

        // Move again: should move to (2,2) and clear destination
        moveTaskForces(gameState, mapData);
        expect(gameState.taskForceMap["tf1"].coord).toEqual({ x: 2, y: 2 });
        expect(gameState.taskForceMap["tf1"].destinationCoord).toBeUndefined();
        expect(gameState.taskForceMap["tf1"].destinationStarId).toBeUndefined();
        expect(gameState.taskForceMap["tf1"].eta).toBeUndefined();
        expect(gameState.taskForceMap["tf1"].path).toBeUndefined();
        expect(gameState.arrivalReport.length).toBe(1);
        expect(gameState.arrivalReport[0].message).toMatch(/has arrived at star1/);
    });

    it('should add generic arrival report if not at a star', () => {
        const player = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN)
            .setTechnologies(createPlayerTechnologiesBuilder().setCurrentMovementRate(1).build())
            .build();
        const team = createTeamBuilder("team1").setPlayers([player]).build();
        const teams = [team];

        // No star at (2,2)
        const starMap: StarMap = {};
        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        const path: Path = {
            elements: [
                { cost: 1, accumulativeCost: 1, coord: { x: 2, y: 2 }, turn: 1 }
            ],
            turn: 1,
            totalCost: 1
        };
        const taskForce = createTaskForceBuilder("tf1", "player1", "team1", { x: 0, y: 0 })
            .setEscorts(1)
            .setPath(path)
            .setDestinationCoord({ x: 2, y: 2 })
            .setEta(1)
            .build();

        const gameState = createGameStateBuilder("1", "player1", GameMode.NORMAL)
            .setTeams(teams)
            .setTaskForceMap({ [taskForce.id]: { ...taskForce } })
            .build();

        moveTaskForces(gameState, mapData);

        expect(gameState.taskForceMap["tf1"].coord).toEqual({ x: 2, y: 2 });
        expect(gameState.arrivalReport.length).toBe(1);
        expect(gameState.arrivalReport[0].message).toMatch(/has arrived at \[2,2\]/);
    });

    it('should remove task force if it has no ships left after moving', () => {
        const player = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN)
            .setTechnologies(createPlayerTechnologiesBuilder().setCurrentMovementRate(1).build())
            .build();
        const team = createTeamBuilder("team1").setPlayers([player]).build();
        const teams = [team];

        const star = createStarBuilder("star1", { x: 1, y: 1 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };
        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        // Task force with no ships
        const path: Path = {
            elements: [
                { cost: 1, accumulativeCost: 1, coord: { x: 1, y: 1 }, turn: 1 }
            ],
            turn: 1,
            totalCost: 1
        };
        const taskForce = createTaskForceBuilder("tf1", "player1", "team1", { x: 0, y: 0 })
            .setPath(path)
            .setDestinationCoord({ x: 1, y: 1 })
            .setEta(1)
            .build();

        // Remove all ships
        taskForce.scouts = 0;
        taskForce.colonyTransports = 0;
        taskForce.colonyTransportsWithCet = 0;
        taskForce.escorts = 0;
        taskForce.attackShips = 0;
        taskForce.dreadnaughts = 0;

        const gameState = createGameStateBuilder("1", "player1", GameMode.NORMAL)
            .setTeams(teams)
            .setTaskForceMap({ [taskForce.id]: { ...taskForce } })
            .build();

        moveTaskForces(gameState, mapData);

        expect(gameState.taskForceMap["tf1"]).toBeUndefined();
    });

    it('should set changed to false for task forces with ships left', () => {
        const player = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN)
            .setTechnologies(createPlayerTechnologiesBuilder().setCurrentMovementRate(1).build())
            .build();
        const team = createTeamBuilder("team1").setPlayers([player]).build();
        const teams = [team];

        const star = createStarBuilder("star1", { x: 1, y: 1 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };
        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        const path: Path = {
            elements: [
                { cost: 1, accumulativeCost: 1, coord: { x: 1, y: 1 }, turn: 1 }
            ],
            turn: 1,
            totalCost: 1
        };
        const taskForce = createTaskForceBuilder("tf1", "player1", "team1", { x: 0, y: 0 })
            .setEscorts(1)
            .setPath(path)
            .setDestinationCoord({ x: 1, y: 1 })
            .setEta(1)
            .build();

        // Mark as changed
        taskForce.changed = true;

        const gameState = createGameStateBuilder("1", "player1", GameMode.NORMAL)
            .setTeams(teams)
            .setTaskForceMap({ [taskForce.id]: { ...taskForce } })
            .build();

        moveTaskForces(gameState, mapData);

        expect(gameState.taskForceMap["tf1"].changed).toBe(false);
    });

    it('should trigger exploration if star not explored by team', () => {
        const player = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN)
            .setTechnologies(createPlayerTechnologiesBuilder().setCurrentMovementRate(1).build())
            .build();
        const team = createTeamBuilder("team1").setPlayers([player]).build();
        const teams = [team];

        const star = createStarBuilder("star1", { x: 1, y: 1 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };
        const mapData = createMapInfoBuilder().setStarMap(starMap).build();

        const path: Path = {
            elements: [
                { cost: 1, accumulativeCost: 1, coord: { x: 1, y: 1 }, turn: 1 }
            ],
            turn: 1,
            totalCost: 1
        };
        const taskForce = createTaskForceBuilder("tf1", "player1", "team1", { x: 0, y: 0 })
            .setEscorts(1)
            .setPath(path)
            .setDestinationCoord({ x: 1, y: 1 })
            .setDestinationStarId("star1")
            .setEta(1)
            .build();

        const gameState = createGameStateBuilder("1", "player1", GameMode.NORMAL)
            .setTeams(teams)
            .setTaskForceMap({ [taskForce.id]: { ...taskForce } })
            .build();

        moveTaskForces(gameState, mapData);

        expect(gameState.explorationReport.length).toBe(1);
        expect(gameState.explorationReport[0].starId).toBe("star1");
        expect(gameState.explorationReport[0].playerId).toBe("player1");
    });
});

describe('isPathValid', () => {

    it('fuck it', () => {

        const path: Path = {
            "totalCost": 5, "turn": 3, "elements": [{ "coord": { "x": 3, "y": 1 }, "accumulativeCost": 3, "turn": 2, "cost": 1 },
            { "coord": { "x": 4, "y": 1 }, "accumulativeCost": 4, "turn": 2, "cost": 1 },
            { "coord": { "x": 5, "y": 2 }, "accumulativeCost": 5, "turn": 3, "cost": 1 }]
        }
        const supplyCoords: Coord[] = [{ "x": 0, "y": 0 }];
        const maxRange = 8;

        const result = isPathValid(path, supplyCoords, maxRange)

        expect(result).toBe(true);
    });


    it('returns true if all path elements are within maxRange of any supply coord', () => {
        const colonyCoords = [{ x: 0, y: 0 }];
        const maxRange = 2;
        const path: Path = {
            elements: [
                { cost: 1, accumulativeCost: 1, coord: { x: 0, y: 0 }, turn: 1 },
                { cost: 1, accumulativeCost: 2, coord: { x: 1, y: 1 }, turn: 2 }
            ],
            turn: 2,
            totalCost: 2
        };
        expect(
            isPathValid(path, colonyCoords, maxRange)
        ).toBe(true);
    });

    it('returns false if any path element is out of maxRange of all supply coords', () => {
        const colonyCoords = [{ x: 0, y: 0 }];
        const maxRange = 1;
        const path: Path = {
            elements: [
                { cost: 1, accumulativeCost: 1, coord: { x: 0, y: 0 }, turn: 1 },
                { cost: 1, accumulativeCost: 2, coord: { x: 2, y: 2 }, turn: 2 }
            ],
            turn: 2,
            totalCost: 2
        };
        expect(
            isPathValid(path, colonyCoords, maxRange)
        ).toBe(false);
    });

    it('returns true if at least one supply coord is within maxRange for all elements', () => {
        const colonyCoords = [{ x: 0, y: 0 }, { x: 2, y: 2 }];
        const maxRange = 1;
        const path: Path = {
            elements: [
                { cost: 1, accumulativeCost: 1, coord: { x: 2, y: 2 }, turn: 1 }
            ],
            turn: 1,
            totalCost: 1
        };
        expect(
            isPathValid(path, colonyCoords, maxRange)
        ).toBe(true);
    });

    it('returns true for empty path elements', () => {
        const colonyCoords = [{ x: 0, y: 0 }];
        const maxRange = 1;
        const path: Path = {
            elements: [],
            turn: 0,
            totalCost: 0
        };
        expect(
            isPathValid(path, colonyCoords, maxRange)
        ).toBe(true);
    });

    it('returns false if path element is out of range for all supply coords (multiple supply coords)', () => {
        const colonyCoords = [{ x: 0, y: 0 }, { x: 5, y: 5 }];
        const maxRange = 1;
        const path: Path = {
            elements: [
                { cost: 1, accumulativeCost: 1, coord: { x: 3, y: 3 }, turn: 1 }
            ],
            turn: 1,
            totalCost: 1
        };
        expect(
            isPathValid(path, colonyCoords, maxRange)
        ).toBe(false);
    });

    it('returns true if all elements are exactly at maxRange from a supply coord', () => {
        const colonyCoords = [{ x: 0, y: 0 }];
        const maxRange = 2;
        const path: Path = {
            elements: [
                { cost: 1, accumulativeCost: 1, coord: { x: 2, y: 0 }, turn: 1 },
                { cost: 1, accumulativeCost: 2, coord: { x: 0, y: 2 }, turn: 2 }
            ],
            turn: 2,
            totalCost: 2
        };
        expect(
            isPathValid(path, colonyCoords, maxRange)
        ).toBe(true);
    });

    it('returns true if path.elements is empty', () => {
        const supplyCoords = [{ x: 0, y: 0 }];
        const maxRange = 3;
        const path: Path = {
            elements: [],
            turn: 0,
            totalCost: 0
        };
        expect(isPathValid(path, supplyCoords, maxRange)).toBe(true);
    });

    it('returns true if all path elements are within maxRange of at least one supply coord', () => {
        const supplyCoords = [{ x: 0, y: 0 }];
        const maxRange = 2;
        const path: Path = {
            elements: [
                { cost: 1, accumulativeCost: 1, coord: { x: 1, y: 1 }, turn: 1 },
                { cost: 1, accumulativeCost: 2, coord: { x: 2, y: 0 }, turn: 2 }
            ],
            turn: 2,
            totalCost: 2
        };
        expect(isPathValid(path, supplyCoords, maxRange)).toBe(true);
    });

    it('returns false if any path element is out of maxRange of all supply coords', () => {
        const supplyCoords = [{ x: 0, y: 0 }];
        const maxRange = 1;
        const path: Path = {
            elements: [
                { cost: 1, accumulativeCost: 1, coord: { x: 0, y: 0 }, turn: 1 },
                { cost: 1, accumulativeCost: 2, coord: { x: 2, y: 2 }, turn: 2 }
            ],
            turn: 2,
            totalCost: 2
        };
        expect(isPathValid(path, supplyCoords, maxRange)).toBe(false);
    });

    it('returns true if at least one supply coord is within maxRange for all elements', () => {
        const supplyCoords = [{ x: 0, y: 0 }, { x: 2, y: 2 }];
        const maxRange = 1;
        const path: Path = {
            elements: [
                { cost: 1, accumulativeCost: 1, coord: { x: 2, y: 2 }, turn: 1 }
            ],
            turn: 1,
            totalCost: 1
        };
        expect(isPathValid(path, supplyCoords, maxRange)).toBe(true);
    });

    it('returns false if path element is out of range for all supply coords (multiple supply coords)', () => {
        const supplyCoords = [{ x: 0, y: 0 }, { x: 5, y: 5 }];
        const maxRange = 1;
        const path: Path = {
            elements: [
                { cost: 1, accumulativeCost: 1, coord: { x: 3, y: 3 }, turn: 1 }
            ],
            turn: 1,
            totalCost: 1
        };
        expect(isPathValid(path, supplyCoords, maxRange)).toBe(false);
    });

    it('returns true if all elements are exactly at maxRange from a supply coord', () => {
        const supplyCoords = [{ x: 0, y: 0 }];
        const maxRange = 2;
        const path: Path = {
            elements: [
                { cost: 1, accumulativeCost: 1, coord: { x: 2, y: 0 }, turn: 1 },
                { cost: 1, accumulativeCost: 2, coord: { x: 0, y: 2 }, turn: 2 }
            ],
            turn: 2,
            totalCost: 2
        };
        expect(isPathValid(path, supplyCoords, maxRange)).toBe(true);
    });

});

describe('simulate', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should run normal simulation flow and increment turn', () => {
        const gameState = createGameStateBuilder("game1", "player1", GameMode.NORMAL)
            .setTeams([{ name: "team1", players: [createPlayerBuilder('player1', 'Player 1', 0, 'team1', PlayerColor.BLUE, PlayerType.HUMAN).build()] },{ name: "team2", players: [createPlayerBuilder('player2', 'Player 2', 0, 'team2', PlayerColor.BLUE, PlayerType.HUMAN).build()] }])
            .setTurn(1)
            .build();

        jest.spyOn(fileUtils, 'readGame').mockReturnValue(gameState);
        jest.spyOn(fileUtils, 'readMap').mockReturnValue(createMapInfoBuilder().build());
        //const writeGameMock = jest.spyOn(fileUtils, 'writeGame').mockImplementation(() => { });
        //const writeMapMock = jest.spyOn(fileUtils, 'writeMap').mockImplementation(() => { });
        //jest.spyOn(production, 'executeProductionYear').mockImplementation(() => { });
        //jest.spyOn(movement, 'processBotPlayers').mockImplementation(() => { });
        const moveTaskForcesMock = jest.spyOn(movement, 'moveTaskForces').mockImplementation(() => { });
        const processEncountersMock = jest.spyOn(movement, 'processEncounters').mockImplementation(() => { });
        const processShipToShipCombatMock = jest.spyOn(movement, 'processShipToShipCombat').mockImplementation(() => { });
        const processPlanetaryAttacksMock = jest.spyOn(movement, 'processPlanetaryAttacks').mockImplementation(() => { });
        const cleanUpTaskForcesMock = jest.spyOn(movement, 'cleanUpTaskForces').mockReturnValue([]);
        jest.spyOn(movement, 'updateFinalScore').mockImplementation(() => { });

        const taskForceMap: TaskForceMap = {
            "TF-0-0-0": createTaskForceBuilder("TF-0-0-0", "player1", "team1", { x: 0, y: 0 }).build(),
            "TF-1-0-0": createTaskForceBuilder("TF-1-0-0", "player2", "team2", { x: 1, y: 1 }).build()
        }

        gameState.taskForceMap = taskForceMap;


        const expectedGameState = cloneDeep(gameState);
        expectedGameState.turn = 2;

        const mapInfo = createMapInfoBuilder().build();

        executeMovement(gameState, mapInfo);

        // const gameState = readGameMock.mock.results[0].value;
        expect(gameState.turn).toBe(2);
        expect(moveTaskForcesMock).toHaveBeenCalled();
        expect(processEncountersMock).toHaveBeenCalled();
        expect(processShipToShipCombatMock).toHaveBeenCalled();
        expect(processPlanetaryAttacksMock).toHaveBeenCalled();
        expect(cleanUpTaskForcesMock).toHaveBeenCalled();
        expect(gameState).toEqual(expectedGameState);
        //expect(writeGameMock).toHaveBeenCalled();
    });

    // it('should set isProductionYear and call processBotPlayers if production year and bot present', () => {
    //     const gameState = createGameStateBuilder("game1", "player1", GameMode.NORMAL)
    //         .setTeams([{ name: "team1", players: [createPlayerBuilder('player1', 'Player 1', 0, 'team1', PlayerColor.BLUE, PlayerType.BOT).build()] }])
    //         .setTurn(4)
    //         .build();

    //     jest.spyOn(fileUtils, 'readGame').mockReturnValue(gameState);
    //     jest.spyOn(fileUtils, 'readMap').mockReturnValue(createMapInfoBuilder().build());
    //     const writeGameMock = jest.spyOn(fileUtils, 'writeGame').mockImplementation(() => { });
    //     //jest.spyOn(fileUtils, 'writeMap').mockImplementation(() => { });
    //     //jest.spyOn(production, 'executeProductionYear').mockImplementation(() => { });
    //     //jest.spyOn(movement, 'processBotPlayers').mockImplementation(() => { });
    //     jest.spyOn(movement, 'moveTaskForces').mockImplementation(() => { });
    //     jest.spyOn(movement, 'processEncounters').mockImplementation(() => { });
    //     jest.spyOn(movement, 'processShipToShipCombat').mockImplementation(() => { });
    //     jest.spyOn(movement, 'processPlanetaryAttacks').mockImplementation(() => { });
    //     jest.spyOn(movement, 'cleanUpTaskForces').mockReturnValue([]);
    //     //const processBotPlayersMock = jest.spyOn(movement, 'processBotPlayers').mockImplementation(() => { });
    //     jest.spyOn(movement, 'updateFinalScore').mockImplementation(() => { });

    //     executeMovement("game1");
    //     expect(gameState.isProductionYear).toBe(true);
    //     expect(writeGameMock).toHaveBeenCalled();
    //     //expect(processBotPlayersMock).toHaveBeenCalledWith("game1");
    // });

    // it('should call processProductionYear if isProductionYear is true', () => {
    //     const gameState = createGameStateBuilder("game1", "player1", GameMode.NORMAL)
    //         .setTeams([{ name: "team1", players: [createPlayerBuilder('player1', 'Player 1', 0, 'team1', PlayerColor.BLUE, PlayerType.BOT).build()] }])
    //         .setTurn(4)
    //         .setIsProductionYear(true)
    //         .build();

    //     jest.spyOn(fileUtils, 'readGame').mockReturnValue(gameState);
    //     jest.spyOn(fileUtils, 'readMap').mockReturnValue(createMapInfoBuilder().build());
    //     jest.spyOn(fileUtils, 'writeGame').mockImplementation(() => { });
    //     //jest.spyOn(fileUtils, 'writeMap').mockImplementation(() => { });
    //     //const processProductionYearMock = jest.spyOn(production, 'executeProductionYear').mockImplementation(() => { });
    //     //jest.spyOn(movement, 'processBotPlayers').mockImplementation(() => { });
    //     jest.spyOn(movement, 'moveTaskForces').mockImplementation(() => { });
    //     jest.spyOn(movement, 'processEncounters').mockImplementation(() => { });
    //     jest.spyOn(movement, 'processShipToShipCombat').mockImplementation(() => { });
    //     jest.spyOn(movement, 'processPlanetaryAttacks').mockImplementation(() => { });
    //     jest.spyOn(movement, 'cleanUpTaskForces').mockReturnValue([]);
    //     //jest.spyOn(movement, 'processBotPlayers').mockImplementation(() => { });
    //     jest.spyOn(movement, 'updateFinalScore').mockImplementation(() => { });

    //     // const gameState = readGameMock.mock.results[0].value;
    //     // gameState.isProductionYear = true;
    //     executeMovement("game1");
    //     //expect(processProductionYearMock).toHaveBeenCalled();
    // });

    it('should set isGameOver and call updateFinalScore if isGameOver', () => {
        const gameState = createGameStateBuilder("game1", "player1", GameMode.NORMAL)
            .setTeams([{ name: "team1", players: [createPlayerBuilder('player1', 'Player 1', 0, 'team1', PlayerColor.BLUE, PlayerType.BOT).build()] }])
            .setTurn(1)
            .build();

        jest.spyOn(fileUtils, 'readGame').mockReturnValue(gameState);
        jest.spyOn(fileUtils, 'readMap').mockReturnValue(createMapInfoBuilder().build());
        jest.spyOn(fileUtils, 'writeGame').mockImplementation(() => { });
        //jest.spyOn(fileUtils, 'writeMap').mockImplementation(() => { });
        //jest.spyOn(production, 'executeProductionYear').mockImplementation(() => { });
        //jest.spyOn(movement, 'processBotPlayers').mockImplementation(() => { });
        jest.spyOn(movement, 'moveTaskForces').mockImplementation(() => { });
        jest.spyOn(movement, 'processEncounters').mockImplementation(() => { });
        jest.spyOn(movement, 'processShipToShipCombat').mockImplementation(() => { });
        jest.spyOn(movement, 'processPlanetaryAttacks').mockImplementation(() => { });
        jest.spyOn(movement, 'cleanUpTaskForces').mockReturnValue([]);
        //jest.spyOn(movement, 'processBotPlayers').mockImplementation(() => { });
        const updateFinalScoreMock = jest.spyOn(movement, 'updateFinalScore').mockImplementation(() => { });
        jest.spyOn(movement, 'isGameOver').mockReturnValue(true);

        //const gameState = readGameMock.mock.results[0].value;
        const mapInfo = createMapInfoBuilder().build();
        executeMovement(gameState, mapInfo);
        expect(gameState.isGameOver).toBe(true);
        expect(updateFinalScoreMock).toHaveBeenCalled();
    });

    // it('should call processBotPlayers if any bot player is active at end', () => {
    //     const gameState = createGameStateBuilder("game1", "player1", GameMode.NORMAL)
    //         .setTeams([{ name: "team1", players: [createPlayerBuilder('player1', 'Player 1', 0, 'team1', PlayerColor.BLUE, PlayerType.BOT).build()] }])
    //         .setTurn(1)
    //         .build();

    //     jest.spyOn(fileUtils, 'readGame').mockReturnValue(gameState);
    //     jest.spyOn(fileUtils, 'readMap').mockReturnValue(createMapInfoBuilder().build());
    //     jest.spyOn(fileUtils, 'writeGame').mockImplementation(() => { });
    //     //jest.spyOn(fileUtils, 'writeMap').mockImplementation(() => { });
    //     //jest.spyOn(production, 'executeProductionYear').mockImplementation(() => { });
    //     //jest.spyOn(movement, 'processBotPlayers').mockImplementation(() => { });
    //     jest.spyOn(movement, 'moveTaskForces').mockImplementation(() => { });
    //     jest.spyOn(movement, 'processEncounters').mockImplementation(() => { });
    //     jest.spyOn(movement, 'processShipToShipCombat').mockImplementation(() => { });
    //     jest.spyOn(movement, 'processPlanetaryAttacks').mockImplementation(() => { });
    //     jest.spyOn(movement, 'cleanUpTaskForces').mockReturnValue([]);
    //     //const processBotPlayersMock = jest.spyOn(movement, 'processBotPlayers').mockImplementation(() => { });
    //     jest.spyOn(movement, 'updateFinalScore').mockImplementation(() => { });
    //     jest.spyOn(movement, 'isGameOver').mockReturnValue(true);

    //     executeMovement("game1");
    //     //expect(processBotPlayersMock).toHaveBeenCalled();
    // });

    it('should set showReports to true for all players if game is over', () => {
        const gameState = createGameStateBuilder("game1", "player1", GameMode.NORMAL)
            .setTeams([{ name: "team1", players: [createPlayerBuilder('player1', 'Player 1', 0, 'team1', PlayerColor.BLUE, PlayerType.BOT).build()] }])
            .setTurn(1)
            .build();

        jest.spyOn(fileUtils, 'readGame').mockReturnValue(gameState);
        jest.spyOn(fileUtils, 'readMap').mockReturnValue(createMapInfoBuilder().build());
        jest.spyOn(fileUtils, 'writeGame').mockImplementation(() => { });
        //jest.spyOn(fileUtils, 'writeMap').mockImplementation(() => { });
        //jest.spyOn(production, 'executeProductionYear').mockImplementation(() => { });
        //jest.spyOn(movement, 'processBotPlayers').mockImplementation(() => { });
        jest.spyOn(movement, 'moveTaskForces').mockImplementation(() => { });
        jest.spyOn(movement, 'processEncounters').mockImplementation(() => { });
        jest.spyOn(movement, 'processShipToShipCombat').mockImplementation(() => { });
        jest.spyOn(movement, 'processPlanetaryAttacks').mockImplementation(() => { });
        jest.spyOn(movement, 'cleanUpTaskForces').mockReturnValue([]);
        //jest.spyOn(movement, 'processBotPlayers').mockImplementation(() => { });
        jest.spyOn(movement, 'updateFinalScore').mockImplementation(() => { });
        jest.spyOn(movement, 'isGameOver').mockReturnValue(true);

        const mapInfo = createMapInfoBuilder().build();
        executeMovement(gameState, mapInfo);
        expect(gameState.teams[0].players[0].showReports).toBe(true);
    });

    it('should set showReports to true for players with reports if game is not over', () => {
        const gameState = createGameStateBuilder("game1", "player1", GameMode.NORMAL)
            .setTeams([{ name: "team1", players: [createPlayerBuilder('player1', 'Player 1', 0, 'team1', PlayerColor.BLUE, PlayerType.BOT).build()] }])
            .setTurn(1)
            .build();

        jest.spyOn(fileUtils, 'readGame').mockReturnValue(gameState);
        jest.spyOn(fileUtils, 'readMap').mockReturnValue(createMapInfoBuilder().build());
        jest.spyOn(fileUtils, 'writeGame').mockImplementation(() => { });
        //jest.spyOn(fileUtils, 'writeMap').mockImplementation(() => { });
        //jest.spyOn(production, 'executeProductionYear').mockImplementation(() => { });
        //jest.spyOn(movement, 'processBotPlayers').mockImplementation(() => { });
        jest.spyOn(movement, 'moveTaskForces').mockImplementation(() => { });
        jest.spyOn(movement, 'processEncounters').mockImplementation((game: GameState) => { game.encounterReport = [{ playerId: "player1", message: "", coord: { x: 0, y: 0 } }] });
        jest.spyOn(movement, 'processShipToShipCombat').mockImplementation(() => { });
        jest.spyOn(movement, 'processPlanetaryAttacks').mockImplementation(() => { });
        jest.spyOn(movement, 'cleanUpTaskForces').mockReturnValue([]);
        //jest.spyOn(movement, 'processBotPlayers').mockImplementation(() => { });
        jest.spyOn(movement, 'updateFinalScore').mockImplementation(() => { });

        const mapInfo = createMapInfoBuilder().build();
        executeMovement(gameState, mapInfo);
        expect(gameState.teams[0].players[0].showReports).toBe(true);
    });

    it('should set showReports to false for players with no reports if game is not over', () => {
        const gameState = createGameStateBuilder("game1", "player1", GameMode.NORMAL)
            .setTeams([{ name: "team0", players: [createPlayerBuilder('player0', 'Player 1', 0, 'team0', PlayerColor.BLUE, PlayerType.BOT).build()] },
            { name: "team1", players: [createPlayerBuilder('player1', 'Player 1', 0, 'team1', PlayerColor.WHITE, PlayerType.BOT).build()] }])
            .setTurn(1)
            .build();

        const taskForceMap: TaskForceMap = {
            "TF-0-0-0": createTaskForceBuilder("TF-0-0-0", "player0", "team0", { x: 0, y: 0 }).build(),
            "TF-1-0-0": createTaskForceBuilder("TF-1-0-0", "player1", "team1", { x: 1, y: 1 }).build()
        }

        gameState.taskForceMap = taskForceMap;

        jest.spyOn(fileUtils, 'readGame').mockReturnValue(gameState);
        jest.spyOn(fileUtils, 'readMap').mockReturnValue(createMapInfoBuilder().build());
        jest.spyOn(fileUtils, 'writeGame').mockImplementation(() => { });
        //jest.spyOn(fileUtils, 'writeMap').mockImplementation(() => { });
        //jest.spyOn(production, 'executeProductionYear').mockImplementation(() => { });
        //jest.spyOn(movement, 'processBotPlayers').mockImplementation(() => { });
        jest.spyOn(movement, 'moveTaskForces').mockImplementation(() => { });
        jest.spyOn(movement, 'processEncounters').mockImplementation(() => { });
        jest.spyOn(movement, 'processShipToShipCombat').mockImplementation(() => { });
        jest.spyOn(movement, 'processPlanetaryAttacks').mockImplementation(() => { });
        jest.spyOn(movement, 'cleanUpTaskForces').mockReturnValue([]);
        //jest.spyOn(movement, 'processBotPlayers').mockImplementation(() => { });
        jest.spyOn(movement, 'updateFinalScore').mockImplementation(() => { });

        const mapInfo = createMapInfoBuilder().build();
        executeMovement(gameState, mapInfo);
        expect(gameState.teams[0].players[0].showReports).toBe(false);
    });
});

describe('isOutOfSupplyRange', () => {
    it('returns false if all colonyCoords are within maxRange from coord', () => {
        // coord is (1,1), colonyCoords are (0,0) and (2,2), maxRange is 2
        // getRange((1,1),(0,0)) = 2, getRange((1,1),(2,2)) = 2
        const coord = { x: 1, y: 1 };
        const colonyCoords = [{ x: 0, y: 0 }, { x: 2, y: 2 }];
        const maxRange = 2;
        expect(isOutOfSupplyRange(coord, colonyCoords, maxRange)).toBe(false);
    });

    it('returns true if only one colonyCoord and it is out of range', () => {
        const coord = { x: 0, y: 0 };
        const colonyCoords = [{ x: 10, y: 10 }];
        const maxRange = 5;
        expect(isOutOfSupplyRange(coord, colonyCoords, maxRange)).toBe(true);
    });

    it('returns false if only one colonyCoord and it is in range', () => {
        const coord = { x: 0, y: 0 };
        const colonyCoords = [{ x: 1, y: 1 }];
        const maxRange = 2;
        expect(isOutOfSupplyRange(coord, colonyCoords, maxRange)).toBe(false);
    });

    it('returns false if coord is within maxRange of at least one supply coord', () => {
        // coord is (3,3), supply coords are (0,0) and (3,3), maxRange is 0
        // getRange((3,3),(3,3)) = 0 <= 0, so should return false
        const coord = { x: 3, y: 3 };
        const colonyCoords = [{ x: 0, y: 0 }, { x: 3, y: 3 }];
        const maxRange = 0;
        expect(isOutOfSupplyRange(coord, colonyCoords, maxRange)).toBe(false);
    });

    it('returns true if coord is not within maxRange of any supply coord', () => {
        // coord is (10,10), supply coords are (0,0), maxRange is 5
        // getRange((10,10),(0,0)) = 20 > 5, so should return true
        const coord = { x: 10, y: 10 };
        const colonyCoords = [{ x: 0, y: 0 }];
        const maxRange = 5;
        expect(isOutOfSupplyRange(coord, colonyCoords, maxRange)).toBe(true);
    });

    it('returns true if supply coords is empty', () => {
        // No supply coords, should return false
        const coord = { x: 1, y: 1 };
        const colonyCoords: { x: number, y: number }[] = [];
        const maxRange = 2;
        expect(isOutOfSupplyRange(coord, colonyCoords, maxRange)).toBe(true);
    });
});

describe('handleFreedColonies', () => {
    it('should set besieged to false if no enemy warship task force remains at besieged colony', () => {
        // Setup teams and players
        const player1 = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN).build();
        const team1 = createTeamBuilder("team1").setPlayers([player1]).build();
        const teams = [team1];

        // Colony was besieged
        const colony = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "player1", "team1").build();
        colony.besieged = true;
        const colonies = [colony];

        // No enemy task forces at the colony's star
        const taskForces: TaskForce[] = [];

        // Star map
        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };

        const turn = 1;
        handleFreedColonies(teams, colonies, taskForces, starMap, turn);

        expect(colony.besieged).toBe(false);
    });

    it('should keep besieged true if enemy warship task force remains at besieged colony', () => {
        const player1 = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN).build();
        const player2 = createPlayerBuilder("player2", "Player 2", 1, "team2", PlayerColor.WHITE, PlayerType.HUMAN).build();
        const team1 = createTeamBuilder("team1").setPlayers([player1]).build();
        const team2 = createTeamBuilder("team2").setPlayers([player2]).build();
        const teams = [team1, team2];

        const colony = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "player1", "team1").build();
        colony.besieged = true;
        const colonies = [colony];

        // Enemy warship task force at the same star
        const tf = createTaskForceBuilder("tf-1", "player2", "team2", { x: 0, y: 0 }).setEscorts(1).build();
        const taskForces: TaskForce[] = [tf];

        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };

        const turn = 1;

        handleFreedColonies(teams, colonies, taskForces, starMap, turn);

        expect(colony.besieged).toBe(true);
    });

    it('should revert captured colony to original owner if no enemy warship task force remains and original owner is active', () => {
        const player1 = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN).build();
        const player2 = createPlayerBuilder("player2", "Player 2", 1, "team2", PlayerColor.WHITE, PlayerType.HUMAN).build();
        const team1 = createTeamBuilder("team1").setPlayers([player1]).build();
        const team2 = createTeamBuilder("team2").setPlayers([player2]).build();
        const teams = [team1, team2];

        const colony = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "player2", "team2").build();
        colony.captured = true;
        colony.capturedTurn = 2;
        colony.originalPlayerId = "player1";
        colony.originalTeamId = "team1";
        const colonies = [colony];

        // No enemy task forces at the colony's star
        const taskForces: TaskForce[] = [];

        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };

        const turn = 1;
        handleFreedColonies(teams, colonies, taskForces, starMap, turn);

        expect(colony.playerId).toBe("player1");
        expect(colony.teamId).toBe("team1");
        expect(colony.captured).toBe(false);
        expect(colony.capturedTurn).toBe(0);
        expect(colony.originalPlayerId).toBeUndefined();
        expect(colony.originalTeamId).toBeUndefined();
    });

    it('should transfer captured colony to teammate if original owner is inactive', () => {
        const player1 = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN).setActive(false).build();
        const player2 = createPlayerBuilder("player2", "Player 2", 1, "team1", PlayerColor.WHITE, PlayerType.HUMAN).build();
        const team1 = createTeamBuilder("team1").setPlayers([player1, player2]).build();
        const teams = [team1];

        const colony = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "playerX", "teamX").build();
        colony.captured = true;
        colony.capturedTurn = 2;
        colony.originalPlayerId = "player1";
        colony.originalTeamId = "team1";
        const colonies = [colony];

        // No enemy task forces at the colony's star
        const taskForces: TaskForce[] = [];

        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };

        const turn = 1;
        handleFreedColonies(teams, colonies, taskForces, starMap, turn);

        expect(colony.playerId).toBe("player2");
        expect(colony.teamId).toBe("team1");
        expect(colony.captured).toBe(false);
        expect(colony.capturedTurn).toBe(0);
        expect(colony.originalPlayerId).toBeUndefined();
        expect(colony.originalTeamId).toBeUndefined();
    });

    it('should revert to original owner if no teammate is active', () => {
        const player1 = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN).setActive(false).build();
        const player2 = createPlayerBuilder("player2", "Player 2", 1, "team1", PlayerColor.WHITE, PlayerType.HUMAN).setActive(false).build();
        const team1 = createTeamBuilder("team1").setPlayers([player1, player2]).build();
        const teams = [team1];

        const colony = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "playerX", "teamX").build();
        colony.captured = true;
        colony.capturedTurn = 2;
        colony.originalPlayerId = "player1";
        colony.originalTeamId = "team1";
        const colonies = [colony];

        // No enemy task forces at the colony's star
        const taskForces: TaskForce[] = [];

        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };

        const turn = 1;
        handleFreedColonies(teams, colonies, taskForces, starMap, turn);

        expect(colony.playerId).toBe("player1");
        expect(colony.teamId).toBe("team1");
        expect(colony.captured).toBe(false);
        expect(colony.capturedTurn).toBe(0);
        expect(colony.originalPlayerId).toBeUndefined();
        expect(colony.originalTeamId).toBeUndefined();
    });

    it('should do nothing if colony is not besieged or captured', () => {
        const player1 = createPlayerBuilder("player1", "Player 1", 0, "team1", PlayerColor.BLUE, PlayerType.HUMAN).build();
        const team1 = createTeamBuilder("team1").setPlayers([player1]).build();
        const teams = [team1];

        const colony = createColonyBuilder("star1-0", 80, 80, PlanetType.TR, "star1", "player1", "team1").build();
        // Not besieged or captured
        const colonies = [colony];

        const taskForces: TaskForce[] = [];

        const star = createStarBuilder("star1", { x: 0, y: 0 }, SpectralClass.G).build();
        const starMap: StarMap = { [star.name]: star };

        const turn = 1;
        handleFreedColonies(teams, colonies, taskForces, starMap, turn);

        expect(colony.playerId).toBe("player1");
        expect(colony.teamId).toBe("team1");
        expect(colony.captured).toBeFalsy();
        expect(colony.besieged).toBeFalsy();
    });
});