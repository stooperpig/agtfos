import cloneDeep from "lodash.clonedeep";
import { Action, ActionDropWeapon, ActionGrabWeapon, ActionMoveToCoord, ActionType } from "../shared/types/action-types";
import { Counter, CounterMap, CounterType, GameState, Phase, PlayerTurnStatus, Replay, ReplayAttackElement, ReplayElements, ReplayMovementElement } from "../shared/types/game-types";
import { isCrew, isMonster, isWeapon } from "../shared/utils/counter-utils";
import { shuffleArray } from "../shared/utils/dice-utils";
import { processDropWeapon, processGrabWeapon, processMoveToCoord } from "../shared/state/reducers/game-reducers";
import { readReplay, writeReplay } from "../utils/file-utils";
import { ReplayType } from "../types/server-types";
import { checkEngagement } from "../shared/utils/movement-utils";

function blockingSleep(ms: number) {
    const sab = new SharedArrayBuffer(4);
    const int32 = new Int32Array(sab);
    Atomics.wait(int32, 0, 0, ms);
}

export const runPhase = (data: any, postMessage: (data: any) => void): void => {
    try {
        const gameState = data as GameState;
        const preReplay = readReplay(gameState.id, ReplayType.PRE);
        console.log(`runPhase: starting for game: ${data.id} phase: ${gameState.phase}`);

        //get the current counters and their actions
        const currentCrewAndMonsterCounters = Object.values(gameState.counterMap).filter(counter => !isWeapon(counter));

        //update state with the starting state from pre-replay
        gameState.counterMap = cloneDeep(preReplay.startingState.counterMap);
        gameState.stackMap = cloneDeep(preReplay.startingState.stackMap);

        //restore actions for counters that were in the current state
        // currentCrewAndMonsterCounters.forEach(currentCounter => {
        //     const startingCounter = gameState.counterMap[currentCounter.id];
        //     if (startingCounter) {
        //         startingCounter.actions = currentCounter.actions;
        //     }
        // });

        const replayElements: ReplayElements = {
            movementElements: [] as ReplayMovementElement[],
            attackElements: [] as ReplayAttackElement[]
        };

        if (gameState.phase === Phase.MOVE) {
            const replayMovementElements = executeMovementPhase(gameState, currentCrewAndMonsterCounters);
            console.log(`Created ${replayMovementElements.length} replay movement elements for game ${gameState.id}`);
            replayElements.movementElements = replayMovementElements;
        }
        // else {
        //     const replayAttackElements = executeAttackPhaseActions(gameState);
        //     console.log(`Created ${replayAttackElements.length} replay attack elements`);
        //     replayElements.attackElements = replayAttackElements;
        // }
        resetCounters(gameState);

        gameState.phase = gameState.phase === Phase.MOVE ? Phase.ATTACK : Phase.MOVE;
        gameState.players.forEach(player => {
            player.turnStatus = PlayerTurnStatus.STARTED;
        });

        const postReplay: Replay = {
            startingState: preReplay.startingState,
            activeState: preReplay.startingState,
            replayElements,
            index: -1,
            playing: false,
            show: false
        };
        writeReplay(gameState.id, postReplay, ReplayType.POST);

        preReplay.startingState.counterMap = gameState.counterMap;
        preReplay.startingState.stackMap = gameState.stackMap;
        writeReplay(gameState.id, preReplay, ReplayType.PRE);

        postMessage({ status: "notifyClient", payload: { gameId: gameState.id, gameState } });
        postMessage({ status: "done", payload: { gameId: gameState.id } });
    } catch (error) {
        console.error(`runPhase: error for game: ${data.id}`, error);
        postMessage({ status: "error", payload: { gameId: data.id, error } });
    }
}

const resetCounters = (gameState: GameState) => {
    console.log(`Resetting counters for game ${gameState.id}`);
    const counters = Object.values(gameState.counterMap);
    counters.forEach(counter => {
        counter.actions = [];
        counter.usedMovementAllowance = 0;
    });
}

const executeAttackPhaseActions = (gameState: GameState): ReplayAttackElement[] => {
    console.log(`Executing attack phase for game ${gameState.id}`);
    return [];
}

