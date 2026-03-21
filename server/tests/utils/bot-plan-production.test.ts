import cloneDeep from "lodash.clonedeep";
import { Colony, ColonyMap, ColonyProductionMap, ExplorationData, PlanetType, PlayerColor, PlayerTechnologies, PlayerType, Production, SpentProductionMap, SpentProductionType, StarMap, TaskForceMap, TechnologyResearch } from "../../src/shared/types/game-types";
import { createColonyBuilder, createMapInfoBuilder, createPlayerBuilder, createProductionBuilder, createSpentProductionMapBuilder, createTaskForceBuilder, createTechnologyResearchMapBuilder, createThreatGraphBuilder } from "../../src/shared/utils/builder-utils";
import { roll6SidedDie, rollXSidedDie, shuffleArray, getRandomIntInclusive } from "../../src/shared/utils/dice-utils";
import { allocateUnusedBudgetToResearch, calculateResearchAllocation, executeBotPlayerConstruction, executeBotPlayerImmigration, planBotProduction, researchTechnologies } from "../../src/utils/bot-plan-production";
import { TechnologySequences } from "../../src/shared/constants/game-constants";
import { consoleLogger } from "../../src/utils/logger";

jest.mock('../../src/shared/utils/dice-utils');

beforeAll(() => {
    consoleLogger.debug = jest.fn();
    consoleLogger.info = jest.fn();
    consoleLogger.warn = jest.fn();
    consoleLogger.error = jest.fn();
    jest.spyOn(console, "log").mockImplementation(() => { });
});

beforeEach(() => {
    if (jest.isMockFunction(roll6SidedDie)) (roll6SidedDie as jest.Mock).mockReset();
    if (jest.isMockFunction(shuffleArray)) (shuffleArray as jest.Mock).mockReset();
    if (jest.isMockFunction(rollXSidedDie)) (rollXSidedDie as jest.Mock).mockReset();
    if (jest.isMockFunction(getRandomIntInclusive)) (getRandomIntInclusive as jest.Mock).mockReset();
});

it('bot immigration with overflow only no CET', () => {
    (roll6SidedDie as jest.Mock).mockReturnValueOnce(6).mockReturnValueOnce(6);
    (getRandomIntInclusive as jest.Mock).mockReturnValueOnce(75);

    const colony: Colony = createColonyBuilder("star1-1", 55, 60, PlanetType.TR, "star1", "player1", "team1").build();
    const technologies: string[] = [];
    const spentProductionMap: SpentProductionMap = createSpentProductionMapBuilder().build();

    const expectedColony = { ...colony };
    const expectedSpentProductionMap = { ...spentProductionMap };
    expectedSpentProductionMap[SpentProductionType.colonyTransports] = 8;

    const hasCet = false;
    const turn = 1;
    const colonies: Colony[] = [colony];
    const colonyProductionMap: ColonyProductionMap = {};
    colonyProductionMap[colony.id] = spentProductionMap;
    executeBotPlayerImmigration(colonies, hasCet, colonyProductionMap, turn);

    expect(colony).toEqual(expectedColony);
    expect(spentProductionMap).toEqual(expectedSpentProductionMap);
});

it('bot immigration with overflow only with CET', () => {
    (roll6SidedDie as jest.Mock).mockReturnValueOnce(1).mockReturnValueOnce(6);
    (getRandomIntInclusive as jest.Mock).mockReturnValueOnce(75);

    const colony: Colony = createColonyBuilder("star1-1", 55, 60, PlanetType.TR, "star1", "player1", "team1").build();
    const spentProductionMap: SpentProductionMap = createSpentProductionMapBuilder().build();

    const expectedColony = { ...colony };
    const expectedSpentProductionMap = { ...spentProductionMap };
    expectedSpentProductionMap[SpentProductionType.colonyTransportsWithCet] = 8;
    const hasCet = true;
    const turn = 1;
    const colonies: Colony[] = [colony];
    const colonyProductionMap: ColonyProductionMap = {};
    colonyProductionMap[colony.id] = spentProductionMap;

    executeBotPlayerImmigration(colonies, hasCet, colonyProductionMap, turn);

    expect(colony).toEqual(expectedColony);
    expect(spentProductionMap).toEqual(expectedSpentProductionMap);
});

