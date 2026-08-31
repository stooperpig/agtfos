import {
    AttackGroup,
    AttackGroupType,
    AttackResult,
    Counter,
    CounterMap,
    CounterType,
    GameState,
    Phase,
    PlayerTurnStatus,
    ReplayAttackElement,
    Scenario,
    StackMap,
    WeaponEffect,
    WeaponEffectEntry,
    WeaponType,
} from '../../src/shared/types/game-types';
import {
    crewAttack,
    handleGrowAttacks,
    handleShrinkAttacks,
    handleToKillAttacks,
    handleFragmentationAttacks,
    handleStunAttacks,
    handleDroppedWeapons,
    updateWeaponEffects,
    updateNonReusableWeapons,
    isValidAttackGroup,
} from '../../src/tasks/crew-attack-task';
import { isCrew, isMonster, isWeapon } from '../../src/shared/utils/counter-utils';
import { readScenario } from '../../src/utils/file-utils';
import { createReplay } from '../../src/utils/game-utils';
import { roll6SidedDie, rollX6SidedDie, getRandomIndex } from '../../src/shared/utils/dice-utils';
import * as fileUtils from '../../src/utils/file-utils';
import { consoleLogger } from '../../src/utils/logger';

jest.mock('../../src/shared/utils/dice-utils');
jest.mock('../../src/utils/file-utils');
jest.mock('../../src/handlers/new-game-handler');
jest.mock('../../src/utils/game-utils');

beforeAll(() => {
    consoleLogger.debug = jest.fn();
    consoleLogger.info = jest.fn();
    consoleLogger.warn = jest.fn();
    consoleLogger.error = jest.fn();
    jest.spyOn(console, "log").mockImplementation(() => {});
});

describe('isValidAttackGroup', () => {
    it('should return true for valid attack group with both attackers and targets', () => {
        const attackGroup: AttackGroup = {
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['target1'],
            attackingCounterIds: ['attacker1'],
            goalDice: 5,
            dice: 5
        };
        expect(isValidAttackGroup(attackGroup)).toBe(true);
    });

    it('should return false for attack group with no attackers', () => {
        const attackGroup: AttackGroup = {
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['target1'],
            attackingCounterIds: [],
            goalDice: 5,
            dice: 5
        };
        expect(isValidAttackGroup(attackGroup)).toBe(false);
    });

    it('should return false for attack group with no targets', () => {
        const attackGroup: AttackGroup = {
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: [],
            attackingCounterIds: ['attacker1'],
            goalDice: 5,
            dice: 5
        };
        expect(isValidAttackGroup(attackGroup)).toBe(false);
    });

    it('should return false for attack group with neither attackers nor targets', () => {
        const attackGroup: AttackGroup = {
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: [],
            attackingCounterIds: [],
            goalDice: 5,
            dice: 5
        };
        expect(isValidAttackGroup(attackGroup)).toBe(false);
    });
});

describe('updateWeaponEffects', () => {
    it('should mark weapon effect as discovered when weapon is used', () => {
        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.BOTTLE_OF_ACID,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.BOTTLE_OF_ACID]: {
                effect: WeaponEffect.GROW,
                discovered: false
            }
        };

        const gameState: Partial<GameState> = {
            counterMap,
            weaponEffectMap
        } as any;

        const usedWeaponIds = new Set(['weapon1']);

        updateWeaponEffects(gameState as GameState, usedWeaponIds);

        expect(weaponEffectMap[WeaponType.BOTTLE_OF_ACID].discovered).toBe(true);
    });

    it('should not mark weapon effect as discovered if already discovered', () => {
        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.BOTTLE_OF_ACID,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.BOTTLE_OF_ACID]: {
                effect: WeaponEffect.GROW,
                discovered: true
            }
        };

        const gameState: Partial<GameState> = {
            counterMap,
            weaponEffectMap
        } as any;

        const usedWeaponIds = new Set(['weapon1']);

        updateWeaponEffects(gameState as GameState, usedWeaponIds);

        expect(weaponEffectMap[WeaponType.BOTTLE_OF_ACID].discovered).toBe(true);
    });

    it('should handle non-weapon counters gracefully', () => {
        const counterMap: CounterMap = {
            'crew1': {
                id: 'crew1',
                type: CounterType.CREW,
                stunned: false,
                movementAllowance: 5,
                attackDice: 2,
                constitution: 3,
                imageName: 'crew.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {};

        const gameState: Partial<GameState> = {
            counterMap,
            weaponEffectMap
        } as any;

        const usedWeaponIds = new Set(['crew1']);

        expect(() => updateWeaponEffects(gameState as GameState, usedWeaponIds)).not.toThrow();
    });
});

