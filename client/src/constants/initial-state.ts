import { GameState, Phase, PlayerColor, PlayerTurnStatus, GameMode } from "../shared/types/game-types";

export const InitialGameState: GameState = {
    id: "0",
    phase: Phase.MOVE,
    currentPlayerId: "0",
    players: [{
        active: true,
        id: "0",
        name: "Bill",
        turnStatus: PlayerTurnStatus.NONE,
        color: PlayerColor.BLUE,
        index: 0
    }],
    mapScale: 0.25,
    scenarioId: "",
    nextCounterId: 0,
    counterMap: {},
    stackMap: {},
    selectedCounterIds: [],
    gameMode: GameMode.NORMAL,
    connectedClients: 0,
    debug: false,
    isGameOver: false,
    refreshGame: false,
    turn: 0,
    weaponEffectMap: {},
    monsterTurnStatus: PlayerTurnStatus.NONE
}