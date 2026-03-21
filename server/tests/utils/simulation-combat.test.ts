import { CombatTeam, ShipContainer, ShipContainerMap } from "../../src/shared/types/game-types";
import { createCombatPlayerBuilder, createShipContainerBuilder } from "../../src/shared/utils/builder-utils";
import { applyLosses, buildTeamTaskForces, calculatePointLosses, getStatus, hasWarships, updateCombatLossesMap, accumulateTotalLosses, TeamTaskForce, hasShips, shouldWithDraw, attackShip, SHIP_TYPE, attackTaskForce, CombatShipContainerMap, CombatShipContainer } from "../../src/utils/simulation-combat";
import { roll6SidedDie, getRandomIndex } from "../../src/shared/utils/dice-utils";
import { consoleLogger } from "../../src/utils/logger";

jest.mock('../../src/shared/utils/dice-utils');

beforeAll(() => {
    consoleLogger.debug = jest.fn();
    consoleLogger.info = jest.fn();
    consoleLogger.warn = jest.fn();
    consoleLogger.error = jest.fn();
    jest.spyOn(console, "log").mockImplementation(() => {});
});

describe("buildTeamTaskForces", () => {
    it("should build TeamTaskForce objects with correct ship counts and names", () => {
        const teams: CombatTeam[] = [
            {
                id: "Red",
                nextPlayerId: 1,
                colonyDefense: false,
                players: [
                    createCombatPlayerBuilder("Alice").setTaskForces([createShipContainerBuilder("TF-0-0").setScouts(2).setEscorts(1).setAttackShips(3).setColonyTransports(1).build()]).build(),
                    createCombatPlayerBuilder("Bob").setTaskForces([createShipContainerBuilder("TF-1-0").setScouts(1).setEscorts(2).setDreadnaughts(1).setColonyTransportsWithCet(1).build()]).build()
                ],
                rulesOfEngagement: {
                    minimumDamageRatio: .4,
                    minimumWinPercent: .4
                }
            },
            {
                id: "Blue",
                nextPlayerId: 1,
                colonyDefense: false,
                players: [
                    createCombatPlayerBuilder("Carol").setTaskForces([createShipContainerBuilder("TF-2-0").setAttackShips(2).setDreadnaughts(2).setColonyTransports(2).build()]).build()
                ],
                rulesOfEngagement: {
                    minimumDamageRatio: .4,
                    minimumWinPercent: .4
                }
            }
        ];

        const result = buildTeamTaskForces(teams);

        expect(result).toHaveLength(2);

        const red = result.find(t => t.id === "Red");
        expect(red).toBeDefined();
        expect(red?.scouts).toBe(3);
        expect(red?.escorts).toBe(3);
        expect(red?.attackShips).toBe(3);
        expect(red?.dreadnaughts).toBe(1);
        expect(red?.colonyTransports).toBe(1);
        expect(red?.colonyTransportsWithCet).toBe(1);
        expect(red?.won).toBe(false);
        expect(red?.withdraw).toBe(false);

        const blue = result.find(t => t.id === "Blue");
        expect(blue).toBeDefined();
        expect(blue?.scouts).toBe(0);
        expect(blue?.escorts).toBe(0);
        expect(blue?.attackShips).toBe(2);
        expect(blue?.dreadnaughts).toBe(2);
        expect(blue?.colonyTransports).toBe(2);
        expect(blue?.colonyTransportsWithCet).toBe(0);
        expect(blue?.won).toBe(false);
        expect(blue?.withdraw).toBe(false);
    });

    it("should handle empty teams array", () => {
        const teams: CombatTeam[] = [];
        const result = buildTeamTaskForces(teams);
        expect(result).toEqual([]);
    });

    it("should handle teams with no players", () => {
        const teams: CombatTeam[] = [
            {
                id: "Lone", players: [], nextPlayerId: 0, colonyDefense: false,
                rulesOfEngagement: {
                    minimumDamageRatio: .4,
                    minimumWinPercent: .4
                }
            }
        ];
        const result = buildTeamTaskForces(teams);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("Lone");
        expect(result[0].scouts).toBe(0);
        expect(result[0].escorts).toBe(0);
        expect(result[0].attackShips).toBe(0);
        expect(result[0].dreadnaughts).toBe(0);
        expect(result[0].colonyTransports).toBe(0);
        expect(result[0].colonyTransportsWithCet).toBe(0);
    });

    it("should sum up ships from multiple taskForces per player", () => {
        const teams: CombatTeam[] = [
            {
                id: "Green",
                nextPlayerId: 0,
                colonyDefense: false,
                players: [
                    createCombatPlayerBuilder("Eve").setTaskForces([
                        createShipContainerBuilder("TF-0-0").setScouts(1).setEscorts(1).setAttackShips(1).setDreadnaughts(1).setColonyTransports(1).setColonyTransportsWithCet(1).build(),
                        createShipContainerBuilder("TF-0-1").setScouts(2).setEscorts(2).setAttackShips(2).setDreadnaughts(2).setColonyTransports(2).setColonyTransportsWithCet(2).build()
                    ]).build()
                ],
                rulesOfEngagement: {
                    minimumDamageRatio: .4,
                    minimumWinPercent: .4
                }
            }
        ];
        // Note: Only the last taskForce per player is counted due to reduce logic in buildTeamTaskForces
        const result = buildTeamTaskForces(teams);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("Green");
        expect(result[0].scouts).toBe(3);
        expect(result[0].escorts).toBe(3);
        expect(result[0].attackShips).toBe(3);
        expect(result[0].dreadnaughts).toBe(3);
        expect(result[0].colonyTransports).toBe(3);
        expect(result[0].colonyTransportsWithCet).toBe(3);
    });

    // describe("simCombatRound", () => {
    //     it("returns a CombatLossesMap with expected keys", () => {
    //         const tfs = [
    //             {escorts: 1, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportCets: 0, name: "A", won: false, withdraw: false},
    //             {escorts: 1, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportCets: 0, name: "B", won: false, withdraw: false}
    //         ];
    //         const losses = simCombatRound(tfs);
    //         expect(typeof losses).toBe("object");
    //         // keys may or may not be present depending on random, but should not throw
    //     });
    // });
});