describe('handleDroppedWeapons', () => {
    it('should drop weapon when crew member is killed', () => {
        const counterMap: CounterMap = {
            'crew1': {
                id: 'crew1',
                type: CounterType.CREW,
                stunned: false,
                movementAllowance: 5,
                attackDice: 2,
                constitution: 3,
                imageName: 'crew.png',
                usedMovementAllowance: 0,
                areaId: 'area1',
                coord: { x: 10, y: 10 },
                weaponCounterId: 'weapon1',
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.BOTTLE_OF_ACID,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const stackMap: StackMap = {
            'area1': {
                id: 'area1',
                counterIds: ['crew1']
            }
        };

        const gameState: Partial<GameState> = {
            counterMap,
            stackMap
        } as any;

        const attackResults: { [key: string]: AttackResult[] } = {
            'crew1': [AttackResult.KILL]
        };

        const scenario: Partial<Scenario> = {} as any;

        handleDroppedWeapons(gameState as GameState, attackResults, scenario as Scenario);

        expect(counterMap['crew1'].weaponCounterId).toBeUndefined();
        expect(counterMap['weapon1'].areaId).toBe('area1');
        expect(counterMap['weapon1'].coord).toEqual({ x: 10, y: 10 });
        expect(stackMap['area1'].counterIds).toContain('weapon1');
    });

    it('should not drop weapon when crew member is not killed', () => {
        const counterMap: CounterMap = {
            'crew1': {
                id: 'crew1',
                type: CounterType.CREW,
                stunned: false,
                movementAllowance: 5,
                attackDice: 2,
                constitution: 3,
                imageName: 'crew.png',
                usedMovementAllowance: 0,
                areaId: 'area1',
                coord: { x: 10, y: 10 },
                weaponCounterId: 'weapon1',
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.BOTTLE_OF_ACID,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const stackMap: StackMap = {
            'area1': {
                id: 'area1',
                counterIds: ['crew1']
            }
        };

        const gameState: Partial<GameState> = {
            counterMap,
            stackMap
        } as any;

        const attackResults: { [key: string]: AttackResult[] } = {
            'crew1': [AttackResult.STUN]
        };

        const scenario: Partial<Scenario> = {} as any;

        handleDroppedWeapons(gameState as GameState, attackResults, scenario as Scenario);

        expect(counterMap['crew1'].weaponCounterId).toBe('weapon1');
    });

    it('should handle crew member without weapon', () => {
        const counterMap: CounterMap = {
            'crew1': {
                id: 'crew1',
                type: CounterType.CREW,
                stunned: false,
                movementAllowance: 5,
                attackDice: 2,
                constitution: 3,
                imageName: 'crew.png',
                usedMovementAllowance: 0,
                areaId: 'area1',
                coord: { x: 10, y: 10 },
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const stackMap: StackMap = {
            'area1': {
                id: 'area1',
                counterIds: ['crew1']
            }
        };

        const gameState: Partial<GameState> = {
            counterMap,
            stackMap
        } as any;

        const attackResults: { [key: string]: AttackResult[] } = {
            'crew1': [AttackResult.KILL]
        };

        const scenario: Partial<Scenario> = {} as any;

        expect(() => handleDroppedWeapons(gameState as GameState, attackResults, scenario as Scenario)).not.toThrow();
    });
});

describe('handleGrowAttacks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should grow baby monster to adult', () => {
        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.BOTTLE_OF_ACID,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'monster1': {
                id: 'monster1',
                type: CounterType.BABY,
                name: 'Baby Monster',
                stunned: false,
                movementAllowance: 3,
                attackDice: 1,
                constitution: 2,
                imageName: 'baby.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.BOTTLE_OF_ACID]: {
                effect: WeaponEffect.GROW,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: ['weapon1'],
            goalDice: 5,
            dice: 5
        }];

        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();
        const attackReplayElements: ReplayAttackElement[] = [];

        const scenario: Partial<Scenario> = {
            monsterSettings: {
                startingMonsterAreaIds: [],
                monsterMaxMap: {},
                monsterImageCountMap: {},
                startingCounts: [],
                monsterPropertyMap: {
                    [CounterType.ADULT]: {
                        movementAllowance: 5,
                        attackDice: 3,
                        constitution: 4
                    },
                    [CounterType.BABY]: {
                        movementAllowance: 3,
                        attackDice: 1,
                        constitution: 2
                    }
                }
            }
        } as any;

        handleGrowAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, scenario as Scenario, usedWeaponIds);

        expect(counterMap['monster1'].type).toBe(CounterType.ADULT);
        expect(attackResults['monster1']).toContain(AttackResult.GROW);
        expect(usedWeaponIds).toContain('weapon1');
    });

    it('should grow egg to baby', () => {
        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.BOTTLE_OF_ACID,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'egg1': {
                id: 'egg1',
                type: CounterType.EGG,
                name: 'Egg',
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 1,
                imageName: 'egg.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.BOTTLE_OF_ACID]: {
                effect: WeaponEffect.GROW,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['egg1'],
            attackingCounterIds: ['weapon1'],
            goalDice: 5,
            dice: 5
        }];

        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();
        const attackReplayElements: ReplayAttackElement[] = [];

        const scenario: Partial<Scenario> = {
            monsterSettings: {
                startingMonsterAreaIds: [],
                monsterMaxMap: {},
                monsterImageCountMap: {},
                startingCounts: [],
                monsterPropertyMap: {
                    [CounterType.BABY]: {
                        movementAllowance: 3,
                        attackDice: 1,
                        constitution: 2
                    },
                    [CounterType.EGG]: {
                        movementAllowance: 0,
                        attackDice: 0,
                        constitution: 1
                    }
                }
            }
        } as any;

        handleGrowAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, scenario as Scenario, usedWeaponIds);

        expect(counterMap['egg1'].type).toBe(CounterType.BABY);
        expect(attackResults['egg1']).toContain(AttackResult.GROW);
        expect(usedWeaponIds).toContain('weapon1');
    });

    it('should not grow if already grown', () => {
        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.BOTTLE_OF_ACID,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'monster1': {
                id: 'monster1',
                type: CounterType.BABY,
                name: 'Baby Monster',
                stunned: false,
                movementAllowance: 3,
                attackDice: 1,
                constitution: 2,
                imageName: 'baby.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.BOTTLE_OF_ACID]: {
                effect: WeaponEffect.GROW,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: ['weapon1'],
            goalDice: 5,
            dice: 5
        }];

        const attackResults: { [key: string]: AttackResult[] } = {
            'monster1': [AttackResult.GROW]
        };
        const usedWeaponIds = new Set<string>();
        const attackReplayElements: ReplayAttackElement[] = [];

        const scenario: Partial<Scenario> = {
            monsterSettings: {
                startingMonsterAreaIds: [],
                monsterMaxMap: {},
                monsterImageCountMap: {},
                startingCounts: [],
                monsterPropertyMap: {
                    [CounterType.ADULT]: {
                        movementAllowance: 5,
                        attackDice: 3,
                        constitution: 4
                    },
                    [CounterType.BABY]: {
                        movementAllowance: 3,
                        attackDice: 1,
                        constitution: 2
                    }
                }
            }
        } as any;

        handleGrowAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, scenario as Scenario, usedWeaponIds);

        expect(counterMap['monster1'].type).toBe(CounterType.BABY); // Should not change
    });
});

describe('handleShrinkAttacks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should shrink adult to baby', () => {
        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.GAS_GRENADE,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'monster1': {
                id: 'monster1',
                type: CounterType.ADULT,
                name: 'Adult Monster',
                stunned: false,
                movementAllowance: 5,
                attackDice: 3,
                constitution: 4,
                imageName: 'adult.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.GAS_GRENADE]: {
                effect: WeaponEffect.SHRINK,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: ['weapon1'],
            goalDice: 5,
            dice: 5
        }];

        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();
        const attackReplayElements: ReplayAttackElement[] = [];

        const scenario: Partial<Scenario> = {
            monsterSettings: {
                startingMonsterAreaIds: [],
                monsterMaxMap: {},
                monsterImageCountMap: {},
                startingCounts: [],
                monsterPropertyMap: {
                    [CounterType.ADULT]: {
                        movementAllowance: 5,
                        attackDice: 3,
                        constitution: 4
                    },
                    [CounterType.BABY]: {
                        movementAllowance: 3,
                        attackDice: 1,
                        constitution: 2
                    }
                }
            }
        } as any;

        handleShrinkAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, scenario as Scenario, usedWeaponIds);

        expect(counterMap['monster1'].type).toBe(CounterType.BABY);
        expect(attackResults['monster1']).toContain(AttackResult.SHRINK);
        expect(usedWeaponIds).toContain('weapon1');
    });

    it('should shrink baby to egg', () => {
        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.GAS_GRENADE,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'monster1': {
                id: 'monster1',
                type: CounterType.BABY,
                name: 'Baby Monster',
                stunned: false,
                movementAllowance: 3,
                attackDice: 1,
                constitution: 2,
                imageName: 'baby.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.GAS_GRENADE]: {
                effect: WeaponEffect.SHRINK,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: ['weapon1'],
            goalDice: 5,
            dice: 5
        }];

        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();
        const attackReplayElements: ReplayAttackElement[] = [];

        const scenario: Partial<Scenario> = {
            monsterSettings: {
                startingMonsterAreaIds: [],
                monsterMaxMap: {},
                monsterImageCountMap: {},
                startingCounts: [],
                monsterPropertyMap: {
                    [CounterType.BABY]: {
                        movementAllowance: 3,
                        attackDice: 1,
                        constitution: 2
                    },
                    [CounterType.EGG]: {
                        movementAllowance: 0,
                        attackDice: 0,
                        constitution: 1
                    }
                }
            }
        } as any;

        handleShrinkAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, scenario as Scenario, usedWeaponIds);

        expect(counterMap['monster1'].type).toBe(CounterType.EGG);
        expect(attackResults['monster1']).toContain(AttackResult.SHRINK);
        expect(usedWeaponIds).toContain('weapon1');
    });

    it('should kill egg when shrunk', () => {
        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.GAS_GRENADE,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'egg1': {
                id: 'egg1',
                type: CounterType.EGG,
                name: 'Egg',
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 1,
                imageName: 'egg.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.GAS_GRENADE]: {
                effect: WeaponEffect.SHRINK,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['egg1'],
            attackingCounterIds: ['weapon1'],
            goalDice: 5,
            dice: 5
        }];

        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();
        const attackReplayElements: ReplayAttackElement[] = [];

        const scenario: Partial<Scenario> = {
            monsterSettings: {
                startingMonsterAreaIds: [],
                monsterMaxMap: {},
                monsterImageCountMap: {},
                startingCounts: [],
                monsterPropertyMap: {
                    [CounterType.EGG]: {
                        movementAllowance: 0,
                        attackDice: 0,
                        constitution: 1
                    }
                }
            }
        } as any;

        handleShrinkAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, scenario as Scenario, usedWeaponIds);

        expect(attackResults['egg1']).toContain(AttackResult.KILL);
        expect(usedWeaponIds).toContain('weapon1');
    });
});

