import React, { useState } from "react";
import './counter-display.css';
import { Counter } from "../../../../../shared/types/game-types";
import { RootState, useAppSelector } from "../../../../../constants/store";
import { isMonster, isWeapon } from "../../../../../shared/utils/counter-utils";
import { ScenarioData } from "../../../../../constants/game-constants";

interface CounterDisplayProps {
    counter: Counter;
    selected: boolean;
    unavailable?: boolean;
    onClick: (id: string) => void;
}

export const CounterDisplay = ({ counter, selected, unavailable = false, onClick }: CounterDisplayProps) => {
    const [toggle, setToggle] = useState<boolean>(false);
    //const imageUrl = `/images/${counter.imageName}.png`;
    const counterMap = useAppSelector((state: RootState) => state.counterMap);
    const players = useAppSelector((state: RootState) => state.players);
    const weaponEffectMap = useAppSelector((state: RootState) => state.weaponEffectMap);

    // const renderWeapon = () => {
    //     if (counter.weaponCounterId) {
    //         const weaponCounter = counterMap[counter.weaponCounterId];
    //         if (weaponCounter) {
    //             return (
    //                 <div className="sidebar-counter-weapon" onClick={(e) => { e.stopPropagation(); onClick(counter.weaponCounterId!); }}>
    //                     &#8614;
    //                     <img className="sidebar-counter-weapon-image" src={`/images/${weaponCounter.imageName}.png`} alt={weaponCounter.name} />
    //                 </div>
    //             );
    //         }
    //     }
    //     return null;
    // };

    const primaryCounterIsWeapon = isWeapon(counter);

    const renderPlayer = () => {
        const player = players.find(p => p.id === counter.playerId);
        if (!player) {
            return null;
        }

        return <div className="counter-panel-player-name">({player.name})</div>;
    }

    const handleRightClick = (event: React.MouseEvent) => {
        event.preventDefault();
        if (event.button !== 0) {
            if (event.type === 'mousedown') {
                setToggle(true);
            } else {
                setToggle(false);
            }
        }
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

    const handleContextMenu = (event: React.MouseEvent) => {
        event.preventDefault();
    }

    const getImageUrl = (counter: Counter) => {
        let imageUrl: string | undefined = undefined;
        if (toggle && isWeapon(counter) && counter.weaponType) {
            const weaponEffect = weaponEffectMap[counter.weaponType]
            if (weaponEffect && weaponEffect.discovered) {
                imageUrl = ScenarioData.imageMap[weaponEffect.effect]?.src;
            }
        } else {
            imageUrl = ScenarioData.imageMap[counter.imageName]?.src;
        }
        return imageUrl || ScenarioData.imageMap[counter.imageName]?.src;
    }

    const renderCounters = () => {
        const imageUrl = getImageUrl(counter);
        if (counter.weaponCounterId) {
            const weaponCounter = counterMap[counter.weaponCounterId];
            if (weaponCounter) {
                const weaponImageUrl = getImageUrl(weaponCounter);
                return (
                    <>
                        <img className="sidebar-counter-image" src={imageUrl} alt={counter.imageName} onClick={() => onClick(counter.id)} />
                        &#8614;
                        <div className="attack-modal-counter-display-weapon" onClick={(e) => { onClick(counter.weaponCounterId!); }}>
                            <img className="sidebar-counter-weapon-image" src={weaponImageUrl} alt={weaponCounter.name} onMouseDown={handleRightClick} onMouseUp={handleRightClick} onContextMenu={handleContextMenu} />
                        </div>
                    </>
                );
            }
        }
        return (
            <div onContextMenu={handleContextMenu}>
                <img className="sidebar-counter-image" src={imageUrl} alt={counter.imageName} onClick={() => onClick(counter.id)} />
            </div>
        )
    };

    return (
        <div className={`sidebar-counter ${selected ? 'selected' : ''} ${unavailable ? 'unavailable' : ''}`}>
            <div className="sidebar-counter-main">
                <div className="sidebar-counter-content">
                    {renderCounters()}
                    {renderCounterData()}
                </div>
            </div>
        </div>
    );
};