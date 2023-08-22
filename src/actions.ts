import { GameState, ImageMap } from "./types/game-types"
import { CounterTypeData, ImageData } from './constants/game-constants';
import { AppDispatch } from "./constants/store";
import { LOAD_GAME } from "./constants/action-constants";
import axios from "axios";
import scenarioData from "./constants/scenario-data";

export const retrieveGame = (gameId: number, playerId: number) => async (dispatch: AppDispatch) => {
  console.log('retrieveGame');
  const response = await axios.get(`/games/game-${gameId}-${playerId}.json`);

  console.log(JSON.stringify(response.data));
  const gameState: GameState = response.data;
  
  await retrieveScenario(dispatch, gameState);
}

const retrieveScenario = async (dispatch: AppDispatch, gameState: GameState) => {
  console.log('retrieveScenario');
  const response = await axios.get(`/scenarios/${gameState.scenarioFile}.json`);

  console.log(JSON.stringify(response.data));

  Object.assign(scenarioData, response.data);
  Object.assign(CounterTypeData, response.data.counterTypes);
  Object.assign(ImageData, response.data.imageMap);

  let loadedImages = 0;
  const numImages = Object.keys(ImageData).length;

  const onLoad = () => {
    console.log(`image ${loadedImages} loaded of ${numImages}`);
    if (++loadedImages >= numImages) {
      console.log("load game");
      dispatch({ type: LOAD_GAME, payload: gameState });
    }
  }

  for (let imageName in ImageData) {
    let src = ImageData[imageName].src;
    let image = new Image();
    image.onload = onLoad;
    image.src = src;
    ImageData[imageName].image = image;
  }
}