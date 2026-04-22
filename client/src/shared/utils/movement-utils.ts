import { Counter, CounterMap, CounterType, StackMap } from "../types/game-types";
import { isCrew, isCrewType, isMonster } from "./counter-utils";


export const checkEngagement = (areaId: string | undefined, counterType: CounterType, counterMap: CounterMap, stackMap: StackMap): string[] => {
    if (!areaId) {
        return [];
    }

    //const activeCounter = counterMap[planningCounter.id];
    const stack = stackMap[areaId];
    console.log(`Stack for area ${areaId}: ${stack ? stack.counterIds.length : 0} counters`);
    if (stack) {
        let enemyCounterIds: string[] = [];
        if (isCrewType(counterType)) {
            console.log(`Check stack counter ids for monsters: ${stack.counterIds}`);
            enemyCounterIds = stack.counterIds.filter(counterId => {
                const counter = counterMap[counterId];
                //stun, egg, frag
                return counter ? !counter.stunned && (counter.type === CounterType.ADULT || counter.type === CounterType.BABY) : false;
            });
        } else {
            enemyCounterIds = stack.counterIds.filter(counterId => {
                const counter = counterMap[counterId];
                //stun 
                return counter ? !counter.stunned && isCrew(counter) : false;
            });
        }

        console.log(`Contains enemy: ${enemyCounterIds.length > 0}`);
        return enemyCounterIds;
    }
    return [];
}