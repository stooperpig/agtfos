import { readFileSync, writeFileSync, existsSync, unlinkSync, renameSync } from 'fs';
import path from 'path';
import { DiceTableData, GameList, ScenarioList } from '../types/server-types'
import { GameState, Replay, Scenario } from '../shared/types/game-types'
import { ReplayType } from '../types/server-types'

const GAME_VERSIONS = 9;

export const deleteGame = (gameId: string): void => {
    const dir = path.join(process.cwd(), '/data/games');
    const baseName = `game-${gameId}`;

    for (let i = 0; i <= GAME_VERSIONS + 1; ++i) {
        const filePath = path.join(dir, `${baseName}${i === 0 ? '.json' : `.${i}.json`}`);
        if (existsSync(filePath)) {
            unlinkSync(filePath);
        }
    }
}

export const deleteReplay = (gameId: string, type: ReplayType): void => {
    const dir = path.join(process.cwd(), '/data/games');
    const baseName = `game-${gameId}-replay-${type}`;

    for (let i = 0; i <= GAME_VERSIONS + 1; ++i) {
        const filePath = path.join(dir, `${baseName}${i === 0 ? '.json' : `.${i}.json`}`);
        if (existsSync(filePath)) {
            unlinkSync(filePath);
        }
    }
}

export const doesGameExist = (gameId: string): boolean => {
    const filePath = path.join(process.cwd(), `/data/games/game-${gameId}.json`);
    return existsSync(filePath);
}

export const readDiceTable = (percentage: number): DiceTableData => {
    const file = path.join(process.cwd(), '/data/tables', `dice-table-${percentage}.json`);
    const table = JSON.parse(readFileSync(file, 'utf8'));
    return table;
}

export const readGame = (gameId: string, version: string | undefined = undefined): GameState => {
    let file;
    if (version !== undefined) {
        file = path.join(process.cwd(), '/data/games', `game-${gameId}.${version}.json`);
    } else {
        file = path.join(process.cwd(), '/data/games', `game-${gameId}.json`);
    }
    const game = JSON.parse(readFileSync(file, 'utf8'));
    return game;
}

export const readReplay = (gameId: string, type: ReplayType, version: string | undefined = undefined): Replay => {
    let file;
    if (version !== undefined) {
        file = path.join(process.cwd(), '/data/games', `game-${gameId}-replay-${type}.${version}.json`);
    } else {
        file = path.join(process.cwd(), '/data/games', `game-${gameId}-replay-${type}.json`);
    }
    const game = JSON.parse(readFileSync(file, 'utf8'));
    return game;
}

export const readScenario = (scenarioId: string): Scenario => {
    const file = path.join(process.cwd(), `/data/scenarios/scenario-${scenarioId}.json`);
    const scenario = JSON.parse(readFileSync(file, 'utf8'));
    return scenario;
}

export const readGames = (): GameList => {
    const file = path.join(process.cwd(), '/data/games.json');
    const games = JSON.parse(readFileSync(file, 'utf8'));
    return games;
}

export const readScenarios = (): ScenarioList => {
    const file = path.join(process.cwd(), '/data/scenarios.json');
    const games = JSON.parse(readFileSync(file, 'utf8'));
    return games;
}

export const writeGame = (game: GameState): void => {
    const dir = path.join(process.cwd(), '/data/games');
    const baseName = `game-${game.id}`;
    const latestFile = path.join(dir, `${baseName}.json`);

    // Rotate old versions: .json.4 <- .json.3 <- ... <- .json.1 <- .json
    for (let i = GAME_VERSIONS; i >= 0; --i) {
        const from = path.join(dir, `${baseName}${i === 0 ? '.json' : `.${i}.json`}`);
        const to = path.join(dir, `${baseName}.${i + 1}.json`);
        if (existsSync(from)) {
            renameSync(from, to);
        }
    }

    // Save current version as .json (latest)
    writeFileSync(latestFile, JSON.stringify(game));
};

export const writeReplay = (gameId: string, replay: Replay, type: ReplayType): void => {
    const dir = path.join(process.cwd(), '/data/games');
    const baseName = `game-${gameId}-replay-${type}`;
    const latestFile = path.join(dir, `${baseName}.json`);

    // Rotate old versions: .json.4 <- .json.3 <- ... <- .json.1 <- .json
    for (let i = GAME_VERSIONS; i >= 0; --i) {
        const from = path.join(dir, `${baseName}${i === 0 ? '.json' : `.${i}.json`}`);
        const to = path.join(dir, `${baseName}.${i + 1}.json`);
        if (existsSync(from)) {
            renameSync(from, to);
        }
    }

    // Save current version as .json (latest)
    writeFileSync(latestFile, JSON.stringify(replay));
};

export const readGameList = (): GameList => {
    let gameList: GameList;

    try {
        gameList = readGames();
    } catch (error) {
        console.log(error);
        console.log('Warning: Reading games failed. Creating default list.');
        gameList = {
            nextId: 0,
            games: []
        }

        writeGames(gameList);
    }

    return gameList;
}

export const readScenarioList = (): ScenarioList => {
    let scenarioList: ScenarioList;

    try {
        scenarioList = readScenarios();
    } catch (error) {
        console.log(error);
        console.log('Warning: Reading games failed. Creating default list.');
        scenarioList = {
            nextId: 0,
            scenarios: []
        }
        writeScenarios(scenarioList);
    }

    return scenarioList;
}

export const writeGames = (games: GameList): void => {
    const file = path.join(process.cwd(), '/data/games.json');
    writeFileSync(file, JSON.stringify(games));
}

export const writeScenarios = (scenarios: ScenarioList): void => {
    const file = path.join(process.cwd(), '/data/scenarios.json');
    writeFileSync(file, JSON.stringify(scenarios));
}

