import React from 'react';
import { HeaderImage } from '../components/header/header-image';
import { TopMenu } from '../components/header/top-menu';
import PlayerPanel from '../apps/portal/player/player-panel';

export default function PlayerPage() {
    return(
        <div>
            <HeaderImage pageId="player" enableMask={true} />
            <TopMenu />
            <PlayerPanel />
        </div>
    )
}