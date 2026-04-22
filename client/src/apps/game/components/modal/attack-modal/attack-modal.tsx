import "./attack-modal.css";
import { useState } from "react";
import React from "react";
import Modal from "../modal";
import { useDispatch, useSelector } from "react-redux";
import { Stack, Counter, CounterType } from "../../../../../shared/types/game-types";
import { isCrew, isMonster } from "../../../../../shared/utils/counter-utils";
import { RootState } from "../../../../../constants/store";

interface CounterDisplayProps {
    counter: Counter;
    selected: boolean;
    unavailable?: boolean;
    onClick: () => void;
    isWeapon?: boolean;
}

const toggleWeaponSelection = (weaponId: string) => {
    if (activeGroupId) {
        // Add weapon to active group instead of selection
        addWeaponToActiveGroup(weaponId);
    } else {
        // Weapon selection for creating new groups
        const usedWeaponIds = attackGroups?.flatMap(group => group.attackingCounters?.map(c => c.id))?.filter(Boolean) || [];
        if (usedWeaponIds.includes(weaponId)) return; // Prevent selection if already in a group

        setSelectedCrew(prev =>
            prev.includes(weaponId)
                ? prev.filter(id => id !== weaponId)
                : [...prev, weaponId]
        );
    }
}

const CounterDisplay = ({ counter, selected, unavailable = false, onClick, isWeapon = false }: CounterDisplayProps) => {
    const imageUrl = `/images/${counter.imageName}.png`;
    const counterMap = useSelector((state: RootState) => state.counterMap);

    const renderWeapon = () => {
        if (counter.weaponCounterId) {
            const weaponCounter = counterMap[counter.weaponCounterId];
            if (weaponCounter) {
                return (
                    <div className="sidebar-counter-weapon" onClick={(e) => {
                        e.stopPropagation();
                        toggleWeaponSelection(counter.weaponCounterId);
                    }}>
                        <img className="sidebar-counter-weapon-image" src={`/images/${weaponCounter.imageName}.png`} alt={weaponCounter.name} />
                    </div>
                );
            }
        }
        return null;
    };

    const renderCounterData = () => {
        if (isMonster(counter)) {
            return (
                <div className="sidebar-counter-data">
                    {counter.name}<br />
                    Mv: {counter.movementAllowance - counter.usedMovementAllowance}/{counter.movementAllowance}
                </div>
            );
        }

        return (
            <div className="sidebar-counter-data">
                {counter.name}<br />
                Mv: {counter.movementAllowance - counter.usedMovementAllowance}/{counter.movementAllowance}
            </div>
        );
    };

    return (
        <div
            className={`sidebar-counter ${selected ? 'selected' : ''} ${unavailable ? 'unavailable' : ''}`}
            onClick={unavailable ? undefined : onClick}
        >
            <div className="sidebar-counter-main">
                <div className="sidebar-counter-content">
                    <img className="sidebar-counter-image" src={imageUrl} alt={counter.imageName} />
                    {renderCounterData()}
                </div>
                {renderWeapon()}
            </div>
        </div>
    );
};

interface AttackGroup {
    id: string;
    attackingCounters: Counter[];
    targetCounters: Counter[];
}

interface PropTypes {
    closeHandler: () => void;
    show: boolean;
    areaId?: string;
    stack?: Stack;
    title: string;
}

