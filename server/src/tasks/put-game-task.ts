import { GameState, GameStatus, Player, PlayerTurnStatus, SaveGameData } from "../shared/types/game-types";
import { PutGameData } from "../types/server-types";
import { readGame, readGameList, writeGame, writeGames } from "../utils/file-utils";

export const putGame = (data: PutGameData, postMessage: (data: any) => void): void => {
    console.log(`putGame: starting for game: ${data.gameId} data: ${JSON.stringify(data)}`);

    const gameId = data.gameId as string;
    const playerId = data.playerId as string;
    const saveGameData = data.saveGameData as SaveGameData;
    const game = readGame(gameId);

     const players = game.players; //teams.flatMap(team => team.players);
     const player = players.find(player => player.id === playerId);

    if (player === undefined) {
        //postMessage({ status: "error", gameId, message: `Error: Save game failed.  Could not find player ${playerId}` });
        console.log("putGame: exited with error player not found");
        return;
    }

    updateGameState(game, player, saveGameData);

    let allPlayersHaveFinished = false;

    if (saveGameData.completedTurn) {
        console.log(`putGame: Player ${playerId} has completed turn for game ${gameId}`);
        allPlayersHaveFinished = players.find(player => player.turnStatus !== PlayerTurnStatus.FINISHED && player.active) === undefined;
    } else {
    }

    if (!allPlayersHaveFinished || game.monsterTurnStatus !== PlayerTurnStatus.FINISHED) {
        writeGame(game);
        postMessage({ status: "done", gameId, turn: game.turn });
        console.log("putGame: exited successfully.");
        return;
    }

    players.forEach(player => {
        player.turnStatus = PlayerTurnStatus.NONE;
    });

    //todo: executeMovement(game, mapData);
    writeGame(game);

    const gameList = readGameList();
    const gameEntry = gameList.games.find(game => game.id === gameId);
    if (gameEntry) {
        gameEntry.turn = game.turn;
        if (game.isGameOver) {
            gameEntry.status = GameStatus.FINISHED;
        }
        writeGames(gameList);
    }

    postMessage({ status: "notifyClient", gameId, turn: game.turn, gameOver: game.isGameOver });

    // if (botPlayers.length > 0) {
    //     botPlayers.forEach(player => {
    //         //const planData = planBotMovement(game, mapData, player);
    //         //updateGameState(game, player, planData);
    //         player.turnStatus = PlayerTurnStatus.FINISHED;
    //     });

    //     writeGame(game);
    // }

    postMessage({ status: "done", gameId, turn: game.turn });
    console.log("putGame: exited successfully.");
}

export const updateGameState = (gameState: GameState, player: Player, saveGameData: SaveGameData) => {
    console.log(`put-game-task: updateGameState called for player ${player.id}`);
    const counterIds = Object.keys(saveGameData.actionMap);
    counterIds.forEach(counterId => {
        const counter = gameState.counterMap[counterId];
        counter.actions = saveGameData.actionMap[counterId];
    });

    if (saveGameData.completedTurn) {
        player.turnStatus = PlayerTurnStatus.FINISHED;
    }
}