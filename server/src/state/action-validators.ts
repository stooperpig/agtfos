import { ActionType } from "../shared/types/action-types";

export const actionValidators: {[key: string]: (state: any, payload: any) => string | undefined} = {
    [ActionType.MOVE_TO_COORD]: (state: any, payload: any) => {
        // TODO: Implement move to coord validation
        return undefined;
    },
    [ActionType.GRAB_WEAPON]: (state: any, payload: any) => {
        const { weaponCounterId } = payload;
        const weaponCounter = state.counterMap[weaponCounterId];
        if (weaponCounter && weaponCounter.ownerCounterId) {
            return "Weapon is already owned by another counter";
        }
        // TODO: Implement grab weapon validation
        return undefined;
    }
};