import React, { useEffect } from "react"
import './game-panel.css'
import { retrieveGame } from "./actions"
import { useDispatch } from "react-redux";
import { connect } from "../../api/web-socket";
import MenuBar from "./components/menubar/menu-bar";
import ToolBar from "./components/toolbar/tool-bar";
import SideBar from "./components/sidebar/side-bar";
import StatusBar from "./components/statusbar/status-bar";
import Map from "./components/map/map";
import { RootState, useAppSelector } from "../../constants/store";
import { ActionType } from "../../shared/types/action-types";

let ignore = false;

interface UrlParameters {
    [key: string]: string
}

const getUrlVars = (): UrlParameters => {
    const vars: UrlParameters = {};
    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, (m: string, key: string, value: string): string => {
        vars[key] = value;
        return value;
    });

    return vars;
}

// const configCallBack = (() => {
//   let listener: any = undefined;

//   const addListener = (aListener: any) => {
//     listener = aListener;
//   }

//   const addPoint = (coord: Coord) => {
//     if (listener !== undefined) {
//       listener(coord);
//     }
//   }

//   return({
//     addListener: addListener,
//     addPoint: addPoint
//   });

// })();

export const GamePanel = () => {
    const dispatch = useDispatch();

    const refreshGame = useAppSelector((state: RootState) => state.refreshGame);
    const currentPlayerId = useAppSelector((state: RootState) => state.currentPlayerId);
    const gameId = useAppSelector((state: RootState) => state.id);

    useEffect(() => {
        if (!ignore) {
            ignore = true;
            const parameters = getUrlVars();
            const gameId = (parameters.gameId) ? parameters.gameId : "0";
            const currentPlayerId = (parameters.player) ? parameters.player : "1";
            const version = (parameters.version) ? parameters.version : undefined;
            console.log("Home loading...");

            retrieveGame(gameId, currentPlayerId, version).then(game => {
                console.log(`retrieved game: ${game.id}`);

                if (game.players) {
                    const player = game.players.find(player => player.id === game.currentPlayerId);
                    if (player !== undefined) {
                        document.title = `${player.name} (${player.color})`;
                    }
                }

                connect(gameId);

                dispatch({ type: ActionType.LOAD_GAME, payload: game });
            }).catch(error => {
                console.log(error);
            });
        }
    });

    useEffect(() => {
        if (refreshGame && currentPlayerId) {
            setTimeout(() => {
                retrieveGame(gameId, currentPlayerId).then(game => {
                    console.log(`retrieved game: ${game.id}`);
                    dispatch({ type: ActionType.LOAD_GAME, payload: game });
                }).catch(error => {
                    console.log(error);
                });
            }, 1000);
        }
    }, [refreshGame, gameId, currentPlayerId, dispatch]);

    const handleContextMenu = (event: React.MouseEvent) => {
        event.preventDefault();
    }

    return (
        <div className="game-panel" onContextMenu={handleContextMenu}>
            <MenuBar />
            <ToolBar />
            <div className="game-panel-center">
                <SideBar />
                <Map />
            </div>
            <StatusBar />
        </div>
    )
}