describe("hasWarships", () => {
    it("returns true if any warship present", () => {
        expect(hasWarships({ escorts: 1, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "A", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 })).toBe(true);
        expect(hasWarships({ escorts: 0, attackShips: 1, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "A", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 })).toBe(true);
        expect(hasWarships({ escorts: 0, attackShips: 0, dreadnaughts: 1, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "A", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 })).toBe(true);
    });
    it("returns false if no warships present", () => {
        expect(hasWarships({ escorts: 0, attackShips: 0, dreadnaughts: 0, scouts: 1, colonyTransports: 1, colonyTransportsWithCet: 1, id: "A", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 })).toBe(false);
    });
});

describe("getStatus", () => {
    it("returns FINISHED if all task forces withdraw", () => {
        const tfs: TeamTaskForce[] = [
            { escorts: 0, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "A", won: false, withdraw: false, rulesOfEngagement: { minimumWinPercent: .4, minimumDamageRatio: .4 }, colonyDefense: false, escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 },
            { escorts: 0, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "B", won: false, withdraw: false, rulesOfEngagement: { minimumWinPercent: .4, minimumDamageRatio: .4 }, colonyDefense: false, escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 }
        ];
        expect(getStatus(tfs, 1)).toBe("FINISHED");
        expect(tfs[0].withdraw).toBe(true);
        expect(tfs[1].withdraw).toBe(true);
    });

    it("returns CONTINUE if at least two task force has warships", () => {
        const tfs: TeamTaskForce[] = [
            { escorts: 1, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "A", won: false, withdraw: false, rulesOfEngagement: { minimumWinPercent: .4, minimumDamageRatio: .4 }, colonyDefense: false, escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 },
            { escorts: 0, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "B", won: false, withdraw: false, rulesOfEngagement: { minimumWinPercent: .4, minimumDamageRatio: .4 }, colonyDefense: false, escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 },
            { escorts: 0, attackShips: 1, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "C", won: false, withdraw: false, rulesOfEngagement: { minimumWinPercent: .4, minimumDamageRatio: .4 }, colonyDefense: false, escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 }
        ];
        expect(getStatus(tfs, 1)).toBe("CONTINUE");
        expect(tfs[0].withdraw).toBe(false);
        expect(tfs[1].withdraw).toBe(true);
        expect(tfs[2].withdraw).toBe(false);
    });

    it("withdraws if enemy has dreadnaughts and this force has no dreadnaughts or attackShips", () => {
        const tfs: TeamTaskForce[] = [
            { escorts: 0, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "A", won: false, withdraw: false, rulesOfEngagement: { minimumWinPercent: .4, minimumDamageRatio: .4 }, colonyDefense: false, escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 },
            { escorts: 0, attackShips: 0, dreadnaughts: 1, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "B", won: false, withdraw: false, rulesOfEngagement: { minimumWinPercent: .4, minimumDamageRatio: .4 }, colonyDefense: false, escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 }
        ];
        expect(getStatus(tfs, 1)).toBe("FINISHED");
        expect(tfs[0].withdraw).toBe(true);
        expect(tfs[1].withdraw).toBe(false);
    });
});

