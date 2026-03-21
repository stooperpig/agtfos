import * as fs from 'fs';
import path from 'path';
import * as fileUtils from '../../src/utils/file-utils';
import { GameList } from '../../src/types/server-types';
import { GameState, MapInfo } from '../../src/shared/types/game-types';

jest.mock('fs');
jest.mock('path');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;
import { consoleLogger } from "../../src/utils/logger";

beforeAll(() => {
    consoleLogger.debug = jest.fn();
    consoleLogger.info = jest.fn();
    consoleLogger.warn = jest.fn();
    consoleLogger.error = jest.fn();
    jest.spyOn(console, "log").mockImplementation(() => {});
});

describe('file-utils', () => {
    const mockGameId = 'test123';
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //const mockStarGraph: StarGraph = { nodes: [], edges: [] } as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockGame: GameState = { id: mockGameId } as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockGames: GameList = [{ id: '1' }, { id: '2' }] as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockMap: MapInfo = { name: 'map1' } as any;
    const mockStarCards = [{ id: 1, name: 'card1' }];

    beforeEach(() => {
        jest.clearAllMocks();
        mockedPath.join.mockImplementation((...args: string[]) => args.join('/'));
        mockedPath.resolve?.mockImplementation((...args: string[]) => args.join('/'));
        mockedFs.existsSync.mockImplementation(() => true);
    });

    describe('deleteStarGraph', () => {
        it('should call unlinkSync with correct path', () => {
            fileUtils.deleteStarGraph(mockGameId);
            expect(mockedFs.unlinkSync).toHaveBeenCalledWith(
                expect.stringContaining(`star-graph-${mockGameId}.json`)
            );
        });
    });

    describe('deleteGame', () => {
        it('should call unlinkSync with correct path', () => {
            fileUtils.deleteGame(mockGameId);
            expect(mockedFs.unlinkSync).toHaveBeenCalledWith(
                expect.stringContaining(`game-${mockGameId}.json`)
            );
        });
    });

    describe('deleteMap', () => {
        it('should call unlinkSync with correct path', () => {
            fileUtils.deleteMap(mockGameId);
            expect(mockedFs.unlinkSync).toHaveBeenCalledWith(
                expect.stringContaining(`map-data-${mockGameId}.json`)
            );
        });
    });

    describe('doesGameExist', () => {
        it('should return true if file exists', () => {
            mockedFs.existsSync.mockReturnValue(true);
            expect(fileUtils.doesGameExist(mockGameId)).toBe(true);
        });
        it('should return false if file does not exist', () => {
            mockedFs.existsSync.mockReturnValue(false);
            expect(fileUtils.doesGameExist(mockGameId)).toBe(false);
        });
    });

    describe('readCards', () => {
        it('should read and parse star cards', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockStarCards));
            expect(fileUtils.readCards()).toEqual(mockStarCards);
        });
    });

    // describe('readStarGraph', () => {
    //     it('should read and parse star graph', () => {
    //         mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockStarGraph));
    //         expect(fileUtils.readStarGraph(mockGameId)).toEqual(mockStarGraph);
    //     });
    // });

    describe('readGame', () => {
        it('should read and parse game', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockGame));
            expect(fileUtils.readGame(mockGameId)).toEqual(mockGame);
        });
    });

    describe('readGames', () => {
        it('should read and parse games list', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockGames));
            expect(fileUtils.readGames()).toEqual(mockGames);
        });
    });

    describe('readMap', () => {
        it('should read and parse map info', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockMap));
            expect(fileUtils.readMap(mockGameId)).toEqual(mockMap);
        });
    });

    // describe('writeStarGraph', () => {
    //     it('should write star graph to file', () => {
    //         fileUtils.writeStarGraph(mockGameId, mockStarGraph);
    //         expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
    //             expect.stringContaining(`star-graph-${mockGameId}.json`),
    //             JSON.stringify(mockStarGraph)
    //         );
    //     });
    // });

    describe('writeGame', () => {
        it('should write game to file', () => {
            fileUtils.writeGame(mockGame);
            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining(`game-${mockGameId}.json`),
                JSON.stringify(mockGame)
            );
        });
    });

    describe('writeGames', () => {
        it('should write games list to file', () => {
            fileUtils.writeGames(mockGames);
            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('games.json'),
                JSON.stringify(mockGames)
            );
        });
    });

    describe('writeMap', () => {
        it('should write map info to file', () => {
            fileUtils.writeMap(mockGameId, mockMap);
            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining(`map-data-${mockGameId}.json`),
                JSON.stringify(mockMap)
            );
        });
    });
});