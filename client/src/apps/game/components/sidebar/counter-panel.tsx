import React, { useState } from 'react';
import { RootState, useAppSelector } from '../../../../constants/store';
import './counter-panel.css';
import { isMonster, isWeapon } from '../../../../shared/utils/counter-utils';
import { ScenarioData } from '../../../../constants/game-constants';
import { Counter } from '../../../../shared/types/game-types';

interface PropTypes {
    counterId: string,
    selected: boolean,
    onClick: any
}

export const CounterPanel = (props: PropTypes) => {

    const [toggle, setToggle] = useState<boolean>(false);
    const counterMap = useAppSelector((state: RootState) => (state.replay && state.replay.show && state.replay.activeState ? state.replay.activeState.counterMap : state.counterMap));
    const players = useAppSelector((state: RootState) => state.players);
    const weaponEffectMap = useAppSelector((state: RootState) => state.weaponEffectMap);
    const counter = counterMap[props.counterId];

    const imageClass = ''; //(counter.ghost) ? 'ghost' : '';

    const panelClass = props.selected ? 'counter-panel selected' : 'counter-panel';

    const handleLeftClick = () => {
        if (props.onClick !== undefined) {
            props.onClick(props.counterId);
        }
    }

    const handleContextMenu = (event: React.MouseEvent) => {
        event.preventDefault();
    }

    const handleRightClick = (event: React.MouseEvent) => {
        if (event.button !== 0) {
            event.preventDefault();
            if (event.type === 'mousedown') {
                setToggle(true);
            } else {
                setToggle(false);
            }
        }
    }

    const renderPlayer = () => {
        const player = players.find(p => p.id === counter.playerId);
        if (!player) {
            return null;
        }

        return <div className="counter-panel-player-name">({player.name})({counter.id})</div>;
    }

    const renderStunnedOrKilled = () => {
        if (counter.killed) {
            return <div className="counter-panel-killed">Killed</div>;
        }
        
        if (counter.stunned) {
            return <div className="counter-panel-stunned">Stunned</div>;
        }

        return null;
    }

    const getImageUrl = (counter: Counter): string | undefined => {
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

    const renderDataPanel = () => {
        if (isWeapon(counter)) {
            return null;
        }

        if (isMonster(counter)) {
            return (
                <div className="counter-panel-data">
                    {counter.name}<br />
                    Mv: {counter.movementAllowance - counter.usedMovementAllowance}/{counter.movementAllowance}<br />
                    <span className={counter.engaged ? 'counter-panel-engaged' : ''}>{counter.engaged ? 'Engaged' : ''}</span>
                    {renderStunnedOrKilled()}
                </div>
            );
        }

        const player = players.find(p => p.id === counter.playerId);
        return (
            <div className="counter-panel-data">
                Mv: {counter.movementAllowance - counter.usedMovementAllowance}/{counter.movementAllowance}<br />
                <span className={counter.engaged ? 'counter-panel-engaged' : ''}>{counter.engaged ? 'Engaged' : ''}</span>
                {renderPlayer()}
                {renderStunnedOrKilled()}
                {renderWeapon()}
            </div>
        )
    }

    const renderWeapon = () => {
        if (counter.weaponCounterId) {
            const weaponCounter = counterMap[counter.weaponCounterId];
            const imageUrl = getImageUrl(weaponCounter);
            const className = toggle ? "counter-panel-weapon-back-image" : "counter-panel-weapon-image";
            return (
                <div className="counter-panel-weapon">
                    <img className={className} src={imageUrl} alt={weaponCounter.name} onMouseDown={handleRightClick} onMouseUp={handleRightClick} onContextMenu={handleContextMenu}/>
                </div>
            );
        }
        return null;
    };

    let imageUrl: string | undefined = getImageUrl(counter);

    return (
        <div className={panelClass} onClick={handleLeftClick} onContextMenu={handleContextMenu}>
            <div className="counter-panel-main">
                <img className="counter-panel-image" src={imageUrl} alt={counter.imageName} onMouseDown={isWeapon(counter) ? handleRightClick : undefined} onMouseUp={isWeapon(counter) ? handleRightClick : undefined } onContextMenu={handleContextMenu} />
                {renderDataPanel()}
            </div>
        </div>
    )
}