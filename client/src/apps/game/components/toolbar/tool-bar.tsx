import React from 'react';
import './tool-bar.css';
import { useAppDispatch, useAppSelector } from '../../../../constants/store';
import { PlayerTurnStatus } from '../../../../shared/types/game-types';
import { isCrew, isWeapon } from '../../../../shared/utils/counter-utils';
import { putData } from '../../../../api/api-utils';
import { socketId } from '../../../../api/web-socket';
import ReplayControls from './replay-controller';
import { ActionAddAction, ActionClearPlan, ActionDropWeapon, ActionGrabWeapon, ActionType } from '../../../../shared/types/action-types';
import { Phase } from '../../../../shared/types/game-types';

const ToolBar = () => {
    const dispatch = useAppDispatch();
    const gameId = useAppSelector(state => state.id);
    const phase = useAppSelector(state => state.phase);
    const players = useAppSelector(state => state.players);
    const currentPlayerId = useAppSelector(state => state.currentPlayerId);
    const counterMap = useAppSelector(state => state.counterMap);
    const selectedCounterIds = useAppSelector(state => state.selectedCounterIds);
    const replayState = useAppSelector(state => state.replay);

    // const toggleModal = (value: boolean, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    //     setter(!value);
    // }

    const player = players !== undefined ? players.find(p => p.id === currentPlayerId) : undefined;
    const isPhaseCompleted = player?.turnStatus === PlayerTurnStatus.FINISHED;
    const selectedCounters = selectedCounterIds.map(id => counterMap[id]);

    const defaultButtonClass = 'tool-bar-button tool-bar-button-hidden';
    const enabledButtonClass = 'tool-bar-button';

    console.log('isPhaseCompleted', isPhaseCompleted);

    const buttons = [
        {
            handler: () => {
                const action: ActionClearPlan = { type: ActionType.CLEAR_PLAN, payload: { counterIds: [...selectedCounterIds] } }
                putData(`/api/games/${gameId}/action`, { socketId, action }).then(() => {
                    dispatch(action);
                }).catch((resp) => {
                    dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: resp.message });
                });
            },
            label: () => ('Clear Plan'),
            className: () => {
                if (phase !== Phase.MOVE) {
                    return defaultButtonClass;
                }

                if (selectedCounterIds.length === 0) {
                    return defaultButtonClass;
                }

                if (selectedCounters.some(counter => !isCrew(counter))) {
                    return defaultButtonClass;
                }

                if (!selectedCounters.some(counter => counter.actions !== undefined && counter.actions.length > 0)) {
                    return defaultButtonClass;
                }

                return enabledButtonClass;
            }
        }, {
            handler: () => {
                const crewCounter = selectedCounters.find(counter => isCrew(counter));
                const weaponCounter = selectedCounters.find(counter => isWeapon(counter));
                if (crewCounter && weaponCounter) {
                    const action: ActionGrabWeapon = { type: ActionType.GRAB_WEAPON, payload: { crewCounterId: crewCounter.id, weaponCounterId: weaponCounter.id, fromAreaId: crewCounter.areaId!, fromCoord: crewCounter.coord!, movementCost: 0 } };
                    putData(`/api/games/${gameId}/action`, { socketId, action }).then(() => {
                        dispatch({ type: ActionType.DESELECT_COUNTER, payload: { counterId: weaponCounter.id } });
                        dispatch(action);
                        const addAction: ActionAddAction = { type: ActionType.ADD_ACTION, payload: { counterIds: [crewCounter.id], actionToAdd: action } };
                        dispatch(addAction);
                    }).catch((resp) => {
                        dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: resp.message });
                    });
                } else {
                    dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: "You must select one crew and one weapon" });
                }
            },
            label: () => ('Grab Weapon'),
            className: () => {
                if (phase !== Phase.MOVE) {
                    return defaultButtonClass;
                }

                const crewCount = selectedCounters.reduce((acc, counter) => isCrew(counter) ? acc + 1 : acc, 0);
                const weaponCount = selectedCounters.reduce((acc, counter) => isWeapon(counter) ? acc + 1 : acc, 0);
                if (crewCount !== 1 || weaponCount !== 1) {
                    return defaultButtonClass;
                }

                if (selectedCounters[0].usedMovementAllowance > 0) {
                    return defaultButtonClass;
                }

                const crewCounter = selectedCounters.find(counter => isCrew(counter));
                if (crewCounter!.actions && crewCounter?.actions.some(action => action.type === ActionType.GRAB_WEAPON)) {
                    return defaultButtonClass;
                }

                return enabledButtonClass;
            }
        }, {
            handler: () => {
                const crewCounter = selectedCounters.find(counter => isCrew(counter));
                if (crewCounter) {
                    const action: ActionDropWeapon = { type: ActionType.DROP_WEAPON, payload: { crewCounterId: crewCounter.id, weaponCounterId: crewCounter.weaponCounterId!, fromAreaId: crewCounter.areaId!, fromCoord: crewCounter.coord!, movementCost: 0 } };
                    putData(`/api/games/${gameId}/action`, { socketId, action }).then(() => {
                        dispatch(action);
                        const addAction: ActionAddAction = { type: ActionType.ADD_ACTION, payload: { counterIds: [crewCounter.id], actionToAdd: action } };
                        dispatch(addAction);
                    }).catch((resp) => {
                        dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: resp.message });
                    });
                } else {
                    dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: "You must select one crew and one weapon" });
                }
            },
            label: () => ('Drop Weapon'),
            className: () => {
                if (phase !== Phase.MOVE) {
                    return defaultButtonClass;
                }

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

                const crewCounter = selectedCounters.find(counter => isCrew(counter));
                if (crewCounter!.actions && crewCounter?.actions.some(action => action.type === ActionType.GRAB_WEAPON)) {
                    return defaultButtonClass;
                }

                return enabledButtonClass;
            }
        },
        // {
        //     handler: () => {
        //         const crewCounter = selectedCounters.find(counter => isCrew(counter));
        //         if (crewCounter) {
        //             const action = { type: ActionType.DROP_WEAPON, payload: { crewCounterId: crewCounter.id } };
        //             putData(`/api/games/${gameId}/action`, { socketId, action }).then(() => {
        //                 dispatch(action);
        //             }).catch((resp) => {
        //                 dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: resp.message });
        //             });
        //         } else {
        //             dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: "You must select one crew and one weapon" });
        //         }
        //     },
        //     label: () => ('Replay'),
        //     className: () => {
        //         const crewCount = selectedCounters.reduce((acc, counter) => isCrew(counter) ? acc + 1 : acc, 0);
        //         if (crewCount !== 1) {
        //             return defaultButtonClass;
        //         }

        //         if (selectedCounters[0].usedMovementAllowance > 0) {
        //             return defaultButtonClass;
        //         }

        //         if (selectedCounters[0].weaponCounterId === undefined) {
        //             return defaultButtonClass;
        //         }

        //         const crewCounter = selectedCounters.find(counter => isCrew(counter));
        //         if (crewCounter!.actions && crewCounter?.actions.some(action => action.type === ActionType.GRAB_WEAPON)) {
        //             return defaultButtonClass;
        //         }

        //         return enabledButtonClass;
        //     }
        // }, 
        {
            handler: async () => {
                // if (isPhaseCompleted) {
                //     return;
                // }

                const action = { type: ActionType.PHASE_COMPLETE, payload: { playerId: currentPlayerId } };
                putData(`/api/games/${gameId}/action`, { socketId, action }).then(() => {
                    dispatch(action);
                }).catch((resp) => {
                    dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: resp.message });
                });
            },
            label: () => {
                if (isPhaseCompleted) {
                    return `Waiting...`;
                } else {
                    return `Next Phase`;
                }
            },
            className: () => {
                if (isPhaseCompleted) {
                    return 'tool-bar-button-next nextPhase-waiting-local';
                } else {
                    return 'tool-bar-button-next';
                }
            }
        }
    ];

    const renderButtons = () => {
        console.log("replayState", replayState);
        if (replayState?.show) {
            return (
                <ReplayControls />
            );
        } else {
            console.log("rendering buttons", buttons.length);
            return (
                <>
                    {buttons.map((button, index) => {
                        return <button key={index} className={button.className()} onClick={button.handler}>{button.label()}</button>
                    })}
                </>
            );
        }
    }

    return (
        <div className="tool-bar">
            {renderButtons()}
        </div>
    );
}

export default ToolBar;