it('bot immigration with no budget remaining', () => {
    (roll6SidedDie as jest.Mock).mockReturnValueOnce(1).mockReturnValueOnce(6);

    const colony: Colony = createColonyBuilder("star1-1", 55, 60, PlanetType.TR, "star1", "player1", "team1").build();
    const technologies: string[] = ["CET"];
    const spentProductionMap: SpentProductionMap = createSpentProductionMapBuilder().setMovementResearch(55).build();

    const expectedColony = { ...colony };
    const expectedSpentProductionMap = { ...spentProductionMap };
    expectedSpentProductionMap[SpentProductionType.colonyTransportsWithCet] = 0;
    const hasCet = false;
    const turn = 1;
    const colonies: Colony[] = [colony];
    const colonyProductionMap: ColonyProductionMap = {};
    colonyProductionMap[colony.id] = createSpentProductionMapBuilder().build();

    executeBotPlayerImmigration(colonies, hasCet, colonyProductionMap, turn);

    expect(colony).toEqual(expectedColony);
    expect(spentProductionMap).toEqual(expectedSpentProductionMap);
});

it('bot immigration with elected migration no CET', () => {
    (roll6SidedDie as jest.Mock).mockReturnValueOnce(6).mockReturnValueOnce(1);
    (getRandomIntInclusive as jest.Mock).mockReturnValueOnce(10);

    const colony: Colony = createColonyBuilder("star1-1", 55, 60, PlanetType.TR, "star1", "player1", "team1").build();
    const technologies: string[] = [];
    const spentProductionMap: SpentProductionMap = createSpentProductionMapBuilder().build();

    const expectedColony = { ...colony };
    const expectedSpentProductionMap = { ...spentProductionMap };
    expectedSpentProductionMap[SpentProductionType.colonyTransports] = 14;
    const hasCet = false;
    const turn = 1;
    const colonies: Colony[] = [colony];
    const colonyProductionMap: ColonyProductionMap = {};
    colonyProductionMap[colony.id] = spentProductionMap;

    executeBotPlayerImmigration(colonies, hasCet, colonyProductionMap, turn);

    expect(colony).toEqual(expectedColony);
    expect(spentProductionMap).toEqual(expectedSpentProductionMap);
});

it('bot immigration with elected migration with CET', () => {
    (roll6SidedDie as jest.Mock).mockReturnValueOnce(1).mockReturnValueOnce(1);
    (getRandomIntInclusive as jest.Mock).mockReturnValueOnce(10);

    const colony: Colony = createColonyBuilder("star1-1", 55, 60, PlanetType.TR, "star1", "player1", "team1").build();
    const spentProductionMap: SpentProductionMap = createSpentProductionMapBuilder().build();

    const expectedColony = { ...colony };
    const expectedSpentProductionMap = { ...spentProductionMap };
    expectedSpentProductionMap[SpentProductionType.colonyTransportsWithCet] = 14;
    const hasCet = true;
    const turn = 1;
    const colonies: Colony[] = [colony];
    const colonyProductionMap: ColonyProductionMap = {};
    colonyProductionMap[colony.id] = spentProductionMap;

    executeBotPlayerImmigration(colonies, hasCet, colonyProductionMap, turn);
    expect(colony).toEqual(expectedColony);
    expect(spentProductionMap).toEqual(expectedSpentProductionMap);
});

it('bot immigration with elected migration no CET limited budget', () => {
    (roll6SidedDie as jest.Mock).mockReturnValueOnce(6).mockReturnValueOnce(1);
    (getRandomIntInclusive as jest.Mock).mockReturnValueOnce(10);

    const colony: Colony = createColonyBuilder("star1-1", 55, 60, PlanetType.TR, "star1", "player1", "team1").build();
    const colonies: Colony[] = [colony];
    const spentProductionMap: SpentProductionMap = createSpentProductionMapBuilder().setMovementResearch(49).build();

    const expectedColony = { ...colony };
    const expectedSpentProductionMap = { ...spentProductionMap };
    expectedSpentProductionMap[SpentProductionType.colonyTransports] = 6;
    const hasCet = false;
    const turn = 1;
    const colonyProductionMap: ColonyProductionMap = {};
    colonyProductionMap[colony.id] = spentProductionMap;

    executeBotPlayerImmigration(colonies, hasCet, colonyProductionMap, turn);

    expect(colony).toEqual(expectedColony);
    expect(spentProductionMap).toEqual(expectedSpentProductionMap);
});


