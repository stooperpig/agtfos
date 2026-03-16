import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../constants/hooks';
import { RootState } from '../../constants/store';
import { Stack } from '../../types/game-types';
import './side-bar.css';
import { CounterPanel } from './counter-panel';
import { SlowBuffer } from 'buffer';
import { SELECT_COUNTER } from '../../constants/action-constants';

export const SideBar = () => {
    const dispatch = useAppDispatch();

    const counters = useAppSelector((state: RootState) => state.counters);
    const stacks = useAppSelector((state: RootState) => state.stacks);
    const currentLocationId = useAppSelector((state: RootState) => state.currentLocationId);
    const locationMap = useAppSelector((state: RootState) => state.locationMap);

    const [currentTab, setCurrentTab] = useState<string>('CREW');

    let crewCounterIds: string[] = [];
    let monsterCounterIds: string[] = [];

    if (locationMap && currentLocationId) {
        const crewStackId = locationMap[currentLocationId].crewStackId;
        const crewStack = stacks[crewStackId];
        if (crewStack) {
            crewCounterIds = crewStack.counterIds;
        }

        const monsterStackId = locationMap[currentLocationId].monsterStackId;
        const monsterStack = stacks[monsterStackId];
        if (monsterStack) {
            monsterCounterIds = monsterStack.counterIds;
        }
    }

    const renderCounters = () => {
        if (currentTab === 'CREW') {
            return (
                <div className="sidebar-counters">
                    {crewCounterIds.map((counterId: string) => {
                        return (
                            <CounterPanel counterId={counterId} onClick={handleSelectCounter}/>
                        )
                    })}
                </div>
            )
        } else if (currentTab === 'MONSTER') {
            return (
                <div className="sidebar-counters">
                    {monsterCounterIds.map((counterId: string) => {
                        return (
                            <CounterPanel counterId={counterId} onClick={handleSelectCounter}/>
                        )
                    })}
                </div>
            );
        } else {
            return (<div></div>)
        }
    }

    const renderHeader  = () => {
        return(
            <div className="side-bar-header">
                <span className={currentTab === 'CREW' ? 'side-bar-tab-selected': 'side-bar-tab'} onClick={() => setCurrentTab('CREW')}>C</span>
                <span className={currentTab === 'MONSTER' ? 'side-bar-tab-selected': 'side-bar-tab'} onClick={() => setCurrentTab('MONSTER')}>M</span>
                <span className={currentTab === 'WEAPON' ? 'side-bar-tab-selected': 'side-bar-tab'} onClick={() => setCurrentTab('WEAPON')}>W</span>
            </div>
        )
    }

    const handleSelectCounter = (counterId: string) => {
        dispatch({type: SELECT_COUNTER, payload: counterId});
    }

    return (
        <div className="side-bar">
            {renderHeader()}
            {renderCounters()}
        </div>
    );
}