describe('handleToKillAttacks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should kill target when roll meets constitution', () => {
        (rollX6SidedDie as jest.Mock).mockReturnValue(4);

        const counterMap: CounterMap = {
            'crew1': {
                id: 'crew1',
                type: CounterType.CREW,
                stunned: false,
                movementAllowance: 5,
                attackDice: 2,
                constitution: 3,
                imageName: 'crew.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'monster1': {
                id: 'monster1',
                type: CounterType.BABY,
                name: 'Baby Monster',
                stunned: false,
                movementAllowance: 3,
                attackDice: 1,
                constitution: 4,
                imageName: 'baby.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {};

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: ['crew1'],
            goalDice: 5,
            dice: 5
        }];

        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();
        const attackReplayElements: ReplayAttackElement[] = [];

        handleToKillAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, usedWeaponIds);

        expect(attackResults['monster1']).toContain(AttackResult.KILL);
        expect(rollX6SidedDie).toHaveBeenCalledWith(2);
        expect(counterMap['monster1'].killed).toBe(true);
    });

    it('should not kill target when roll is below constitution', () => {
        (rollX6SidedDie as jest.Mock).mockReturnValue(2);

        const counterMap: CounterMap = {
            'crew1': {
                id: 'crew1',
                type: CounterType.CREW,
                stunned: false,
                movementAllowance: 5,
                attackDice: 2,
                constitution: 3,
                imageName: 'crew.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'monster1': {
                id: 'monster1',
                type: CounterType.BABY,
                name: 'Baby Monster',
                stunned: false,
                movementAllowance: 3,
                attackDice: 1,
                constitution: 4,
                imageName: 'baby.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {};

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: ['crew1'],
            goalDice: 5,
            dice: 5
        }];

        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();
        const attackReplayElements: ReplayAttackElement[] = [];

        handleToKillAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, usedWeaponIds);

        expect(attackResults['monster1']).toBeUndefined();
        expect(counterMap['monster1'].killed).toBe(false);
    });

    it('should add weapon dice to kill attack', () => {
        (rollX6SidedDie as jest.Mock).mockReturnValue(5);

        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.KNIFE,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'monster1': {
                id: 'monster1',
                type: CounterType.BABY,
                name: 'Baby Monster',
                stunned: false,
                movementAllowance: 3,
                attackDice: 1,
                constitution: 5,
                imageName: 'baby.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.KNIFE]: {
                effect: WeaponEffect.FIVE_DICE_TO_KILL,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: ['weapon1'],
            goalDice: 5,
            dice: 5
        }];

        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();
        const attackReplayElements: ReplayAttackElement[] = [];

        handleToKillAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, usedWeaponIds);

        expect(attackResults['monster1']).toContain(AttackResult.KILL);
        expect(rollX6SidedDie).toHaveBeenCalledWith(5);
        expect(usedWeaponIds).toContain('weapon1');
    });
});

describe('handleStunAttacks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should stun target when roll meets constitution', () => {
        (rollX6SidedDie as jest.Mock).mockReturnValue(4);

        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.STUN_PISTOL,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'monster1': {
                id: 'monster1',
                type: CounterType.BABY,
                name: 'Baby Monster',
                stunned: false,
                movementAllowance: 3,
                attackDice: 1,
                constitution: 4,
                imageName: 'baby.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.STUN_PISTOL]: {
                effect: WeaponEffect.FIVE_DICE_TO_STUN,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: ['weapon1'],
            goalDice: 5,
            dice: 5
        }];

        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();
        const attackReplayElements: ReplayAttackElement[] = [];

        handleStunAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, usedWeaponIds);

        expect(attackResults['monster1']).toContain(AttackResult.STUN);
        expect(counterMap['monster1'].stunned).toBe(true);
        expect(rollX6SidedDie).toHaveBeenCalledWith(5);
        expect(usedWeaponIds).toContain('weapon1');
    });

    it('should not stun target when roll is below constitution', () => {
        (rollX6SidedDie as jest.Mock).mockReturnValue(2);

        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.STUN_PISTOL,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'monster1': {
                id: 'monster1',
                type: CounterType.BABY,
                name: 'Baby Monster',
                stunned: false,
                movementAllowance: 3,
                attackDice: 1,
                constitution: 4,
                imageName: 'baby.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.STUN_PISTOL]: {
                effect: WeaponEffect.FIVE_DICE_TO_STUN,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: ['weapon1'],
            goalDice: 5,
            dice: 5
        }];

        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();
        const attackReplayElements: ReplayAttackElement[] = [];

        handleStunAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, usedWeaponIds);

        expect(attackResults['monster1']).toBeUndefined();
        expect(counterMap['monster1'].stunned).toBe(false);
    });
});

describe('handleFragmentationAttacks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should fragment monster and create fragments', () => {
        (roll6SidedDie as jest.Mock).mockReturnValue(3);

        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.CAN_OF_ROCKET_FUEL,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'monster1': {
                id: 'monster1',
                type: CounterType.BABY,
                name: 'Baby Monster',
                stunned: false,
                movementAllowance: 3,
                attackDice: 1,
                constitution: 2,
                imageName: 'baby.png',
                usedMovementAllowance: 0,
                areaId: 'area1',
                coord: { x: 10, y: 10 },
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.CAN_OF_ROCKET_FUEL]: {
                effect: WeaponEffect.ONE_DIE_FRAGMENTS,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: ['weapon1'],
            goalDice: 5,
            dice: 5
        }];

        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();
        const attackReplayElements: ReplayAttackElement[] = [];
        const stackMap: StackMap = {
            'area1': {
                id: 'area1',
                counterIds: ['monster1']
            }
        };

        const scenario: Partial<Scenario> = {
            monsterSettings: {
                startingMonsterAreaIds: [],
                monsterMaxMap: {},
                monsterImageCountMap: {
                    [CounterType.EGG]: 10
                },
                startingCounts: [],
                monsterPropertyMap: {
                    [CounterType.FRAGMENT]: {
                        movementAllowance: 2,
                        attackDice: 0,
                        constitution: 1
                    },
                    [CounterType.EGG]: {
                        movementAllowance: 0,
                        attackDice: 0,
                        constitution: 1
                    }
                }
            }
        } as any;

        const nextCounterId = 10;
        const result = handleFragmentationAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, scenario as Scenario, usedWeaponIds, nextCounterId, stackMap);

        expect(counterMap['monster1'].type).toBe(CounterType.FRAGMENT);
        expect(attackResults['monster1']).toContain(AttackResult.FRAGMENT);
        expect(usedWeaponIds).toContain('weapon1');
        expect(result).toBe(12); // 10 + 2 fragments
        expect(Object.keys(counterMap).length).toBe(4); // weapon1, monster1, and 2 fragments
    });

    it('should not create fragments when roll is 1', () => {
        (roll6SidedDie as jest.Mock).mockReturnValue(1);

        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.CAN_OF_ROCKET_FUEL,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'monster1': {
                id: 'monster1',
                type: CounterType.BABY,
                name: 'Baby Monster',
                stunned: false,
                movementAllowance: 3,
                attackDice: 1,
                constitution: 2,
                imageName: 'baby.png',
                usedMovementAllowance: 0,
                areaId: 'area1',
                coord: { x: 10, y: 10 },
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.CAN_OF_ROCKET_FUEL]: {
                effect: WeaponEffect.ONE_DIE_FRAGMENTS,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: ['weapon1'],
            goalDice: 5,
            dice: 5
        }];

        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();
        const attackReplayElements: ReplayAttackElement[] = [];
        const stackMap: StackMap = {
            'area1': {
                id: 'area1',
                counterIds: ['monster1']
            }
        };

        const scenario: Partial<Scenario> = {
            monsterSettings: {
                startingMonsterAreaIds: [],
                monsterMaxMap: {},
                monsterImageCountMap: {
                    [CounterType.EGG]: 10
                },
                startingCounts: [],
                monsterPropertyMap: {
                    [CounterType.FRAGMENT]: {
                        movementAllowance: 2,
                        attackDice: 0,
                        constitution: 1
                    },
                    [CounterType.EGG]: {
                        movementAllowance: 0,
                        attackDice: 0,
                        constitution: 1
                    }
                }
            }
        } as any;

        const nextCounterId = 10;
        const result = handleFragmentationAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, scenario as Scenario, usedWeaponIds, nextCounterId, stackMap);

        expect(counterMap['monster1'].type).toBe(CounterType.FRAGMENT);
        expect(attackResults['monster1']).toContain(AttackResult.FRAGMENT);
        expect(result).toBe(10); // No fragments created
        expect(Object.keys(counterMap).length).toBe(2); // Only weapon1 and monster1
    });
});

