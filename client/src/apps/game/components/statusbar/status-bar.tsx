import React from 'react';
import './status-bar.css';
import { MessageBar } from './message-bar';
import { useAppSelector } from '../../../../constants/store';

const StatusBar = () => {
    const turn = useAppSelector(state => state.turn);
    const currentLocationId = useAppSelector(state => state.currentAreaId);

    const renderCurrentLocation = (currentLocationId: string | undefined) => {
        if (currentLocationId) {
            return(
                <div className="status-bar-current-hex">
                    Location: [{currentLocationId}]
                </div>
            )
        } else {
            return null;
        }
    }
    
    return (
        <div className="status-bar">
            <div className="status-bar-current-turn">{`Turn: ${turn}`}</div>
            {renderCurrentLocation(currentLocationId)}
            <MessageBar />
        </div>
    );
}

export default StatusBar;