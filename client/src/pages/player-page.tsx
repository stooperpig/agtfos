import React from 'react';
import "./player-page.css"
import { HeaderImage } from '../components/header/header-image';
import { TopMenu } from '../components/header/top-menu';
import PlayerPanel from '../apps/portal/player/player-panel';

export default function PlayerPage() {
    return(
        <div className="player-page">
            <HeaderImage pageId="player" enableMask={true} />
            <TopMenu />
            <PlayerPanel />
        </div>
    )
}