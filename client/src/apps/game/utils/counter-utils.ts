import { ScenarioData } from "../../../constants/game-constants";
import { Counter, WeaponEffectType, WeaponTargetType } from "../../../shared/types/game-types";

export const isAreaWeapon = (counter: Counter) => {
    return ScenarioData.weaponMap[counter.weaponType!].effectType === WeaponEffectType.AREA || ScenarioData.weaponMap[counter.weaponType!].effectType === WeaponEffectType.MULTIPLE_AREAS;
};

export const isSingleAreaWeapon = (counter: Counter) => {
    return ScenarioData.weaponMap[counter.weaponType!].effectType === WeaponEffectType.AREA;
};

export const isMultiAreaWeapon = (counter: Counter) => {
    return ScenarioData.weaponMap[counter.weaponType!].effectType === WeaponEffectType.MULTIPLE_AREAS;
}

export const isCollateralEffectWeapon = (counter: Counter) => {
    return ScenarioData.weaponMap[counter.weaponType!].targetType === WeaponTargetType.ALL;
}

export const getWeaponTargetType = (counter: Counter) => {
    return ScenarioData.weaponMap[counter.weaponType!].targetType;
};