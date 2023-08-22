import { GameState, Scenario } from "../types/game-types";

export const InitialState: GameState = {
    id: 0,
    scenarioFile: undefined,
    counters: {},
    stacks: {}
};

export const InitialScenario: Scenario = {
    id: 'original',
    name: 'original',
    board: {
        imageName: 'board',
        locationMap: {}
    },
    imageMap: {},
    counterTypes: {}
}