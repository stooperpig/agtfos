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

//keep
export interface GameEntry {
    id: string
    status: GameStatus
    turn: number
    players: GameEntryPlayer[]
    debug?: boolean
}

//keep
export interface GameEntryPlayer {
    color: PlayerColor
    id: string
    index: number //todo: this is really only used on creation of game
    name: string
    //teamId: string
    //type: PlayerType
    //botDifficulty?: BotDifficulty
}

//delete
export interface GameEntryTeam {
    id: string
    players: GameEntryPlayer[]
}

export enum GameMode {
    COMBINE_TASK_FORCE = "COMBINE_TF",
    LAND_CTS = "LAND_CTS",
    NORMAL = "NORMAL",
    SET_TASK_FORCE_DESTINATION = "SET_TASK_FORCE_DESTINATION",
    SPLIT_TASK_FORCE = "SPLIT_TF",
    TRANSFER_SHIPS = "TRANSFER_SHIPS",
}

export interface GameState {
     phase: Phase
     players: Player[]
     currentLocationId?: string
     scenarioId: string
     counterMap: CounterMap
     nextCounterId: number
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

//keep
export interface NewGamePlayer {
    index: number
    id?: string
    name?: string
    color?: PlayerColor
}

//keep
export interface Player extends GameEntryPlayer {
    active: boolean
    turnStatus: PlayerTurnStatus
}

//keep
export enum PlayerColor {
    BLUE = "BLUE",
    RED = "RED",
    YELLOW = "YELLOW",
    GREEN = "GREEN"
}

export interface PlayerMap {
    [key: string]: Player
}

export enum PlayerTurnStatus {
    FINISHED = 'FINISHED',
    NONE = 'NONE',
    STARTED = 'STARTED'
}

//delete
export enum PlayerType {
    BOT = 'Bot',
    HUMAN = 'Human'
}

export interface SaveGameData {
    completedTurn: boolean
    actionMap: CounterActionMap
}

//******************************************************************************************************************** */
//******************************************************************************************************************** */
//******************************************************************************************************************** */
//******************************************************************************************************************** */

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
    phaseStartingStackId?: string
    playerId?: string
    actions: CounterAction[]
}

export interface CounterAction {
    type: CounterActionType
    targetId?: string
    weaponId?: string
    fromStackId?: string
    toStackId?: string
}

export interface CounterActionMap {
    [counterId: string]: CounterAction[]
}

export enum CounterActionType {
    MOVE = 'MOVE',
    ATTACK = 'ATTACK',
    GROW = 'GROW',
    GRAB_WEAPON = 'GRAB_WEAPON'
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

export interface CounterMap {
    [key: string]: Counter
}

export interface Image {
    src: string,
    image?: any
}

export interface ImageMap {
    [key: string]: Image
}

export interface Location {
    id: string
    name: string
    apertures: Aperture[]
    polygon: Polygon
    crewStackPolygon: Polygon
    monsterStackPolygon: Polygon
    weaponStacks: LocationWeaponStack[],
}

export interface LocationMap {
    [key: string]: Location
}

export interface LocationWeaponStack {
    id: string
    type: WeaponType
    polygon: Polygon
}


export interface MonsterSettings {
    startingMonsterLocationIds: string[]
    maxBabyCount: number
    babyImageCount: number
    maxAdultCount: number
    adultImageCount: number
    maxFragmentCount: number
    fragmentImageCount: number
    maxEggCount: number
    eggImageCount: number
    startingCounts: {
        babies: number
        adults: number
        eggs: number
    }[]
}


export enum Phase {
    MOVE = "MOVE",
    ATTACK = "ATTACK"
}

export type Polygon = Coord[];

export interface Scenario {
    id: string
    name: string
    board: Board
    imageMap: ImageMap
    crew: ScenarioCrew[]
    monsterSettings: MonsterSettings
    weaponMap: {
        [key: string]: {
            count: number
            imageName: string
        }
    }
}

// export interface WeaponSettings {
//     maxCountMap: {
//         [key in WeaponType]:  {
//             count: number

//         }
//     }
// }

export interface ScenarioCrew {
    name: string
    type: CounterType
    movementAllowance: number
    attackDice: number
    constitution: number
    imageName: string
    startingLocationIds: string[]
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