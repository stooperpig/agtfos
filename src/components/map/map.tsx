import React from 'react';
import { ImageData } from '../../constants/game-constants';
import './map.css';
import { useAppDispatch, useAppSelector } from '../../constants/hooks';
import { RootState } from '../../constants/store';
import scenarioData from '../../constants/scenario-data';
import { Coord, Counter, CounterMap, LocationMap, Polygon, Stack, StackMap, Location } from '../../types/game-types';
import { pointInPolygon } from '../../utils/map-utils';
import { SET_CURRENT_LOCATION_ID } from '../../constants/action-constants';

const updateCanvas = (canvas: HTMLCanvasElement, scale: number, boardName: string, stacks: StackMap, counters: CounterMap, locationMap: LocationMap | undefined,
    currentLocationId: string | undefined) => {
    //console.log("updateCanvas");
    const context: any | null = canvas ? canvas.getContext('2d') : null;
    if (context == null) {
        console.log("context undefined");
        return;
    }

    let imageData = ImageData[boardName];
    if (imageData == null) {
        console.log("imageData undefined");
        return;
    }

    const board = imageData.image;
    if (board == null) {
        console.log("image undefined");
        return;
    }

    let counter = ImageData['1st-Officer'].image;

    const boardWidth = board.naturalWidth * scale;
    const boardHeight = board.naturalHeight * scale;
    const counterWidth = counter.naturalWidth * scale * 0.9;
    const counterHeight = counter.naturalHeight * scale * 0.9;

    canvas.width = boardWidth; //3135 * scale;
    canvas.height = boardHeight; //1751 * scale;

    console.log('drawing board');
    context.drawImage(board, 0, 0, boardWidth, boardHeight);

    context.drawImage(counter, 0, 0, counterWidth, counterHeight);

    if (locationMap !== undefined) {
        const keys = Object.keys(locationMap);
        keys.forEach((locationId: string) => {
            const location = locationMap[locationId];
            // drawPolygon(context, location.polygon, scale);

            if (locationId === currentLocationId) {
                drawPolygon(context, location.crewStackPolygon, scale);
                drawPolygon(context, location.monsterStackPolygon, scale);
                if (location.weaponStackPolygons) {
                    location.weaponStackPolygons.forEach((polygon: Polygon) => {
                        drawPolygon(context, polygon, scale);
                    })
                }
            }

            let stack = stacks[location.crewStackId];
            if (stack !== undefined) {
                renderStack(context, scale, location.crewStackPolygon, counters, stack)
            }

            stack = stacks[location.monsterStackId];
            if (stack !== undefined) {
                renderStack(context, scale, location.monsterStackPolygon, counters, stack)
            }

            for (let i = 0; i < location.weaponStackIds.length; ++i) {
                stack = stacks[location.weaponStackIds[i]];
                if (stack !== undefined) {
                    renderStack(context, scale, location.weaponStackPolygons[i], counters, stack)
                }
            }
        });
    }
}

const renderStack = (context: any, scale: number, polygon: Polygon, counters: CounterMap, stack: Stack) => {
    if (polygon === undefined || polygon.length === 0 || stack === undefined || stack.counterIds.length === 0) {
        return;
    }

    stack.counterIds.forEach((counterId: string, index: number) => {
        const counter = counters[counterId];

        const x = polygon[0].x * scale;
        const y = polygon[0].y * scale;

        //console.log(`draw counter ${counter.imageName} at (${x},${y})`);

        let counterImage = ImageData[counter.imageName].image;
        if (counterImage && index < 10) {
            const counterWidth = counterImage.naturalWidth * scale * 0.9;
            const counterHeight = counterImage.naturalHeight * scale * 0.9;
            context.drawImage(counterImage, x - (index * 3), y - (index * 3), counterWidth, counterHeight);
        }
    });
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

interface PropTypes {
    callback?: any
}

const getLocation = (locationMap: LocationMap | undefined, coord: Coord): Location | undefined => {
    if (locationMap !== undefined) {
        const keys = Object.keys(locationMap);
        for (let i = 0; i < keys.length; ++i) {
            const location = locationMap[keys[i]];
            if (pointInPolygon(location.polygon, coord)) {
                return location;
            }
        }
    }

    return undefined;
}

export const Map = (props: PropTypes) => {
    const dispatch = useAppDispatch();

    const boardImageName = scenarioData.board.imageName;
    const counters = useAppSelector((state: RootState) => state.counters);
    const stacks = useAppSelector((state: RootState) => state.stacks);
    const scale = useAppSelector((state: RootState) => state.scale);
    const currentLocationId = useAppSelector((state: RootState) => state.currentLocationId);
    const locationMap = useAppSelector((state: RootState) => state.locationMap);

    const canvasRef = React.createRef<HTMLCanvasElement>();

    React.useEffect(() => {
        //console.log("useEffect on map " + boardImageName);
        if (canvasRef.current && boardImageName !== undefined) {
            const canvas: HTMLCanvasElement = canvasRef.current;
            updateCanvas(canvas, scale, boardImageName, stacks, counters, locationMap, currentLocationId);
        }
    }, [canvasRef, scale, boardImageName, stacks, counters, locationMap, currentLocationId]);

    const handleLeftClick = (event: any) => {
        let posX = event.nativeEvent.offsetX;
        let posY = event.nativeEvent.offsetY;
        //console.log(`click (${posX},${posY})`);
        if (props.callback !== undefined) {
            props.callback.addPoint({ x: posX, y: posY });
        }

        const location = getLocation(locationMap, { x: posX / scale, y: posY / scale });
        console.log(`clicked on location: ${location ? location.id : 'not found'}`);

        if (location !== undefined) {
            dispatch({ type: SET_CURRENT_LOCATION_ID, payload: location.id });
        }
    }

    return (
        <div className="map">
            <canvas ref={canvasRef} className="field-canvas" onClick={handleLeftClick}></canvas>
        </div>
    );
}