describe('updateNonReusableWeapons', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getRandomIndex as jest.Mock).mockReturnValue(0);
    });

    it('should return non-reusable weapon to stack', () => {
        const counterMap: CounterMap = {
            'crew1': {
                id: 'crew1',
                type: CounterType.CREW,
                stunned: false,
                movementAllowance: 5,
                attackDice: 2,
                constitution: 3,
                imageName: 'crew.png',
                usedMovementAllowance: 0,
                weaponCounterId: 'weapon1',
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.BOTTLE_OF_ACID,
                ownerCounterId: 'crew1',
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const stackMap: StackMap = {
            'area1': {
                id: 'area1',
                counterIds: ['crew1']
            }
        };

        const gameState: Partial<GameState> = {
            counterMap,
            stackMap
        } as any;

        const usedWeaponIds = new Set(['weapon1']);

        const scenario: Partial<Scenario> = {
            board: {
                imageName: 'board.png',
                areaDefinitionMap: {
                    'area1': {
                        id: 'area1',
                        name: 'Area 1',
                        apertures: [],
                        polygon: [],
                        weaponStacks: [{
                            id: 'stack1',
                            type: WeaponType.BOTTLE_OF_ACID,
                            coord: { x: 5, y: 5 }
                        }]
                    }
                }
            },
            weaponMap: {
                [WeaponType.BOTTLE_OF_ACID]: {
                    reuseable: false
                }
            }
        } as any;

        updateNonReusableWeapons(gameState as GameState, usedWeaponIds, scenario as Scenario);

        expect(counterMap['crew1'].weaponCounterId).toBeUndefined();
        expect(counterMap['weapon1'].ownerCounterId).toBeUndefined();
        expect(counterMap['weapon1'].areaId).toBe('area1');
        expect(stackMap['area1'].counterIds).toContain('weapon1');
    });

    it('should not return reusable weapon to stack', () => {
        const counterMap: CounterMap = {
            'crew1': {
                id: 'crew1',
                type: CounterType.CREW,
                stunned: false,
                movementAllowance: 5,
                attackDice: 2,
                constitution: 3,
                imageName: 'crew.png',
                usedMovementAllowance: 0,
                weaponCounterId: 'weapon1',
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.BOTTLE_OF_ACID,
                ownerCounterId: 'crew1',
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const stackMap: StackMap = {
            'area1': {
                id: 'area1',
                counterIds: ['crew1']
            }
        };

        const gameState: Partial<GameState> = {
            counterMap,
            stackMap
        } as any;

        const usedWeaponIds = new Set(['weapon1']);

        const scenario: Partial<Scenario> = {
            board: {
                imageName: 'board.png',
                areaDefinitionMap: {
                    'area1': {
                        id: 'area1',
                        name: 'Area 1',
                        apertures: [],
                        polygon: [],
                        weaponStacks: [{
                            id: 'stack1',
                            type: WeaponType.BOTTLE_OF_ACID,
                            coord: { x: 5, y: 5 }
                        }]
                    }
                }
            },
            weaponMap: {
                [WeaponType.BOTTLE_OF_ACID]: {
                    reuseable: true
                }
            }
        } as any;

        updateNonReusableWeapons(gameState as GameState, usedWeaponIds, scenario as Scenario);

        expect(counterMap['crew1'].weaponCounterId).toBe('weapon1');
        expect(counterMap['weapon1'].ownerCounterId).toBe('crew1');
    });

    it('should create new stack if stack does not exist in area', () => {
        const counterMap: CounterMap = {
            'crew1': {
                id: 'crew1',
                type: CounterType.CREW,
                name: 'Crew Member',
                movementAllowance: 5,
                attackDice: 2,
                constitution: 3,
                imageName: 'crew.png',
                usedMovementAllowance: 0,
                stunned: false,
                areaId: 'area1',
                coord: { x: 10, y: 10 },
                weaponCounterId: 'weapon1',
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.BOTTLE_OF_ACID,
                ownerCounterId: 'crew1',
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const stackMap: StackMap = {};

        const gameState: Partial<GameState> = {
            counterMap,
            stackMap
        } as any;

        const usedWeaponIds = new Set(['weapon1']);

        const scenario: Partial<Scenario> = {
            board: {
                imageName: 'board.png',
                areaDefinitionMap: {
                    'area1': {
                        id: 'area1',
                        name: 'Area 1',
                        apertures: [],
                        polygon: [],
                        weaponStacks: [{
                            id: 'stack1',
                            type: WeaponType.BOTTLE_OF_ACID,
                            coord: { x: 5, y: 5 }
                        }]
                    }
                }
            },
            weaponMap: {
                [WeaponType.BOTTLE_OF_ACID]: {
                    reuseable: false
                }
            }
        } as any;

        updateNonReusableWeapons(gameState as GameState, usedWeaponIds, scenario as Scenario);

        expect(counterMap['crew1'].weaponCounterId).toBeUndefined();
        expect(counterMap['weapon1'].ownerCounterId).toBeUndefined();
        expect(counterMap['weapon1'].areaId).toBe('area1');
        expect(stackMap['area1']).toBeDefined();
        expect(stackMap['area1'].counterIds).toContain('weapon1');
    });

    it('should not move weapon if no suitable area exists', () => {
        const counterMap: CounterMap = {
            'crew1': {
                id: 'crew1',
                type: CounterType.CREW,
                name: 'Crew Member',
                movementAllowance: 5,
                attackDice: 2,
                constitution: 3,
                imageName: 'crew.png',
                usedMovementAllowance: 0,
                stunned: false,
                areaId: 'area1',
                coord: { x: 10, y: 10 },
                weaponCounterId: 'weapon1',
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.BOTTLE_OF_ACID,
                ownerCounterId: 'crew1',
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const stackMap: StackMap = {
            'area1': {
                id: 'area1',
                counterIds: ['crew1']
            }
        };

        const gameState: Partial<GameState> = {
            counterMap,
            stackMap
        } as any;

        const usedWeaponIds = new Set(['weapon1']);

        const scenario: Partial<Scenario> = {
            board: {
                imageName: 'board.png',
                areaDefinitionMap: {
                    'area1': {
                        id: 'area1',
                        name: 'Area 1',
                        apertures: [],
                        polygon: [],
                        weaponStacks: [] // No weapon stacks for this weapon type
                    }
                }
            },
            weaponMap: {
                [WeaponType.BOTTLE_OF_ACID]: {
                    reuseable: false
                }
            }
        } as any;

        updateNonReusableWeapons(gameState as GameState, usedWeaponIds, scenario as Scenario);

        expect(counterMap['crew1'].weaponCounterId).toBeUndefined();
        expect(counterMap['weapon1'].ownerCounterId).toBeUndefined();
        expect(counterMap['weapon1'].areaId).toBeUndefined();
    });
});

describe('handleToKillAttacks - additional cases', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should add FOUR_DICE_TO_KILL weapon dice', () => {
        (rollX6SidedDie as jest.Mock).mockReturnValue(5);

        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.KNIFE,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'monster1': {
                id: 'monster1',
                type: CounterType.BABY,
                name: 'Baby Monster',
                stunned: false,
                movementAllowance: 3,
                attackDice: 1,
                constitution: 4,
                imageName: 'baby.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.KNIFE]: {
                effect: WeaponEffect.FOUR_DICE_TO_KILL,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: ['weapon1'],
            goalDice: 0,
            dice: 0
        }];

        const attackReplayElements: ReplayAttackElement[] = [];
        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();

        handleToKillAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, usedWeaponIds);

        expect(rollX6SidedDie).toHaveBeenCalledWith(4);
        expect(usedWeaponIds).toContain('weapon1');
    });

    it('should add THREE_DICE_TO_KILL weapon dice', () => {
        (rollX6SidedDie as jest.Mock).mockReturnValue(3);

        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.KNIFE,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'monster1': {
                id: 'monster1',
                type: CounterType.BABY,
                name: 'Baby Monster',
                stunned: false,
                movementAllowance: 3,
                attackDice: 1,
                constitution: 3,
                imageName: 'baby.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.KNIFE]: {
                effect: WeaponEffect.THREE_DICE_TO_KILL,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: ['weapon1'],
            goalDice: 0,
            dice: 0
        }];

        const attackReplayElements: ReplayAttackElement[] = [];
        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();

        handleToKillAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, usedWeaponIds);

        expect(rollX6SidedDie).toHaveBeenCalledWith(3);
        expect(usedWeaponIds).toContain('weapon1');
        expect(attackResults['monster1']).toContain(AttackResult.KILL);
    });

    it('should add crew attack dice to kill attack', () => {
        (rollX6SidedDie as jest.Mock).mockReturnValue(4);

        const counterMap: CounterMap = {
            'crew1': {
                id: 'crew1',
                type: CounterType.CREW,
                name: 'Crew Member',
                movementAllowance: 5,
                attackDice: 3,
                constitution: 3,
                imageName: 'crew.png',
                usedMovementAllowance: 0,
                stunned: false,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'monster1': {
                id: 'monster1',
                type: CounterType.BABY,
                name: 'Baby Monster',
                stunned: false,
                movementAllowance: 3,
                attackDice: 1,
                constitution: 4,
                imageName: 'baby.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {};

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: ['crew1'],
            goalDice: 0,
            dice: 0
        }];

        const attackReplayElements: ReplayAttackElement[] = [];
        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();

        handleToKillAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, usedWeaponIds);

        expect(rollX6SidedDie).toHaveBeenCalledWith(3);
        expect(attackResults['monster1']).toContain(AttackResult.KILL);
        expect(counterMap['monster1'].killed).toBe(true);
        expect(counterMap['monster1'].stunned).toBe(false);
    });

    it('should combine crew and weapon dice for kill attack', () => {
        (rollX6SidedDie as jest.Mock).mockReturnValue(6);

        const counterMap: CounterMap = {
            'crew1': {
                id: 'crew1',
                type: CounterType.CREW,
                name: 'Crew Member',
                movementAllowance: 5,
                attackDice: 2,
                constitution: 3,
                imageName: 'crew.png',
                usedMovementAllowance: 0,
                stunned: false,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.KNIFE,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'monster1': {
                id: 'monster1',
                type: CounterType.BABY,
                name: 'Baby Monster',
                stunned: false,
                movementAllowance: 3,
                attackDice: 1,
                constitution: 6,
                imageName: 'baby.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.KNIFE]: {
                effect: WeaponEffect.FOUR_DICE_TO_KILL,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: ['crew1', 'weapon1'],
            goalDice: 0,
            dice: 0
        }];

        const attackReplayElements: ReplayAttackElement[] = [];
        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();

        handleToKillAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, usedWeaponIds);

        expect(rollX6SidedDie).toHaveBeenCalledWith(6); // 2 crew dice + 4 weapon dice
        expect(attackResults['monster1']).toContain(AttackResult.KILL);
        expect(counterMap['monster1'].killed).toBe(true);
    });
});