it('bot immigration with elected migration with CET limited budget', () => {
    (roll6SidedDie as jest.Mock).mockReturnValueOnce(1).mockReturnValueOnce(1);
    (getRandomIntInclusive as jest.Mock).mockReturnValueOnce(10);

    const colony: Colony = createColonyBuilder("star1-1", 55, 60, PlanetType.TR, "star1", "player1", "team1").build();
    const colonies = [colony];
    const spentProductionMap: SpentProductionMap = createSpentProductionMapBuilder().setMovementResearch(49).build();

    const expectedColony = { ...colony };
    const expectedSpentProductionMap = { ...spentProductionMap };
    expectedSpentProductionMap[SpentProductionType.colonyTransportsWithCet] = 3;
    const turn = 1;
    const hasCet = true;
    const colonyProductionMap: ColonyProductionMap = {};
    colonyProductionMap[colony.id] = spentProductionMap;

    executeBotPlayerImmigration(colonies, hasCet, colonyProductionMap, turn);

    expect(colony).toEqual(expectedColony);
    expect(spentProductionMap).toEqual(expectedSpentProductionMap);
});

it('bot construction build one of each', () => {
    (roll6SidedDie as jest.Mock).mockReturnValueOnce(6).mockReturnValueOnce(6);
    (rollXSidedDie as jest.Mock).mockReturnValueOnce(1);

    (shuffleArray as jest.Mock).mockImplementation((options: []) => rotateOptions(options));

    const colony: Colony = createColonyBuilder("star1-1", 88, 88, PlanetType.TR, "star1", "player1", "team1").build();
    const colonies = [colony];
    const availTechsForConstruction: string[] = ["ATK", "DN", "MB", "AMB", "IIT", "AIT", "RIU"];

    const taskForce = createTaskForceBuilder("tf-1-0", "player1", "1", { x: 0, y: 0 }).setEscorts(1).build();
    const taskForces = [taskForce];

    const colonyProductionMap: ColonyProductionMap = {};
    colonyProductionMap[colony.id] = createSpentProductionMapBuilder().build();

    const expectedColony = { ...colony };
    const expectedColonyProductionMap = cloneDeep(colonyProductionMap);
    expectedColonyProductionMap[colony.id] = createSpentProductionMapBuilder().build();
    expectedColonyProductionMap[colony.id].scouts = 1;
    expectedColonyProductionMap[colony.id].escorts = 1;
    expectedColonyProductionMap[colony.id].attackShips = 1;
    expectedColonyProductionMap[colony.id].dreadnaughts = 1;
    expectedColonyProductionMap[colony.id].missileBases = 1;
    expectedColonyProductionMap[colony.id].advancedMissileBases = 1;
    expectedColonyProductionMap[colony.id].planetaryForceScreen = 0;
    expectedColonyProductionMap[colony.id].industrialUnits = 0;
    expectedColonyProductionMap[colony.id].roboticIndustrialUnits = 1;

    const starMap: StarMap = {};
    const explorationData: ExplorationData = {};
    const teamId = "team1";

    //colonies: Colony[], taskForces: TaskForce[], colonyProductionMap: ColonyProductionMap, availTechsForConstruction: string[]
    executeBotPlayerConstruction(colonies, taskForces, colonyProductionMap, availTechsForConstruction, starMap, explorationData, teamId);

    expect(colony).toEqual(expectedColony);
    expect(colonyProductionMap).toEqual(expectedColonyProductionMap);
});

it('calculateResearchAllocation', () => {
    (rollXSidedDie as jest.Mock).mockReturnValueOnce(1);
    //allocation percent
    (getRandomIntInclusive as jest.Mock).mockReturnValueOnce(10);
    (shuffleArray as jest.Mock).mockImplementation((options: []) => rotateOptions(options));

    const colony: Colony = createColonyBuilder("star1-1", 40, 60, PlanetType.TR, "star1", "player1", "team1").build();
    const colonies = [colony];

    const existingTechnologies: PlayerTechnologies = {
        currentMovementRate: 2,
        shipMovementAllowance: [],
        shipMovementAllowanceBalance: 0,
        weaponSystems: [],
        weaponSystemsBalance: 0,
        technical: [],
        technicalBalance: 0
    };

    const colonyProductionMap: ColonyProductionMap = {};
    colonyProductionMap[colony.id] = createSpentProductionMapBuilder().build();

    const expectedResult: ColonyProductionMap = {};
    expectedResult[colony.id] = createSpentProductionMapBuilder().build();
    expectedResult[colony.id].weaponsResearch = 4;

    calculateResearchAllocation(colonyProductionMap, existingTechnologies, colonies, []);

    expect(colonyProductionMap[colony.id].weaponsResearch).toEqual(4);
    expect(colonyProductionMap[colony.id].movementResearch).toEqual(0);
    expect(colonyProductionMap[colony.id].technologyResearch).toEqual(0);
});

