import { CounterMap, GameState, Location, Stack } from "../../types/game-types";
import cloneDeep from 'lodash/cloneDeep';

const createNewStack = (id: string, locationId: string) => {
    return {
        id,
        locationId,
        counterIds: []
    }
}

const moveSelectedCounters = (counters: CounterMap, fromStack: Stack, toStack: Stack) => {
    if (fromStack === undefined || toStack === undefined) {
        return;
    }
    
    const selectedCounterIds = fromStack.counterIds.filter((counterId: string) => {
        const counter = counters[counterId];
        return counter.selected;
    });

    fromStack.counterIds = fromStack.counterIds.filter((counterId: string) => {
        const counter = counters[counterId];
        return !counter.selected;
    });

    toStack.counterIds = [...toStack.counterIds, ...selectedCounterIds];
}

export const processLoadGame = (state: GameState, payload: any): GameState => {
    const newState: GameState = payload as GameState;
    return { ...newState };
}

export const processMoveToLocation = (state: GameState, payload: any): GameState => {
    const locationId = payload;
    const newState = cloneDeep(state);

    let oldLocation = undefined;
    if (newState.currentLocationId) {
        oldLocation = newState.locationMap![newState.currentLocationId];
    }

    const newLocation = newState.locationMap![locationId];

    if (oldLocation && newLocation) {
        console.log('new location crewStack: ' + newLocation.crewStackId);
        console.log('new location monsterStack: ' + newLocation.monsterStackId);

        if (newState.stacks[newLocation.crewStackId] === undefined) {
            const newStack = createNewStack(newLocation.crewStackId, newLocation.id);
            newState.stacks[newStack.id] = newStack;
            newLocation.crewStackId = newStack.id;
        }

        if (newState.stacks[newLocation.monsterStackId] === undefined) {
            const newStack = createNewStack(newLocation.monsterStackId, newLocation.id);
            newState.stacks[newStack.id] = newStack;
            newLocation.monsterStackId = newStack.id;
        }

        moveSelectedCounters(newState.counters, newState.stacks[oldLocation.crewStackId], newState.stacks[newLocation.crewStackId]);
        moveSelectedCounters(newState.counters, newState.stacks[oldLocation.monsterStackId], newState.stacks[newLocation.monsterStackId]);

        newState.currentLocationId = locationId;
        // if (oldLocation) {
        //     removeSelectedCounters(newState.counters, newState.stacks[oldLocation.crewStackId]);
        //     removeSelectedCounters(newState.counters, newState.stacks[oldLocation.monsterStackId]);
        //     if (oldLocation.weaponStackIds) {
        //         oldLocation.weaponStackIds.forEach((stackId: string) => {
        //             removeSelectedCounters(newState.counters, newState.stacks[stackId]);
        //         });
        //     }
        // }
    }

    return newState;
}

export const processSetCurrentLocationId = (state: GameState, payload: any): GameState => {
    const locationId: string = payload;
    const newState = cloneDeep(state);
    newState.currentLocationId = locationId;

    if (newState.currentLocationId !== state.currentLocationId) {
        const keys = Object.keys(newState.stacks);
        keys.forEach((stackId: string) => {
            const stack = newState.stacks[stackId];
            updateSelectedCounters(newState.counters, stack, false);
        })
    }

    return newState;
}

export const processSelectCounter = (state: GameState, payload: any): GameState => {
    const counterId = payload;
    const newState = cloneDeep(state);

    newState.counters[counterId].selected = !newState.counters[counterId].selected;

    return newState;
}

export const processSelectLocation = (state: GameState, payload: any): GameState => {
    const location: Location = payload;
    const newState = { ...state };
    newState.locationMap = { ...state.locationMap };
    newState.locationMap[location.id] = { ...location };
    return newState;
}

// const removeSelectedCounters = (counters: CounterMap, stack: Stack) => {
//     if (stack) {
//         const newCounterIds = stack.counterIds.filter((counterId: string) => {
//             const counter = counters[counterId];
//             return !counter.selected;
//         });

//         stack.counterIds = newCounterIds;
//     }
// }

const updateSelectedCounters = (counters: CounterMap, stack: Stack, selectedValue: boolean) => {
    stack.counterIds.forEach((counterId: string) => {
        const counter = counters[counterId];
        counter.selected = selectedValue;
    })
}