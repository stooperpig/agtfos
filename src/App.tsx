import React from 'react';
import './App.css';
import { MenuBar } from './components/menubar/menu-bar';
import { Map } from './components/map/map';
import { ToolBar } from './components/toolbar/tool-bar';
import { StatusBar } from './components/statusbar/status-bar';
//import { SideBar } from './components/sidebar/side-bar';
import { useAppDispatch } from './constants/hooks';
import { retrieveGame } from './actions';
import { MapConfig } from './components/mapconfig/map-config';
import { Coord } from './types/game-types';


const configCallBack = (() => {
  let listener: any = undefined;

  const addListener = (aListener: any) => {
    listener = aListener;
  }

  const addPoint = (coord: Coord) => {
    if (listener !== undefined) {
      listener(coord);
    }
  }

  return({
    addListener: addListener,
    addPoint: addPoint
  });
})();

function App() {
  const dispatch = useAppDispatch();
  let ignore = false;

  React.useEffect(() => {   
    if (!ignore) {
      console.log("App useEffect ");
      dispatch(retrieveGame(0, 0));
    }

    return () => { ignore = true; }
    //const parameters = getUrlVars();
    //const playerId = (parameters.playerId) ? parseInt(parameters.playerId, 10) : 0;
    //const gameId = (parameters.gameId) ? parseInt(parameters.gameId, 10) : 0;
    //console.log(gameId, playerId);

  },[ignore]);


  return (
    <div className="game">
      <MenuBar />
      <ToolBar />
      <div className="game-center">
        <MapConfig callback={configCallBack} />
        <Map callback={configCallBack} />
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