describe("updateCombatLossesMap", () => {
    beforeEach(() => {
        if (jest.isMockFunction(getRandomIndex)) (getRandomIndex as jest.Mock).mockReset();
    });

    it("adds losses to the correct task force", () => {
        (getRandomIndex as jest.Mock).mockReturnValueOnce(0).mockReturnValueOnce(0);
        const losses = { escorts: 2, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransportsWithCet: 0, colonyTransports: 0, id: "", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 };
        const tfs: TeamTaskForce[] = [
            { escorts: 2, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "A", won: false, withdraw: false, rulesOfEngagement: { minimumWinPercent: .4, minimumDamageRatio: .4 }, colonyDefense: false, escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 },
            { escorts: 0, attackShips: 2, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "B", won: false, withdraw: false, rulesOfEngagement: { minimumWinPercent: .4, minimumDamageRatio: .4 }, colonyDefense: false, escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 }
        ];
        const map: CombatShipContainerMap = {};
        updateCombatLossesMap(map, losses, tfs, "escorts");
        expect(map["A"].escorts).toBe(2);
    });
});

describe("applyLosses", () => {
    it("subtracts losses from task forces", () => {
        const tfs: TeamTaskForce[] = [
            { escorts: 2, attackShips: 1, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "A", won: false, withdraw: false, rulesOfEngagement: { minimumWinPercent: .4, minimumDamageRatio: .4 }, colonyDefense: false, escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 }
        ];
        const losses: CombatShipContainerMap = { "A": { escorts: 1, attackShips: 1, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "A", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 } };
        applyLosses(tfs, losses);
        expect(tfs[0].escorts).toBe(1);
        expect(tfs[0].attackShips).toBe(0);
    });
});

describe("updateTotalLosses", () => {
    it("adds recent losses to total losses", () => {
        const total: CombatShipContainerMap = { "A": { escorts: 1, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "A", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 } };
        const recent: CombatShipContainerMap = { "A": { escorts: 2, attackShips: 1, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "A", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 } };
        accumulateTotalLosses(total, recent);
        expect(total["A"].escorts).toBe(3);
        expect(total["A"].attackShips).toBe(1);
    });
    it("adds new entry if not present", () => {
        const total: { [key: string]: CombatShipContainer } = {};
        const recent: CombatShipContainerMap = { "A": { escorts: 1, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "A", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 } };
        accumulateTotalLosses(total, recent);
        expect(total["A"].escorts).toBe(1);
    });
});

describe("calculatePointLosses", () => {
    it("calculates points using IndustrialUnitCostSchedule", () => {
        const losses: CombatShipContainer = { escorts: 2, attackShips: 1, dreadnaughts: 1, scouts: 2, colonyTransports: 1, colonyTransportsWithCet: 1, id: "A", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 };
        // (2*8)+(1*20)+(1*40)*(2*3)+(1*3)+(1*4)
        const result = calculatePointLosses(losses);
        expect(typeof result).toBe("number");
        expect(result).toEqual((2 * 8) + (1 * 20) + (1 * 40) + (2 * 3) + (1 * 3) + (1 * 4));
    });

});

