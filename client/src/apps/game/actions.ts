import { getData } from "../../api/api-utils";
import { ImageData, ScenarioData } from "../../constants/game-constants";
import { GameState, Scenario } from "../../shared/types/game-types";

export const retrieveGame = async (gameId: string, playerId: string): Promise<GameState> => {
  const gameState = await getData<GameState>(`/api/games/${gameId}/player/${playerId}`);
  const scenario = await getData<Scenario>(`/api/scenarios/${gameState.scenarioId}`);
  
  Object.assign(ImageData, scenario.imageMap);
  Object.assign(ScenarioData, scenario);

  await loadImages();
  return gameState;
}

export const loadImages = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    try {
      let loadedImages = 0;
      const numImages = Object.keys(ImageData).length;
      const onLoad = async () => {
        if (++loadedImages >= numImages) {
          resolve(true);
        }
      };

       for (const imageName in ImageData) {
        const src = ImageData[imageName].src;
        const image = new Image();
        image.onload = onLoad;
        image.src = src;
        ImageData[imageName].image = image;
      }
    } catch (error) {
      reject(error);
    }
  });
}
