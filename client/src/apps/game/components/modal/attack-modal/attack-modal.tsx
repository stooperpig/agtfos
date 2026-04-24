import "./attack-modal.css";
import { useState } from "react";
import React from "react";
import Modal from "../modal";
import { useDispatch, useSelector } from "react-redux";
import { Stack, Counter, CounterType, AttackGroup } from "../../../../../shared/types/game-types";
import { isCrew, isMonster } from "../../../../../shared/utils/counter-utils";
import { RootState, useAppDispatch, useAppSelector } from "../../../../../constants/store";
import { CounterDisplay } from "./counter-display";
import { ActionAddCounterToAttackGroup, ActionCreateAttackGroup, ActionDeleteAttackGroup, ActionRemoveCounterFromAttackGroup, ActionType } from "../../../../../shared/types/action-types";
import { putData } from "../../../../../api/api-utils";
import { socketId } from '../../../../../api/web-socket';
import { AttackGroupDisplay } from "./attack-group-display";

interface PropTypes {
    closeHandler: () => void;
    show: boolean;
    areaId?: string;
    stack?: Stack;
    title: string;
}

export const AttackModal = (props: PropTypes) => {
    const dispatch = useAppDispatch();
    const gameId = useAppSelector((state: RootState) => state.id);
    const counterMap = useAppSelector((state: RootState) => state.counterMap);
    const allAttackGroups = useAppSelector((state: RootState) => state.attackGroups ?? []);
    //const [attackGroups, setAttackGroups] = useState<AttackGroup[]>([]);
    const [selectedCrewOrWeapon, setSelectedCrewOrWeapon] = useState<string[]>([]);
    const [selectedMonsters, setSelectedMonsters] = useState<string[]>([]);
    const [activeGroupId, setActiveGroupId] = useState<string | undefined>(undefined);

    const attackGroups = allAttackGroups.filter(attackGroup => attackGroup.areaId === props.areaId);

    const handleClose = () => {
        props.closeHandler();
    }

    const getStackCounters = (): Counter[] => {
        if (!props.stack || !counterMap) return [];
        return props.stack.counterIds.map(id => counterMap[id]).filter(Boolean);
    }

    const getAvailableCrewCounters = (): Counter[] => {
        const allCrew = getStackCounters().filter(counter => isCrew(counter));
        const usedAttackIds = attackGroups?.flatMap(group => group.attackingCounterIds.map(counterId => counterId)) || [];

        return allCrew.filter(counter => {
            // Crew is unavailable if either itself or its weapon is used
            return !usedAttackIds.includes(counter.id) && !usedAttackIds.includes(counter.weaponCounterId || '');
        });
    }

    const getAvailableMonsterCounters = (): Counter[] => {
        const allMonsters = getStackCounters().filter(counter => isMonster(counter));
        const usedMonsterIds = attackGroups?.flatMap(group => group.targetCounterIds.map(counterId => counterId)) || [];

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
            addCrewOrWeaponToActiveGroup(counterId);
        } else {
            // Existing selection logic for creating new groups
            const usedCrewIds = attackGroups?.flatMap(group => group.attackingCounterIds)?.filter(Boolean) || [];
            if (usedCrewIds.includes(counterId)) {
                return; // Prevent selection if already in a group
            }

            setSelectedCrewOrWeapon(prev => prev.includes(counterId) ? prev.filter(id => id !== counterId) : [...prev, counterId]);
        }
    }

    const addCrewOrWeaponToActiveGroup = (counterId: string) => {
        if (!activeGroupId) return;

        const action: ActionAddCounterToAttackGroup = {
            type: ActionType.ADD_COUNTER_TO_ATTACK_GROUP,
            payload: {
                attackGroupId: activeGroupId,
                attackingCounterId: counterId,
            }
        };

        console.log(JSON.stringify(action));
        putData(`api/games/${gameId}/attackgroup`, { socketId, action: action }).then((resp) => {
            dispatch(action);
            setActiveGroupId(action.payload.attackGroupId);
            //setSelectedCrewOrWeapon([]);
            //setSelectedMonsters([]);
        }).catch((resp) => {
            dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: resp.message });
        });

        // setAttackGroups((prevAttackGroups: AttackGroup[]) => {
        //     return prevAttackGroups.map(group => {
        //         if (group.id === activeGroupId) {
        //             const counter = counterMap[counterId];
        //             if (!counter || group.attackingCounterIds.includes(counterId)) return group; // Already in group

        //             return {
        //                 ...group,
        //                 attackingCounters: [...group.attackingCounterIds, counter]
        //             };
        //         }
        //         return group;
        //     });
        // });
    };

    const addMonsterToActiveGroup = (counterId: string) => {
        if (!activeGroupId) {
            return;
        }

        const group = attackGroups?.find(group => group.id === activeGroupId);
        if (group?.targetCounterIds.some(counterId => isMonster(counterMap[counterId]))) {
            return;
        }

        const action: ActionAddCounterToAttackGroup = {
            type: ActionType.ADD_COUNTER_TO_ATTACK_GROUP,
            payload: {
                attackGroupId: activeGroupId,
                targetCounterId: counterId,
            }
        };

        console.log(JSON.stringify(action));
        putData(`api/games/${gameId}/attackgroup`, { socketId, action: action }).then((resp) => {
            dispatch(action);
            setActiveGroupId(action.payload.attackGroupId);
            //setSelectedCrewOrWeapon([]);
            //setSelectedMonsters([]);
        }).catch((resp) => {
            dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: resp.message });
        });

        // setAttackGroups((prevAttackGroups: AttackGroup[]) => {
        //     return prevAttackGroups.map(group => {
        //         if (group.id === activeGroupId) {
        //             const counter = counterMap[counterId];
        //             if (!counter || group.targetCounterIds.includes(counterId)) return group; // Already in group

        //             return {
        //                 ...group,
        //                 targetCounters: [...group.targetCounterIds, counter]
        //             };
        //         }
        //         return group;
        //     });
        // });
    };

    const toggleMonsterSelection = (counterId: string) => {
        if (selectedMonsters.includes(counterId)) {
            setSelectedMonsters(prev => prev.filter(id => id !== counterId));
            return;
        }

        if (selectedMonsters.length >= 1) {
            return;
        }

        if (activeGroupId) {
            // Add to active group instead of selection
            addMonsterToActiveGroup(counterId);
        } else {
            // Existing selection logic for creating new groups
            const usedMonsterIds = attackGroups?.flatMap(group => group.targetCounterIds)?.filter(Boolean) || [];
            if (usedMonsterIds.includes(counterId)) {
                return; // Prevent selection if already in a group
            }

            setSelectedMonsters(prev => prev.includes(counterId) ? prev.filter(id => id !== counterId) : [...prev, counterId]);
        }
    };

    const createAttackGroup = () => {
        console.log('create attack group');
        const action: ActionCreateAttackGroup = {
            type: ActionType.CREATE_ATTACK_GROUP,
            payload: {
                areaId: props.areaId!,
                attackGroupId: crypto.randomUUID(),
            }
        };

        console.log(JSON.stringify(action));
        putData(`api/games/${gameId}/attackgroup`, { socketId, action: action }).then((resp) => {
            dispatch(action);
            setActiveGroupId(action.payload.attackGroupId);
            setSelectedCrewOrWeapon([]);
            setSelectedMonsters([]);
        }).catch((resp) => {
            dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: resp.message });
        });
        // const crew = selectedCrewOrWeapon.map(id => counterMap[id]).filter(Boolean);
        // const monsters = selectedMonsters.map(id => counterMap[id]).filter(Boolean);

        // const newGroup: AttackGroup = {
        //     id: `group-${Date.now()}`,
        //     attackingCounterIds: crew.length > 0 ? crew.map(c => c.id) : [],
        //     targetCounterIds: monsters.length > 0 ? monsters.map(c => c.id) : []
        // };

        // setAttackGroups(prevAttackGroups => [...prevAttackGroups, newGroup]);
        // setSelectedCrewOrWeapon([]);
        // setSelectedMonsters([]);
        // setActiveGroupId(newGroup.id);
    }

    const handleGroupClick = (groupId: string) => {
        setActiveGroupId(groupId === activeGroupId ? undefined : groupId);
    };

    const removeCounterFromGroup = (groupId: string, counterId: string) => {
        console.log('Removing counter from group:', groupId, counterId);

        const action: ActionRemoveCounterFromAttackGroup = {
            type: ActionType.REMOVE_COUNTER_FROM_ATTACK_GROUP,
            payload: {
                attackGroupId: groupId,
                counterId: counterId,
            }
        };

        console.log(JSON.stringify(action));
        putData(`api/games/${gameId}/attackgroup`, { socketId, action: action }).then((resp) => {
            dispatch(action);
            setActiveGroupId(action.payload.attackGroupId);
            //setSelectedCrewOrWeapon([]);
            //setSelectedMonsters([]);
        }).catch((resp) => {
            dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: resp.message });
        });

        // const updatedGroups = attackGroups.map(group => {
        //     if (group.id === groupId) {
        //         const updatedGroup = {
        //             ...group,
        //             attackingCounterIds: group.attackingCounterIds?.filter((id: string) => id !== counterId) || [],
        //             targetCounterIds: group.targetCounterIds?.filter((id: string) => id !== counterId) || []
        //         };

        //         return updatedGroup;
        //     }
        //     return group;
        // });
        //setAttackGroups(updatedGroups);
    };

    const removeAttackGroup = (groupId: string) => {
        //setAttackGroups((prevAttackGroups: AttackGroup[]) => prevAttackGroups.filter(group => group.id !== groupId));


        const action: ActionDeleteAttackGroup = {
            type: ActionType.DELETE_ATTACK_GROUP,
            payload: {
                attackGroupId: groupId
            }
        };

        console.log(JSON.stringify(action));
        putData(`api/games/${gameId}/attackgroup`, { socketId, action: action }).then((resp) => {
            dispatch(action);
            //setActiveGroupId(action.payload.attackGroupId);
            if (activeGroupId === groupId) {
                setActiveGroupId(attackGroups.find(group => group.id !== groupId)?.id || undefined);
            }
            //setSelectedCrewOrWeapon([]);
            //setSelectedMonsters([]);
        }).catch((resp) => {
            dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: resp.message });
        });
    }

    const handleSubmit = () => {
        // TODO: Handle attack submission logic
        console.log('Attack groups:', attackGroups);
        handleClose();
    }

    const submitForm = async (formData: FormData) => {
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
                                        selected={selectedCrewOrWeapon.includes(counter.id) || selectedCrewOrWeapon.includes(counter.weaponCounterId || '')}
                                        onClick={toggleCrewSelection}
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
                                        <AttackGroupDisplay
                                            key={group.id}
                                            attackGroup={group}
                                            active={group.id === activeGroupId}
                                            groupSelectClick={handleGroupClick}
                                            removeGroupClick={removeAttackGroup}
                                            removeCounterClick={removeCounterFromGroup}
                                        />
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
                                >
                                    Create Group
                                </button>
                                <button className="attack-modal-button cancel-btn" onClick={handleClose}>
                                    Exit
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
                                        onClick={toggleMonsterSelection}
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