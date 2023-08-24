import { useState } from 'react';
import { Coord, LocationMap, Polygon } from '../../types/game-types';
import './map-config.css';
import { useAppDispatch, useAppSelector } from '../../constants/hooks';
import { RootState } from '../../constants/store';
import { UPDATE_LOCATION } from '../../constants/action-constants';

interface PropTypes {
    callback: any
}

const createBox = (point: Coord): Polygon => {
    const boxSideLength = 101 * 0.9;

    const polygon = [];
    polygon.push(point);
    polygon.push({ x: point.x, y: point.y + boxSideLength });
    polygon.push({ x: point.x + boxSideLength, y: point.y + boxSideLength });
    polygon.push({ x: point.x + boxSideLength, y: point.y });

    return polygon;
}

export const MapConfig = (props: PropTypes) => {
    const dispatch = useAppDispatch();

    const [currentLocationId, setCurrentLocationId] = useState<string>('');
    const [points, setPoints] = useState<Coord[]>([]);

    const scale = useAppSelector((state: RootState) => state.scale);
    const locationMap = useAppSelector((state: RootState) => state.locationMap);



    const renderLocations = (locationMap: LocationMap) => {
        const keys = Object.keys(locationMap);
        console.log(`location count: ${keys.length}`);
        return (
            <select name="location" size={20} onChange={(event) => { setCurrentLocationId(event.target.value) }}>
                {keys.map((locationId: string, index: number) => {
                    const location = locationMap[locationId];
                    return (
                        <option value={location.id} key={index}>({location.id}) {location.name}</option>
                    )
                })}
            </select>
        );
    }

    const renderEditPanel = (locationMap: LocationMap, locationId: string) => {
        if (currentLocationId !== '') {
            return (
                <div className="map-config-edit-panel">
                    <hr />
                    id: {locationId}<br />
                    name: {locationMap[locationId].name} <br /><br />
                    <button onClick={() => handleStartPolygon()}>start polygon</button><br />
                    <button onClick={() => handleEndPolygon()}>end polygon</button><br /><br />
                    <button onClick={() => handleCrewBox()}>set crew box</button><br />
                    <button onClick={() => handleMonsterBox()}>set monster box</button><br />
                    <button onClick={() => handleWeaponBox(0)}>set weapon 0</button><br />
                    <button onClick={() => handleWeaponBox(1)}>set weapon 1</button><br /><br />
                    <button onClick={() => handleDump()}>dump</button>
                </div>
            );
        } else {
            return (<div></div>);
        }
    }

    const handleCrewBox = () => {
        if (points.length > 0) {
            const polygon = createBox(points[0]);
            const location = { ...locationMap![currentLocationId] };
            location.crewStackPolygon = polygon;
            dispatch({ type: UPDATE_LOCATION, payload: location });
        } else {
            const location = { ...locationMap![currentLocationId] };
            location.crewStackPolygon = [];
            dispatch({ type: UPDATE_LOCATION, payload: location });
        }

        setPoints([]);
    }

    const handleMonsterBox = () => {
        if (points.length > 0) {
            const polygon = createBox(points[0]);
            const location = { ...locationMap![currentLocationId] };
            location.monsterStackPolygon = polygon;
            dispatch({ type: UPDATE_LOCATION, payload: location });
        } else {
            const location = { ...locationMap![currentLocationId] };
            location.monsterStackPolygon = [];
            dispatch({ type: UPDATE_LOCATION, payload: location });
        }

        setPoints([]);
    }

    const handleWeaponBox = (id: number) => {
        if (points.length > 0) {
            const polygon = createBox(points[0]);
            const location = { ...locationMap![currentLocationId] };
            location.weaponStackPolygons = location.weaponStackPolygons ? [...location.weaponStackPolygons] : [];
            location.weaponStackPolygons[id] = polygon;
            dispatch({ type: UPDATE_LOCATION, payload: location });
        } else {
            const location = { ...locationMap![currentLocationId] };
            location.weaponStackPolygons = location.weaponStackPolygons ? [...location.weaponStackPolygons] : [];
            location.weaponStackPolygons[id] = [];
            dispatch({ type: UPDATE_LOCATION, payload: location });
        }

        setPoints([]);
    }

    const handleDump = () => {
        console.log(JSON.stringify(locationMap));
    }

    const handleStartPolygon = () => {
        setPoints([]);
    }

    const handleEndPolygon = () => {
        if (currentLocationId !== undefined) {
            const location = { ...locationMap![currentLocationId] };
            location.polygon = points;
            dispatch({ type: UPDATE_LOCATION, payload: location });
            setPoints([]);
        }
    }

    const handleClick = (coord: Coord) => {
        console.log(`received click (${coord.x},${coord.y})`);
        const newPoints = [...points, coord];
        setPoints(newPoints);
        console.log(JSON.stringify(newPoints));
    }

    if (props.callback !== undefined) {
        props.callback.addListener(handleClick);
    }

    if (locationMap) {
        return (
            <div className="map-config">
                Scale: {scale}<br />
                Locations<br />
                {renderLocations(locationMap)}
                {renderEditPanel(locationMap, currentLocationId)}
            </div>
        );
    } else {
        return (<div>No locations</div>);
    }
}