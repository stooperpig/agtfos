import { Aperture, Counter, CounterState, CounterType, GameState, Location, LocationMap, Phase, Stack, StackMap } from "./types/game-types"
import { ImageData } from './constants/game-constants';
import { AppDispatch } from "./constants/store";
import { LOAD_GAME } from "./constants/action-constants";
import axios from "axios";
import scenarioData from "./constants/scenario-data";
import { pickRandom, roll6SidedDie } from "./utils/dice-utils";

export const retrieveGame = (gameId: number, playerId: number) => async (dispatch: AppDispatch) => {
  console.log('retrieveGame');
  const response = await axios.get(`/games/game-${gameId}-${playerId}.json`);

  console.log(JSON.stringify(response.data));
  const gameState: GameState = response.data;

  await retrieveScenario(dispatch, gameState);
}

const retrieveScenario = async (dispatch: AppDispatch, gameState: GameState) => {
  console.log('retrieveScenario');
  const response = await axios.get(`/scenarios/${gameState.scenarioFile}.json`);

  console.log(JSON.stringify(response.data));

  Object.assign(scenarioData, response.data);
  Object.assign(ImageData, response.data.imageMap);

  gameState.locationMap = response.data.board.locationMap;

  let loadedImages = 0;
  const numImages = Object.keys(ImageData).length;

  const onLoad = () => {
    console.log(`image ${loadedImages} loaded of ${numImages}`);
    if (++loadedImages >= numImages) {
      console.log("load game");
      if (gameState.phase === Phase.SETUP) {
        setupGame(gameState);
      }
      dispatch({ type: LOAD_GAME, payload: gameState });
    }
  }

  for (let imageName in ImageData) {
    console.log("loading image " + imageName);
    let src = ImageData[imageName].src;
    let image = new Image();
    image.onload = onLoad;
    image.src = src;
    ImageData[imageName].image = image;
  }
}

interface CounterLocation {
  id: string,
  name: string,
  stackIds: string[]
}

const placeCrew = (gameState: GameState) => {
  const crewLocations = [{
    id: "0",
    name: "1st-Officer",
    stackIds: ["4-1", "7-1"]
  }, {
    "id": "1",
    "name": "Captain-Yid",
    stackIds: ["4-1", "7-1"]
  }, {
    "id": "2",
    "name": "Comm-Officer",
    stackIds: ["4-1", "7-1", "23-1"]
  }, {
    "id": "3",
    "name": "Cook",
    stackIds: ["27-1", "25-1"]
  }, {
    "id": "4",
    "name": "Coxswain",
    stackIds: ["29-1", "37-1"]
  }, {
    "id": "5",
    "name": "Doc",
    stackIds: ["37-1", "9-1"]
  }, {
    "id": "6",
    "name": "Engineer",
    stackIds: ["12-1", "40-1", "33-1"]
  }, {
    "id": "7",
    "name": "Engineer-Officer",
    stackIds: ["12-1", "9-1"]
  }, {
    "id": "8",
    "name": "Machinist",
    stackIds: ["40-1", "33-1"]
  }, {
    "id": "9",
    "name": "Marine",
    stackIds: ["9-1", "37-1"]
  }, {
    "id": "10",
    "name": "Marine2",
    stackIds: ["9-1", "37-1"]
  }, {
    "id": "11",
    "name": "Mascot",
    stackIds: ["3-1"]
  }, {
    "id": "12",
    "name": "Medic",
    stackIds: ["37-1", "36-1"]
  }, {
    "id": "13",
    "name": "Ops-Officer",
    stackIds: ["41-1", "24-1"]
  }, {
    "id": "14",
    "name": "Pilot",
    stackIds: ["2-1", "8-1", "9-1"]
  }, {
    "id": "15",
    "name": "Pilot2",
    stackIds: ["2-1", "8-1", "9-1"]
  }, {
    "id": "16",
    "name": "Robot",
    stackIds: ["40-1", "33-1"]
  }, {
    "id": "17",
    "name": "Sarge",
    stackIds: ["9-1", "29-1"]
  }, {
    "id": "18",
    "name": "Sparks",
    stackIds: ["4-1", "7-1"]
  }, {
    "id": "19",
    "name": "Supply-Officer",
    stackIds: ["28-1", "25-1"]
  }, {
    "id": "20",
    "name": "Tech",
    stackIds: ["1-1", "16-1"]
  }, {
    "id": "21",
    "name": "Yeoman",
    stackIds: ["4-1", "7-1"]
  }]

  crewLocations.forEach((crewLocation: CounterLocation) => {
    const counter = gameState.counters[crewLocation.id];
    const index = pickRandom(crewLocation.stackIds.length);
    const assignment = crewLocation.stackIds[index - 1];
    let stack = gameState.stacks[assignment];

    if (stack === undefined) {
      stack = createStack(assignment);
      gameState.stacks[assignment] = stack;
    }

    stack.counterIds.push(counter.id);
  })
}

