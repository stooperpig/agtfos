export interface Aperture {
    type: ApertureType,
    locationId: string,
    losLocationIds: string[]
}

export enum ApertureType {
    OPEN = "OPEN",
    DOOR = "DOOR"
}

export interface Board {
    imageName: string,
    locationMap: LocationMap
}

export interface Coord {
    x: number,
    y: number
}

export interface Counter {
    id: string,
    name?: string,
    type: CounterType
}

export interface CounterMap {
    [key: string]: Counter
}

export interface CounterType {
    name: string,
    movementAllowance: number,
    attackDice: number,
    constitution: number,
    imageName: string
}

export interface CounterTypeMap {
    [key: string]: CounterType
}

export interface GameState {
    id: number,
    scenarioFile?: string,
    counters: CounterMap,
    stacks: StackMap
}

export interface Image {
    src: string,
    image?: any
}

export interface ImageMap {
    [key: string]: Image
}

export interface Location {
    id: string,
    name: string,
    apertures: Aperture[],
    polygon: Polygon,
    crewStackId: string,
    monsterStackId: string
    weaponStackIds: string[]
}

export interface LocationMap {
    [key:string]: Location
}

export type Polygon = Coord[];

export interface Scenario {
    id: string,
    name: string,
    board: Board,
    imageMap: ImageMap,
    counterTypes: CounterTypeMap
}

export interface Stack {
    coord: Coord,
    counters: Counter[]
}

export interface StackMap {
    [key: string]: Stack
}