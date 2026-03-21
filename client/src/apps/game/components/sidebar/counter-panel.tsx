import React from 'react';
import { RootState, useAppSelector } from '../../../../constants/store';
import './counter-panel.css';

interface PropTypes {
    counterId: string,
    selected: boolean,
    onClick: any
}

export const CounterPanel = (props: PropTypes) => {
    const counterMap = useAppSelector((state: RootState) => state.counterMap);

    const counter = counterMap[props.counterId];

    const imageUrl = `/images/${counter.imageName}.png`;

    const imageClass = ''; //(counter.ghost) ? 'ghost' : '';

    const panelClass = props.selected ? 'counter-panel selected': 'counter-panel';

    const handleClick = () => {
        if (props.onClick !== undefined) {
            props.onClick(props.counterId);
        }
    }

    return(
        <div className={panelClass} onClick={handleClick}>
            <div className="counter-panel-image">
                <img className={imageClass} src={imageUrl} alt={counter.imageName} />
            </div>
            <div className="counter-panel-data">
                Mv: {counter.movementAllowance - counter.usedMovementAllowance}/{counter.movementAllowance}
            </div>
        </div>
    )
}