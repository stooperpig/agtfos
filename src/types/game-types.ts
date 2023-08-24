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
    type: CounterType,
    state: CounterState,
    weapon?: WeaponType,
    movementAllowance: number,
    attackDice: number,
    constitution: number,
    imageName: string
}

export enum CounterType {
    CREW = 'CREW',
    ROBOT = 'ROBOT',
    EGG = 'EGG',
    BABY = 'BABY',
    ADULT = 'ADULT',
    FRAGMENT = 'FRAGMENT'
}

export interface CounterMap {
    [key: string]: Counter
}

export enum CounterState {
    NORMAL = 'NORMAL',
    STUNNED = 'STUNNED'
}

export interface GameState {
    id: number,
    phase: Phase,
    currentPlayerId: number,
    phasingPlayerId: number,
    players: Player[],
    scale: number,
    scenarioFile?: string,
    counters: CounterMap,
    nextCounterId: number,
    stacks: StackMap,
    locationMap?: LocationMap
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
    crewStackPolygon: Polygon,
    monsterStackId: string,
    monsterStackPolygon: Polygon,
    weaponStackIds: string[]
    weaponStackPolygons: Polygon[]
}

export interface LocationMap {
    [key: string]: Location
}

export enum Phase {
    SETUP = "SETUP",
    GROW = "GROW",
    MOVE = "MOVE",
    ATTACK = "ATTACK",
    WAKE_UP = "WAKE_UP",
    GRAB_WEAPONS = "GRAB_WEAPONS"
}

export interface Player {
    id: number,
    name: string,
    teamType: TeamType
}

export type Polygon = Coord[];

export interface Scenario {
    id: string,
    name: string,
    board: Board,
    imageMap: ImageMap,
}

export interface Stack {
    id: string,
    locationId: string,
    counterIds: string[]
}

export interface StackMap {
    [key: string]: Stack
}

export enum TeamType {
    CREW = "CREW",
    MONSTER = "MONSTER"
}

export enum WeaponType {
    BOTTLE_OF_ACID,
    CANNISTER_OF_ZGWORTZ,
    COMMUNICATIONS_BEAMER,
    ELECTRIC_FENCE,
    FIRE_EXTINGUSHER,
    GAS_GRENADE,
    HYPODERMIC,
    KNIVE,
    POOL_STICK,
    CAN_OF_ROCKET_FUEL,
    STUN_PISTOL,
    WELDING_TORCH
}