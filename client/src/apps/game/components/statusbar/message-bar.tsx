import React from 'react';
import './message-bar.css';
import { useAppSelector } from '../../../../constants/store';

export const MessageBar = () => {
    const message = useAppSelector(state => state.statusMessage);

    return (
        <div className="message-bar">
            {message || ""}
        </div>
    );
}   