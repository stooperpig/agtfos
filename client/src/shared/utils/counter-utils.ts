import { Counter, CounterType } from "../types/game-types";

export const isCrew = (counter: Counter) => {
    return counter.type === CounterType.CREW || counter.type === CounterType.ROBOT;
}

export const isMonster = (counter: Counter) => {
    return counter.type === CounterType.EGG || counter.type === CounterType.BABY || counter.type === CounterType.ADULT || counter.type === CounterType.FRAGMENT;
}

export const isWeapon = (counter: Counter) => {
    return counter.type === CounterType.WEAPON;
}
