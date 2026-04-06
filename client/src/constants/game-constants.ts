import { ImageMap, Scenario } from "../shared/types/game-types";

export const ImageData: ImageMap = {
};

export const ScenarioData: Scenario = {
    id: "",
    name: "",
    board: {
        imageName: "",
        areaDefinitionMap: {}
    },
    imageMap: {},
    crew: [],
    monsterSettings: {
        startingMonsterAreaIds: [],
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
    weaponMap: {},
    counterWidth: 0,
    counterHeight: 0
};