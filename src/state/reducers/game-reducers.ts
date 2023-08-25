import { GameState, Location } from "../../types/game-types";

export const processLoadGame = (state: GameState, payload: any): GameState => {
    const newState: GameState = payload as GameState;
    return { ...newState };
}

export const processSetCurrentLocationId = (state: GameState, payload: any): GameState => {
    return { ...state, currentLocationId: payload };
}

export const processUpdateLocation = (state: GameState, payload: any): GameState => {
    const location: Location = payload;
    const newState = { ...state };
    newState.locationMap = { ...state.locationMap };
    newState.locationMap[location.id] = { ...location };
    return newState;
}