import './map.css';
import React, { useRef } from 'react'
import { useAppDispatch, useAppSelector } from '../../../../constants/store';
import { ImageData, ScenarioData } from '../../../../constants/game-constants';
import { Coord, CounterMap, Player, Polygon, Stack, StackMap, AreaDefinition, AreaDefinitionMap, Phase, Counter, Animation, WeaponType, WeaponEffectEntry, WeaponEffect } from '../../../../shared/types/game-types';
import { getMovementCost, pointInPolygon } from '../../utils/map-utils';
import { sortCounterIdsBySelected, validateMove } from './utils';
import { socketId } from '../../../../api/web-socket';
import { putData } from '../../../../api/api-utils';
import { ActionMoveToCoord, ActionSelectTargetArea, ActionType, SelectLocationMode } from '../../../../shared/types/action-types';
import { checkEngagement } from '../../../../shared/utils/movement-utils';

const weaponsDisplayTable: { [key: string]: Coord } = {
    [WeaponType.BOTTLE_OF_ACID]: {
        "x": 3066,
        "y": 284
    },
    [WeaponType.CANNISTER_OF_ZGWORTZ]: {
        "x": 3065,
        "y": 398
    },
    [WeaponType.COMMUNICATIONS_BEAMER]: {
        "x": 3065,
        "y": 513
    },
    [WeaponType.ELECTRIC_FENCE]: {
        "x": 3064,
        "y": 630
    },
    [WeaponType.FIRE_EXTINGUSHER]: {
        "x": 3063,
        "y": 746
    },
    [WeaponType.GAS_GRENADE]: {
        "x": 3060,
        "y": 864
    },
    [WeaponType.HYPODERMIC]: {
        "x": 3059,
        "y": 977
    },
    [WeaponType.KNIFE]: {
        "x": 3057,
        "y": 1095
    },
    [WeaponType.POOL_STICK]: {
        "x": 3056,
        "y": 1212
    },
    [WeaponType.CAN_OF_ROCKET_FUEL]: {
        "x": 3055,
        "y": 1326
    },
    [WeaponType.STUN_PISTOL]: {
        "x": 3054,
        "y": 1441
    },
    [WeaponType.WELDING_TORCH]: {
        "x": 3053,
        "y": 1556
    }
}

const updateCanvas = (canvas: HTMLCanvasElement, scale: number, currentAreaId: string | undefined, stackMap: StackMap, counterMap: CounterMap,
    areaDefinitionMap: AreaDefinitionMap, weaponsEffectMap: { [key: string]: WeaponEffectEntry }, selectedCounterIds: string[], animation?: Animation) => {
    const context: CanvasRenderingContext2D | null = canvas ? canvas.getContext('2d') : null;
    if (context == null) {
        console.log("context undefined");
        return;
    }

    const imageData = ImageData["map"];
    if (imageData == null) {
        console.log("imageData undefined");
        return;
    }

    const board = imageData.image;
    if (board == null) {
        console.log("image undefined");
        return;
    }

    const boardWidth = board.naturalWidth * scale;
    const boardHeight = board.naturalHeight * scale;

    canvas.width = boardWidth;
    canvas.height = boardHeight;

    console.log('drawing board');
    context.drawImage(board, 0, 0, boardWidth, boardHeight);

    if (currentAreaId) {
        const areaDefinition = areaDefinitionMap[currentAreaId];
        renderCurrentArea(context, areaDefinition, scale);
    }

    if (stackMap && counterMap && stackMap) {
        const areaIds = Object.keys(stackMap);
        areaIds.forEach((areaId: string) => {
            const area = stackMap[areaId];

            let stack = stackMap[area.id];
            if (stack !== undefined) {
                renderStack(context, scale, counterMap, stack, selectedCounterIds, animation)
            }
        });
    }



    renderWeaponsDisplayTable(context, weaponsDisplayTable, weaponsEffectMap, scale);
}

const renderCurrentArea = (context: any, areaDefinition: AreaDefinition, scale: number) => {
    //areaDefinition.polygon.forEach(point => {
    //context.fillStyle = 'rgba(255, 0, 0, 0.5)';
    //  context.fillRect(point.x * scale, point.y * scale, 10 * scale, 10 * scale);
    //});
    const polygon = areaDefinition.polygon;

    context.beginPath();
    context.moveTo(polygon[0].x * scale, polygon[0].y * scale);

    for (const point of polygon.slice(1)) {
        context.lineTo(point.x * scale, point.y * scale);
    }

    context.closePath();

    // Transparent shading
    context.fillStyle = "rgba(30, 144, 255, 0.35)";
    context.fill();

    // Optional outline
    context.strokeStyle = "yellow";
    context.setLineDash([5, 5]);
    context.lineWidth = 3;
    context.stroke();

}