it('allocateUnusedBudgetToResearch 8 left over after construction costs of 32', () => {
    (shuffleArray as jest.Mock).mockImplementation((options: []) => rotateOptions(options));

    const colony: Colony = createColonyBuilder("star1-1", 40, 60, PlanetType.TR, "star1", "player1", "team1").build();
    const colonies: Colony[] = [colony];
    const production: Production = createProductionBuilder().setColonyProductionMap({ "star1-1": createSpentProductionMapBuilder().setEscorts(4).build() }).build();

    const existingTechnologies: PlayerTechnologies = {
        currentMovementRate: 2,
        shipMovementAllowance: [],
        shipMovementAllowanceBalance: 0,
        weaponSystems: [],
        weaponSystemsBalance: 0,
        technical: [],
        technicalBalance: 0
    }

    const expectedProduction = cloneDeep(production);
    expectedProduction.colonyProductionMap["star1-1"][SpentProductionType.weaponsResearch] = 8;

    allocateUnusedBudgetToResearch(colonies, production, existingTechnologies);

    expect(production).toEqual(expectedProduction);
});

// it('executeBotPlayerProduction', () => {
//     //should build ct with cet,  
//     (roll6SidedDie as jest.Mock).mockReturnValueOnce(6).mockReturnValueOnce(6);
//     (rollXSidedDie as jest.Mock).mockReturnValueOnce(1);
//     //should immigrate, research allocation percent 25
//     (getRandomIntInclusive as jest.Mock).mockReturnValueOnce(25).mockReturnValueOnce(0);

//     (shuffleArray as jest.Mock).mockImplementation((options: []) => rotateOptions(options));

//     let colony: Colony = createColonyBuilder("star1-1", 40, 60, PlanetType.TR, "star1", "bot1", "team1").build();
//     const colonyMap: ColonyMap = {};
//     colonyMap[colony.id] = colony;
//     colony = createColonyBuilder("star2-1", 40, 60, PlanetType.TR, "star2", "player1", "team1").build();
//     colonyMap[colony.id] = colony;

//     let taskForce = createTaskForceBuilder("tf-1-0", "bot1", "1", { x: 0, y: 0 }).setEscorts(1).build();
//     const taskForceMap: TaskForceMap = {};
//     taskForceMap[taskForce.id] = taskForce;
//     taskForce = createTaskForceBuilder("tf-2-0", "player1", "2", { x: 0, y: 0 }).setEscorts(1).build();
//     taskForceMap[taskForce.id] = taskForce;

//     const player = createPlayerBuilder("bot1", "Bot1", 1, "team1", PlayerColor.WHITE, PlayerType.BOT).build();

//     const expectedPlayer = cloneDeep(player);
//     expectedPlayer.production = createProductionBuilder().setColonyProductionMap({ "star1-1": createSpentProductionMapBuilder().setEscorts(3).setScouts(5).setWeaponsResearch(1).build() }).build();
//     const expectedTaskForceMap = cloneDeep(taskForceMap);
//     const expectedColonyMap = cloneDeep(colonyMap);
//     const threahGraph = createThreatGraphBuilder().build();
//     const mapData = createMapInfoBuilder().setStarMap({}).build();
//     const explorationData: ExplorationData = {};
//     const turn = 1;

//     //executeBotPlayerProduction = (colonyMap: ColonyMap, taskForceMap: TaskForceMap, player: Player)
//     planBotProduction(colonyMap, taskForceMap, player, threahGraph, mapData.starMap, explorationData, turn);

//     expect(colonyMap).toEqual(expectedColonyMap);
//     expect(taskForceMap).toEqual(expectedTaskForceMap);

//     expect(player).toEqual(expectedPlayer);
// });

// it('executeBotPlayerProduction with previous research balances', () => {
//     //should build ct with cet,  
//     (roll6SidedDie as jest.Mock).mockReturnValueOnce(6).mockReturnValueOnce(6);
//     (rollXSidedDie as jest.Mock).mockReturnValueOnce(1);
//     //should immigrate, research allocation percent 25
//     (getRandomIntInclusive as jest.Mock).mockReturnValueOnce(25).mockReturnValueOnce(25);
//     (shuffleArray as jest.Mock).mockImplementation((options: []) => rotateOptions(options));

//     let colony: Colony = createColonyBuilder("star1-1", 40, 60, PlanetType.TR, "star1", "bot1", "team1").build();
//     const colonyMap: ColonyMap = {};
//     colonyMap[colony.id] = colony;
//     colony = createColonyBuilder("star2-1", 40, 60, PlanetType.TR, "star2", "player1", "team1").build();
//     colonyMap[colony.id] = colony;

