import { Action, Dispatch, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { CounterActionMap, CounterMap, GameState, SaveGameData } from "../../../../shared/types/game-types";
import { putData } from '../../../../api/api-utils';
import { SET_STATUS_MESSAGE, SET_TURN_COMPLETED } from '../../../../constants/action-constants';

export const handleSaveGame = async (dispatch: ThunkDispatch<GameState, undefined, UnknownAction> & Dispatch<Action>, completedTurn: boolean, gameId: string, currentPlayerId: string, counterMap: CounterMap) => {

    const counters = Object.values(counterMap).filter(counter => counter.playerId === currentPlayerId && counter.actions.length > 0);
    const actionMap: CounterActionMap = {};

    counters.forEach(counter => {
        actionMap[counter.id] = counter.actions;
    });

    const request: SaveGameData = {
        completedTurn,
        actionMap,
    }

    try {
        await putData(`/api/games/${gameId}/player/${currentPlayerId}`, request);
        if (completedTurn) {
            dispatch({ type: SET_TURN_COMPLETED, payload: {} });
        }

        dispatch({ type: SET_STATUS_MESSAGE, payload: 'Game saved successfully' });
    } catch (error) {
        console.log(`error ${error}`)
    }
}