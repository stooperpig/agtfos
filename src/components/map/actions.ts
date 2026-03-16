import { MOVE_TO_LOCATION, SET_CURRENT_LOCATION_ID } from "../../constants/action-constants";
import { AppDispatch, GetState } from "../../constants/store";
import { Aperture } from "../../types/game-types";


export const selectLocation = (locationId: string) => {
    return (dispatch: AppDispatch, getState: GetState) => {
        dispatch({ type: SET_CURRENT_LOCATION_ID, payload: locationId });
    }
}

export const moveToLocation = (locationId: string) => {
    return (dispatch: AppDispatch, getState: GetState) => {
        const state = getState();
        const currentLocationId = state.currentLocationId;
        if (currentLocationId) {
            const location = state.locationMap![currentLocationId];
            const newLocationIsAdj = location.apertures.find((aperture: Aperture) => aperture.locationId === locationId) !== undefined;
            if (newLocationIsAdj) {
                dispatch({ type: MOVE_TO_LOCATION, payload:locationId });
            } else {
                console.log('new location is not adj');
            }
        }
    }
}