const executeMovementPhase = (gameState: GameState, currentCrewAndMonsterCounters: Counter[]): ReplayMovementElement[] => {
    console.log(`Executing movement phase for game ${gameState.id}`);
    const replayMovementElements: ReplayMovementElement[] = [];
    //const crewAndMonsterCounters = Object.values(gameState.counterMap).filter(counter => !isWeapon(counter));
    currentCrewAndMonsterCounters.forEach(counter => {
        counter.engaged = false;
    });

    //process drop actions first
    const countersWithDropActions = currentCrewAndMonsterCounters.filter(counter => counter.actions.some(action => action.type === ActionType.DROP_WEAPON));
    console.log(`Counters with drop actions: ${countersWithDropActions.length}`);
    countersWithDropActions.forEach(counter => {
        console.log(`Counter ${counter.id} has drop action`)
        const action = counter.actions.find(action => action.type === ActionType.DROP_WEAPON);
        console.log(`Drop action: ${action}`)
        if (action) {
            processDropWeapon(gameState, action as ActionDropWeapon);
            const replayMovementElement: ReplayMovementElement = {
                type: ActionType.DROP_WEAPON,
                counterId: action.payload.counterId,
                fromAreaId: action.payload.fromAreaId,
                fromCoord: action.payload.fromCoord,
                toAreaId: action.payload.toAreaId,
                toCoord: action.payload.toCoord,
                weaponCounterId: action.payload.weaponCounterId,
                movementCost: 0,
                engagedData: {},
                spottedData: {}
            };
            replayMovementElements.push(replayMovementElement);
        }
    });

    //process grab actions second
    const countersWithGrabActions = currentCrewAndMonsterCounters.filter(counter => counter.actions.some(action => action.type === ActionType.GRAB_WEAPON));
    console.log(`Counters with grab actions: ${countersWithGrabActions.length}`);
    countersWithGrabActions.forEach(counter => {
        console.log(`Counter ${counter.id} has grab action`)
        const action = counter.actions.find(action => action.type === ActionType.GRAB_WEAPON);
        console.log(`Grab action: ${action}`)
        if (action) {
            processGrabWeapon(gameState, action as ActionGrabWeapon);
            const replayMovementElement: ReplayMovementElement = {
                type: ActionType.GRAB_WEAPON,
                counterId: action.payload.counterId,
                fromAreaId: action.payload.fromAreaId,
                fromCoord: action.payload.fromCoord,
                toAreaId: action.payload.toAreaId,
                toCoord: action.payload.toCoord,
                weaponCounterId: action.payload.weaponCounterId,
                movementCost: 0,
                engagedData: {},
                spottedData: {}
            };
            replayMovementElements.push(replayMovementElement);
        }
    });

    //process all actions but will basically ignore the drops/grabs since they have already been processed
    let processedAction = true;
    let index = 0;
    let count = 0;
    while (processedAction && count < 10) {
        ++count;
        processedAction = false;
        console.log(`Processing action index ${index}`);
        for (let i = 0; i < currentCrewAndMonsterCounters.length; i++) {
            const counter = currentCrewAndMonsterCounters[i];
            if (counter.actions && counter.actions.length > index) {
                console.log(`Counter ${counter.id} has ${counter.actions.length} actions`);
                processedAction = true;
                const action = counter.actions[index];
                console.log(`processing action ${index} for counter ${counter.id}`);
                if (action.type === ActionType.MOVE_TO_COORD) {
                    processMoveToCoord(gameState, action as ActionMoveToCoord);
                    const replayMovementElement: ReplayMovementElement = {
                        type: ActionType.MOVE_TO_COORD,
                        counterId: action.payload.counterId,
                        fromAreaId: action.payload.fromAreaId,
                        fromCoord: action.payload.fromCoord,
                        toAreaId: action.payload.toAreaId,
                        toCoord: action.payload.toCoord,
                        weaponCounterId: action.payload.weaponCounterId,
                        movementCost: 0,
                        engagedData: {},
                        spottedData: {}
                    };
                    replayMovementElements.push(replayMovementElement);

                    const engagedCounterIds = checkEngagement(gameState.counterMap[counter.id].areaId, counter.type, gameState.counterMap, gameState.stackMap);
                    console.log(`Engaged counters: ${engagedCounterIds.length}`);
                    if (engagedCounterIds.length > 0) {
                        engagedCounterIds.push(counter.id);

                        replayMovementElement.engagedData =
                            engagedCounterIds.reduce((acc: { [key: string]: boolean }, key: string) => {
                                acc[key] = true;
                                return acc;
                            }, {} as { [key: string]: boolean });

                        engagedCounterIds.forEach(engagedCounterId => {
                            console.log(`Engaged counter: ${engagedCounterId}`);
                            const activeCounter = gameState.counterMap[engagedCounterId];
                            activeCounter.engaged = true;

                            const planningCounter = currentCrewAndMonsterCounters.find(counter => counter.id === engagedCounterId);
                            if (planningCounter && planningCounter.actions && planningCounter.actions.length - 1 > index) {
                                planningCounter.actions.splice(index + 1);
                            }
                        });
                    }
                }
            }
        }

        if (processedAction) {
            shuffleArray(currentCrewAndMonsterCounters);
            index++;
        }
    }
    return replayMovementElements;
}

//need function to determine spotted status of areas
//will call before a move to coord and after in order to create delta of counters in the areas for the replay element.