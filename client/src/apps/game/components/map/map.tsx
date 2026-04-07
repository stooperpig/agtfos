import './map.css';
import React from 'react'
import { useAppDispatch, useAppSelector } from '../../../../constants/store';
import { ImageData, ScenarioData } from '../../../../constants/game-constants';
import { Coord, CounterMap, Player, Polygon, Stack, StackMap, AreaDefinition, Aperture, AreaDefinitionMap, Phase } from '../../../../shared/types/game-types';
import { getMovementCost, pointInPolygon } from '../../utils/map-utils';
import { sortCounterIdsBySelected, validateMove } from './utils';
import { sendMessage, socketId } from '../../../../api/web-socket';
import { putData } from '../../../../api/api-utils';
import { ActionAddAction, ActionMoveToCoord, ActionType } from '../../../../shared/types/action-types';

const updateCanvas = (canvas: HTMLCanvasElement, scale: number, currentAreaId: string | undefined, stackMap: StackMap, counterMap: CounterMap,
    areaDefinitionMap: AreaDefinitionMap, selectedCounterIds: string[]) => {
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
                renderStack(context, scale, counterMap, stack, selectedCounterIds)
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

const renderStack = (context: any, scale: number, counters: CounterMap, stack: Stack, selectedCounterIds: string[]) => {
    if (stack === undefined || stack.counterIds.length === 0) {
        return;
    }

    const counterIds = sortCounterIdsBySelected(stack.counterIds, selectedCounterIds).reverse();

    counterIds.forEach((counterId: string, index: number) => {
        const counter = counters[counterId];

        const imageData = ImageData[counter.imageName];
        if (imageData === undefined) {
            console.log('image data not found for counter ' + counter.imageName);
            return;
        }

        let counterImage = ImageData[counter.imageName].image;
        if (counterImage && index < 10) {
            const counterWidth = counterImage.naturalWidth * scale * 0.9;
            const counterHeight = counterImage.naturalHeight * scale * 0.9;
            const x = counter.coord!.x * scale - (counterWidth / 2);
            const y = counter.coord!.y * scale - (counterHeight / 2);
            context.drawImage(counterImage, x - (index * 3), y - (index * 3), counterWidth, counterHeight);
            if (selectedCounterIds && selectedCounterIds.includes(counterId)) {
                context.strokeStyle = `rgb(255, 0, 0)`;
                context.beginPath();
                context.rect(x - (index * 3), y - (index * 3), counterWidth + 1, counterHeight + 1);
                context.stroke();
                context.closePath();
            }
        }
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


const Map = () => {
    const dispatch = useAppDispatch();

    const selectedCounterIds = useAppSelector(state => state.selectedCounterIds);
    const currentAreaId = useAppSelector(state => state.currentAreaId);
    const stackMap = useAppSelector(state => state.stackMap);
    const counterMap = useAppSelector(state => state.counterMap);
    const phase = useAppSelector(state => state.phase);
    const mapScale = useAppSelector(state => state.mapScale);
    const areaDefinitionMap = ScenarioData.board.areaDefinitionMap;
    const gameId = useAppSelector(state => state.id);
    const replay = useAppSelector(state => state.replay);

    let player: Player | undefined = undefined;

    const canvasRef = React.createRef<HTMLCanvasElement>();
    //let clickTimer: NodeJS.Timeout | undefined = undefined;

    React.useEffect(() => {
        if (canvasRef.current) {
            const canvas: HTMLCanvasElement = canvasRef.current;
            if (replay && replay.show && replay.activeState) {
                updateCanvas(canvas, mapScale, currentAreaId, replay.activeState.stackMap, replay.activeState.counterMap, areaDefinitionMap, selectedCounterIds);
                return;
            } else {
                updateCanvas(canvas, mapScale, currentAreaId, stackMap, counterMap, areaDefinitionMap, selectedCounterIds);
            }
        }
    }, [canvasRef, currentAreaId, mapScale, stackMap, areaDefinitionMap, selectedCounterIds, replay]);

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

        const movementCost   = getMovementCost(currentAreaId!, newArea!.id);
        const moveToAction: ActionMoveToCoord = { type: ActionType.MOVE_TO_COORD, payload: { counterIds: [...selectedCounterIds], fromAreaId: currentAreaId!, fromCoords: fromCoords, toAreaId: newArea!.id, toCoord: { x: posX / scale, y: posY / scale }, movementCost } };
        console.log(JSON.stringify(moveToAction));
        putData(`api/games/${gameId}/action`, { socketId, action: moveToAction }).then((resp) => {
            dispatch({ type: ActionType.SELECT_AREA, payload: { areaId: newArea?.id, clearSelectedCounterIds: false } });
            dispatch(moveToAction);
            const addActionAction: ActionAddAction = { type: ActionType.ADD_ACTION, payload: { counterIds: selectedCounterIds, actionToAdd: moveToAction } };
            dispatch(addActionAction);
        }).catch((resp) => {
            dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: resp.message });
        });
    }

    return (
        <div className="map">
            <canvas ref={canvasRef} className="map-canvas" onClick={(event) => handleLeftClick(event, mapScale)} onContextMenu={(event) => handleRightClick(event, mapScale)}></canvas>
        </div>
    );
}

export default Map;