describe('handleFragmentationAttacks - additional cases', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    //reenable this test when we do a ranged attack that is an area attack
    // it('should add fragments to other area attack groups', () => {
    //     (roll6SidedDie as jest.Mock).mockReturnValue(3);

    //     const counterMap: CounterMap = {
    //         'weapon1': {
    //             id: 'weapon1',
    //             type: CounterType.WEAPON,
    //             weaponType: WeaponType.CAN_OF_ROCKET_FUEL,
    //             stunned: false,
    //             movementAllowance: 0,
    //             attackDice: 0,
    //             constitution: 0,
    //             imageName: 'weapon.png',
    //             usedMovementAllowance: 0,
    //             engaged: false,
    //             spotted: false,
    //             attacking: false,
    //             moved: false
    //         },
    //         'monster1': {
    //             id: 'monster1',
    //             type: CounterType.BABY,
    //             name: 'Baby Monster',
    //             stunned: false,
    //             movementAllowance: 3,
    //             attackDice: 1,
    //             constitution: 2,
    //             imageName: 'baby.png',
    //             usedMovementAllowance: 0,
    //             areaId: 'area1',
    //             coord: { x: 10, y: 10 },
    //             engaged: false,
    //             spotted: false,
    //             attacking: false,
    //             moved: false
    //         }
    //     };

    //     const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
    //         [WeaponType.CAN_OF_ROCKET_FUEL]: {
    //             effect: WeaponEffect.ONE_DIE_FRAGMENTS,
    //             discovered: false
    //         }
    //     };

    //     const attackGroups: AttackGroup[] = [
    //         {
    //             id: 'group1',
    //             areaId: 'area1',
    //             type: AttackGroupType.SINGLE_TARGET,
    //             targetCounterIds: ['monster1'],
    //             attackingCounterIds: ['weapon1'],
    //             goalDice: 0,
    //             dice: 0
    //         },
    //         {
    //             id: 'group2',
    //             areaId: 'area1',
    //             type: AttackGroupType.AREA,
    //             targetCounterIds: [],
    //             attackingCounterIds: ['crew1'],
    //             goalDice: 0,
    //             dice: 0
    //         }
    //     ];

    //     const stackMap: StackMap = {
    //         'area1': {
    //             id: 'area1',
    //             counterIds: ['monster1']
    //         }
    //     };

    //     const attackReplayElements: ReplayAttackElement[] = [];
    //     const attackResults: { [key: string]: AttackResult[] } = {};
    //     const usedWeaponIds = new Set<string>();
    //     const nextCounterId = 100;

    //     const scenario: Partial<Scenario> = {
    //         monsterSettings: {
    //             monsterPropertyMap: {
    //                 [CounterType.FRAGMENT]: {
    //                     movementAllowance: 2,
    //                     attackDice: 1,
    //                     constitution: 1
    //                 }
    //             },
    //             monsterImageCountMap: {
    //                 [CounterType.FRAGMENT]: 5
    //             }
    //         }
    //     } as any;

    //     const result = handleFragmentationAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, scenario as Scenario, usedWeaponIds, nextCounterId, stackMap);

    //     expect(result).toBe(102); // 100 + 2 fragments
    //     expect(attackGroups[1].targetCounterIds.length).toBe(1); // Fragments added to area attack group
    // });

    it('should not fragment non-monster targets', () => {
        (roll6SidedDie as jest.Mock).mockReturnValue(3);

        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.CAN_OF_ROCKET_FUEL,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'crew1': {
                id: 'crew1',
                type: CounterType.CREW,
                name: 'Crew Member',
                movementAllowance: 5,
                attackDice: 2,
                constitution: 3,
                imageName: 'crew.png',
                usedMovementAllowance: 0,
                stunned: false,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.CAN_OF_ROCKET_FUEL]: {
                effect: WeaponEffect.ONE_DIE_FRAGMENTS,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['crew1'],
            attackingCounterIds: ['weapon1'],
            goalDice: 0,
            dice: 0
        }];

        const stackMap: StackMap = {};

        const attackReplayElements: ReplayAttackElement[] = [];
        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();
        const nextCounterId = 100;

        const scenario: Partial<Scenario> = {
            monsterSettings: {
                monsterPropertyMap: {
                    [CounterType.FRAGMENT]: {
                        movementAllowance: 2,
                        attackDice: 1,
                        constitution: 1
                    }
                },
                monsterImageCountMap: {
                    [CounterType.FRAGMENT]: 5
                }
            }
        } as any;

        const result = handleFragmentationAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, scenario as Scenario, usedWeaponIds, nextCounterId, stackMap);

        expect(result).toBe(100); // No fragments created
        expect(attackResults['crew1']).toBeUndefined();
    });
});

describe('handleShrinkAttacks - additional cases', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should shrink fragment to egg', () => {
        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.GAS_GRENADE,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'fragment1': {
                id: 'fragment1',
                type: CounterType.FRAGMENT,
                name: 'Fragment',
                stunned: false,
                movementAllowance: 2,
                attackDice: 1,
                constitution: 1,
                imageName: 'fragment.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.GAS_GRENADE]: {
                effect: WeaponEffect.SHRINK,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['fragment1'],
            attackingCounterIds: ['weapon1'],
            goalDice: 0,
            dice: 0
        }];

        const attackReplayElements: ReplayAttackElement[] = [];
        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();

        const scenario: Partial<Scenario> = {
            monsterSettings: {
                monsterPropertyMap: {
                    [CounterType.EGG]: {
                        movementAllowance: 0,
                        attackDice: 0,
                        constitution: 1
                    }
                },
                monsterImageCountMap: {
                    [CounterType.EGG]: 5
                }
            }
        } as any;

        handleShrinkAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, scenario as Scenario, usedWeaponIds);

        expect(counterMap['fragment1'].type).toBe(CounterType.EGG);
        expect(attackResults['fragment1']).toContain(AttackResult.SHRINK);
        expect(usedWeaponIds).toContain('weapon1');
    });
});

