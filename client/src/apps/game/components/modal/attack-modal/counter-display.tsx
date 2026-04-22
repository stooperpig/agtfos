

import React from "react";
import { Counter } from "../../../../../shared/types/game-types";
import { useSelector } from "react-redux";
import { RootState } from "../../../../../constants/store";
import { isMonster } from "../../../../../shared/utils/counter-utils";

interface CounterDisplayProps {
    counter: Counter;
    selected: boolean;
    unavailable?: boolean;
    onClick: () => void;
    isWeapon?: boolean;
}

export const CounterDisplay = ({ counter, selected, unavailable = false, onClick, isWeapon = false }: CounterDisplayProps) => {
    const imageUrl = `/images/${counter.imageName}.png`;
    const counterMap = useSelector((state: RootState) => state.counterMap);

    const renderWeapon = () => {
        if (counter.weaponCounterId) {
            const weaponCounter = counterMap[counter.weaponCounterId];
            if (weaponCounter) {
                return (
                    <div className="sidebar-counter-weapon" onClick={(e) => {
                        e.stopPropagation();
                        toggleWeaponSelection(counter.weaponCounterId);
                    }}>
                        <img className="sidebar-counter-weapon-image" src={`/images/${weaponCounter.imageName}.png`} alt={weaponCounter.name} />
                    </div>
                );
            }
        }
        return null;
    };

    const renderCounterData = () => {
        if (isMonster(counter)) {
            return (
                <div className="sidebar-counter-data">
                    {counter.name}<br />
                    Mv: {counter.movementAllowance - counter.usedMovementAllowance}/{counter.movementAllowance}
                </div>
            );
        }

        return (
            <div className="sidebar-counter-data">
                {counter.name}<br />
                Mv: {counter.movementAllowance - counter.usedMovementAllowance}/{counter.movementAllowance}
            </div>
        );
    };

    return (
        <div
            className={`sidebar-counter ${selected ? 'selected' : ''} ${unavailable ? 'unavailable' : ''}`}
            onClick={unavailable ? undefined : onClick}
        >
            <div className="sidebar-counter-main">
                <div className="sidebar-counter-content">
                    <img className="sidebar-counter-image" src={imageUrl} alt={counter.imageName} />
                    {renderCounterData()}
                </div>
                {renderWeapon()}
            </div>
        </div>
    );
};