const renderWeaponsDisplayTable = (context: any, weaponsDisplayTable: { [key: string]: Coord }, weaponsEffectMap: { [key: string]: WeaponEffectEntry }, scale: number) => {
    const keys = Object.keys(weaponsEffectMap);
    keys.forEach(key => {
        const entry = weaponsEffectMap[key];
        if (entry.discovered) {
            const coord = weaponsDisplayTable[key];
            if (coord) {
                renderWeaponsDisplayEntry(context, coord, entry.effect, scale);
            } else {
                console.log('no coord for effect', entry.effect);
            }
        }
    });
}

const renderWeaponsDisplayEntry = (context: any, coord: Coord, effect: WeaponEffect, scale: number) => {
    const image = ImageData[effect]?.image;
    if (image) {
        const counterWidth = image.naturalWidth * scale * 1.1;
        const counterHeight = image.naturalHeight * scale * 1.1;
        const x = coord!.x * scale - (counterWidth / 2);
        const y = coord!.y * scale - (counterHeight / 2);
        //console.log('drawing weapon effect', effect, x, y, counterWidth, counterHeight);
        context.drawImage(image, x, y, counterWidth, counterHeight);
    } else {
        console.log('no image for effect', effect);
    }
}

// const drawPolygon = (context: any, polygon: Polygon, scale: number) => {
//     if (polygon === undefined || polygon.length < 3) {
//         return;
//     }
//     context.strokeStyle = `rgb(255, 0, 0)`;
//     context.lineWidth = 4;
//     context.beginPath();
//     context.moveTo(polygon[0].x * scale, polygon[0].y * scale);

//     for (let i = 1; i < polygon.length; ++i) {
//         context.lineTo(polygon[i].x * scale, polygon[i].y * scale);
//     }

//     context.lineTo(polygon[0].x * scale, polygon[0].y * scale);
//     context.stroke();
//     context.closePath();
// }

const renderCounter = (context: any, scale: number, counter: Counter, coord: Coord, index: number, isSelected: boolean) => {
    const imageData = ImageData[counter.imageName];
    if (imageData === undefined) {
        console.log('image data not found for counter ' + counter.imageName);
        return;
    }

    let counterImage = ImageData[counter.imageName].image;
    if (counterImage && index < 10) {
        const counterWidth = counterImage.naturalWidth * scale * 0.9;
        const counterHeight = counterImage.naturalHeight * scale * 0.9;
        const x = coord!.x * scale - (counterWidth / 2);
        const y = coord!.y * scale - (counterHeight / 2);
        context.drawImage(counterImage, x - (index * 3), y - (index * 3), counterWidth, counterHeight);
        if (isSelected) {
            context.strokeStyle = `rgb(255, 0, 0)`;
            context.beginPath();
            context.rect(x - (index * 3), y - (index * 3), counterWidth + 1, counterHeight + 1);
            context.stroke();
            context.closePath();
        }
    }
}

const renderStack = (context: any, scale: number, counters: CounterMap, stack: Stack, selectedCounterIds: string[], animation?: Animation) => {
    if (stack === undefined || stack.counterIds.length === 0) {
        return;
    }

    const counterIds = sortCounterIdsBySelected(stack.counterIds, selectedCounterIds).reverse();

    counterIds.forEach((counterId: string, index: number) => {
        const counter = counters[counterId];
        if (animation && animation.counterId === counterId) {
            // skip rendering this counter since it's being animated
            return;
        }

        renderCounter(context, scale, counter, counter.coord!, index, selectedCounterIds && selectedCounterIds.includes(counterId));
    });
}

const getArea = (areaDefinitionMap: AreaDefinitionMap | undefined, coord: Coord): AreaDefinition | undefined => {
    if (areaDefinitionMap !== undefined) {
        const keys = Object.keys(areaDefinitionMap);
        for (let i = 0; i < keys.length; ++i) {
            const areaDefinition = areaDefinitionMap[keys[i]];
            if (pointInPolygon(areaDefinition.polygon, coord)) {
                return areaDefinition;
            }
        }
    }

    return undefined;
}

type AnimState = {
    from: Coord
    to: Coord
    counterId: string
    startTime: number
    duration: number
}

