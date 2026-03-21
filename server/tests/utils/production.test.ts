import { GameMode, GameState, MapInfo, Path, PlanetType, PlayerColor, PlayerType, SpectralClass, SpentProductionType } from "../../src/shared/types/game-types";
import { createColonyBuilder, createGameStateBuilder, createPlayerBuilder, createProductionBuilder, createStarBuilder } from "../../src/shared/utils/builder-utils";
import { consoleLogger } from "../../src/utils/logger";
import { buildUpdatedPath, executeProductionYear } from "../../src/utils/production";

beforeAll(() => {
    consoleLogger.debug = jest.fn();
    consoleLogger.info = jest.fn();
    consoleLogger.warn = jest.fn();
    consoleLogger.error = jest.fn();
    jest.spyOn(console, "log").mockImplementation(() => {});
});

describe('buildUpdatedPath', () => {

    it('update path costs multi-turn trip', () => {
        const path: Path = {
            "totalCost": 5,
            "turn": 3,
            "elements": [
                {
                    "coord": {
                        "x": 1,
                        "y": 1
                    },
                    "accumulativeCost": 1,
                    "turn": 1,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 2,
                        "y": 1
                    },
                    "accumulativeCost": 2,
                    "turn": 1,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 3,
                        "y": 2
                    },
                    "accumulativeCost": 3,
                    "turn": 2,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 4,
                        "y": 2
                    },
                    "accumulativeCost": 4,
                    "turn": 2,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 5,
                        "y": 2
                    },
                    "accumulativeCost": 5,
                    "turn": 3,
                    "cost": 1
                }
            ]
        };

        const expected = {
            "totalCost": 5,
            "turn": 2,
            "elements": [
                {
                    "coord": {
                        "x": 1,
                        "y": 1
                    },
                    "accumulativeCost": 1,
                    "turn": 1,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 2,
                        "y": 1
                    },
                    "accumulativeCost": 2,
                    "turn": 1,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 3,
                        "y": 2
                    },
                    "accumulativeCost": 3,
                    "turn": 1,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 4,
                        "y": 2
                    },
                    "accumulativeCost": 4,
                    "turn": 2,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 5,
                        "y": 2
                    },
                    "accumulativeCost": 5,
                    "turn": 2,
                    "cost": 1
                }
            ]
        };

        const result = buildUpdatedPath(path, 0, 3);

        expect(result).toEqual(expected);
    });

    it('update path costs single-turn trip', () => {
        const path: Path = {
            "totalCost": 5,
            "turn": 3,
            "elements": [
                {
                    "coord": {
                        "x": 1,
                        "y": 1
                    },
                    "accumulativeCost": 1,
                    "turn": 1,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 2,
                        "y": 1
                    },
                    "accumulativeCost": 2,
                    "turn": 1,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 3,
                        "y": 2
                    },
                    "accumulativeCost": 3,
                    "turn": 2,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 4,
                        "y": 2
                    },
                    "accumulativeCost": 4,
                    "turn": 2,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 5,
                        "y": 2
                    },
                    "accumulativeCost": 5,
                    "turn": 3,
                    "cost": 1
                }
            ]
        };

        const expected = {
            "totalCost": 5,
            "turn": 1,
            "elements": [
                {
                    "coord": {
                        "x": 1,
                        "y": 1
                    },
                    "accumulativeCost": 1,
                    "turn": 1,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 2,
                        "y": 1
                    },
                    "accumulativeCost": 2,
                    "turn": 1,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 3,
                        "y": 2
                    },
                    "accumulativeCost": 3,
                    "turn": 1,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 4,
                        "y": 2
                    },
                    "accumulativeCost": 4,
                    "turn": 1,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 5,
                        "y": 2
                    },
                    "accumulativeCost": 5,
                    "turn": 1,
                    "cost": 1
                }
            ]
        };

        const result = buildUpdatedPath(path, 0, 8);

        expect(result).toEqual(expected);
    });

    it('update path costs gas cloud in middle', () => {
        const path: Path = {
            "totalCost": 10,
            "turn": 8,
            "elements": [
                {
                    "coord": {
                        "x": 5,
                        "y": 3
                    },
                    "accumulativeCost": 1,
                    "turn": 4,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 5,
                        "y": 4
                    },
                    "accumulativeCost": 2,
                    "turn": 4,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 6,
                        "y": 4
                    },
                    "accumulativeCost": 3,
                    "turn": 5,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 7,
                        "y": 5
                    },
                    "accumulativeCost": 4,
                    "turn": 5,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 7,
                        "y": 6
                    },
                    "accumulativeCost": 5,
                    "turn": 6,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 8,
                        "y": 6
                    },
                    "accumulativeCost": 8,
                    "turn": 7,
                    "cost": 3
                },
                {
                    "coord": {
                        "x": 9,
                        "y": 7
                    },
                    "accumulativeCost": 9,
                    "turn": 8,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 9,
                        "y": 8
                    },
                    "accumulativeCost": 10,
                    "turn": 8,
                    "cost": 1
                }
            ]
        };

        const expected = {
            "totalCost": 11,
            "turn": 7,
            "elements": [
                {
                    "coord": {
                        "x": 5,
                        "y": 3
                    },
                    "accumulativeCost": 1,
                    "turn": 4,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 5,
                        "y": 4
                    },
                    "accumulativeCost": 2,
                    "turn": 4,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 6,
                        "y": 4
                    },
                    "accumulativeCost": 3,
                    "turn": 4,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 7,
                        "y": 5
                    },
                    "accumulativeCost": 4,
                    "turn": 5,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 7,
                        "y": 6
                    },
                    "accumulativeCost": 5,
                    "turn": 5,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 8,
                        "y": 6
                    },
                    "accumulativeCost": 9,
                    "turn": 6,
                    "cost": 4
                },
                {
                    "coord": {
                        "x": 9,
                        "y": 7
                    },
                    "accumulativeCost": 10,
                    "turn": 7,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 9,
                        "y": 8
                    },
                    "accumulativeCost": 11,
                    "turn": 7,
                    "cost": 1
                }
            ]
        };

        const result = buildUpdatedPath(path, 3, 3);

        expect(result).toEqual(expected);
    });

    it('update path costs gas cloud at end', () => {
        const path: Path = {
            "totalCost": 8,
            "turn": 7,
            "elements": [
                {
                    "coord": {
                        "x": 5,
                        "y": 3
                    },
                    "accumulativeCost": 1,
                    "turn": 4,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 6,
                        "y": 3
                    },
                    "accumulativeCost": 2,
                    "turn": 4,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 6,
                        "y": 4
                    },
                    "accumulativeCost": 3,
                    "turn": 5,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 6,
                        "y": 5
                    },
                    "accumulativeCost": 4,
                    "turn": 5,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 7,
                        "y": 6
                    },
                    "accumulativeCost": 5,
                    "turn": 6,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 7,
                        "y": 7
                    },
                    "accumulativeCost": 8,
                    "turn": 7,
                    "cost": 3
                }
            ]
        };

        const expected = {
            "totalCost": 9,
            "turn": 6,
            "elements": [
                {
                    "coord": {
                        "x": 5,
                        "y": 3
                    },
                    "accumulativeCost": 1,
                    "turn": 4,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 6,
                        "y": 3
                    },
                    "accumulativeCost": 2,
                    "turn": 4,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 6,
                        "y": 4
                    },
                    "accumulativeCost": 3,
                    "turn": 4,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 6,
                        "y": 5
                    },
                    "accumulativeCost": 4,
                    "turn": 5,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 7,
                        "y": 6
                    },
                    "accumulativeCost": 5,
                    "turn": 5,
                    "cost": 1
                },
                {
                    "coord": {
                        "x": 7,
                        "y": 7
                    },
                    "accumulativeCost": 9,
                    "turn": 6,
                    "cost": 4
                }
            ]
        };

        const result = buildUpdatedPath(path, 3, 3);

        expect(result).toEqual(expected);
    });
});