describe('handleGrowAttacks - additional cases', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should grow fragment to baby', () => {
        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.BOTTLE_OF_ACID,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'fragment1': {
                id: 'fragment1',
                type: CounterType.FRAGMENT,
                name: 'Fragment',
                stunned: false,
                movementAllowance: 2,
                attackDice: 1,
                constitution: 1,
                imageName: 'fragment.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.BOTTLE_OF_ACID]: {
                effect: WeaponEffect.GROW,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['fragment1'],
            attackingCounterIds: ['weapon1'],
            goalDice: 0,
            dice: 0
        }];

        const attackReplayElements: ReplayAttackElement[] = [];
        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();

        const scenario: Partial<Scenario> = {
            monsterSettings: {
                monsterPropertyMap: {
                    [CounterType.BABY]: {
                        movementAllowance: 3,
                        attackDice: 1,
                        constitution: 2
                    }
                },
                monsterImageCountMap: {
                    [CounterType.BABY]: 5
                }
            }
        } as any;

        handleGrowAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, scenario as Scenario, usedWeaponIds);

        expect(counterMap['fragment1'].type).toBe(CounterType.BABY);
        expect(attackResults['fragment1']).toContain(AttackResult.GROW);
        expect(usedWeaponIds).toContain('weapon1');
    });
});

describe('handleDroppedWeapons - additional cases', () => {
    it('should not drop weapon if crew is not killed', () => {
        const counterMap: CounterMap = {
            'crew1': {
                id: 'crew1',
                type: CounterType.CREW,
                name: 'Crew Member',
                movementAllowance: 5,
                attackDice: 2,
                constitution: 3,
                imageName: 'crew.png',
                usedMovementAllowance: 0,
                stunned: false,
                areaId: 'area1',
                coord: { x: 10, y: 10 },
                weaponCounterId: 'weapon1',
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.BOTTLE_OF_ACID,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const stackMap: StackMap = {
            'area1': {
                id: 'area1',
                counterIds: ['crew1']
            }
        };

        const gameState: Partial<GameState> = {
            counterMap,
            stackMap
        } as any;

        const attackResults: { [key: string]: AttackResult[] } = {
            'crew1': [AttackResult.STUN] // Not killed
        };

        const scenario: Partial<Scenario> = {} as any;

        handleDroppedWeapons(gameState as GameState, attackResults, scenario as Scenario);

        expect(counterMap['crew1'].weaponCounterId).toBe('weapon1');
        expect(stackMap['area1'].counterIds).not.toContain('weapon1');
    });

    it('should not drop weapon if crew has no weapon', () => {
        const counterMap: CounterMap = {
            'crew1': {
                id: 'crew1',
                type: CounterType.CREW,
                name: 'Crew Member',
                movementAllowance: 5,
                attackDice: 2,
                constitution: 3,
                imageName: 'crew.png',
                usedMovementAllowance: 0,
                stunned: false,
                areaId: 'area1',
                coord: { x: 10, y: 10 },
                weaponCounterId: undefined,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const stackMap: StackMap = {
            'area1': {
                id: 'area1',
                counterIds: ['crew1']
            }
        };

        const gameState: Partial<GameState> = {
            counterMap,
            stackMap
        } as any;

        const attackResults: { [key: string]: AttackResult[] } = {
            'crew1': [AttackResult.KILL]
        };

        const scenario: Partial<Scenario> = {} as any;

        handleDroppedWeapons(gameState as GameState, attackResults, scenario as Scenario);

        expect(counterMap['crew1'].weaponCounterId).toBeUndefined();
        expect(stackMap['area1'].counterIds).toEqual(['crew1']);
    });
});

describe('crewAttack', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (readScenario as jest.Mock).mockReturnValue({
            monsterSettings: {
                monsterPropertyMap: {
                    [CounterType.BABY]: {
                        movementAllowance: 3,
                        attackDice: 1,
                        constitution: 2
                    },
                    [CounterType.ADULT]: {
                        movementAllowance: 4,
                        attackDice: 2,
                        constitution: 3
                    }
                },
                monsterImageCountMap: {
                    [CounterType.BABY]: 5,
                    [CounterType.ADULT]: 5
                }
            },
            board: {
                imageName: 'board.png',
                areaDefinitionMap: {}
            },
            weaponMap: {}
        });
        (createReplay as jest.Mock).mockReturnValue({
            replayElements: {
                attackElements: []
            }
        });
    });

    it('should process crew attack and update game state', () => {
        const postMessage = jest.fn();

        const gameState: Partial<GameState> = {
            id: 'game1',
            scenarioId: 'scenario1',
            phase: Phase.CREW_ATTACK,
            attackGroups: [],
            counterMap: {
                'crew1': {
                    id: 'crew1',
                    type: CounterType.CREW,
                    name: 'Crew Member',
                    movementAllowance: 5,
                    attackDice: 2,
                    constitution: 3,
                    imageName: 'crew.png',
                    usedMovementAllowance: 5,
                    stunned: true,
                    engaged: true,
                    areaId: 'area1',
                    coord: { x: 10, y: 10 },
                    weaponCounterId: undefined,
                    spotted: false,
                    attacking: false,
                    moved: false,
                killed: false
                }
            },
            weaponEffectMap: {},
            stackMap: {},
            nextCounterId: 100,
            players: [
                {
                    id: 'player1',
                    name: 'Player 1',
                    turnStatus: PlayerTurnStatus.FINISHED
                }
            ]
        } as any;

        crewAttack(gameState, postMessage);

        expect(gameState.counterMap!['crew1'].usedMovementAllowance).toBe(0);
        expect(gameState.counterMap!['crew1'].stunned).toBe(false);
        expect(gameState.counterMap!['crew1'].engaged).toBe(false);
        expect(gameState.phase).toBe(Phase.CREW_ATTACK_REPLAY);
        expect(gameState.attackGroups).toEqual([]);
        expect(gameState.players![0].turnStatus).toBe(PlayerTurnStatus.STARTED);
        expect(postMessage).toHaveBeenCalledWith({ status: "notifyClient", payload: { gameId: 'game1', gameState } });
        expect(postMessage).toHaveBeenCalledWith({ status: "done", payload: { gameId: 'game1' } });
    });

    it('should handle errors and send error message', () => {
        const postMessage = jest.fn();
        (readScenario as jest.Mock).mockImplementation(() => {
            throw new Error('Scenario not found');
        });

        const gameState: Partial<GameState> = {
            id: 'game1',
            scenarioId: 'scenario1',
            phase: Phase.CREW_ATTACK,
            attackGroups: [],
            counterMap: {},
            weaponEffectMap: {},
            stackMap: {},
            nextCounterId: 100,
            players: []
        } as any;

        crewAttack(gameState, postMessage);

        expect(postMessage).toHaveBeenCalledWith({ status: "error", payload: { gameId: 'game1', error: expect.any(Error) } });
    });

    it('should filter out invalid attack groups', () => {
        const postMessage = jest.fn();

        const gameState: Partial<GameState> = {
            id: 'game1',
            scenarioId: 'scenario1',
            phase: Phase.CREW_ATTACK,
            attackGroups: [
                {
                    id: 'invalidGroup1',
                    areaId: 'area1',
                    type: AttackGroupType.SINGLE_TARGET,
                    targetCounterIds: [],
                    attackingCounterIds: ['crew1']
                },
                {
                    id: 'invalidGroup2',
                    areaId: 'area1',
                    type: AttackGroupType.SINGLE_TARGET,
                    targetCounterIds: ['monster1'],
                    attackingCounterIds: []
                }
            ],
            counterMap: {},
            weaponEffectMap: {},
            stackMap: {},
            nextCounterId: 100,
            players: []
        } as any;

        crewAttack(gameState, postMessage);

        expect(postMessage).toHaveBeenCalledWith({ status: "notifyClient", payload: { gameId: 'game1', gameState: expect.any(Object) } });
    });
});

describe('handleToKillAttacks - branch coverage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should handle empty attackingIds array', () => {
        const counterMap: CounterMap = {
            'monster1': {
                id: 'monster1',
                type: CounterType.BABY,
                name: 'Baby Monster',
                stunned: false,
                movementAllowance: 3,
                attackDice: 1,
                constitution: 2,
                imageName: 'baby.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {};

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: [],
            goalDice: 0,
            dice: 0
        }];

        const attackReplayElements: ReplayAttackElement[] = [];
        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();

        handleToKillAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, usedWeaponIds);

        expect(rollX6SidedDie).not.toHaveBeenCalled();
        expect(attackResults['monster1']).toBeUndefined();
    });

    it('should handle null target counter', () => {
        (rollX6SidedDie as jest.Mock).mockReturnValue(5);

        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.KNIFE,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.KNIFE]: {
                effect: WeaponEffect.FIVE_DICE_TO_KILL,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'], // monster1 doesn't exist in counterMap
            attackingCounterIds: ['weapon1'],
            goalDice: 0,
            dice: 0
        }];

        const attackReplayElements: ReplayAttackElement[] = [];
        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();

        handleToKillAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, usedWeaponIds);

        expect(rollX6SidedDie).toHaveBeenCalledWith(5);
        expect(attackResults['monster1']).toBeUndefined(); // No result since target is null
    });
});

