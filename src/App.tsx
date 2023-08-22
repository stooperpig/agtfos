import React from 'react';
import './App.css';
import { MenuBar } from './components/menubar/menu-bar';
import { Map } from './components/map/map';
import { ToolBar } from './components/toolbar/tool-bar';
import { StatusBar } from './components/statusbar/status-bar';
//import { SideBar } from './components/sidebar/side-bar';
import { useAppDispatch } from './constants/hooks';
import { retrieveGame } from './actions';
import { MapConfig } from './mapconfig/map-config';


function App() {
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    //console.log("game mounted");
    //const parameters = getUrlVars();
    //const playerId = (parameters.playerId) ? parseInt(parameters.playerId, 10) : 0;
    //const gameId = (parameters.gameId) ? parseInt(parameters.gameId, 10) : 0;
    //console.log(gameId, playerId);
    dispatch(retrieveGame(0, 0));
  });

  return (
    <div className="game">
      <MenuBar />
      <ToolBar />
      <div className="game-center">
        <MapConfig />
        <Map />
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