const placeWeapons = (gameState: GameState) => {
  const weaponLocations = [{
    "id": "22",
    "name": "BottleOfAcid",
    stackIds: ["30-3"]
  }, {
    "id": "23",
    "name": "BottleOfAcid",
    stackIds: ["30-3"]
  }, {
    "id": "24",
    "name": "BottleOfAcid",
    stackIds: ["30-3"]
  }, {
    "id": "25",
    "name": "CannisterOfZgwortz",
    stackIds: ["27-3", "29-3"]
  }, {
    "id": "26",
    "name": "CannisterOfZgwortz",
    stackIds: ["27-3", "29-3"]
  }, {
    "id": "27",
    "name": "CannisterOfZgwortz",
    stackIds: ["27-3", "29-3"]
  }, {
    "id": "28",
    "name": "CommBeamer",
    stackIds: ["1-3", "16-3"]
  }, {
    "id": "29",
    "name": "CommBeamer",
    stackIds: ["1-3", "16-3"]
  }, {
    "id": "30",
    "name": "ElectricFence",
    stackIds: ["6-3"]
  }, {
    "id": "31",
    "name": "ElectricFence",
    stackIds: ["6-3"]
  }, {
    "id": "32",
    "name": "FireExtinguisher",
    stackIds: ["33-3", "40-3"]
  }, {
    "id": "33",
    "name": "FireExtinguisher",
    stackIds: ["33-3", "40-3"]
  }, {
    "id": "34",
    "name": "GasGrenade",
    stackIds: ["39-3"]
  }, {
    "id": "35",
    "name": "GasGrenade",
    stackIds: ["39-3"]
  }, {
    "id": "36",
    "name": "GasGrenade",
    stackIds: ["39-3"]
  }, {
    "id": "37",
    "name": "Hypodermic",
    stackIds: ["37-3"]
  }, {
    "id": "38",
    "name": "Hypodermic",
    stackIds: ["37-3"]
  }, {
    "id": "39",
    "name": "Knife",
    stackIds: ["27-4"]
  }, {
    "id": "40",
    "name": "Knife",
    stackIds: ["27-4"]
  }, {
    "id": "41",
    "name": "Knife",
    stackIds: ["27-4"]
  }, {
    "id": "42",
    "name": "PoolStick",
    stackIds: ["9-3"]
  }, {
    "id": "43",
    "name": "PoolStick",
    stackIds: ["9-3"]
  }, {
    "id": "44",
    "name": "RocketFuel",
    stackIds: ["10-3", "13-3"]
  }, {
    "id": "45",
    "name": "RocketFuel",
    stackIds: ["10-3", "13-3"]
  }, {
    "id": "46",
    "name": "RocketFuel",
    stackIds: ["10-3", "13-3"]
  }, {
    "id": "47",
    "name": "StunPistol",
    stackIds: ["4-3", "7-3"]
  }, {
    "id": "48",
    "name": "StunPistol",
    stackIds: ["4-3", "7-3"]
  }, {
    "id": "49",
    "name": "WeldingTorch",
    stackIds: ["40-4", "33-4"]
  }, {
    "id": "50",
    "name": "WeldingTorch",
    stackIds: ["40-4", "33-4"]
  }]

  weaponLocations.forEach((weaponLocation: CounterLocation) => {
    const counter = gameState.counters[weaponLocation.id];
    const index = pickRandom(weaponLocation.stackIds.length);
    const assignment = weaponLocation.stackIds[index - 1];
    let stack = gameState.stacks[assignment];

    if (stack === undefined) {
      stack = createStack(assignment);
      gameState.stacks[assignment] = stack;
    }

    stack.counterIds.push(counter.id);
  })
}

const placeMonsters = (gameState: GameState) => {
  let roll = roll6SidedDie();
  let monsters: Counter[] = [];

  switch (roll) {
    case 1:
      monsters = createMonsters(gameState.nextCounterId, 6, 4, 2);
      break;
    case 2:
      monsters = createMonsters(gameState.nextCounterId, 6, 3, 3);
      break;
    case 3:
      monsters = createMonsters(gameState.nextCounterId, 5, 4, 3);
      break;
    case 4:
      monsters = createMonsters(gameState.nextCounterId, 4, 4, 4);
      break;
    case 5:
      monsters = createMonsters(gameState.nextCounterId, 2, 5, 4);
      break;
    case 6:
      monsters = createMonsters(gameState.nextCounterId, 1, 6, 4);
      break;
    default:
      break;
  }

  roll = pickRandom(5);
  let startingLocationId: string = ''
  switch(roll) {
    case 1:
      startingLocationId = '6'; 
      break;
    case 2:
      startingLocationId = '30';
      break;
    case 3:
      startingLocationId = '17';
      break;
    case 4:
      startingLocationId = '18';
      break;
    case 5:
      startingLocationId = '19';
      break;
    default:
      break;
  }

  const locationMap = gameState.locationMap!;
  const locationIds = traverseBF(locationMap, gameState.stacks, monsters.length, locationMap![startingLocationId]);

  for(let i = 0; i < monsters.length; ++i) {
    const location = locationMap[locationIds[i]];
    const stackId = location.monsterStackId;
    const monster = monsters[i];

    gameState.counters[monster.id] = monster;

    let stack = gameState.stacks[stackId];

    if (stack === undefined) {
      stack = createStack(stackId);
      gameState.stacks[stackId] = stack;
    }

    console.log(`adding monster ${monster.id} to stack ${stackId}`);
    stack.counterIds.push(monster.id);
  }

  console.log(`found ${locationIds.length} locations`);

}

