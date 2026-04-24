import { Action, ActionType } from "./action-types"

export interface Animation {
    counterId: string
    fromCoord: Coord
    toCoord: Coord
}

export interface AreaDefinition {
    id: string
    name: string
    apertures: Aperture[]
    polygon: Polygon
    coord?: Coord
    crewStackPolygon?: Polygon
    monsterStackPolygon?: Polygon
    weaponStacks: AreaWeaponStack[],
}

export interface AreaDefinitionMap {
    [key: string]: AreaDefinition
}

export interface AreaWeaponStack {
    id: string
    type: WeaponType
    polygon?: Polygon
    coord?: Coord
}

export interface Aperture {
    type: ApertureType,
    areaId: string,
    losAreaIds: string[]
}

export enum ApertureType {
    OPEN = "OPEN",
    DOOR = "DOOR"
}

export interface AttackGroup {
    id: string
    areaId: string
    targetCounterIds: string[];
    attackingCounterIds: string[];
}

export interface Board {
    imageName: string,
    areaDefinitionMap: AreaDefinitionMap
}

export enum BotDifficulty {
    Easy = 'easy',
    Medium = 'medium',
    Hard = 'hard',
    Hardest = 'hardest'
}

export interface Coord {
    x: number
    y: number
}

export interface Counter {
    id: string
    name?: string
    type: CounterType
    stunned: boolean
    weaponCounterId?: string
    weaponType?: WeaponType
    movementAllowance: number
    attackDice: number
    constitution: number
    imageName: string
    usedMovementAllowance: number
    coord?: Coord
    areaId?: string
    playerId?: string
    //actions: Action[]
    ownerCounterId?: string
    engaged: boolean
    spotted: boolean
    attacking: boolean
    moved: boolean
}

export interface CounterMap {
    [key: string]: Counter
}

export enum CounterType {
    CREW = 'CREW',
    ROBOT = 'ROBOT',
    EGG = 'EGG',
    BABY = 'BABY',
    ADULT = 'ADULT',
    FRAGMENT = 'FRAGMENT',
    WEAPON = 'WEAPON'
}

export interface GameEntry {
    id: string
    status: GameStatus
    turn: number
    players: GameEntryPlayer[]
    debug?: boolean
}

export interface GameEntryPlayer {
    color: PlayerColor
    id: string
    index: number //todo: this is really only used on creation of game
    name: string
}

export enum GameMode {
    NORMAL = "NORMAL"
}

export interface GameState {
    phase: Phase
    players: Player[]
    currentAreaId?: string
    scenarioId: string
    counterMap: CounterMap
    nextCounterId: number
    nextAttackGroupId: number
    stackMap: StackMap
    connectedClients: number
    currentPlayerId: string
    debug: boolean
    gameMode: GameMode
    id: string
    isGameOver: boolean
    refreshGame: boolean
    statusMessage?: string
    turn: number
    weaponEffectMap: {
        [key: string]: WeaponEffect
    }
    mapScale: number
    selectedCounterIds: string[]
    monsterTurnStatus: PlayerTurnStatus
    replay?: Replay
    attackGroups: AttackGroup[]
}

export enum GameStatus {
    ACTIVE = "ACTIVE",
    FINISHED = "FINISHED"
}

export interface GeneralInfo {
    playerId: string
    coord: Coord
    messages: string[]
}

export interface Image {
    src: string,
    image?: any
}

export interface ImageMap {
    [key: string]: Image
}

export interface MonsterSettings {
    startingMonsterAreaIds: string[]
    monsterMaxMap: {
        [key: string]: number
    }
    monsterImageCountMap: {
        [key: string]: number
    }
    //maxBabyCount: number
    //babyImageCount: number
    //maxAdultCount: number
    //adultImageCount: number
    //maxFragmentCount: number
    //fragmentImageCount: number
    //maxEggCount: number
    //eggImageCount: number
    startingCounts: {
        babies: number
        adults: number
        eggs: number
    }[],
    monsterPropertyMap: {
        [key: string]: MonsterProperties
    }
}

export interface MonsterProperties {
    movementAllowance: number
    attackDice: number
    constitution: number
}

// export type MoveToCoordAction = {
//     type: CounterActionType.MOVE_TO_COORD,
//     payload: {
//         counterIds: string[],
//         fromAreaId: string,
//         toAreaId: string,
//         toCoord: Coord
//     }
// };

export interface NewGamePlayer {
    index: number
    id?: string
    name?: string
    color?: PlayerColor
}

export enum Phase {
    GRAB_WEAPON = "GRAB_WEAPON",
    MOVE = "MOVE",
    ATTACK = "ATTACK",
    ATTACK_REPLAY = "ATTACK_REPLAY",
    MONSTER_REPLAY = "MONSTER_REPLAY",
    MONSTER_PHASE = "MONSTER_PHASE"
}