const animateCounter = (canvas: HTMLCanvasElement, scale: number, aninmationRef: React.RefObject<{ [key: string]: AnimState }>, runningRef: React.RefObject<boolean>, counterMap: CounterMap, signalAnimationComplete: () => void) => {
    const context = canvas.getContext('2d');
    if (context && aninmationRef.current && runningRef.current) {
        const imageData = ImageData["map"];
        if (imageData == null) {
            console.log("imageData undefined");
            return;
        }

        const board = imageData.image;
        if (board == null) {
            console.log("image undefined");
            return;
        }

        const boardWidth = board.naturalWidth * scale;
        const boardHeight = board.naturalHeight * scale;

        canvas.width = boardWidth;
        canvas.height = boardHeight;
        context.clearRect(0, 0, canvas.width, canvas.height);

        let stillAnimating = false
        const animStates = Object.values(aninmationRef.current);
        animStates.forEach(animState => {
            const counter = counterMap[animState.counterId];
            if (counter) {
                const t = Math.min((performance.now() - animState.startTime) / animState.duration, 1);

                const ease = t * t * (3 - 2 * t);

                const x = animState.from.x + (animState.to.x - animState.from.x) * ease;
                const y = animState.from.y + (animState.to.y - animState.from.y) * ease;

                if (t === 1) {
                    delete aninmationRef.current[animState.counterId];
                    stillAnimating = Object.keys(aninmationRef.current).length > 0;
                } else {
                    stillAnimating = true;
                }

                console.log(`drawCounter(context, counter, ${x}, ${y}) stillAnimating: ${stillAnimating}`);
                renderCounter(context, scale, counter, { x, y }, 0, true);
            }
        });

        if (stillAnimating) {
            requestAnimationFrame(() => animateCounter(canvas, scale, aninmationRef, runningRef, counterMap, signalAnimationComplete));
        } else {
            context.clearRect(0, 0, canvas.width, canvas.height);
            signalAnimationComplete();
            runningRef.current = false;
        }
    }
}

