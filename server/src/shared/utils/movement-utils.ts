import { CounterMap, CounterType, Stack } from "../types/game-types";
import { isCrew, isCrewType } from "./counter-utils";


export const checkEngagement = (stack: Stack | undefined, counterType: CounterType, counterMap: CounterMap): boolean => {
    if (!stack) {
        return false;
    }

    console.log(`Stack for area ${stack.id}: ${stack.counterIds.length} counters`);
    if (stack) {
        let foundEnemy = false;
        if (isCrewType(counterType)) {
            console.log(`Check stack counter ids for monsters: ${stack.counterIds}`);
            foundEnemy = stack.counterIds.some(counterId => {
                const counter = counterMap[counterId];
                return counter ? !counter.stunned && (counter.type === CounterType.ADULT || counter.type === CounterType.BABY) : false;
            });
        } else {
            foundEnemy = stack.counterIds.some(counterId => {
                const counter = counterMap[counterId];
                return counter ? !counter.stunned && isCrew(counter) : false;
            });
        }

        console.log(`Contains enemy: ${foundEnemy}`);
        return foundEnemy;
    }
    return false;
}