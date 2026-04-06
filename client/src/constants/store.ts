import { useDispatch, useSelector, useStore } from 'react-redux';
import { rootReducer } from '../state/reducers';
import { configureStore } from '@reduxjs/toolkit';

const store = configureStore({ reducer: rootReducer, devTools: true });

export default store;

export type AppStore = typeof store
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
export type GetState = typeof store.getState;
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
export const useAppStore = useStore.withTypes<AppStore>()