export const AttackModal = (props: PropTypes) => {
    const dispatch = useDispatch();
    const counterMap = useSelector((state: RootState) => state.counterMap);
    const [attackGroups, setAttackGroups] = useState<AttackGroup[]>([]);
    const [selectedCrew, setSelectedCrew] = useState<string[]>([]);
    const [selectedMonsters, setSelectedMonsters] = useState<string[]>([]);
    const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

    const handleClose = () => {
        props.closeHandler();
    }

    const getStackCounters = (): Counter[] => {
        if (!props.stack || !counterMap) return [];
        return props.stack.counterIds.map(id => counterMap[id]).filter(Boolean);
    }

    const getAvailableCrewCounters = (): Counter[] => {
        const allCrew = getStackCounters().filter(counter => isCrew(counter));
        const usedAttackIds = attackGroups?.flatMap(group => group.attackingCounters.map(c => c.id)) || [];
        const usedWeaponIds = attackGroups?.flatMap(group =>
            group.attackingCounters
                .filter(counter => counter.weaponCounterId)
                .map(counter => counter.weaponCounterId)
        ) || [];

        return allCrew.filter(counter => {
            // Crew is unavailable if either itself or its weapon is used
            return !usedAttackIds.includes(counter.id) && !usedWeaponIds.includes(counter.id);
        });
    }

    const getAvailableWeapons = (): Counter[] => {
        const allWeapons = getStackCounters().filter(counter => counter.type === CounterType.WEAPON);
        const usedWeaponIds = attackGroups?.flatMap(group => group.attackingCounters.map(c => c.id)) || [];
        const usedCrewIds = attackGroups?.flatMap(group =>
            group.attackingCounters
                .filter(counter => isCrew(counter))
                .map(counter => counter.id)
        ) || [];

        return allWeapons.filter(weapon => {
            // Weapon is unavailable if either itself or its crew is used
            const crewCounter = Object.values(counterMap).find(counter =>
                counter.weaponCounterId === weapon.id
            );
            return !usedWeaponIds.includes(weapon.id) &&
                (!crewCounter || !usedCrewIds.includes(crewCounter.id));
        });
    }

    const getAvailableMonsterCounters = (): Counter[] => {
        const allMonsters = getStackCounters().filter(counter => isMonster(counter));
        const usedMonsterIds = attackGroups?.flatMap(group => group.targetCounters.map(m => m.id)) || [];

        return allMonsters.filter(counter => !usedMonsterIds.includes(counter.id));
    }

    const getCrewCounters = (): Counter[] => {
        return getStackCounters().filter(counter => isCrew(counter));
    }

    const getMonsterCounters = (): Counter[] => {
        return getStackCounters().filter(counter => isMonster(counter));
    }

    const toggleCrewSelection = (counterId: string) => {
        if (activeGroupId) {
            // Add to active group instead of selection
            addCrewToActiveGroup(counterId);
        } else {
            // Existing selection logic for creating new groups
            const usedCrewIds = attackGroups?.flatMap(group => group.attackingCounters?.map(c => c.id))?.filter(Boolean) || [];
            if (usedCrewIds.includes(counterId)) return; // Prevent selection if already in a group

            setSelectedCrew(prev =>
                prev.includes(counterId)
                    ? prev.filter(id => id !== counterId)
                    : [...prev, counterId]
            );
        }
    }

    const addCrewToActiveGroup = (counterId: string) => {
        if (!activeGroupId) return;

        setAttackGroups((prevAttackGroups: AttackGroup[]) => {
            return prevAttackGroups.map(group => {
                if (group.id === activeGroupId) {
                    const counter = counterMap[counterId];
                    if (!counter || group.attackingCounters.some(c => c.id === counterId)) return group; // Already in group

                    return {
                        ...group,
                        attackingCounters: [...group.attackingCounters, counter]
                    };
                }
                return group;
            });
        });
    };

    const addWeaponToActiveGroup = (weaponId: string) => {
        if (!activeGroupId) return;

        setAttackGroups((prevAttackGroups: AttackGroup[]) => {
            return prevAttackGroups.map(group => {
                if (group.id === activeGroupId) {
                    const weapon = counterMap[weaponId];
                    if (!weapon || group.attackingCounters.some(c => c.id === weaponId)) return group; // Already in group

                    return {
                        ...group,
                        attackingCounters: [...group.attackingCounters, weapon]
                    };
                }
                return group;
            });
        });
    };

    const toggleMonsterSelection = (counterId: string) => {
        const usedMonsterIds = attackGroups?.flatMap(group => group.targetCounters?.map(m => m.id))?.filter(Boolean) || [];
        if (usedMonsterIds.includes(counterId)) return; // Prevent selection if already in a group

        setSelectedMonsters(prev => {
            if (prev.includes(counterId)) {
                return prev.filter(id => id !== counterId);
            } else if (prev.length === 0) {
                return [counterId]; // Only allow one monster selection
            } else {
                return prev; // Prevent multiple monster selection
            }
        });
    };

    const createAttackGroup = () => {
        if (selectedCrew.length === 0 || selectedMonsters.length === 0) return;
        if (selectedMonsters.length > 1) return; // Ensure only one monster per group

        const crew = selectedCrew.map(id => counterMap[id]).filter(Boolean);
        const monsters = selectedMonsters.map(id => counterMap[id]).filter(Boolean);

        const newGroup: AttackGroup = {
            id: `group-${Date.now()}`,
            attackingCounters: crew,
            targetCounters: monsters
        };

        setAttackGroups(prevAttackGroups => [...prevAttackGroups, newGroup]);
        setSelectedCrew([]);
        setSelectedMonsters([]);
    }

    const handleGroupClick = (groupId: string) => {
        setActiveGroupId(groupId === activeGroupId ? null : groupId);
    };

    const removeCounterFromGroup = (groupId: string, counterId: string) => {
        const updatedGroups = attackGroups.map(group => {
            if (group.id === groupId) {
                const updatedGroup = {
                    ...group,
                    crew: group.attackingCounters?.filter((c: Counter) => c.id !== counterId) || [],
                    monsters: group.targetCounters?.filter((m: Counter) => m.id !== counterId) || []
                };

                // If group is empty after removal, delete it
                if (updatedGroup.crew.length === 0 && updatedGroup.monsters.length === 0) {
                    return null; // This will be filtered out
                }

                return updatedGroup;
            }
            return group;
        });
        setAttackGroups(updatedGroups.filter((group: AttackGroup | null) => group !== null) as AttackGroup[]);
    };

    const removeAttackGroup = (groupId: string) => {
        setAttackGroups((prevAttackGroups: AttackGroup[]) => prevAttackGroups.filter(group => group.id !== groupId));
        if (activeGroupId === groupId) {
            setActiveGroupId(null);
        }
    }

    const handleSubmit = () => {
        // TODO: Handle attack submission logic
        console.log('Attack groups:', attackGroups);
        handleClose();
    }

    const submitForm = async (formData: FormData) => {
        // if (taskForce === undefined || props.planet === undefined || props.star === undefined) {
        //     return;
        // } else {
        //     return null;
        // }
    }

    if (props.show) {
        const crewCounters = getCrewCounters();
        const monsterCounters = getMonsterCounters();

        return (
            <Modal showHideClassName='modal display-block' title={props.title} handleClose={handleClose}>
                <div className='attack-modal'>
                    <div className="attack-modal-layout">
                        {/* Left Sidebar - Crew Counters */}
                        <div className="attack-modal-sidebar attack-modal-crew">
                            <h3>Crew</h3>
                            <div className="counter-list">
                                {getAvailableCrewCounters().map(counter => (
                                    <CounterDisplay
                                        key={counter.id}
                                        counter={counter}
                                        selected={selectedCrew.includes(counter.id)}
                                        onClick={() => toggleCrewSelection(counter.id)}
                                    />
                                ))}
                                {getCrewCounters().filter(counter => !getAvailableCrewCounters().includes(counter)).map(counter => (
                                    <CounterDisplay
                                        key={counter.id}
                                        counter={counter}
                                        selected={false}
                                        unavailable={true}
                                        onClick={() => { }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Center - Attack Groups and Buttons */}
                        <div className="attack-modal-center">
                            <div className="attack-groups-section">
                                <h3>Attack Groups</h3>
                                <div className="attack-groups">
                                    {attackGroups.map(group => (
                                        <div key={group.id} className={`attack-group ${group.id === activeGroupId ? 'active' : ''}`}
                                            onClick={() => handleGroupClick(group.id)}
                                        >
                                            <div className="group-counters">
                                                <div className="group-counters-list">
                                                    {[...group.attackingCounters, ...group.targetCounters].map((counter: Counter) => (
                                                        <div key={counter.id} className="group-counter"
                                                            onContextMenu={(e) => {
                                                                e.preventDefault();
                                                                removeCounterFromGroup(group.id, counter.id);
                                                            }}
                                                        >
                                                            <img
                                                                className="group-counter-image-large"
                                                                src={`/images/${counter.imageName}.png`}
                                                                alt={counter.imageName}
                                                                title={`${counter.name || counter.type} (${isCrew(counter) ? 'Crew' : 'Monster'})`}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <button
                                                className="remove-group-x-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeAttackGroup(group.id);
                                                }}
                                                title="Remove group"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    {attackGroups.length === 0 && (
                                        <div className="no-groups">No attack groups created</div>
                                    )}
                                </div>
                            </div>

                            <div className="attack-modal-buttons">
                                <button
                                    className="attack-modal-button create-group-btn"
                                    onClick={createAttackGroup}
                                    disabled={selectedCrew.length === 0 || selectedMonsters.length === 0}
                                >
                                    Create Group
                                </button>
                                <button className="attack-modal-button cancel-btn" onClick={handleClose}>
                                    Cancel
                                </button>
                                <button
                                    className="attack-modal-button submit-btn"
                                    onClick={handleSubmit}
                                    disabled={attackGroups.length === 0}
                                >
                                    Submit Attack
                                </button>
                            </div>
                        </div>

                        {/* Right Sidebar - Monster Counters */}
                        <div className="attack-modal-sidebar attack-modal-monsters">
                            <h3>Monsters</h3>
                            <div className="counter-list">
                                {getAvailableMonsterCounters().map(counter => (
                                    <CounterDisplay
                                        key={counter.id}
                                        counter={counter}
                                        selected={selectedMonsters.includes(counter.id)}
                                        onClick={() => toggleMonsterSelection(counter.id)}
                                    />
                                ))}
                                {getMonsterCounters().filter(counter => !getAvailableMonsterCounters().includes(counter)).map(counter => (
                                    <CounterDisplay
                                        key={counter.id}
                                        counter={counter}
                                        selected={false}
                                        unavailable={true}
                                        onClick={() => { }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        )
    } else {
        return null;
    }
}