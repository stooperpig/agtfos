import React, { useEffect, useState } from 'react';
import './player-panel.css';
import { deleteData, getData, patchData } from '../../../api/api-utils';
import { GameEntry, GameEntryPlayer, GameEntryTeam, PlayerType, Scenario } from '../../../shared/types/game-types';
import CreateGameForm from './create-game-form';
import { ClientUser, getUser } from '../../../utils/user-client';

//todo: fix this...why isn't this a shared interface def?
export interface SimplePlayer {
    id: string
    name: string
}

export default function PlayerPanel() {
    const [players, setPlayers] = useState<SimplePlayer[]>([]);
    const [currentPlayerId, setCurrentPlayerId] = useState<string | undefined>(undefined);
    const [games, setGames] = useState<GameEntry[]>([]);
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [user, setUser] = useState<ClientUser | undefined>(undefined);

    useEffect(() => {
        getScenarios();
        const currentUser = getUser(document);
        if (currentUser) {
            setUser(currentUser);
            setCurrentPlayerId(currentUser.id);
        }
    }, []);

    useEffect(() => {
        getData<SimplePlayer[]>('/api/ul').then((response) => {
            setPlayers(response);
        }).catch(error => {
            console.log(error);
            setPlayers([]);
        });
    }, []);

    useEffect(() => {
        if (currentPlayerId !== undefined) {
            getGames(currentPlayerId);
        } else {
            setGames([]);
        }
    }, [currentPlayerId]);

    const launchGame = (gameId: string) => {
        console.log(`launchFullGame: ${gameId}:${currentPlayerId}`);
        window.open(`/game?gameId=${gameId}&player=${currentPlayerId}`);
    };

    const deleteOldGame = async (gameId: string) => {
        const result = window.confirm(`Delete game ${gameId}`);
        if (result) {
            try {
                await deleteData(`/api/games/${gameId}`);
                getGames(currentPlayerId);
            } catch (error) {
                console.log("delete game failed " + error);
            }
        }
    }

    const handleCreateGame = async (success: boolean) => {
        if (success) {
            await getGames(currentPlayerId);
        }
    }

    const getGames = async (currentPlayerId: string | undefined) => {
        if (currentPlayerId) {
            try {
                const response = await getData<GameEntry[]>(`/api/games/list/${currentPlayerId}`);
                //console.log(response);
                setGames(response);
            } catch (error) {
                console.log(error);
            }
        }
    }

    const getScenarios = async () => {
        try {
            const response = await getData<Scenario[]>(`/api/scenarios/list`);
            //console.log(response);
            setScenarios(response);
        } catch (error) {
            console.log(error);
        }

    }

    const renderPlayer = (player: GameEntryPlayer) => {
        return (
            <span key={player.id}>{player.name} </span>
        );
    }

    const renderPlayers = (players: GameEntryPlayer[]) => {
        return (
            <td>
                {players.map((player: GameEntryPlayer) => {
                    return renderPlayer(player);
                })}
            </td>
        );
    }

    const toggleDebug = async (gameId: string, currentDebug: boolean) => {
        try {
            const newDebug = !currentDebug;
            await patchData(`/api/games/${gameId}/debug`, { debug: newDebug });

            // Update the local state to reflect the change
            setGames(games.map(game =>
                game.id === gameId ? { ...game, debug: newDebug } : game
            ));
        } catch (error) {
            console.error('Failed to toggle debug mode:', error);
        }
    };

    const renderLaunchButton = (gameId: string) => {
        return (
            <td><button onClick={() => launchGame(gameId)}>Launch</button></td>
        );
    }

    const renderDeleteButton = (gameId: string) => {
        return (
            <td><button onClick={() => deleteOldGame(gameId)}>Delete</button></td>
        );
    }

    console.log("rendering the tsx");

    const renderPlayerSelect = () => {
        if (user?.admin) {
            return (
                <div>
                    Player: <select className="player-panel-player-select" value={currentPlayerId} onChange={event => setCurrentPlayerId(event.currentTarget.value)}>
                        <option value={undefined}>Select Player</option>
                        {players.map((player, index) => (
                            <option key={index} value={player.id}>{player.name}</option>
                        ))}
                    </select>
                </div>
            )
        } else {
            return (
                <div>Player: {user?.name}</div>
            )
        }
    }

    return (
        <div className="player-panel">
            {renderPlayerSelect()}
            <br />Games<br />
            <table className="player-panel-games-table">
                <thead>
                    <tr>
                        <th>Id</th>
                        <th>Turn</th>
                        <th>Players</th>
                        <th>Status</th>
                        <th>Debug</th>
                        <th>Launch</th>
                        <th>Delete</th>
                    </tr>
                </thead>
                <tbody>
                    {games.map((game, index) => {
                        return (
                            <tr key={index}>
                                <td>{game.id}</td>
                                <td>{game.turn}</td>
                                {renderPlayers(game.players)}
                                <td>{game.status}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={game.debug || false}
                                        onChange={() => toggleDebug(game.id, game.debug || false)}
                                        style={{ cursor: 'pointer' }}
                                    />
                                </td>
                                {renderLaunchButton(game.id)}
                                {renderDeleteButton(game.id)}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <br />
            <hr />
            <CreateGameForm players={players} scenarios={scenarios} handler={handleCreateGame} />
        </div>
    )
}