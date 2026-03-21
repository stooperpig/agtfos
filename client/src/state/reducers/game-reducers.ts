import { Coord, CounterActionType, GameMode, GameState, PlayerTurnStatus } from "../../shared/types/game-types";
import { isCrew, isMonster, isWeapon } from "../../shared/utils/counter-utils";
import { CREW_STACK_ID_SUFFIX, MONSTER_STACK_ID_SUFFIX } from "../../shared/constants/game-constants";

export const processGrabWeapon = (state: GameState, payload: any): void => {
    const { counterId, weaponCounterId, locationId } = payload;
    
}

export const processDropWeapon = (state: GameState, payload: any): void => {
    const { selectedCounterId, locationId } = payload;
    const counter = state.counterMap[selectedCounterId];
    const weaponCounterId = counter.weaponCounterId;
    counter.weaponCounterId = undefined;


}

export const processTradeWeapon = (state: GameState, payload: any): void => {
    const selectedCounterIds = payload as string[]
    const counters = selectedCounterIds.map(counterId => state.counterMap[counterId]);
    const tempCounterId = counters[0].weaponCounterId;
    counters[1].weaponCounterId = tempCounterId;
    counters[0].weaponCounterId = counters[1].weaponCounterId;
}

export const processClearPlan = (state: GameState, payload: any): void => {
    const selectedCounterIds = payload as string[]
    const counters = selectedCounterIds.map(counterId => state.counterMap[counterId]);
    counters.forEach(counter => {
        counter.actions = [];
    });
}

export const processMoveToLocation = (state: GameState, payload: any): void => {
    const toLocationId = payload;

    if (toLocationId === undefined) {
        return;
    }

    const fromStackId = state.currentLocationId + CREW_STACK_ID_SUFFIX;
    const fromStack = state.stackMap[fromStackId];

    if (fromStack === undefined) {
        return;
    }
    
    fromStack.counterIds = fromStack.counterIds.filter(counterId => !state.selectedCounterIds.includes(counterId));

    const toStackId = toLocationId + CREW_STACK_ID_SUFFIX;
    let toStack = state.stackMap[toStackId];
    if (toStack === undefined) {
        toStack = createNewStack(toStackId, toLocationId);
        state.stackMap[toStackId] = { ...toStack, counterIds: [...state.selectedCounterIds] };
    } else {
        toStack.counterIds.push(...state.selectedCounterIds);
    }

    const counters = state.selectedCounterIds.map(counterId => state.counterMap[counterId]);
    counters.forEach(counter => {
        ++counter.usedMovementAllowance;
        counter.actions.push({type: CounterActionType.MOVE, fromStackId, toStackId});
    });

    state.currentLocationId = toLocationId;
}

export const processRefreshGame = (state: GameState, payload: boolean): void => {
    state.refreshGame = payload;
}

export const processSelectLocation = (state: GameState, payload: string): void => {
    state.currentLocationId = payload;
    state.selectedCounterIds = [];
    state.statusMessage = undefined;
}

export const processSetStatusMessage = (state: GameState, payload: string): void => {
    state.statusMessage = payload;
}

export const processSelectCounter = (state: GameState, payload: any): void => {
    const counterId = payload;

    if (!state.selectedCounterIds) {
        state.selectedCounterIds = [];
    }

    if (state.selectedCounterIds.includes(counterId)) {
        state.selectedCounterIds = state.selectedCounterIds.filter(id => id !== counterId);
    } else {
        state.selectedCounterIds = [...state.selectedCounterIds, counterId];
    }
}

export const processUpdateClientCount = (state: GameState, payload: number): void => {
    const count = payload;
    state.connectedClients = count;
}

//create builders
const createNewStack = (id: string, locationId: string) => {
    return {
        id,
        locationId,
        counterIds: []
    }
}