const createMonsters = (nextCounterId: number, numOfEggs: number, numOfBabies: number, numOfAdults: number): Counter[] => {
  const counters: Counter[] = [];
  let id = nextCounterId;

  for (let i = 0; i < numOfEggs; ++i) {
    const counter = createEgg(id + '');
    ++id;
    counters.push(counter);
  }

  for (let i = 0; i < numOfBabies; ++i) {
    const counter = createBaby(id + '');
    ++id;
    counters.push(counter);
  }

  for (let i = 0; i < numOfAdults; ++i) {
    const counter = createAdult(id + '');
    ++id;
    counters.push(counter);
  }

  console.log(JSON.stringify(counters));

  return counters;
}

const setupGame = (gameState: GameState) => {
  placeCrew(gameState);
  placeWeapons(gameState);
  placeMonsters(gameState);
}

const createStack = (id: string): Stack => {
  const parts = id.split('-');
  return {
    id: id,
    locationId: parts[0],
    counterIds: []
  }
}

const createEgg = (id: string): Counter => {
  const roll = pickRandom(5);
  return {
    id: id,
    name: 'Egg',
    type: CounterType.EGG,
    state: CounterState.NORMAL,
    movementAllowance: 0,
    attackDice: 0,
    constitution: 5,
    imageName: `Egg-${roll}`
  }
}

const createBaby = (id: string): Counter => {
  const roll = pickRandom(12);
  return {
    id: id,
    name: 'Baby',
    type: CounterType.BABY,
    state: CounterState.NORMAL,
    movementAllowance: 1,
    attackDice: 2,
    constitution: 12,
    imageName: `Baby-${roll}`
  }
}

const createAdult = (id: string): Counter => {
  const roll = pickRandom(12);
  return {
    id: id,
    name: 'Adult',
    type: CounterType.ADULT,
    state: CounterState.NORMAL,
    movementAllowance: 2,
    attackDice: 4,
    constitution: 16,
    imageName: `Adult-${roll}`
  }
}

const createFragment = (id: string): Counter => {
  const roll = pickRandom(7);
  return {
    id: id,
    name: 'Fragment',
    type: CounterType.FRAGMENT,
    state: CounterState.NORMAL,
    movementAllowance: 0,
    attackDice: 1,
    constitution: 8,
    imageName: `Fragment-${roll}`
  }
}

const traverseBF = (locationMap: LocationMap, stacks: StackMap, count: number, startingLocation: Location): string[] => {
  const visited: string[] = [];
  const locationStack: Location[] = [startingLocation];

  console.log(`traverse starting with ${startingLocation.id}`);

  while(locationStack.length > 0 && visited.length < count) {
    const location = locationStack.shift();
    if (location === undefined) {
      break;
    }

    visited.push(location.id);

    console.log('-----------------------------');
    console.log('visited');
    console.log(JSON.stringify(visited));
    console.log('locationStack');
    console.log(JSON.stringify(locationStack));

    const apertures = location?.apertures.filter((aperture: Aperture) => {
      const locationId = aperture.locationId;

      const alreadyVisited = visited.find((id: string) => id === locationId) !== undefined;
      console.log(`locationId ${locationId} visited: ${alreadyVisited}`);
      if (alreadyVisited) {
        return false;
      }

      const alreadyInLocationStack = locationStack.find((location: Location) => location.id === locationId) !== undefined;
      console.log(`locationId ${locationId} already in locationStack: ${alreadyInLocationStack}`);
      if (alreadyInLocationStack) {
        return false;
      }

      const adjLocation = locationMap[locationId];
      const stack = stacks[adjLocation.crewStackId];

      const doesNotContainsCrew = (stack === undefined || stack.counterIds.length === 0);
      console.log(`locationId ${locationId} contains crew: ${!doesNotContainsCrew}`);
      return doesNotContainsCrew;
    });

    const adjLocations = apertures.map((aperture: Aperture) => {
      const locationId = aperture.locationId;
      const adjLocation = locationMap[locationId];
      return adjLocation;
    });



    locationStack.push(...adjLocations);

    const tempIds = locationStack.map((location: Location) => location.id);
    console.log('locationStack:');
    console.log(JSON.stringify(tempIds));
  }
//   let collection = [this.root];
//   while(collection.length) {
//     let node = collection.shift()
//     if (node.data === value) {
//       return true
//     } else {
//       collection.push(...node.children)
//     }
//   }
  return visited;
}