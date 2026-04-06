import { Counter, CounterType } from "../types/game-types";

export const isCrew = (counter: Counter) => {
    return isCrewType(counter.type);
}

export const isCrewType = (type: CounterType) => {
    return type === CounterType.CREW || type === CounterType.ROBOT;
}

export const isMonster = (counter: Counter) => {
    return isMonsterType(counter.type);
}

export const isMonsterType = (type: CounterType) => {
    return type === CounterType.EGG || type === CounterType.BABY || type === CounterType.ADULT || type === CounterType.FRAGMENT;
}

export const isWeapon = (counter: Counter) => {
    return isWeaponType(counter.type);
}

export const isWeaponType = (type: CounterType) => {
    return type === CounterType.WEAPON;
}
