import './map.css';
import React from 'react'
import { SET_STATUS_MESSAGE, SELECT_LOCATION, MOVE_TO_LOCATION } from '../../../../constants/action-constants';
import { useAppDispatch, useAppSelector } from '../../../../constants/store';
import { ImageData, ScenarioData } from '../../../../constants/game-constants';
import { Coord, CounterMap, LocationMap, Player, Polygon, Stack, StackMap, Location, Aperture } from '../../../../shared/types/game-types';
import { CREW_STACK_ID_SUFFIX, MONSTER_STACK_ID_SUFFIX, WEAPON_STACK_ID_SUFFIX } from '../../../../shared/constants/game-constants';
import { pointInPolygon } from '../../utils/map-utils';
import state from 'pusher-js/types/src/core/http/state';
import { validateMove } from './utils';

const updateCanvas = (canvas: HTMLCanvasElement, scale: number, currentLocationId: string | undefined, stackMap: StackMap, counterMap: CounterMap, 
    locationMap: LocationMap, selectedCounterIds: string[]) => {
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

    // console.log('stackMap', stackMap);
    // console.log('counterMap', counterMap);
    // console.log('locationMap', locationMap);

    if (stackMap && counterMap && locationMap) {
        const locationIds = Object.keys(locationMap);
        locationIds.forEach((locationId: string) => {
            const location = locationMap[locationId];

            //if (locationId === currentLocationId) {
            //    drawPolygon(context, location.crewStackPolygon, scale);
            //    drawPolygon(context, location.monsterStackPolygon, scale);
                // if (location.weaponStackPolygons) {
                //     location.weaponStackPolygons.forEach((polygon: Polygon) => {
                //         drawPolygon(context, polygon, scale);
                //     })
                // }
            //}

            let stack = stackMap[location.id + CREW_STACK_ID_SUFFIX];
            if (stack !== undefined) {
                renderStack(context, scale, location.crewStackPolygon, counterMap, stack, selectedCounterIds)
            }

            stack = stackMap[location.id + MONSTER_STACK_ID_SUFFIX];
            if (stack !== undefined) {
                renderStack(context, scale, location.monsterStackPolygon, counterMap, stack, selectedCounterIds)
            }

            for (let i = 0; i < location.weaponStacks.length; ++i) {
                const weaponStack = location.weaponStacks[i];
                stack = stackMap[location.id + WEAPON_STACK_ID_SUFFIX + `-${weaponStack.id}`];
                if (stack !== undefined) {
                    renderStack(context, scale, weaponStack.polygon, counterMap, stack, selectedCounterIds)
                }
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

const renderStack = (context: any, scale: number, polygon: Polygon, counters: CounterMap, stack: Stack, selectedCounterIds: string[]) => {
    if (polygon === undefined || polygon.length === 0 || stack === undefined || stack.counterIds.length === 0) {
        return;
    }

    stack.counterIds.forEach((counterId: string, index: number) => {
        const counter = counters[counterId];

        const x = polygon[0].x * scale;
        const y = polygon[0].y * scale;

        const imageData = ImageData[counter.imageName];
        if (imageData === undefined) {
            console.log('image data not found for counter ' + counter.imageName);
            return;
        }

        let counterImage = ImageData[counter.imageName].image;
        if (counterImage && index < 10) {
            const counterWidth = counterImage.naturalWidth * scale * 0.9;
            const counterHeight = counterImage.naturalHeight * scale * 0.9;
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

// const renderThreatData = (context: CanvasRenderingContext2D, starMap: StarMap, threatData: ThreatGraph) => {
//     if (threatData === undefined) {
//         return;
//     }

//     const stars = Object.values(starMap);
//     stars.forEach(star => {
//         const starNode = threatData[star.name];
//         drawStarThreat(context, star, starNode);
//     });
// }

// const renderExploration = (context: CanvasRenderingContext2D, starMap: StarMap) => {
//     const stars = Object.values(starMap);
//     stars.forEach(star => {
//         if (star.planets && star.planets.length > 0) {
//             drawStarExploration(context, star);
//         } 
//     });
// } 

// const renderUnexploredStars = (context: CanvasRenderingContext2D, starMap: StarMap) => {
//     const stars = Object.values(starMap);
//     stars.forEach(star => {
//         if (star.planets === undefined) {
//             const point = hexToPoint(star.coord.x, star.coord.y);
//             drawUnexploredStar(context, point);
//         }
//     });
// }

// const renderTaskForces = (context: CanvasRenderingContext2D, taskForces: TaskForce[], teams: Team[], selectedTaskForceIds: string[] | undefined) => {
//     taskForces.forEach(taskForce => {
//         if (!taskForce.deleted) {
//             const point = hexToPoint(taskForce.coord.x, taskForce.coord.y);

//             const inStarHex = findStar(MapData.starMap, taskForce.coord) !== undefined;

//             const player = getPlayer(teams, taskForce.playerId);
//             if (player === undefined) {
//                 return;
//             }

//             drawTaskForce(context, point.x, point.y, taskForce.id, player.color, inStarHex);
//         }
//     });

//     if (selectedTaskForceIds) {
//         selectedTaskForceIds.forEach(id => {
//             const taskForce = taskForces.find(taskForce => taskForce.id === id);
//             if (taskForce && taskForce.destinationCoord && taskForce.path) {
//                 const path = taskForce.path;
//                 path.elements.forEach(element => {
//                     drawPathHex(context, element);
//                 })
//             }
//         });
//     }
// }

// const getHex = (event: React.MouseEvent): Coord | undefined => {
//     const posX = event.nativeEvent.offsetX;
//     const posY = event.nativeEvent.offsetY;
//     const coord = pointToHex(posX, posY);
//     return coord;
// }

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


const Map = () => {
    const dispatch = useAppDispatch();

    // const selectedTaskForceIds = useAppSelector(state => state.selectedTaskForceIds);
    const selectedCounterIds = useAppSelector(state => state.selectedCounterIds);
    const currentLocationId = useAppSelector(state => state.currentLocationId);
    const stackMap = useAppSelector(state => state.stackMap);
    const counterMap = useAppSelector(state => state.counterMap);
    // const taskForceMap = useAppSelector(state => state.taskForceMap);
    // const colonyMap = useAppSelector(state => state.colonyMap);
    // const teams = useAppSelector(state => state.teams);
    const turn = useAppSelector(state => state.turn);
    const mapScale = useAppSelector(state => state.mapScale);
    // const showExploration = useAppSelector(state => state.showExploration);
    // const isProductionYear = useAppSelector(state => state.isProductionYear);
    // const currentPlayerId = useAppSelector(state => state.currentPlayerId);
    // const threatData = useAppSelector(state => state.threatData);
    const locationMap = ScenarioData.board.locationMap;

    let player: Player | undefined = undefined;
    // if (teams && currentPlayerId) {
    //     player = getPlayer(teams, currentPlayerId);
    // }

    const canvasRef = React.createRef<HTMLCanvasElement>();
    //let clickTimer: NodeJS.Timeout | undefined = undefined;

    // const taskForces = taskForceMap ? Object.values(taskForceMap) : [];
    // const colonies = colonyMap ? Object.values(colonyMap) : [];

    React.useEffect(() => {
        if (canvasRef.current) {
            const canvas: HTMLCanvasElement = canvasRef.current;
            updateCanvas(canvas, mapScale, currentLocationId, stackMap, counterMap, locationMap, selectedCounterIds);
        }
    }, [canvasRef, currentLocationId, mapScale, stackMap, locationMap, selectedCounterIds]);

    const handleLeftClick = (event: React.MouseEvent, scale: number) => {
        const posX = event.nativeEvent.offsetX;
        const posY = event.nativeEvent.offsetY;

        const location = getLocation(locationMap, { x: posX / scale, y: posY / scale });
        console.log(`clicked on location: ${location ? location.id : 'not found'}`);

        if (location !== undefined) {
            dispatch({ type: SELECT_LOCATION, payload: location.id });
        }
    }

    const handleRightClick = (event: React.MouseEvent, scale: number) => {
        event.preventDefault();

        const posX = event.nativeEvent.offsetX;
        const posY = event.nativeEvent.offsetY;

        const newLocation = getLocation(locationMap, { x: posX / scale, y: posY / scale });

        const validationError = validateMove(selectedCounterIds, currentLocationId, newLocation?.id, locationMap, counterMap, stackMap);
        if (validationError) {
            dispatch({type: SET_STATUS_MESSAGE, payload: validationError});
            return;
        }

        dispatch({ type: MOVE_TO_LOCATION, payload: newLocation?.id });
    }

    return (
        <div className="map">
            <canvas ref={canvasRef} className="map-canvas" onClick={(event) => handleLeftClick(event, mapScale)} onContextMenu={(event) => handleRightClick(event, mapScale)}></canvas>
        </div>
    );
}

export default Map;