import React from 'react';
import './tool-bar.css';
import { useAppDispatch, useAppSelector } from '../../../../constants/store';
import { Player, PlayerTurnStatus } from '../../../../shared/types/game-types';
import { handleSaveGame } from '../menubar/utils';
import { isCrew, isWeapon } from '../../../../shared/utils/counter-utils';
import { CLEAR_PLAN } from '../../../../constants/action-constants';

const ToolBar = () => {
    const dispatch = useAppDispatch();
    const gameId = useAppSelector(state => state.id);
    const turn = useAppSelector(state => state.turn);
    const players = useAppSelector(state => state.players);
    const currentPlayerId = useAppSelector(state => state.currentPlayerId);
    const counterMap = useAppSelector(state => state.counterMap);
    const selectedCounterIds = useAppSelector(state => state.selectedCounterIds);

    const toggleModal = (value: boolean, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
        setter(!value);
    }

    const player = players !== undefined ? players.find(p => p.id === currentPlayerId) : undefined;
    const isTurnCompleted = player?.turnStatus === PlayerTurnStatus.FINISHED;
    const selectedCounters = selectedCounterIds.map(id => counterMap[id]);

    const defaultButtonClass = 'tool-bar-button tool-bar-button-hidden';
    const enabledButtonClass = 'tool-bar-button';

    console.log('isTurnComplete', isTurnCompleted);

    const buttons = [
        {
            handler: () => {
                dispatch({ type: CLEAR_PLAN, payload: { counterIds: selectedCounterIds } });
            },
            label: () => ('Clear Plan'),
            className: () => {
                if (selectedCounters.some(counter => !isCrew(counter))) {
                    return defaultButtonClass;
                }

                return enabledButtonClass;
            }
        }, {
            handler: () => {
                dispatch({ type: 'GRAB_WEAPON', payload: { counterIds: selectedCounterIds } });
            },
            label: () => ('Grab Weapon'),
            className: () => {
                const crewCount = selectedCounters.reduce((acc, counter) => isCrew(counter) ? acc + 1 : acc, 0);
                const weaponCount = selectedCounters.reduce((acc, counter) => isWeapon(counter) ? acc + 1 : acc, 0);
                if (crewCount !== 1 || weaponCount !== 1) {
                    return defaultButtonClass;
                }

                if (selectedCounters[0].usedMovementAllowance > 0) {
                    return defaultButtonClass;
                }

                return enabledButtonClass;
            }
        }, {
            handler: () => {
                dispatch({ type: 'DROP_WEAPON', payload: { counterIds: selectedCounterIds } });
            },
            label: () => ('Drop Weapon'),
            className: () => {
                const crewCount = selectedCounters.reduce((acc, counter) => isCrew(counter) ? acc + 1 : acc, 0);
                if (crewCount !== 1) {
                    return defaultButtonClass;
                }

                if (selectedCounters[0].usedMovementAllowance > 0) {
                    return defaultButtonClass;
                }

                if (selectedCounters[0].weaponCounterId === undefined) {
                    return defaultButtonClass;
                }

                return enabledButtonClass;
            }
        }, {
            handler: () => {
                dispatch({ type: 'TRADE_WEAPON', payload: { counterIds: selectedCounterIds } });
            },
            label: () => ('Trade Weapon'),
            className: () => {
                const crewCount = selectedCounters.reduce((acc, counter) => isCrew(counter) ? acc + 1 : acc, 0);
                if (crewCount !== 2) {
                    return defaultButtonClass;
                }

                if (selectedCounters[0].weaponCounterId === undefined || selectedCounters[1].weaponCounterId === undefined) {
                    return defaultButtonClass;
                }

                if (selectedCounters[0].usedMovementAllowance > 0 || selectedCounters[1].usedMovementAllowance > 0) {
                    return defaultButtonClass;
                }

                return enabledButtonClass;
            }
        }, {
            handler: async () => {
                if (isTurnCompleted) {
                    return;
                }

                handleSaveGame(dispatch, true, gameId, currentPlayerId, counterMap);
            },
            label: () => {
                if (isTurnCompleted) {
                    return "Waiting";
                } else {
                    return "Next Phase";
                }
            },
            className: () => {
                if (isTurnCompleted) {
                    return 'tool-bar-button-next nextPhase-waiting-local';
                } else {
                    return 'tool-bar-button-next';
                }
            }
        }
    ];

    return (
        <div className="tool-bar">
            {buttons.map((button, index) => {
                return <button key={index} className={button.className()} onClick={button.handler}>{button.label()}</button>
            })}
        </div>
    );
}

export default ToolBar;