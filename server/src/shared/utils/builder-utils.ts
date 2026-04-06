import { Player, PlayerColor, PlayerTurnStatus, PlayerType, GameState, GameMode, Phase } from "../types/game-types";

export const createGameStateBuilder = (
  id: string,
  currentPlayerId: string,
  gameMode: GameMode
) => {
  const state: GameState = {
    counterMap: {},
    players: [],
    scenarioId: '',
    phase: Phase.MOVE,
    nextCounterId: 1,
    stackMap: {},
    id,
    currentPlayerId,
    debug: false,
    gameMode,
    connectedClients: 0,
    isGameOver: false,
    refreshGame: false,
    turn: 0,
    weaponEffectMap: {},
    mapScale: 1,
    selectedCounterIds: [],
    monsterTurnStatus: PlayerTurnStatus.STARTED,
    // weaponStateMap: {}
  };

  const builder = {
    setConnectedClients(count: number) {
      state.connectedClients = count;
      return builder;
    },
    setIsGameOver(value: boolean) {
      state.isGameOver = value;
      return builder;
    },
    setRefreshGame(value: boolean) {
      state.refreshGame = value;
      return builder;
    },
    setStatusMessage(message: string) {
      state.statusMessage = message;
      return builder;
    },
    setTurn(turn: number) {
      state.turn = turn;
      return builder;
    },
    build() {
      return state;
    }
  };

  return builder;
};

export const createPlayerBuilder = (id: string, name: string, index: number, teamId: string, color: PlayerColor, type: PlayerType) => {
  const player: Player = {
    id,
    name,
    index,
    color,
    active: true,
    turnStatus: PlayerTurnStatus.STARTED,
  };

  const builder = {
    setStatus(status: PlayerTurnStatus) {
      player.turnStatus = status;
      return builder;
    },
    setActive(active: boolean) {
      player.active = active;
      return builder;
    },
    build() {
      return player;
    }
  };

  return builder;
};