const Map = () => {
    const dispatch = useAppDispatch();

    const animationsRef = useRef<{ [key: string]: AnimState }>({});
    const runningRef = useRef(false);
    let clickTimer: NodeJS.Timeout | undefined = undefined;

    const selectedCounterIds = useAppSelector(state => state.selectedCounterIds);
    const currentAreaId = useAppSelector(state => state.currentAreaId);
    const stackMap = useAppSelector(state => state.stackMap);
    const counterMap = useAppSelector(state => state.counterMap);
    const phase = useAppSelector(state => state.phase);
    const mapScale = useAppSelector(state => state.mapScale);
    const areaDefinitionMap = ScenarioData.board.areaDefinitionMap;
    const gameId = useAppSelector(state => state.id);
    const replay = useAppSelector(state => state.replay);
    const animation = useAppSelector(state => state.replay?.activeState?.animation);
    const weaponEffectMap = useAppSelector(state => state.weaponEffectMap);

    let player: Player | undefined = undefined;

    const mainCanvasRef = useRef<HTMLCanvasElement>(null);
    const animationCanvasRef = useRef<HTMLCanvasElement>(null);
    //let clickTimer: NodeJS.Timeout | undefined = undefined;
    //buildWeaponDisplay();

    React.useEffect(() => {
        console.log('animation', animation);
        if (animation !== undefined && animationCanvasRef.current) {
            animationsRef.current[animation.counterId] = {
                from: animation.fromCoord,
                to: animation.toCoord,
                counterId: animation.counterId,
                startTime: performance.now(),
                duration: 300
            };
            const canvas: HTMLCanvasElement = animationCanvasRef.current;
            startLoop(canvas)
        }
    }, [animation, animationCanvasRef]);

    React.useEffect(() => {
        console.log('map useEffect');
        if (mainCanvasRef.current) {
            const canvas: HTMLCanvasElement = mainCanvasRef.current;
            if (replay && replay.show && replay.activeState) {
                updateCanvas(canvas, mapScale, currentAreaId, replay.activeState.stackMap, replay.activeState.counterMap, areaDefinitionMap, weaponEffectMap, selectedCounterIds, replay.activeState.animation);
                return;
            } else {
                console.log('map useEffect - normal');
                updateCanvas(canvas, mapScale, currentAreaId, stackMap, counterMap, areaDefinitionMap, weaponEffectMap, selectedCounterIds);
            }
        }
    }, [mainCanvasRef, counterMap, currentAreaId, mapScale, stackMap, areaDefinitionMap, selectedCounterIds, replay, weaponEffectMap]);


    const signalAnimationComplete = () => {
        dispatch({ type: ActionType.CLEAR_REPLAY_ANIMATION })
    }

    const startLoop = (canvas: HTMLCanvasElement) => {
        console.log('startLoop');
        if (!runningRef.current && canvas) {
            console.log('starting loop');
            runningRef.current = true
            if (replay && replay.show && replay.activeState && animationsRef.current) {
                console.log('animating counter');
                requestAnimationFrame(() => animateCounter(canvas, mapScale, animationsRef, runningRef, replay.activeState!.counterMap, signalAnimationComplete));
            }
        }
    }

    const handleLeftClick = (event: React.MouseEvent, scale: number) => {
        const posX = event.nativeEvent.offsetX;
        const posY = event.nativeEvent.offsetY;

        const area = getArea(areaDefinitionMap, { x: posX / scale, y: posY / scale });
        console.log(`clicked on location: ${area ? area.id : 'not found'}`);

        if (area === undefined) {
            return;
        }

        if (clickTimer === undefined) {
            clickTimer = setInterval(() => {
                clearInterval(clickTimer);
                clickTimer = undefined;
                dispatch({ type: ActionType.SELECT_AREA, payload: { areaId: area.id, clearSelectedCounterIds: true, selectMode: SelectLocationMode.SINGLE } });
            }, 300);
        } else {
            clearInterval(clickTimer);
            clickTimer = undefined;
            dispatch({ type: ActionType.SELECT_AREA, payload: { areaId: area.id, clearSelectedCounterIds: true, selectMode: SelectLocationMode.DOUBLE } });
        }




        // if (area !== undefined) {
        //     dispatch({ type: ActionType.SELECT_AREA, payload: { areaId: area.id, clearSelectedCounterIds: true } });
        // }
    }

    const handleRightClick = (event: React.MouseEvent, scale: number) => {
        event.preventDefault();

        const posX = event.nativeEvent.offsetX;
        const posY = event.nativeEvent.offsetY;

        const newArea = getArea(areaDefinitionMap, { x: posX / scale, y: posY / scale });

        if (phase !== Phase.CREW_MOVE && phase !== Phase.CREW_ATTACK) {
            dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: 'It is not the movement or attack phase' });
            return;
        }

        if (phase === Phase.CREW_ATTACK) {
            const action: ActionSelectTargetArea = {
                type: ActionType.SELECT_TARGET_AREA,
                payload: {
                    areaId: newArea!.id
                }
            };
            dispatch(action);
            return;
        } else {
            const validationError = validateMove(selectedCounterIds, currentAreaId, newArea?.id, areaDefinitionMap, counterMap, stackMap);
            if (validationError) {
                dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: validationError });
                return;
            }

            const fromCoords = selectedCounterIds.map(counterId => {
                const counter = counterMap[counterId];
                return counter.coord!
            });

            const firstCounter = counterMap[selectedCounterIds[0]];
            const engaged = (currentAreaId !== newArea!.id) ? checkEngagement(stackMap[newArea!.id], firstCounter.type, counterMap) : false;
            const movementCost = getMovementCost(currentAreaId!, newArea!.id);
            const action: ActionMoveToCoord = {
                type: ActionType.MOVE_TO_COORD,
                payload: {
                    counterIds: [...selectedCounterIds],
                    fromAreaId: currentAreaId!,
                    fromCoords: fromCoords,
                    toAreaId: newArea!.id,
                    toCoord: { x: posX / scale, y: posY / scale },
                    movementCost,
                    engaged: engaged
                }
            };
            return;
        } else {
            const validationError = validateMove(selectedCounterIds, currentAreaId, newArea?.id, areaDefinitionMap, counterMap, stackMap);
            if (validationError) {
                dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: validationError });
                return;
            }

            const fromCoords = selectedCounterIds.map(counterId => {
                const counter = counterMap[counterId];
                return counter.coord!
            });

            const firstCounter = counterMap[selectedCounterIds[0]];
            const engaged = (currentAreaId !== newArea!.id) ? checkEngagement(stackMap[newArea!.id], firstCounter.type, counterMap) : false;
            const movementCost = getMovementCost(currentAreaId!, newArea!.id);
            const moveToAction: ActionMoveToCoord = {
                type: ActionType.MOVE_TO_COORD,
                payload: {
                    counterIds: [...selectedCounterIds],
                    fromAreaId: currentAreaId!,
                    fromCoords: fromCoords,
                    toAreaId: newArea!.id,
                    toCoord: { x: posX / scale, y: posY / scale },
                    movementCost,
                    engaged: engaged
                }
            };
            console.log(JSON.stringify(moveToAction));
            putData(`api/games/${gameId}/action`, { socketId, action: moveToAction }).then((resp) => {
                dispatch({ type: ActionType.SELECT_AREA, payload: { areaId: newArea?.id, clearSelectedCounterIds: false } });
                dispatch(moveToAction);
                // const addActionAction: ActionAddAction = { type: ActionType.ADD_ACTION, payload: { counterIds: selectedCounterIds, actionToAdd: moveToAction } };
                // dispatch(addActionAction);
            }).catch((resp) => {
                dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: resp.message });
            });
        }
    }

    return (
        <div className="map">
            <canvas ref={mainCanvasRef} className="map-canvas" onClick={(event) => handleLeftClick(event, mapScale)} onContextMenu={(event) => handleRightClick(event, mapScale)}></canvas>
            <canvas ref={animationCanvasRef} className="map-canvas animation" onClick={(event) => handleLeftClick(event, mapScale)} onContextMenu={(event) => handleRightClick(event, mapScale)}></canvas>
        </div>
    );
}

export default Map;