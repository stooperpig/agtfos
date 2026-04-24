import './map.css';
import React, { createRef, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '../../../../constants/store';
import { ImageData, ScenarioData } from '../../../../constants/game-constants';
import { Coord, CounterMap, Player, Polygon, Stack, StackMap, AreaDefinition, Aperture, AreaDefinitionMap, Phase, Counter, Animation } from '../../../../shared/types/game-types';
import { getMovementCost, pointInPolygon } from '../../utils/map-utils';
import { sortCounterIdsBySelected, validateMove } from './utils';
import { sendMessage, socketId } from '../../../../api/web-socket';
import { putData } from '../../../../api/api-utils';
import { ActionMoveToCoord, ActionType } from '../../../../shared/types/action-types';
import { checkEngagement } from '../../../../shared/utils/movement-utils';

const updateCanvas = (canvas: HTMLCanvasElement, scale: number, currentAreaId: string | undefined, stackMap: StackMap, counterMap: CounterMap,
    areaDefinitionMap: AreaDefinitionMap, selectedCounterIds: string[], animation?: Animation) => {
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
}

const drawPolygon = (context: any, polygon: Polygon, scale: number) => {
    if (polygon === undefined || polygon.length < 3) {
        return;
    }
    context.strokeStyle = `rgb(255, 0, 0)`;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(polygon[0].x * scale, polygon[0].y * scale);

    for (let i = 1; i < polygon.length; ++i) {
        context.lineTo(polygon[i].x * scale, polygon[i].y * scale);
    }

    context.lineTo(polygon[0].x * scale, polygon[0].y * scale);
    context.stroke();
    context.closePath();
}

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
            // TODO: render animation
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

const animateCounter = (canvas: HTMLCanvasElement, scale: number, aninmationRef: React.RefObject<{ [key: string]: AnimState }>, runningRef: React.RefObject<boolean>, counterMap: CounterMap) => {
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
            requestAnimationFrame(() => animateCounter(canvas, scale, aninmationRef, runningRef, counterMap));
        } else {
            runningRef.current = false;
        }
    }
}

const Map = () => {
    const dispatch = useAppDispatch();

    const animationsRef = useRef<{ [key: string]: AnimState }>({});
    const runningRef = useRef(false);

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

    let player: Player | undefined = undefined;

    const mainCanvasRef = useRef<HTMLCanvasElement>(null);
    const animationCanvasRef = useRef<HTMLCanvasElement>(null);
    //let clickTimer: NodeJS.Timeout | undefined = undefined;

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
                updateCanvas(canvas, mapScale, currentAreaId, replay.activeState.stackMap, replay.activeState.counterMap, areaDefinitionMap, selectedCounterIds, replay.activeState.animation);
                return;
            } else {        
                console.log('map useEffect - normal');
                updateCanvas(canvas, mapScale, currentAreaId, stackMap, counterMap, areaDefinitionMap, selectedCounterIds);
            }
        }
    }, [mainCanvasRef, counterMap, currentAreaId, mapScale, stackMap, areaDefinitionMap, selectedCounterIds, replay]);

    function startLoop(canvas: HTMLCanvasElement) {
        console.log('startLoop');
        if (!runningRef.current && canvas) {
            console.log('starting loop');
            runningRef.current = true
            //const canvas: HTMLCanvasElement = canvasRef.current;
            if (replay && replay.show && replay.activeState && animationsRef.current) {
                console.log('animating counter');
                requestAnimationFrame(() => animateCounter(canvas, mapScale, animationsRef, runningRef, replay.activeState!.counterMap));
            }
        }
    }

    const handleLeftClick = (event: React.MouseEvent, scale: number) => {
        const posX = event.nativeEvent.offsetX;
        const posY = event.nativeEvent.offsetY;

        const area = getArea(areaDefinitionMap, { x: posX / scale, y: posY / scale });
        console.log(`clicked on location: ${area ? area.id : 'not found'}`);

        if (area !== undefined) {
            dispatch({ type: ActionType.SELECT_AREA, payload: { areaId: area.id, clearSelectedCounterIds: true } });
        }
    }

    const handleRightClick = (event: React.MouseEvent, scale: number) => {
        event.preventDefault();

        const posX = event.nativeEvent.offsetX;
        const posY = event.nativeEvent.offsetY;

        const newArea = getArea(areaDefinitionMap, { x: posX / scale, y: posY / scale });

        if (phase !== Phase.MOVE) {
            dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: 'It is not the movement phase' });
            return;
        }

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

    return (
        <div className="map">
            <canvas ref={mainCanvasRef} className="map-canvas" onClick={(event) => handleLeftClick(event, mapScale)} onContextMenu={(event) => handleRightClick(event, mapScale)}></canvas>
            <canvas ref={animationCanvasRef} className="map-canvas animation" onClick={(event) => handleLeftClick(event, mapScale)} onContextMenu={(event) => handleRightClick(event, mapScale)}></canvas>
        </div>
    );
}

export default Map;