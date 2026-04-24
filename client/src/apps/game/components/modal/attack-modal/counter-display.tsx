import React from "react";
import { Counter } from "../../../../../shared/types/game-types";
import { RootState, useAppSelector } from "../../../../../constants/store";
import { isMonster } from "../../../../../shared/utils/counter-utils";

interface CounterDisplayProps {
    counter: Counter;
    selected: boolean;
    unavailable?: boolean;
    onClick: (id: string) => void;
    isWeapon?: boolean;
}

export const CounterDisplay = ({ counter, selected, unavailable = false, onClick, isWeapon = false }: CounterDisplayProps) => {
    const imageUrl = `/images/${counter.imageName}.png`;
    const counterMap = useAppSelector((state: RootState) => state.counterMap);
    const players = useAppSelector((state: RootState) => state.players);

    const renderWeapon = () => {
        if (counter.weaponCounterId) {
            const weaponCounter = counterMap[counter.weaponCounterId];
            if (weaponCounter) {
                return (
                    <div className="sidebar-counter-weapon" onClick={(e) => { e.stopPropagation(); onClick(counter.weaponCounterId!); }}>
                        <img className="sidebar-counter-weapon-image" src={`/images/${weaponCounter.imageName}.png`} alt={weaponCounter.name} />
                    </div>
                );
            }
        }
        return null;
    };

    const renderPlayer = () => {
        const player = players.find(p => p.id === counter.playerId);
        if (!player) {
            return null;
        }

        return <div className="counter-panel-player-name">({player.name})</div>;
    }

    const renderCounterData = () => {
        if (isMonster(counter)) {
            return (
                <div className="sidebar-counter-data">
                    {counter.name}<br />
                </div>
            );
        }

        const player = players.find(p => p.id === counter.playerId);

        return (
            <div className="sidebar-counter-data">
                {counter.name}<br />
                <span className={counter.engaged ? 'sidebar-counter-data-engaged' : ''}>{counter.engaged ? 'Engaged' : ''}</span>
                {renderPlayer()}
            </div>
        );
    };

    return (
        <div className={`sidebar-counter ${selected ? 'selected' : ''} ${unavailable ? 'unavailable' : ''}`}>
            <div className="sidebar-counter-main">
                <div className="sidebar-counter-content">
                    <img className="sidebar-counter-image" src={imageUrl} alt={counter.imageName} onClick={() => onClick(counter.id)} />
                    {renderCounterData()}
                    {renderWeapon()}
                </div>
            </div>
        </div>
    );
};