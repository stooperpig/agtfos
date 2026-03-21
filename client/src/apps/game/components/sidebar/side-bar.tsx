import React, { useEffect, useState } from 'react';
import { RootState, useAppDispatch, useAppSelector } from '../../../../constants/store';
import './side-bar.css';
import { ScenarioData } from '../../../../constants/game-constants';
import { CREW_STACK_ID_SUFFIX, MONSTER_STACK_ID_SUFFIX, WEAPON_STACK_ID_SUFFIX } from '../../../../shared/constants/game-constants';
import { CounterPanel } from './counter-panel';
import { SELECT_COUNTER } from '../../../../constants/action-constants';

const SideBar = () => {
    const dispatch = useAppDispatch();

    const counterMap = useAppSelector((state: RootState) => state.counterMap);
    const stackMap = useAppSelector((state: RootState) => state.stackMap);
    const currentLocationId = useAppSelector((state: RootState) => state.currentLocationId);
    const locationMap = ScenarioData.board.locationMap;
    const selectedCounterIds = useAppSelector((state: RootState) => state.selectedCounterIds);

    const [currentTab, setCurrentTab] = useState<string>('CREW');

    let crewCounterIds: string[] = [];
    let monsterCounterIds: string[] = [];
    let weaponCounterIds: string[] = [];

    if (locationMap && currentLocationId) {
        const crewStack = stackMap[currentLocationId + CREW_STACK_ID_SUFFIX];
        if (crewStack) {
            crewCounterIds = crewStack.counterIds;
        }

        const monsterStack = stackMap[currentLocationId + MONSTER_STACK_ID_SUFFIX];
        if (monsterStack) {
            monsterCounterIds = monsterStack.counterIds;
        }

        ScenarioData.board.locationMap[currentLocationId].weaponStacks.forEach(weaponStack => {
            const stack = stackMap[currentLocationId + WEAPON_STACK_ID_SUFFIX + `-${weaponStack.id}`];
            if (stack) {
                weaponCounterIds.push(...stack.counterIds);
            }
        });
    }

    useEffect(() => {
        let newTab = 'CREW';

        if (crewCounterIds.length > 0) {
            newTab = 'CREW';
        } else if (monsterCounterIds.length > 0) {
            newTab = 'MONSTER';
        } else if (weaponCounterIds.length > 0) {
            newTab = 'WEAPON';
        }
        
        if (newTab !== currentTab) {
            setCurrentTab(newTab);
        }
    }, [currentLocationId]);

    const renderHeader = () => {
        return (
            <div className="side-bar-header">
                <span className={currentTab === 'CREW' ? 'side-bar-tab-selected' : 'side-bar-tab'} onClick={() => setCurrentTab('CREW')}>C</span>
                <span className={currentTab === 'MONSTER' ? 'side-bar-tab-selected' : 'side-bar-tab'} onClick={() => setCurrentTab('MONSTER')}>M</span>
                <span className={currentTab === 'WEAPON' ? 'side-bar-tab-selected' : 'side-bar-tab'} onClick={() => setCurrentTab('WEAPON')}>W</span>
            </div>
        )
    }

    const renderCounters = () => {
        if (currentTab === 'CREW') {
            return (
                <div className="sidebar-counters">
                    {crewCounterIds.map((counterId: string, index: number) => {
                        return (
                            <CounterPanel key={index} counterId={counterId} selected={selectedCounterIds.includes(counterId)} onClick={handleSelectCounter} />
                        )
                    })}
                </div>
            )
        } else if (currentTab === 'MONSTER') {
            return (
                <div className="sidebar-counters">
                    {monsterCounterIds.map((counterId: string, index: number) => {
                        return (
                            <CounterPanel key={index} counterId={counterId} selected={selectedCounterIds.includes(counterId)} onClick={handleSelectCounter} />
                        )
                    })}
                </div>
            );
        } else if (currentTab === 'WEAPON') {
            return (
                <div className="sidebar-counters">
                    {weaponCounterIds.map((counterId: string, index: number) => {
                        return (
                            <CounterPanel key={index} counterId={counterId} selected={selectedCounterIds.includes(counterId)} onClick={handleSelectCounter} />
                        )
                    })}
                </div>
            );
        } else {
            return (<div></div>)
        }
    }

    const handleSelectCounter = (counterId: string) => {
        dispatch({ type: SELECT_COUNTER, payload: counterId });
    }

    return (
        <div className="side-bar">
            {renderHeader()}
            {renderCounters()}
        </div>
    );
}

export default SideBar;