describe('handleGrowAttacks - branch coverage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should handle null target counter', () => {
        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.BOTTLE_OF_ACID,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.BOTTLE_OF_ACID]: {
                effect: WeaponEffect.GROW,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'], // monster1 doesn't exist
            attackingCounterIds: ['weapon1'],
            goalDice: 0,
            dice: 0
        }];

        const attackReplayElements: ReplayAttackElement[] = [];
        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();

        const scenario: Partial<Scenario> = {
            monsterSettings: {
                monsterPropertyMap: {},
                monsterImageCountMap: {}
            }
        } as any;

        handleGrowAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, scenario as Scenario, usedWeaponIds);

        expect(attackResults['monster1']).toBeUndefined();
        expect(usedWeaponIds).not.toContain('weapon1');
    });
});

describe('handleShrinkAttacks - branch coverage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should handle null target counter', () => {
        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.GAS_GRENADE,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.GAS_GRENADE]: {
                effect: WeaponEffect.SHRINK,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'], // monster1 doesn't exist
            attackingCounterIds: ['weapon1'],
            goalDice: 0,
            dice: 0
        }];

        const attackReplayElements: ReplayAttackElement[] = [];
        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();

        const scenario: Partial<Scenario> = {
            monsterSettings: {
                monsterPropertyMap: {},
                monsterImageCountMap: {}
            }
        } as any;

        handleShrinkAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, scenario as Scenario, usedWeaponIds);

        expect(attackResults['monster1']).toBeUndefined();
        expect(usedWeaponIds).toContain('weapon1'); // Weapon is still marked as used
    });
});

describe('handleDroppedWeapons - branch coverage', () => {
    it('should handle null counter in attack results', () => {
        const counterMap: CounterMap = {};

        const stackMap: StackMap = {
            'area1': {
                id: 'area1',
                counterIds: []
            }
        };

        const gameState: Partial<GameState> = {
            counterMap,
            stackMap
        } as any;

        const attackResults: { [key: string]: AttackResult[] } = {
            'nonexistent': [AttackResult.KILL]
        };

        const scenario: Partial<Scenario> = {} as any;

        handleDroppedWeapons(gameState as GameState, attackResults, scenario as Scenario);

        expect(stackMap['area1'].counterIds).toEqual([]);
    });
});

describe('updateWeaponEffects - branch coverage', () => {
    it('should handle null counter in usedWeaponIds', () => {
        const counterMap: CounterMap = {};

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.BOTTLE_OF_ACID]: {
                effect: WeaponEffect.GROW,
                discovered: false
            }
        };

        const gameState: Partial<GameState> = {
            counterMap,
            weaponEffectMap
        } as any;

        const usedWeaponIds = new Set(['nonexistent']);

        updateWeaponEffects(gameState as GameState, usedWeaponIds);

        expect(weaponEffectMap[WeaponType.BOTTLE_OF_ACID].discovered).toBe(false);
    });

    it('should handle non-weapon counter in usedWeaponIds', () => {
        const counterMap: CounterMap = {
            'crew1': {
                id: 'crew1',
                type: CounterType.CREW,
                name: 'Crew Member',
                movementAllowance: 5,
                attackDice: 2,
                constitution: 3,
                imageName: 'crew.png',
                usedMovementAllowance: 0,
                stunned: false,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.BOTTLE_OF_ACID]: {
                effect: WeaponEffect.GROW,
                discovered: false
            }
        };

        const gameState: Partial<GameState> = {
            counterMap,
            weaponEffectMap
        } as any;

        const usedWeaponIds = new Set(['crew1']);

        updateWeaponEffects(gameState as GameState, usedWeaponIds);

        expect(weaponEffectMap[WeaponType.BOTTLE_OF_ACID].discovered).toBe(false);
    });
});

describe('updateNonReusableWeapons - branch coverage', () => {
    it('should handle null counter in usedWeaponIds', () => {
        const counterMap: CounterMap = {};

        const stackMap: StackMap = {};

        const gameState: Partial<GameState> = {
            counterMap,
            stackMap
        } as any;

        const usedWeaponIds = new Set(['nonexistent']);

        const scenario: Partial<Scenario> = {
            board: {
                imageName: 'board.png',
                areaDefinitionMap: {}
            },
            weaponMap: {}
        } as any;

        updateNonReusableWeapons(gameState as GameState, usedWeaponIds, scenario as Scenario);

        expect(counterMap).toEqual({});
    });

    it('should handle weaponStack not found in area', () => {
        const counterMap: CounterMap = {
            'crew1': {
                id: 'crew1',
                type: CounterType.CREW,
                name: 'Crew Member',
                movementAllowance: 5,
                attackDice: 2,
                constitution: 3,
                imageName: 'crew.png',
                usedMovementAllowance: 0,
                stunned: false,
                areaId: 'area1',
                coord: { x: 10, y: 10 },
                weaponCounterId: 'weapon1',
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.BOTTLE_OF_ACID,
                ownerCounterId: 'crew1',
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const stackMap: StackMap = {
            'area1': {
                id: 'area1',
                counterIds: ['crew1']
            }
        };

        const gameState: Partial<GameState> = {
            counterMap,
            stackMap
        } as any;

        const usedWeaponIds = new Set(['weapon1']);

        const scenario: Partial<Scenario> = {
            board: {
                imageName: 'board.png',
                areaDefinitionMap: {
                    'area1': {
                        id: 'area1',
                        name: 'Area 1',
                        apertures: [],
                        polygon: [],
                        weaponStacks: [] // No weapon stacks
                    }
                }
            },
            weaponMap: {
                [WeaponType.BOTTLE_OF_ACID]: {
                    reuseable: false
                }
            }
        } as any;

        updateNonReusableWeapons(gameState as GameState, usedWeaponIds, scenario as Scenario);

        expect(counterMap['crew1'].weaponCounterId).toBeUndefined();
        expect(counterMap['weapon1'].ownerCounterId).toBeUndefined();
        expect(counterMap['weapon1'].areaId).toBeUndefined(); // Weapon not moved since no stack found
    });

    it('should handle non-weapon counter in usedWeaponIds', () => {
        const counterMap: CounterMap = {
            'crew1': {
                id: 'crew1',
                type: CounterType.CREW,
                name: 'Crew Member',
                movementAllowance: 5,
                attackDice: 2,
                constitution: 3,
                imageName: 'crew.png',
                usedMovementAllowance: 0,
                stunned: false,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const stackMap: StackMap = {};

        const gameState: Partial<GameState> = {
            counterMap,
            stackMap
        } as any;

        const usedWeaponIds = new Set(['crew1']);

        const scenario: Partial<Scenario> = {
            board: {
                imageName: 'board.png',
                areaDefinitionMap: {}
            },
            weaponMap: {}
        } as any;

        updateNonReusableWeapons(gameState as GameState, usedWeaponIds, scenario as Scenario);

        expect(counterMap['crew1']).toBeDefined();
    });
});

describe('handleStunAttacks - branch coverage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should handle empty attackingIds array', () => {
        const counterMap: CounterMap = {
            'monster1': {
                id: 'monster1',
                type: CounterType.BABY,
                name: 'Baby Monster',
                stunned: false,
                movementAllowance: 3,
                attackDice: 1,
                constitution: 2,
                imageName: 'baby.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {};

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: [],
            goalDice: 0,
            dice: 0
        }];

        const attackReplayElements: ReplayAttackElement[] = [];
        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();

        handleStunAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, usedWeaponIds);

        expect(rollX6SidedDie).not.toHaveBeenCalled();
        expect(attackResults['monster1']).toBeUndefined();
    });

    it('should handle null target counter', () => {
        (rollX6SidedDie as jest.Mock).mockReturnValue(5);

        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.STUN_PISTOL,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.STUN_PISTOL]: {
                effect: WeaponEffect.FIVE_DICE_TO_STUN,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'], // monster1 doesn't exist
            attackingCounterIds: ['weapon1'],
            goalDice: 0,
            dice: 0
        }];

        const attackReplayElements: ReplayAttackElement[] = [];
        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();

        handleStunAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, usedWeaponIds);

        expect(rollX6SidedDie).toHaveBeenCalledWith(5);
        expect(attackResults['monster1']).toBeUndefined(); // No result since target is null
    });

    it('should handle target without constitution', () => {
        (rollX6SidedDie as jest.Mock).mockReturnValue(5);

        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.STUN_PISTOL,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'monster1': {
                id: 'monster1',
                type: CounterType.BABY,
                name: 'Baby Monster',
                stunned: false,
                movementAllowance: 3,
                attackDice: 1,
                constitution: undefined as any, // No constitution
                imageName: 'baby.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.STUN_PISTOL]: {
                effect: WeaponEffect.FIVE_DICE_TO_STUN,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: ['weapon1'],
            goalDice: 0,
            dice: 0
        }];

        const attackReplayElements: ReplayAttackElement[] = [];
        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();

        handleStunAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, usedWeaponIds);

        expect(rollX6SidedDie).toHaveBeenCalledWith(5);
        expect(attackResults['monster1']).toBeUndefined(); // No result since no constitution
    });
});

