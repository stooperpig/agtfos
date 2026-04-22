import { CounterMap, StackMap, Scenario, AreaDefinitionMap } from "../shared/types/game-types";

export const checkLos = (fromAreaId: string, toAreaId: string): boolean => {
    // TODO: Implement line-of-sight checking logic
    return true;
};


export const spotted = (areaId: string, scenario: Scenario, stackMap: StackMap, counterMap: CounterMap): boolean => {
    // TODO: Implement spotting logic
    //and area is spotted if BOTH sides can see the area
    //iterate through all areas and check if both sides can see the area
    //start with the stacks in the current area
    //then check adjacent areas
    //then check los areas (range > 1)
    return true;
};

export const getPath = (fromAreaId: string, toAreaId: string): string[] => {
    // TODO: Implement pathfinding logic
    return [];
};

export const getAdjacentAreas = (areaId: string, areaDefinitionMap: AreaDefinitionMap): string[] => {
    const area = areaDefinitionMap[areaId];
    return area.apertures.map(aperture => aperture.areaId);
};

export const getLosAreas = (areaId: string, areaDefinitionMap: AreaDefinitionMap): string[] => {
    const area = areaDefinitionMap[areaId];
    const losAreas = area.apertures.reduce((acc, aperture) => {
        if (aperture.losAreaIds.length > 0) {
            acc.push(...aperture.losAreaIds);
        }
        return acc;
    }, [] as string[]);

    return losAreas
};

export const getShortestPath = (areaDefinitionMap: AreaDefinitionMap, startAreaId: string, endAreaId: string): string[] | undefined => {
    console.log(`Getting shortest path from ${startAreaId} to ${endAreaId}`);
    const queue: string[] = [startAreaId]
    const visited = new Set<string>();
    const parent: Record<string, string | undefined> = {};

    visited.add(startAreaId);
    parent[startAreaId] = undefined;

    while (queue.length > 0) {
        const currentAreaId = queue.shift()!

        if (currentAreaId === endAreaId) {
            break;
        }

        for (const neighbor of areaDefinitionMap[currentAreaId].apertures.map(aperture => aperture.areaId) || []) {
            if (visited.has(neighbor)) {
                continue;
            }

            visited.add(neighbor);
            parent[neighbor] = currentAreaId;
            queue.push(neighbor);
        }
    }

    if (!visited.has(endAreaId)) {
        return undefined;
    }

    // rebuild path
    const path: string[] = []
    let current: string | undefined = endAreaId;

    while (current) {
        path.push(current);
        current = parent[current];
    }
    console.log(`Shortest path from ${startAreaId} to ${endAreaId}: ${[...path].reverse().join(' -> ')}`);

    return path.reverse();
}