describe("hasShips", () => {
    it("returns true if any ship type is present", () => {
        expect(
            // Only scouts
            hasShips({ escorts: 0, attackShips: 0, dreadnaughts: 0, scouts: 1, colonyTransports: 0, colonyTransportsWithCet: 0, id: "A", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 })
        ).toBe(true);
        expect(
            // Only escorts
            hasShips({ escorts: 1, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "B", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 })
        ).toBe(true);
        expect(
            // Only attackShips
            hasShips({ escorts: 0, attackShips: 1, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "C", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 })
        ).toBe(true);
        expect(
            // Only dreadnaughts
            hasShips({ escorts: 0, attackShips: 0, dreadnaughts: 1, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "D", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 })
        ).toBe(true);
        expect(
            // Only colonyTransports
            hasShips({ escorts: 0, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransports: 1, colonyTransportsWithCet: 0, id: "E", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 })
        ).toBe(true);
        expect(
            // Only colonyTransportsWithCet
            hasShips({ escorts: 0, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 1, id: "F", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 })
        ).toBe(true);
    });

    it("returns false if all ship counts are zero", () => {
        expect(
            hasShips({ escorts: 0, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "Z", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 })
        ).toBe(false);
    });
});


describe("shouldWithDraw", () => {
    const baseRules = { minimumWinPercent: 0.5, minimumDamageRatio: 0.5 };

    it("returns true if winPercent is below minimum and damage ratio is below minimum", () => {
        const taskForce: TeamTaskForce = {
            id: "A",
            escorts: 1,
            attackShips: 0,
            dreadnaughts: 0,
            scouts: 0,
            colonyTransports: 0,
            colonyTransportsWithCet: 0,
            won: false,
            withdraw: false,
            rulesOfEngagement: { ...baseRules },
            colonyDefense: false,
            escortsWithIsw: 0,
            attackShipsWithIsw: 0,
            dreadnaughtsWithIsw: 0
        };
        const enemyTaskForces: TeamTaskForce[] = [
            {
                id: "B",
                escorts: 1,
                attackShips: 0,
                dreadnaughts: 0,
                scouts: 0,
                colonyTransports: 0,
                colonyTransportsWithCet: 0,
                won: false,
                withdraw: false,
                rulesOfEngagement: { ...baseRules },
                colonyDefense: false,
                escortsWithIsw: 0,
                attackShipsWithIsw: 0,
                dreadnaughtsWithIsw: 0
            }
        ];
        const projections = {
            A: { winPercent: 0.4, nextRoundLosses: 2 },
            B: { winPercent: 0.6, nextRoundLosses: 0.5 }
        };
        const messages: string[] = [];
        expect(
            shouldWithDraw(taskForce, enemyTaskForces, projections, messages)
        ).toBe(true);
        expect(messages.some(m => m.includes("withdraw winPct"))).toBe(true);
        expect(messages.some(m => m.includes("withdraw dmgRatio"))).toBe(true);
    });

    it("returns false if winPercent is above minimum", () => {
        const taskForce: TeamTaskForce = {
            id: "A",
            escorts: 1,
            attackShips: 0,
            dreadnaughts: 0,
            scouts: 0,
            colonyTransports: 0,
            colonyTransportsWithCet: 0,
            won: false,
            withdraw: false,
            rulesOfEngagement: { ...baseRules },
            colonyDefense: false,
            escortsWithIsw: 0,
            attackShipsWithIsw: 0,
            dreadnaughtsWithIsw: 0
        };
        const enemyTaskForces: TeamTaskForce[] = [
            {
                id: "B",
                escorts: 1,
                attackShips: 0,
                dreadnaughts: 0,
                scouts: 0,
                colonyTransports: 0,
                colonyTransportsWithCet: 0,
                won: false,
                withdraw: false,
                rulesOfEngagement: { ...baseRules },
                colonyDefense: false,
                escortsWithIsw: 0,
                attackShipsWithIsw: 0,
                dreadnaughtsWithIsw: 0
            }
        ];
        const projections = {
            A: { winPercent: 0.6, nextRoundLosses: 2 },
            B: { winPercent: 0.4, nextRoundLosses: 1 }
        };
        const messages: string[] = [];
        expect(
            shouldWithDraw(taskForce, enemyTaskForces, projections, messages)
        ).toBe(false);
        expect(messages.length).toBe(0);
    });

    it("returns false if averageLosses is zero", () => {
        const taskForce: TeamTaskForce = {
            id: "A",
            escorts: 1,
            attackShips: 0,
            dreadnaughts: 0,
            scouts: 0,
            colonyTransports: 0,
            colonyTransportsWithCet: 0,
            won: false,
            withdraw: false,
            rulesOfEngagement: { ...baseRules },
            colonyDefense: false,
            escortsWithIsw: 0,
            attackShipsWithIsw: 0,
            dreadnaughtsWithIsw: 0
        };
        const enemyTaskForces: TeamTaskForce[] = [
            {
                id: "B",
                escorts: 1,
                attackShips: 0,
                dreadnaughts: 0,
                scouts: 0,
                colonyTransports: 0,
                colonyTransportsWithCet: 0,
                won: false,
                withdraw: false,
                rulesOfEngagement: { ...baseRules },
                colonyDefense: false,
                escortsWithIsw: 0,
                attackShipsWithIsw: 0,
                dreadnaughtsWithIsw: 0
            }
        ];
        const projections = {
            A: { winPercent: 0.4, nextRoundLosses: 0 },
            B: { winPercent: 0.6, nextRoundLosses: 1 }
        };
        const messages: string[] = [];
        expect(
            shouldWithDraw(taskForce, enemyTaskForces, projections, messages)
        ).toBe(false);
    });

    it("returns false if no enemy task forces", () => {
        const taskForce: TeamTaskForce = {
            id: "A",
            escorts: 1,
            attackShips: 0,
            dreadnaughts: 0,
            scouts: 0,
            colonyTransports: 0,
            colonyTransportsWithCet: 0,
            won: false,
            withdraw: false,
            rulesOfEngagement: { ...baseRules },
            colonyDefense: false,
            escortsWithIsw: 0,
            attackShipsWithIsw: 0,
            dreadnaughtsWithIsw: 0
        };
        const enemyTaskForces: TeamTaskForce[] = [];
        const projections = {
            A: { winPercent: 0.1, nextRoundLosses: 2 }
        };
        const messages: string[] = [];
        expect(
            shouldWithDraw(taskForce, enemyTaskForces, projections, messages)
        ).toBe(false);
    });

    it("returns false if averageEnemyLosses/averageLosses is above minimumDamageRatio", () => {
        const taskForce: TeamTaskForce = {
            id: "A",
            escorts: 1,
            attackShips: 0,
            dreadnaughts: 0,
            scouts: 0,
            colonyTransports: 0,
            colonyTransportsWithCet: 0,
            won: false,
            withdraw: false,
            rulesOfEngagement: { ...baseRules },
            colonyDefense: false,
            escortsWithIsw: 0,
            attackShipsWithIsw: 0,
            dreadnaughtsWithIsw: 0
        };
        const enemyTaskForces: TeamTaskForce[] = [
            {
                id: "B",
                escorts: 1,
                attackShips: 0,
                dreadnaughts: 0,
                scouts: 0,
                colonyTransports: 0,
                colonyTransportsWithCet: 0,
                won: false,
                withdraw: false,
                rulesOfEngagement: { ...baseRules },
                colonyDefense: false,
                escortsWithIsw: 0,
                attackShipsWithIsw: 0,
                dreadnaughtsWithIsw: 0
            }
        ];
        const projections = {
            A: { winPercent: 0.4, nextRoundLosses: 1 },
            B: { winPercent: 0.6, nextRoundLosses: 1 }
        };
        const messages: string[] = [];
        expect(
            shouldWithDraw(taskForce, enemyTaskForces, projections, messages)
        ).toBe(false);
    });
});

