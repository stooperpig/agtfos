import { Aperture, CounterMap, Location, LocationMap, StackMap } from "../../../../shared/types/game-types";
import { isCrew } from "../../../../shared/utils/counter-utils";


export const validateMove = (selectedCounterIds: string[], fromLocationId: string | undefined, toLocationId: string | undefined, locationMap: LocationMap, counterMap: CounterMap, stackMap: StackMap): string | undefined => {
        if (fromLocationId === undefined) {
            return 'No current location';
        }

        if (toLocationId === undefined) {
            return 'Invalid location';
        }

        if (selectedCounterIds.length === 0) {
            return 'No counters selected';
        }

        if (selectedCounterIds.some((counterId: string) => {
            const counter = counterMap[counterId];
            return counter.stunned;
        })) {
            return 'You can not move stunned counters';
        }

        if (selectedCounterIds.some((counterId: string) => {
            const counter = counterMap[counterId];
            return !isCrew(counter);
        })) {
            return 'You can only move crew counters';
        }

        if (selectedCounterIds.some((counterId: string) => {
            const counter = counterMap[counterId];
            return counter.movementAllowance - counter.usedMovementAllowance < 1;
        })) {
            return 'Counter(s) does not have enough movement points';
        }

        //todo: check selectedCounterIds (make sure some are selected and are all correct type (crew and not stunned) and belong to player)
        //also check movement points remaining
        
        const currentLocation = locationMap[fromLocationId];
        const newLocationIsAdj = currentLocation.apertures.find((aperture: Aperture) => aperture.locationId === toLocationId) !== undefined;
        
        if (!newLocationIsAdj) {
            return 'Location is not accessible from current location';
        }
        
        return undefined;
}