export type Polygon = Coord[];

export interface Player extends GameEntryPlayer {
    active: boolean
    turnStatus: PlayerTurnStatus
}

export interface PlayerMap {
    [key: string]: Player
}

export enum PlayerColor {
    BLUE = "BLUE",
    RED = "RED",
    YELLOW = "YELLOW",
    GREEN = "GREEN"
}

export enum PlayerTurnStatus {
    FINISHED = 'FINISHED',
    STARTED = 'STARTED'
}


export enum PlayerType {
    BOT = 'Bot',
    HUMAN = 'Human'
}

// type ReplayEvent =
//     | { type: CounterActionType.MOVE; payload: { counterIds: string[]; fromAreaId: string; toAreaId: string, fromCoord: Coord, toCoord: Coord } }
//     | { type: CounterActionType.ATTACK; attackerId: string; targetId: string; damage: number }
//     | { type: CounterActionType.GRAB_WEAPON; crewId: string; itemId: string }
//     | { type: CounterActionType.DROP_WEAPON; crewId: string; itemId: string }
//     | { type: CounterActionType.INITIALIZE; payload: { counterId: string; areaId: string, coord: Coord, stunned: boolean, weaponId: string | undefined, usedMovementAllowance: number } }

export interface ReplayState {
    counterMap: CounterMap
    stackMap: StackMap
    animation?: Animation
}

export interface Replay {
    activeState?: ReplayState
    startingState: ReplayState
    replayElements: ReplayElements
    index: number
    playing: boolean
    show: boolean
}

export interface ReplayElements {
    movementElements: ReplayMovementElement[]
    attackElements: ReplayAttackElement[]
    //fireElements: ReplayFireElement[]
}

export interface ReplayAttackElement {
    attackerId: string
    targetId: string
    damage: number
}

export interface ReplayMovementElement {
    type: ActionType;
    counterId: string;
    fromAreaId: string;
    fromCoord: Coord;
    toAreaId?: string;
    toCoord?: Coord;
    weaponCounterId?: string;
    movementCost: number
    nextType?: CounterType;
    newCounterId?: string;
    movementAllowance?: number;
    attackDice?: number;
    constitution?: number;
    imageName?: string;
    engagedData: { [key: string]: boolean };   //todo: this probably needs to set property on all effected counters [] not just the moving counter,  
    spottedData: { [key: string]: boolean };   //todo: this probably needs to set property on all effected counters (map) not just the moving counter,
}

export interface ReplayCounter {
    counterId: string
    //facing: number
    //formation: Formation
    movementAllowance: number
}


// export interface SaveGameData {
//     completedTurn: boolean
//     actionMap: CounterActionMap
// }

export interface Scenario {
    id: string
    name: string
    board: Board
    imageMap: ImageMap
    counterWidth: number
    counterHeight: number
    crew: ScenarioCrew[]
    monsterSettings: MonsterSettings
    weaponMap: {
        [key: string]: {
            count: number
            imageName: string
            effectType: WeaponEffectType
            range: number
        }
    }
}

export interface ScenarioCrew {
    name: string
    type: CounterType
    movementAllowance: number
    attackDice: number
    constitution: number
    imageName: string
    startingAreaIds: string[]
}

export interface ScenarioEntry {
    id: string,
    name: string
}

export interface Stack {
    id: string
    counterIds: string[]
}

export interface StackMap {
    [key: string]: Stack
}

export enum WeaponEffectType {
    SINGLE_TARGET = "SINGLE_TARGET",
    AREA = "AREA"
}

export enum WeaponEffect {
    FIVE_DICE_TO_KILL = "FIVE_DICE_TO_KILL",
    FIVE_DICE_TO_STUN = "FIVE_DICE_TO_STUN",
    NO_EFFECT = "NO_EFFECT",
    GROW = "GROW",
    SHRINK = "SHRINK",
    ONE_DIE_FRAGMENTS = "ONE_DIE_FRAGMENTS"
}

export enum WeaponType {
    BOTTLE_OF_ACID = "BOTTLE_OF_ACID",
    CANNISTER_OF_ZGWORTZ = "CANNISTER_OF_ZGWORTZ",
    COMMUNICATIONS_BEAMER = "COMMUNICATIONS_BEAMER",
    ELECTRIC_FENCE = "ELECTRIC_FENCE",
    FIRE_EXTINGUSHER = "FIRE_EXTINGUSHER",
    GAS_GRENADE = "GAS_GRENADE",
    HYPODERMIC = "HYPODERMIC",
    KNIFE = "KNIFE",
    POOL_STICK = "POOL_STICK",
    CAN_OF_ROCKET_FUEL = "CAN_OF_ROCKET_FUEL",
    STUN_PISTOL = "STUN_PISTOL",
    WELDING_TORCH = "WELDING_TORCH"
}