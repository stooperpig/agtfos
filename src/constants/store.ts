import { rootReducer } from "../state/reducers/reducers";
import { configureStore } from '@reduxjs/toolkit';
import thunk from 'redux-thunk';

const store = configureStore({ reducer: rootReducer, devTools: true, middleware: [thunk] });

export default store;

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch;
export type GetState = typeof store.getState;