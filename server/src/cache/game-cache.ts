import { GameState } from "../shared/types/game-types";
import { GameContainerMap } from "../types/server-types";
import { readGame, writeGame } from "../utils/file-utils";

const gameContainerMap: GameContainerMap = {};

export const retrieveGame = (gameId: string): GameState => {
  let gameContainer = gameContainerMap[gameId];

  if (gameContainer === undefined) {
    console.log(`cache: Reading game ${gameId}`)
    const state = readGame(gameId);

    gameContainer = {
      state,
      saveTimeout: null,
      isDirty: false,
      lastSave: Date.now()
    }

    gameContainerMap[gameId] = gameContainer;
  }

  return gameContainer.state
}

export const addGame = (gameId: string, state: GameState): void => {
  gameContainerMap[gameId] = {
    state,
    saveTimeout: null,
    isDirty: false,
    lastSave: 0
  };

  markDirty(gameId);
}

export const flush = (gameId: string): void => {
  const gameContainer = gameContainerMap[gameId];
  console.log(`cache: flushing game ${gameId}`)
  writeGame(gameContainer.state)
  gameContainer.isDirty = false
  gameContainer.lastSave = Date.now()
}

export const markDirty = (gameId: string): void => {
  const gameContainer = gameContainerMap[gameId];

  gameContainer.isDirty = true
  console.log(`cache: Marked game ${gameId} as dirty`)

  if (gameContainer.saveTimeout) return

  const delay = Date.now() - gameContainer.lastSave > 5000 ? 0 : 2500

  gameContainer.saveTimeout = setTimeout(() => {
    if (gameContainer.isDirty) {
      console.log(`cache: writing game ${gameId}`)
      writeGame(gameContainer.state)
      gameContainer.isDirty = false
      gameContainer.lastSave = Date.now()
    }

    gameContainer.saveTimeout = null
  }, delay)
}