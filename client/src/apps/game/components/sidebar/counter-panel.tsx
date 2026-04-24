import React from 'react';
import { RootState, useAppSelector } from '../../../../constants/store';
import './counter-panel.css';
import { isMonster, isWeapon } from '../../../../shared/utils/counter-utils';

interface PropTypes {
    counterId: string,
    selected: boolean,
    onClick: any
}

export const CounterPanel = (props: PropTypes) => {
    const counterMap = useAppSelector((state: RootState) => (state.replay && state.replay.show && state.replay.activeState ? state.replay.activeState.counterMap : state.counterMap));
    const players = useAppSelector((state: RootState) => state.players);
    const counter = counterMap[props.counterId];

    const imageUrl = `/images/${counter.imageName}.png`;

    const imageClass = ''; //(counter.ghost) ? 'ghost' : '';

    const panelClass = props.selected ? 'counter-panel selected' : 'counter-panel';

    const handleClick = () => {
        if (props.onClick !== undefined) {
            props.onClick(props.counterId);
        }
    }

    const renderPlayer = () => {
        const player = players.find(p => p.id === counter.playerId);
        if (!player) {
            return null;
        }

        return <div className="counter-panel-player-name">({player.name})</div>;
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
                </div>
            );
        }

        const player = players.find(p => p.id === counter.playerId);
        return (
            <div className="counter-panel-data">
                Mv: {counter.movementAllowance - counter.usedMovementAllowance}/{counter.movementAllowance}<br />
                <span className={counter.engaged ? 'counter-panel-engaged' : ''}>{counter.engaged ? 'Engaged' : ''}</span>
                {renderPlayer()}
                {renderWeapon()}
            </div>
        )
    }

    const renderWeapon = () => {
        if (counter.weaponCounterId) {
            const weaponCounter = counterMap[counter.weaponCounterId];
            return (
                <div className="counter-panel-weapon">
                    <img className="counter-panel-weapon-image" src={`/images/${weaponCounter.imageName}.png`} alt={weaponCounter.name} />
                </div>
            );
        }
        return null;
    };

    return (
        <div className={panelClass} onClick={handleClick}>
            <div className="counter-panel-main">
                <img className="counter-panel-image" src={imageUrl} alt={counter.imageName} />
                {renderDataPanel()}
            </div>
        </div>
    )
}