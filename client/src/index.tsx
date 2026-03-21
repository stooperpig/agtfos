import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './constants/store';
import HomePage from './pages/home-page';
import GamePage from './pages/game-page';
import PlayerPage from './pages/player-page';
import AdminPage from './pages/admin-page';

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <Provider store={store}>
        <BrowserRouter>
            <Routes>
                <Route index element={<HomePage />} />
                <Route path="player" element={<PlayerPage />} />
                <Route path="admin" element={<AdminPage />} />
                <Route path="game" element={<GamePage />} />
            </Routes>
        </BrowserRouter>
    </Provider>
);