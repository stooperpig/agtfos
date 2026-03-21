import React, { useEffect, useState } from 'react';
import './menu.css';
import './drop-down-menu.css';
import DropdownMenu from './drop-down-menu';
import { useAppDispatch, useAppSelector } from '../../../../constants/store';
import { GameState, PlayerTurnStatus, SaveGameData } from '../../../../shared/types/game-types';
import { SET_SHOW_REPORTS, SET_STATUS_MESSAGE, SET_TURN_COMPLETED } from '../../../../constants/action-constants';

// import ReportsModal from '../modal/reports-modal/reports-modal';
// import StatusModal from '../modal/status-modal/status-modal';
// import ProductionModal from '../modal/production-modal/production-modal';
import cloneDeep from 'lodash.clonedeep';
import { handleSaveGame } from './utils';
// import PlayerResignModal from '../modal/player-resign-modal/player-resign-modal';

const Menu = () => {
    const dispatch = useAppDispatch();

    //const [showReports, setShowReports] = useState<boolean>(false);
    const [showProduction, setShowProduction] = useState<boolean>(false);
    const [showStatus, setShowStatus] = useState<boolean>(false);
    const [showResign, setShowResign] = useState<boolean>(false);

    const gameId = useAppSelector((state: GameState) => state.id);
    const currentPlayerId = useAppSelector((state: GameState) => state.currentPlayerId);
    const counterMap = useAppSelector((state: GameState) => state.counterMap);
    // const colonyMap = useAppSelector((state: GameState) => state.colonyMap);
    // const teams = useAppSelector((state: GameState) => state.teams);
    // const taskForceMap = useAppSelector((state: GameState) => state.taskForceMap);
    const isProductionYear = false; //useAppSelector(state => state.isProductionYear);

    // useEffect(() => {
    //     setShowProduction(isProductionYear);
    // }, [isProductionYear]);

    //let production: Production | undefined;
    let showReports = false;
    // if (teams && currentPlayerId) {
    //     const player = getPlayer(teams, currentPlayerId);
    //     if (player) {
    //         production = player.production;
    //         if (production) {
    //             production = cloneDeep(production);
    //         }
    //         showReports = player.showReports;
    //     }
    // }

    // if (production === undefined) {
    //     production = { colonyProductionMap: {}, technologyResearchMap: {} }
    // }

    const toggleModal = (value: boolean, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
        setter(!value);
    }

    const handleShowReports = (value: boolean) => {
        dispatch({ type: SET_SHOW_REPORTS, payload: value });
    }

    // const productionUpdateFunction = (completeTurn: boolean, colonyProductionMap: ColonyProductionMap, technologyResearchMap: TechnologyResearchMap) => {
    //     dispatch({ type: SET_PRODUCTION, payload: { colonyProductionMap, technologyResearchMap } });
    // }

    const gameMenu = {
        title: 'Game',
        subItems: [{
            title: 'Save Game', handler: () => { handleSaveGame(dispatch, false, gameId, currentPlayerId, counterMap); }
        }, {
            title: 'Resign', handler: () => { toggleModal(showResign, setShowResign) }
        }]
    };

    // const productionMenu = {
    //     title: 'Production Plan',
    //     subItems: [],
    //     handler: () => { toggleModal(showProduction, setShowProduction) }
    // };

    // const stateMenu = {
    //     title: 'Status',
    //     subItems: [],
    //     handler: () => { toggleModal(showStatus, setShowStatus); }
    // };

    // const reportMenu = {
    //     title: 'Reports',
    //     subItems: [],
    //     handler: () => { handleShowReports(!showReports) }
    // }

    const renderGameMenu = () => {
        if (!isProductionYear) {
            gameMenu.subItems.splice(1, 0, {
                title: 'Complete Turn',
                handler: () => { handleSaveGame(dispatch, true, gameId, currentPlayerId, counterMap); }
            });
        }

        return (<DropdownMenu menuItem={gameMenu} />);
    }

    // const renderProductionMenu = () => {
    //     if (isProductionYear) {
    //         return (<DropdownMenu menuItem={productionMenu} />);
    //     } else {
    //         return null;
    //     }
    // }

    return (
        <div className="menu">
            {renderGameMenu()}
            {/* <DropdownMenu menuItem={stateMenu} /> */}
            {/* <DropdownMenu menuItem={reportMenu} /> */}
            {/* {renderProductionMenu()} */}
            {/* <ReportsModal show={showReports} closeHandler={() => handleShowReports(false)} />
            <StatusModal show={showStatus} closeHandler={() => toggleModal(showStatus, setShowStatus)} />
            <ProductionModal show={showProduction} closeHandler={() => toggleModal(showProduction, setShowProduction)} production={production} updateFunction={productionUpdateFunction} />
            <PlayerResignModal show={showResign} closeHandler={() => { toggleModal(showResign, setShowResign) }} /> */}
        </div>
    );
}

export default Menu;