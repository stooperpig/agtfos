import React, { ChangeEvent, useState } from 'react';
import { SimplePlayer } from './player-panel';
import { BotDifficulty, NewGamePlayer, PlayerColor, ScenarioEntry } from '../../../shared/types/game-types';
import { postData } from '../../../api/api-utils';

interface PropTypes {
    players: SimplePlayer[]
    handler: (success: boolean) => void
    scenarios: ScenarioEntry[]
}

export default function CreateGameForm(props: PropTypes) {
    const [newPlayers, setNewPlayers] = useState<NewGamePlayer[]>([]);
    const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>(BotDifficulty.Easy);
    const [scenarioId, setScenarioId] = useState<string | undefined>("");
    const [debugMode, setDebugMode] = useState(false);

    const colors = Object.values(PlayerColor);

    const handleCreateGame = async () => {
        if (scenarioId === "") {
            alert("No scenario selected");
            return;
        }

        const selectedPlayers = newPlayers.filter(player => player.id !== undefined);

        if (selectedPlayers.length === 0) {
            alert("No players selected");
            return;
        }

        selectedPlayers.forEach(selectedPlayer => {
            const player = props.players.find(player => player.id === selectedPlayer.id);
            if (player) {
                selectedPlayer.name = player.name;
            }
        });

        try {
            const requestData = {
                scenarioId: scenarioId,
                players: selectedPlayers,
                botDifficulty: botDifficulty,
                debug: debugMode
            }

            await postData<{ message: string }>('/api/games', requestData);
            props.handler(true);
        } catch (error) {
            console.log(error);
            console.log("create game failed");
        }
    }

    const getNewPlayer = (playerIndex: number): NewGamePlayer => {
        let player = newPlayers.find(player => player.index === playerIndex)
        if (player === undefined) {
            player = {
                index: playerIndex,
                color: colors[playerIndex],
            };
            newPlayers.push(player);
        }

        return player;
    }

    const handleUpdateScenario = (event: ChangeEvent<HTMLSelectElement>) => {
        const newValue = event.target.value;
        setScenarioId(newValue);
    }

    const handleUpdateBotDifficulty = (event: ChangeEvent<HTMLSelectElement>) => {
        const newValue = event.target.value;
        setBotDifficulty(newValue as BotDifficulty);
    }

    const handleUpdatePlayer = (event: ChangeEvent<HTMLSelectElement>, playerIndex: number) => {
        const newValue = event.target.value;
        const player = getNewPlayer(playerIndex);
        player.id = (newValue !== "-1") ? newValue : undefined;
        setNewPlayers(newPlayers);
    }

    const handleUpdateColor = (event: ChangeEvent<HTMLSelectElement>, playerIndex: number) => {
        const newValue = event.target.value;
        const player = getNewPlayer(playerIndex);
        player.color = newValue as PlayerColor;
        setNewPlayers(newPlayers);
        console.log(newPlayers);
    }

    return (
        <div>
            <span>New Game</span><br /><br />
            <div className="player-panel-create-game">
                <div className="player-panel-create-game-left">
                    <div>
                        Scenario: &nbsp;
                        <select defaultValue={"Select Scenario"} onChange={(event) => handleUpdateScenario(event)}>
                            <option value="">Select Scenario</option>
                            {props.scenarios.map((scenario: ScenarioEntry, index: number) => {
                                return (<option key={index} value={scenario.id} >{scenario.name}</option>)
                            })}
                        </select>
                    </div>
                    <div style={{ margin: '10px 0' }}>
                        Difficulty: &nbsp;
                        <select defaultValue={BotDifficulty.Easy} onChange={(event) => handleUpdateBotDifficulty(event)}>
                            {Object.values(BotDifficulty).map((difficulty: string, index: number) => {
                                return (<option key={index} value={difficulty} >{difficulty}</option>)
                            })}
                        </select>
                    </div>
                    <div style={{ margin: '10px 0' }}>
                        <label>
                            Enable Debug Mode: &nbsp;
                            <input
                                type="checkbox"
                                checked={debugMode}
                                onChange={(e) => setDebugMode(e.target.checked)}
                            />
                        </label>
                    </div>
                    <div className="player-panel-create-game-details">
                        <div className="player-panel-create-game-players">
                            <table className="player-panel-games-table">
                                <thead>
                                    <tr>
                                        <th>Player</th>
                                        <th>Color</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[0, 1, 2, 3].map(index => {
                                        return (
                                            <tr key={index}>
                                                <td>
                                                    <select onChange={(event) => handleUpdatePlayer(event, index)}>
                                                        <option value="-1">Select Player</option>
                                                        {props.players.map((player: SimplePlayer, index: number) => {
                                                            return (<option key={index} value={player.id} >{player.name}</option>)
                                                        })}
                                                    </select>
                                                </td>
                                                <td>
                                                    <select defaultValue={colors[index]} onChange={(event) => handleUpdateColor(event, index)}>
                                                        {colors.map((color: string, index: number) => {
                                                            return (<option key={index} value={color} >{color}</option>)
                                                        })}
                                                    </select>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <br />
                    <button onClick={() => handleCreateGame()}>Create New Game</button>&nbsp;&nbsp;<button>Cancel</button>
                </div>
            </div>
        </div>);
}