//     let taskForce = createTaskForceBuilder("tf-1-0", "bot1", "1", { x: 0, y: 0 }).setEscorts(1).build();
//     const taskForceMap: TaskForceMap = {};
//     taskForceMap[taskForce.id] = taskForce;
//     taskForce = createTaskForceBuilder("tf-2-0", "player1", "2", { x: 0, y: 0 }).setEscorts(1).build();
//     taskForceMap[taskForce.id] = taskForce;

//     const player = createPlayerBuilder("bot1", "Bot1", 1, "team1", PlayerColor.WHITE, PlayerType.BOT).build();
//     player.technologies.shipMovementAllowanceBalance = 15;
//     player.technologies.technicalBalance = 30;

//     const expectedPlayer = cloneDeep(player);
//     expectedPlayer.production = createProductionBuilder().setColonyProductionMap({ "star1-1": createSpentProductionMapBuilder().setEscorts(2).setScouts(4).setWeaponsResearch(12).build() }).build();
//     expectedPlayer.production.technologyResearchMap[SpentProductionType.movementResearch] = [{ symbol: "3MA", amount: 15 }];
//     expectedPlayer.production.technologyResearchMap[SpentProductionType.technologyResearch] = [{ symbol: "CET", amount: 30 }];
//     const expectedTaskForceMap = cloneDeep(taskForceMap);
//     const expectedColonyMap = cloneDeep(colonyMap);
//     const threatGraph = createThreatGraphBuilder().build();
//     const mapData = createMapInfoBuilder().setStarMap({}).build();
//     const explorationData: ExplorationData = {};
//     const turn = 1;

//     planBotProduction(colonyMap, taskForceMap, player, threatGraph, mapData.starMap, explorationData, turn);

//     expect(colonyMap).toEqual(expectedColonyMap);
//     expect(taskForceMap).toEqual(expectedTaskForceMap);

//     expect(player).toEqual(expectedPlayer);
// });

it('executeBotPlayerResearch no balance', () => {
    const technologies = TechnologySequences.shipMovementAllowance;
    const previousResearch: string[] = []
    const expectedResult: TechnologyResearch[] = [];
    const balance = 0;

    const result = researchTechnologies(technologies, previousResearch, balance);

    expect(result).toEqual(expectedResult);
});

it('executeBotPlayerResearch to cover 1 tech no previous', () => {
    const technologies = TechnologySequences.shipMovementAllowance;
    const previousResearch: string[] = []
    const expectedResult: TechnologyResearch[] = [{
        symbol: "3MA",
        amount: 15
    }];
    const balance = 15;

    const result = researchTechnologies(technologies, previousResearch, balance);

    expect(result).toEqual(expectedResult);
});

it('executeBotPlayerResearch to cover 2 techs no previous', () => {
    const technologies = TechnologySequences.shipMovementAllowance;
    const previousResearch: string[] = []
    const expectedResult: TechnologyResearch[] = [{
        symbol: "3MA",
        amount: 15
    }, {
        symbol: "4MA",
        amount: 30
    }];
    const balance = 47;

    const result = researchTechnologies(technologies, previousResearch, balance);

    expect(result).toEqual(expectedResult);
});

it('executeBotPlayerResearch to cover 2 techs one previous', () => {
    const technologies = TechnologySequences.shipMovementAllowance;
    const previousResearch: string[] = ["3MA"];
    const expectedResult: TechnologyResearch[] = [{
        symbol: "4MA",
        amount: 30
    }, {
        symbol: "5MA",
        amount: 40
    }];
    const balance = 72;

    const result = researchTechnologies(technologies, previousResearch, balance);

    expect(result).toEqual(expectedResult);
});


//***********************************************************************************************************************/
//                                                  Utils
//********************************************************************************************************************* */

const rotateOptions = (arr: SpentProductionType[]): SpentProductionType[] => {
    const returnValue = [...arr];
    if (returnValue.length === 0) return [...arr]; // Handle empty array
    const first = returnValue.shift(); // Remove the first element
    if (first) {
        returnValue.push(first); // Add it to the end
    }
    return returnValue;
}

// const createOptions = (options: SpentProductionType[]): SpentProductionType[][] => {
//     const returnValue = [];
//     //let options = ;
//     returnValue.push(options);
//     for (let i = 0; i < options.length; ++i) {
//         options = rotateOptions(options);
//         returnValue.push(options);
//     }

//     returnValue.push(options);
//     returnValue.push(options);

//     return returnValue;
// }