describe('handleFragmentationAttacks - branch coverage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should handle null target counter', () => {
        (roll6SidedDie as jest.Mock).mockReturnValue(3);

        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.CAN_OF_ROCKET_FUEL,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.CAN_OF_ROCKET_FUEL]: {
                effect: WeaponEffect.ONE_DIE_FRAGMENTS,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'], // monster1 doesn't exist
            attackingCounterIds: ['weapon1'],
            goalDice: 0,
            dice: 0
        }];

        const stackMap: StackMap = {};

        const attackReplayElements: ReplayAttackElement[] = [];
        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();
        const nextCounterId = 100;

        const scenario: Partial<Scenario> = {
            monsterSettings: {
                monsterPropertyMap: {
                    [CounterType.FRAGMENT]: {
                        movementAllowance: 2,
                        attackDice: 1,
                        constitution: 1
                    }
                },
                monsterImageCountMap: {
                    [CounterType.FRAGMENT]: 5
                }
            }
        } as any;

        const result = handleFragmentationAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, scenario as Scenario, usedWeaponIds, nextCounterId, stackMap);

        expect(result).toBe(100); // No fragments created
        expect(attackResults['monster1']).toBeUndefined();
        expect(usedWeaponIds).not.toContain('weapon1');
    });
});

describe('handleToKillAttacks - additional branch coverage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should handle target without constitution', () => {
        (rollX6SidedDie as jest.Mock).mockReturnValue(5);

        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.KNIFE,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'monster1': {
                id: 'monster1',
                type: CounterType.BABY,
                name: 'Baby Monster',
                stunned: false,
                movementAllowance: 3,
                attackDice: 1,
                constitution: undefined as any, // No constitution
                imageName: 'baby.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.KNIFE]: {
                effect: WeaponEffect.FIVE_DICE_TO_KILL,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: ['weapon1'],
            goalDice: 0,
            dice: 0
        }];

        const attackReplayElements: ReplayAttackElement[] = [];
        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();

        handleToKillAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, usedWeaponIds);

        expect(rollX6SidedDie).toHaveBeenCalledWith(5);
        expect(attackResults['monster1']).toBeUndefined(); // No result since no constitution
    });

    it('should handle roll below constitution', () => {
        (rollX6SidedDie as jest.Mock).mockReturnValue(2);

        const counterMap: CounterMap = {
            'weapon1': {
                id: 'weapon1',
                type: CounterType.WEAPON,
                weaponType: WeaponType.KNIFE,
                stunned: false,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: 'weapon.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'monster1': {
                id: 'monster1',
                type: CounterType.BABY,
                name: 'Baby Monster',
                stunned: false,
                movementAllowance: 3,
                attackDice: 1,
                constitution: 5,
                imageName: 'baby.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {
            [WeaponType.KNIFE]: {
                effect: WeaponEffect.FIVE_DICE_TO_KILL,
                discovered: false
            }
        };

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: ['weapon1'],
            goalDice: 0,
            dice: 0
        }];

        const attackReplayElements: ReplayAttackElement[] = [];
        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();

        handleToKillAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, usedWeaponIds);

        expect(rollX6SidedDie).toHaveBeenCalledWith(5);
        expect(attackResults['monster1']).toBeUndefined(); // No result since roll < constitution
    });
});

describe('handleGrowAttacks - additional branch coverage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should handle non-weapon counter', () => {
        const counterMap: CounterMap = {
            'crew1': {
                id: 'crew1',
                type: CounterType.CREW,
                name: 'Crew Member',
                movementAllowance: 5,
                attackDice: 2,
                constitution: 3,
                imageName: 'crew.png',
                usedMovementAllowance: 0,
                stunned: false,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'monster1': {
                id: 'monster1',
                type: CounterType.BABY,
                name: 'Baby Monster',
                stunned: false,
                movementAllowance: 3,
                attackDice: 1,
                constitution: 2,
                imageName: 'baby.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {};

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: ['crew1'],
            goalDice: 0,
            dice: 0
        }];

        const attackReplayElements: ReplayAttackElement[] = [];
        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();

        const scenario: Partial<Scenario> = {
            monsterSettings: {
                monsterPropertyMap: {},
                monsterImageCountMap: {}
            }
        } as any;

        handleGrowAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, scenario as Scenario, usedWeaponIds);

        expect(attackResults['monster1']).toBeUndefined();
        expect(usedWeaponIds).not.toContain('crew1');
    });
});

describe('handleShrinkAttacks - additional branch coverage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should handle non-weapon counter', () => {
        const counterMap: CounterMap = {
            'crew1': {
                id: 'crew1',
                type: CounterType.CREW,
                name: 'Crew Member',
                movementAllowance: 5,
                attackDice: 2,
                constitution: 3,
                imageName: 'crew.png',
                usedMovementAllowance: 0,
                stunned: false,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            },
            'monster1': {
                id: 'monster1',
                type: CounterType.BABY,
                name: 'Baby Monster',
                stunned: false,
                movementAllowance: 3,
                attackDice: 1,
                constitution: 2,
                imageName: 'baby.png',
                usedMovementAllowance: 0,
                engaged: false,
                spotted: false,
                attacking: false,
                moved: false,
                killed: false
            }
        };

        const weaponEffectMap: { [key: string]: WeaponEffectEntry } = {};

        const attackGroups: AttackGroup[] = [{
            id: 'group1',
            areaId: 'area1',
            type: AttackGroupType.SINGLE_TARGET,
            targetCounterIds: ['monster1'],
            attackingCounterIds: ['crew1'],
            goalDice: 0,
            dice: 0
        }];

        const attackReplayElements: ReplayAttackElement[] = [];
        const attackResults: { [key: string]: AttackResult[] } = {};
        const usedWeaponIds = new Set<string>();

        const scenario: Partial<Scenario> = {
            monsterSettings: {
                monsterPropertyMap: {},
                monsterImageCountMap: {}
            }
        } as any;

        handleShrinkAttacks(attackReplayElements, attackGroups, counterMap, weaponEffectMap, attackResults, scenario as Scenario, usedWeaponIds);

        expect(attackResults['monster1']).toBeUndefined();
        expect(usedWeaponIds).not.toContain('crew1');
    });
});