describe('processProductionYear', () => {
    let game: GameState;
    let mapData: MapInfo;

    beforeEach(() => {
        // Minimal mock setup for GameState and MapInfo
        game = createGameStateBuilder("1", "p1", GameMode.NORMAL).setTeams([{
            name: "t1",
            players: [createPlayerBuilder("p1", "P1", 0, "t1", PlayerColor.BLUE, PlayerType.HUMAN)
                .setTechnologies({
                    currentMovementRate: 2,
                    shipMovementAllowance: ["2A"],
                    shipMovementAllowanceBalance: 0,
                    weaponSystems: [],
                    weaponSystemsBalance: 0,
                    technical: [],
                    technicalBalance: 0
                })
                .setProduction(createProductionBuilder()
                    .setColonyProductionMap({
                        "col1": {
                            [SpentProductionType.scouts]: 1,
                            [SpentProductionType.escorts]: 0,
                            [SpentProductionType.attackShips]: 0,
                            [SpentProductionType.dreadnaughts]: 0,
                            [SpentProductionType.colonyTransports]: 0,
                            [SpentProductionType.colonyTransportsWithCet]: 0,
                            [SpentProductionType.missileBases]: 1,
                            [SpentProductionType.advancedMissileBases]: 0,
                            [SpentProductionType.industrialUnits]: 1,
                            [SpentProductionType.roboticIndustrialUnits]: 0,
                            [SpentProductionType.planetaryForceScreen]: 0,
                            [SpentProductionType.movementResearch]: 2,
                            [SpentProductionType.weaponsResearch]: 3,
                            [SpentProductionType.technologyResearch]: 4
                        }
                    })
                    .setTechnologyResearchMap({
                        [SpentProductionType.movementResearch]: [
                            { symbol: "3A", amount: 2 }
                        ],
                        [SpentProductionType.weaponsResearch]: [
                            { symbol: "W1", amount: 3 }
                        ],
                        [SpentProductionType.technologyResearch]: [
                            { symbol: "T1", amount: 4 }
                        ]
                    })
                    .build())
                .build()]
        }])
            .setColonyMap({
                "col1": createColonyBuilder("col1", 5, 5, PlanetType.TR, "star1", "p1", "t1").build()
            })
            .setIsProductionYear(true)
            .build();

        mapData = {
            rows: 10,
            columns: 10,
            entryHexes: [],
            gasClouds: [],
            starMap: {
                "star1": createStarBuilder("star1", { x: 1, y: 2 }, SpectralClass.G).build()
            }
        };
    });

    it('should process production year and update player, colonies, and task forces', () => {
        executeProductionYear(game, mapData);

        // Colony should have updated missileBases, industrialUnits, and population
        const colony = game.colonyMap["col1"];
        expect(colony.missileBases).toBe(1);
        expect(colony.industrialUnits).toBe(5); // incremented by growth
        expect(colony.population).toBe(5); // incremented by growth

        // Task force should be created
        const tf = Object.values(game.taskForceMap)[0];
        expect(tf).toBeDefined();
        expect(tf.scouts).toBe(1);
        expect(tf.playerId).toBe("p1");
        expect(tf.coord).toEqual({ x: 1, y: 2 });

        // Technologies should be updated
        const player = game.teams[0].players[0];
        expect(player.technologies.shipMovementAllowance).toContain("3A");
        expect(player.technologies.weaponSystems).toContain("W1");
        expect(player.technologies.technical).toContain("T1");

        // Production should be cleared
        expect(player.production).toBeUndefined();

        // isProductionYear should be false
        expect(game.isProductionYear).toBe(false);
    });

    it('should clean up colonies with zero population', () => {
        // Set population to 0
        game.colonyMap["col1"].population = 0;
        executeProductionYear(game, mapData);
        expect(game.colonyMap["col1"]).toBeUndefined();
    });

    it('should dismantle excess industrial units if over allowed ratio', () => {
        // Give colony more industrial units than allowed
        game.colonyMap["col1"].industrialUnits = 10;
        game.colonyMap["col1"].population = 2;
        executeProductionYear(game, mapData);
        // Should be reduced to 2 (population) * 1 (allowed ratio) = 2
        expect(game.colonyMap["col1"].industrialUnits).toBeLessThanOrEqual(2);
        // Should add a message to generalReport
        expect(game.generalReport.length).toBeGreaterThan(0);
        expect(game.generalReport[0].messages[0]).toMatch(/were dismantled/);
    });

    it('should update movement allowance and task force paths if new tech is researched', () => {
        // Add a task force with a path
        game.taskForceMap["tf1"] = {
            id: "tf1",
            playerId: "p1",
            teamId: "t1",
            scouts: 0,
            escorts: 0,
            attackShips: 0,
            dreadnaughts: 0,
            colonyTransports: 0,
            colonyTransportsWithCet: 0,
            coord: { x: 0, y: 0 },
            originColony: "col1",
            changed: false,
            deleted: false,
            reduceColony: false,
            path: {
                elements: [
                    { coord: { x: 0, y: 0 }, accumulativeCost: 1, cost: 1, turn: 1 },
                    { coord: { x: 1, y: 0 }, accumulativeCost: 2, cost: 1, turn: 2 }
                ],
                totalCost: 2,
                turn: 2
            },
            eta: 2
        };

        game.teams[0].players[0].production!.technologyResearchMap[SpentProductionType.movementResearch] = [
            { symbol: "4A", amount: 2 }
        ];
        executeProductionYear(game, mapData);

        // Movement allowance should be updated
        expect(game.teams[0].players[0].technologies.currentMovementRate).toBe(4);

        // Task force path and eta should be updated
        const tf = game.taskForceMap["tf1"];
        expect(tf.path).toBeDefined();
        expect(tf.eta).toBe(tf.path!.turn);
    });
});