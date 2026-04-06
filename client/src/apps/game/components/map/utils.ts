import { Aperture, CounterMap, AreaDefinitionMap, StackMap, Counter } from "../../../../shared/types/game-types";
import { isCrew } from "../../../../shared/utils/counter-utils";


export const validateMove = (selectedCounterIds: string[], fromAreaId: string | undefined, toAreaId: string | undefined, areaDefinitionMap: AreaDefinitionMap, counterMap: CounterMap, stackMap: StackMap): string | undefined => {
    if (fromAreaId === undefined) {
        return 'No current location';
    }

    if (toAreaId === undefined) {
        return 'Invalid location';
    }

    if (selectedCounterIds.length === 0) {
        return 'No counters selected';
    }

    if (selectedCounterIds.some((counterId: string) => {
        const counter = counterMap[counterId];
        return !isCrew(counter);
    })) {
        return 'You can only move crew counters';
    }

    if (fromAreaId === toAreaId) {
        return undefined;
    }

    if (fromAreaId !== toAreaId && selectedCounterIds.some((counterId: string) => {
        const counter = counterMap[counterId];
        return counter.stunned;
    })) {
        return 'You can not move stunned counters';
    }

    if (selectedCounterIds.some((counterId: string) => {
        const counter = counterMap[counterId];
        return counter.movementAllowance - counter.usedMovementAllowance < 1;
    })) {
        return 'Counter(s) does not have enough movement points';
    }

    const currentArea = areaDefinitionMap[fromAreaId];
    const newAreaIsAdjacent = currentArea.apertures.find((aperture: Aperture) => aperture.areaId === toAreaId) !== undefined;

    if (!newAreaIsAdjacent) {
        return 'Location is not accessible from current location';
    }

    return undefined;
}

export const sortCounterIdsBySelected = (counterIds: string[], selectedIds: string[]): string[] => {
  const selectedSet = new Set(selectedIds)

  return [...counterIds].sort((a, b) => {
    const aSelected = selectedSet.has(a)
    const bSelected = selectedSet.has(b)

    if (aSelected === bSelected) return 0
    return aSelected ? -1 : 1
  })
}