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

    const counter = counterMap[props.counterId];

    const imageUrl = `/images/${counter.imageName}.png`;

    const imageClass = ''; //(counter.ghost) ? 'ghost' : '';

    const panelClass = props.selected ? 'counter-panel selected' : 'counter-panel';

    const handleClick = () => {
        if (props.onClick !== undefined) {
            props.onClick(props.counterId);
        }
    }

    const renderDataPanel = () => {
        if (isWeapon(counter) || isMonster(counter)) {
            return null;
        }
        
        return (
            <div className="counter-panel-data">
                Mv: {counter.movementAllowance - counter.usedMovementAllowance}/{counter.movementAllowance}<br />
                {counter.engaged ? 'Engaged' : ''}
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