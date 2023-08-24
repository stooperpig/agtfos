import { GameState, Phase, Scenario, TeamType } from "../types/game-types";

export const InitialState: GameState = {
    id: 0,
    phase: Phase.SETUP,
    currentPlayerId: 0,
    phasingPlayerId: 0,
    players: [{
        id: 0,
        name: "Bill",
        teamType: TeamType.CREW
    },{
        id: 0,
        name: "MJ",
        teamType: TeamType.MONSTER
    }],
    scale: 0.25,
    scenarioFile: undefined,
    nextCounterId: 0,
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
    imageMap: {}
}