describe("attackShip", () => {
    beforeEach(() => {
        if (jest.isMockFunction(roll6SidedDie)) (roll6SidedDie as jest.Mock).mockReset();
    });

    it("returns 0 for NO_EFFECT", () => {
        expect(attackShip(SHIP_TYPE.SCOUT, SHIP_TYPE.ESCORT, false)).toBe(0);
        expect(attackShip(SHIP_TYPE.COLONY_TRANSPORT, SHIP_TYPE.ATTACK_SHIP, false)).toBe(0);
    });

    it("returns 1 for AUTOMATIC_DESTRUCTION", () => {
        expect(attackShip(SHIP_TYPE.DREADNAUGHT, SHIP_TYPE.SCOUT, false)).toBe(1);
        expect(attackShip(SHIP_TYPE.DREADNAUGHT, SHIP_TYPE.COLONY_TRANSPORT, false)).toBe(1);
    });

    it("returns 1 for toHitValue 10 (2d6 roll) and roll of 10", () => {
        (roll6SidedDie as jest.Mock).mockReturnValueOnce(4).mockReturnValueOnce(6);
        const result = attackShip(SHIP_TYPE.ATTACK_SHIP, SHIP_TYPE.DREADNAUGHT, false);
        expect(result).toBe(1);
    });

    it("returns 1 for normal toHitValue (1d6 roll) and roll of 1", () => {
        (roll6SidedDie as jest.Mock).mockReturnValue(1);
        const result = attackShip(SHIP_TYPE.ATTACK_SHIP, SHIP_TYPE.ESCORT, false);
        expect(result).toBe(1);
    });
});

