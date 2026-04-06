import React, { useEffect, useState } from 'react';
import { RootState, useAppDispatch, useAppSelector } from '../../../../constants/store';
import './side-bar.css';
import { ScenarioData } from '../../../../constants/game-constants';
import { CounterPanel } from './counter-panel';
import { isCrew, isMonster, isWeapon } from '../../../../shared/utils/counter-utils';
import state from 'pusher-js/types/src/core/http/state';
import { ActionType } from '../../../../shared/types/action-types';

const SideBar = () => {
    const dispatch = useAppDispatch();

    const counterMap = useAppSelector((state: RootState) => (state.replay && state.replay.show && state.replay.activeState ? state.replay.activeState.counterMap : state.counterMap));
    const stackMap = useAppSelector((state: RootState) => (state.replay && state.replay.show && state.replay.activeState ? state.replay.activeState.stackMap : state.stackMap));
    const currentAreaId = useAppSelector((state: RootState) => (state.currentAreaId));
    const areaDefinitionMap = ScenarioData.board.areaDefinitionMap;
    const selectedCounterIds = useAppSelector((state: RootState) => (state.selectedCounterIds));
    const currentPlayerId = useAppSelector((state: RootState) => (state.currentPlayerId));

    const [currentTab, setCurrentTab] = useState<string>('CREW');

    let crewCounterIds: string[] = [];
    let monsterCounterIds: string[] = [];
    let weaponCounterIds: string[] = [];

    if (areaDefinitionMap && currentAreaId) {
        const stack = stackMap[currentAreaId];
        if (stack && stack.counterIds && stack.counterIds.length > 0) {
            stack.counterIds.map(counterId => {
                const counter = counterMap[counterId];
                if (counter) {
                    if (isCrew(counter)) {
                        crewCounterIds.push(counterId);
                    } else if (isMonster(counter)) {
                        monsterCounterIds.push(counterId);
                    } else if (isWeapon(counter)) {
                        weaponCounterIds.push(counterId);
                    }
                }
            });

            crewCounterIds = [...crewCounterIds, ...weaponCounterIds]
        }
    }

    useEffect(() => {
        let newTab = 'CREW';

        if (crewCounterIds.length > 0) {
            newTab = 'CREW';
        } else if (monsterCounterIds.length > 0) {
            newTab = 'MONSTER';
        }

        if (newTab !== currentTab) {
            setCurrentTab(newTab);
        }
    }, [currentAreaId]);

    const renderHeader = () => {
        return (
            <div className="side-bar-header">
                <span className={currentTab === 'CREW' ? 'side-bar-tab-selected' : 'side-bar-tab'} onClick={() => setCurrentTab('CREW')}>Crew</span>
                <span className={currentTab === 'MONSTER' ? 'side-bar-tab-selected' : 'side-bar-tab'} onClick={() => setCurrentTab('MONSTER')}>AGTFOs</span>
                {/* <span className={currentTab === 'WEAPON' ? 'side-bar-tab-selected' : 'side-bar-tab'} onClick={() => setCurrentTab('WEAPON')}>W</span> */}
            </div>
        )
    }

    const renderCounters = () => {
        if (currentTab === 'CREW') {
            return (
                <div className="side-bar-counters">
                    {crewCounterIds.map((counterId: string, index: number) => {
                        return (
                            <CounterPanel key={index} counterId={counterId} selected={selectedCounterIds.includes(counterId)} onClick={handleSelectCounter} />
                        )
                    })}
                </div>
            )
        } else if (currentTab === 'MONSTER') {
            return (
                <div className="side-bar-counters">
                    {monsterCounterIds.map((counterId: string, index: number) => {
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
        const counter = counterMap[counterId];
        if (counter) {
            if (isCrew(counter)) {
                if (counter.playerId !== currentPlayerId) {
                    dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: "You do not own that counter" });
                } else {
                    dispatch({ type: ActionType.SELECT_COUNTER, payload: counterId });
                }
            } else if (isMonster(counter)) {
                dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: "You can not select monsters" });
            } else {
                dispatch({ type: ActionType.SELECT_COUNTER, payload: counterId });
            }
        }
    }

    return (
        <div className="side-bar">
            {renderHeader()}
            {renderCounters()}
        </div>
    );
}

export default SideBar;