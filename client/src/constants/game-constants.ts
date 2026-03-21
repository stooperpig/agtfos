import { ImageMap, Scenario, MapInfo } from "../shared/types/game-types";

export const ImageData: ImageMap = {
};

export const ScenarioData: Scenario = {
    id: "",
    name: "",
    board: {
        imageName: "",
        locationMap: {}
    },
    imageMap: {},
    crew: [],
    monsterSettings: {
        startingMonsterLocationIds: [],
        maxBabyCount: 0,
        babyImageCount: 0,
        maxAdultCount: 0,
        adultImageCount: 0,
        maxFragmentCount: 0,
        fragmentImageCount: 0,
        maxEggCount: 0,
        eggImageCount: 0,
        startingCounts: []
    },
    weaponMap: {}
};

// export const MapData: MapInfo = {
//     rows: 21,
//     columns: 32,
//     entryHexes: [],
//     gasClouds: [],
//     starMap: {}
// }