describe("attackTaskForce", () => {
    beforeEach(() => {
        if (jest.isMockFunction(roll6SidedDie)) (roll6SidedDie as jest.Mock).mockReset();
    });

    it("returns zero losses if attacking force has no ships", () => {
        //(roll6SidedDie as jest.Mock).mockReturnValueOnce(4)
        const attacker = {
            id: "A",
            escorts: 0,
            attackShips: 0,
            dreadnaughts: 0,
            scouts: 0,
            colonyTransports: 0,
            colonyTransportsWithCet: 0,
            won: false,
            withdraw: false,
            rulesOfEngagement: { minimumWinPercent: 0.4, minimumDamageRatio: 0.4 },
            colonyDefense: false,
            escortsWithIsw: 0,
            attackShipsWithIsw: 0,
            dreadnaughtsWithIsw: 0
        };
        const defenders = [
            {
                id: "B",
                escorts: 1,
                attackShips: 1,
                dreadnaughts: 1,
                scouts: 1,
                colonyTransports: 1,
                colonyTransportsWithCet: 1,
                won: false,
                withdraw: false,
                rulesOfEngagement: { minimumWinPercent: 0.4, minimumDamageRatio: 0.4 },
                colonyDefense: false,
                escortsWithIsw: 0,
                attackShipsWithIsw: 0,
                dreadnaughtsWithIsw: 0
            }
        ];
        const losses = attackTaskForce(attacker, defenders);
        expect(losses.escorts).toBe(0);
        expect(losses.attackShips).toBe(0);
        expect(losses.dreadnaughts).toBe(0);
        expect(losses.scouts).toBe(0);
        expect(losses.colonyTransports).toBe(0);
        expect(losses.colonyTransportsWithCet).toBe(0);
    });

    it("returns losses object with correct keys and values", () => {
        (roll6SidedDie as jest.Mock).mockReturnValueOnce(1).mockReturnValueOnce(1);

        const attacker = {
            id: "A",
            escorts: 1,
            attackShips: 1,
            dreadnaughts: 0,
            scouts: 0,
            colonyTransports: 0,
            colonyTransportsWithCet: 0,
            won: false,
            withdraw: false,
            rulesOfEngagement: { minimumWinPercent: 0.4, minimumDamageRatio: 0.4 },
            colonyDefense: false,
            escortsWithIsw: 0,
            attackShipsWithIsw: 0,
            dreadnaughtsWithIsw: 0
        };
        const defenders = [
            {
                id: "B",
                escorts: 2,
                attackShips: 1,
                dreadnaughts: 0,
                scouts: 0,
                colonyTransports: 0,
                colonyTransportsWithCet: 0,
                won: false,
                withdraw: false,
                rulesOfEngagement: { minimumWinPercent: 0.4, minimumDamageRatio: 0.4 },
                colonyDefense: false,
                escortsWithIsw: 0,
                attackShipsWithIsw: 0,
                dreadnaughtsWithIsw: 0
            }
        ];
        const losses = attackTaskForce(attacker, defenders);
        expect(losses).toHaveProperty("escorts");
        expect(losses).toHaveProperty("attackShips");
        expect(losses).toHaveProperty("dreadnaughts");
        expect(losses).toHaveProperty("scouts");
        expect(losses).toHaveProperty("colonyTransports");
        expect(losses).toHaveProperty("colonyTransportsWithCet");
        expect(losses.escorts).toBe(1);
        expect(losses.attackShips).toBe(1);
        expect(losses.dreadnaughts).toBe(0);
    });

    describe("updateCombatLossesMap (edge cases)", () => {
        beforeEach(() => {
            if (jest.isMockFunction(getRandomIndex)) (getRandomIndex as jest.Mock).mockReset();
        });

        it("does nothing if losses[property] is 0", () => {
            const losses = { escorts: 0, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransportsWithCet: 0, colonyTransports: 0, id: "", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 };
            const tfs: TeamTaskForce[] = [
                { escorts: 2, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "A", won: false, withdraw: false, rulesOfEngagement: { minimumWinPercent: .4, minimumDamageRatio: .4 }, colonyDefense: false, escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 }
            ];
            const map: CombatShipContainerMap = {};
            updateCombatLossesMap(map, losses, tfs, "escorts");
            expect(map["A"]).toBeUndefined();
        });

        it("creates a new ShipContainer in map if not present", () => {
            (getRandomIndex as jest.Mock).mockReturnValue(0);
            const losses = { escorts: 1, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransportsWithCet: 0, colonyTransports: 0, id: "", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 };
            const tfs: TeamTaskForce[] = [
                { escorts: 1, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "A", won: false, withdraw: false, rulesOfEngagement: { minimumWinPercent: .4, minimumDamageRatio: .4 }, colonyDefense: false, escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 }
            ];
            const map: CombatShipContainerMap = {};
            updateCombatLossesMap(map, losses, tfs, "escorts");
            expect(map["A"]).toBeDefined();
            expect(map["A"].escorts).toBe(1);
        });

        it("increments existing ShipContainer in map if present", () => {
            (getRandomIndex as jest.Mock).mockReturnValue(0);
            const losses = { escorts: 2, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransportsWithCet: 0, colonyTransports: 0, id: "", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 };
            const tfs: TeamTaskForce[] = [
                { escorts: 2, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "A", won: false, withdraw: false, rulesOfEngagement: { minimumWinPercent: .4, minimumDamageRatio: .4 }, colonyDefense: false, escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 }
            ];
            const map: CombatShipContainerMap = { "A": { escorts: 1, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "A", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 } };
            updateCombatLossesMap(map, losses, tfs, "escorts");
            expect(map["A"].escorts).toBeGreaterThanOrEqual(2);
        });

        it("does not throw if no targetTaskForces have ships of that type", () => {
            const losses = { escorts: 1, attackShips: 0, dreadnaughts: 0, scouts: 0, colonyTransportsWithCet: 0, colonyTransports: 0, id: "", escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 };
            const tfs: TeamTaskForce[] = [
                { escorts: 0, attackShips: 1, dreadnaughts: 0, scouts: 0, colonyTransports: 0, colonyTransportsWithCet: 0, id: "A", won: false, withdraw: false, rulesOfEngagement: { minimumWinPercent: .4, minimumDamageRatio: .4 }, colonyDefense: false, escortsWithIsw: 0, attackShipsWithIsw: 0, dreadnaughtsWithIsw: 0 }
            ];
            const map: CombatShipContainerMap = {};
            expect(() => updateCombatLossesMap(map, losses, tfs, "escorts")).not.toThrow();
            expect(map["A"]).toBeUndefined();
        });
    });
});