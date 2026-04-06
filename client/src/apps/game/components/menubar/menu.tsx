import React, { useState } from 'react';
import './menu.css';
import './drop-down-menu.css';
import DropdownMenu from './drop-down-menu';
import { useAppDispatch, useAppSelector } from '../../../../constants/store';
import { GameState, Replay } from '../../../../shared/types/game-types';
import { getData, putData } from '../../../../api/api-utils';
import { socketId } from '../../../../api/web-socket';
import { ActionPhaseComplete, ActionRefreshReplay, ActionReplayShow, ActionSetStatusMessage, ActionType } from '../../../../shared/types/action-types';

const Menu = () => {
    const dispatch = useAppDispatch();

    const [showResign, setShowResign] = useState<boolean>(false);
    const phase = useAppSelector((state: GameState) => state.phase);
    const gameId = useAppSelector((state: GameState) => state.id);
    const currentPlayerId = useAppSelector((state: GameState) => state.currentPlayerId);
    const replay = useAppSelector((state: GameState) => state.replay);

    const toggleModal = (value: boolean, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
        setter(!value);
    }

    const gameMenu = {
        title: 'Game',
        subItems: [{
            title: 'Next Phase', handler: () => {
                const action: ActionPhaseComplete = { type: ActionType.PHASE_COMPLETE, payload: { playerId: currentPlayerId } };
                putData(`/api/games/${gameId}/action`, { socketId, action }).then(() => {
                    dispatch(action);
                }).catch((resp) => {
                    const action: ActionSetStatusMessage = { type: ActionType.SET_STATUS_MESSAGE, payload: resp.message }
                    dispatch(action);
                });
            }
        }]
    };

    const replayMenu = {
        title: replay?.show ? `Hide Replay ${replay.show}` : `Show Replay (${replay?.show})`,
        subItems: [],
        handler: () => {
            if (replay === undefined) {
                getData(`/api/games/${gameId}/replay`).then((resp) => {
                    const refreshAction: ActionRefreshReplay = { type: ActionType.REFRESH_REPLAY, payload: resp as Replay };
                    dispatch(refreshAction);
                    const replayShowAction: ActionReplayShow = { type: ActionType.REPLAY_SHOW, payload: true }
                    dispatch(replayShowAction);
                }).catch((resp) => {
                    const action: ActionSetStatusMessage = { type: ActionType.SET_STATUS_MESSAGE, payload: resp.message }
                    dispatch(action);
                });

            } else {
                const action: ActionReplayShow = { type: ActionType.REPLAY_SHOW, payload: replay?.show ? false : true }
                dispatch(action);
            }
        }
    };

    // const renderReplayMenu = () => {
    //     if (replay !== undefined && replay.replayElements !== undefined && (replay.replayElements.movementElements.length > 0 || replay?.replayElements.attackElements.length > 0)) {
    //         return(
    //             <DropdownMenu menuItem={replayMenu} />
    //         )
    //     }
    //     return null;
    // }
    const capitalize = (str: string): string => {
        if (!str) return str;
        return str[0].toUpperCase() + str.slice(1).toLowerCase();
    };

    return (
        <div className="menu">
            <DropdownMenu menuItem={gameMenu} />
            <DropdownMenu menuItem={replayMenu} />
            <div className="menu-right-child">
                <span className="menu-phase">{capitalize(phase)} Phase</span>
            </div>
        </div>
    );
}

export default Menu;