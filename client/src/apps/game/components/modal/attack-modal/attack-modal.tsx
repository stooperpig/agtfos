import "./attack-modal.css";
import { useState } from "react";
import React from "react";
import Modal from "../modal";
import { Stack, Counter, CounterType, AttackGroup, WeaponEffectType, AttackGroupType, WeaponTargetType } from "../../../../../shared/types/game-types";
import { isCrew, isMonster, isWeapon } from "../../../../../shared/utils/counter-utils";
import { RootState, useAppDispatch, useAppSelector } from "../../../../../constants/store";
import { getWeaponTargetType, isAreaWeapon } from "../../../utils/counter-utils";
import { CounterDisplay } from "./counter-display";
import { ActionAddCountersToAttackGroup, ActionCreateAttackGroup, ActionDeleteAttackGroup, ActionRemoveCounterFromAttackGroup, ActionSetStatusMessage, ActionType } from "../../../../../shared/types/action-types";
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
        const usedMonsterIds = attackGroups?.flatMap(group => { return group.type === AttackGroupType.AREA ? [] : group.targetCounterIds.map(counterId => counterId) }) || [];

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
            addCrewOrWeaponToActiveGroup(counterId);
        } else {
            const usedCrewIds = attackGroups?.flatMap(group => group.attackingCounterIds)?.filter(Boolean) || [];
            if (usedCrewIds.includes(counterId)) {
                return;
            }
        }
    }

    const getAreaAttackGroup = (): AttackGroup | undefined => {
        return attackGroups?.find(group => group.type === AttackGroupType.AREA);
    }

    const getActiveGroup = (): AttackGroup | undefined => {
        return attackGroups?.find(group => group.id === activeGroupId);
    }

    const addCrewOrWeaponToActiveGroup = (counterId: string) => {
        if (!activeGroupId) return;

        const activeGroup = getActiveGroup();
        if (!activeGroup) return;

        const counter = counterMap[counterId];
        if (!counter) return;

        //when adding area weapon to a group if the groups does not have targets then 
        //   add all monsters to the group
        //   if weapon is a area weapon that affects crew also then create a friendly fire group and add crew to it.
        //   why not automatically handle the area group the same way (i.e. create area group and add monsters to it)
        //if (isWeapon(counter) && activeGroup.type === AttackGroupType.SINGLE_TARGET && isAreaWeapon(counter)) {
        //    const areaAttackGroup = getAreaAttackGroup();
            //todo: find/create the area attack group and add all monsters to it
        //} 
        
        //const areaAttackGroup = getAreaAttackGroup();

        //   see if the proper group type exists for those types of weapons.  if not create it and add this weapon to it and all the impacted counters to it.

        //   this means that you have to clear the friendly fire group if that weapon is removed.
        //handle case where weapon has a multiple area effect (creating other groups for other areas too?)



        //const attackGroup = attackGroups.find(attackGroup => attackGroup.id === activeGroupId);
        if (!activeGroup) {
            return;
        }

        if (isWeapon(counter) && activeGroup.type === AttackGroupType.SINGLE_TARGET && isAreaWeapon(counter)) {
            const action: ActionSetStatusMessage = { type: ActionType.SET_STATUS_MESSAGE, payload: 'Cannot add area weapon to an single target attack group' }
            dispatch(action);
            return;
        }

        if (isWeapon(counter) && activeGroup.type === AttackGroupType.AREA && !isAreaWeapon(counter)) {
            const action: ActionSetStatusMessage = { type: ActionType.SET_STATUS_MESSAGE, payload: 'Cannot add non-area weapons to an area attack group' }
            dispatch(action);
            return;
        }

        if (!isWeapon(counter) && activeGroup.type === AttackGroupType.AREA) {
            const action: ActionSetStatusMessage = { type: ActionType.SET_STATUS_MESSAGE, payload: 'Cannot add crew member to area attack group without area effect weapon' }
            dispatch(action);
            return;
        }

        const action: ActionAddCountersToAttackGroup = {
            type: ActionType.ADD_COUNTERS_TO_ATTACK_GROUP,
            payload: {
                attackGroupId: activeGroupId,
                attackingCounterIds: [counterId],
            }
        };

        console.log(JSON.stringify(action));
        putData(`api/games/${gameId}/attackgroup`, { socketId, action: action }).then((resp) => {
            dispatch(action);
            setActiveGroupId(action.payload.attackGroupId);
        }).catch((resp) => {
            dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: resp.message });
        });
    };

    const addMonsterToActiveGroup = (counterId: string) => {
        if (!activeGroupId) {
            return;
        }

        const counter = counterMap[counterId];
        if (!counter) return;

        const attackGroup = attackGroups?.find(group => group.id === activeGroupId);
        if (!attackGroup) return;

        if (attackGroup.type === AttackGroupType.AREA) {
            const action: ActionSetStatusMessage = { type: ActionType.SET_STATUS_MESSAGE, payload: 'Cannot manually add targets to area attack group' }
            dispatch(action);
            return;
        }

        const group = attackGroups?.find(group => group.id === activeGroupId);
        if (group?.targetCounterIds.some(counterId => isMonster(counterMap[counterId]))) {
            return;
        }

        const action: ActionAddCountersToAttackGroup = {
            type: ActionType.ADD_COUNTERS_TO_ATTACK_GROUP,
            payload: {
                attackGroupId: activeGroupId,
                targetCounterIds: [counterId],
            }
        };

        console.log(JSON.stringify(action));
        putData(`api/games/${gameId}/attackgroup`, { socketId, action: action }).then((resp) => {
            dispatch(action);
            setActiveGroupId(action.payload.attackGroupId);
        }).catch((resp) => {
            dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: resp.message });
        });
    };

    const toggleMonsterSelection = (counterId: string) => {
        if (activeGroupId) {
            addMonsterToActiveGroup(counterId);
        } else {
            const usedMonsterIds = attackGroups?.flatMap(group => group.targetCounterIds)?.filter(Boolean) || [];
            if (usedMonsterIds.includes(counterId)) {
                return;
            }
        }
    };

    const createAttackGroup = (attackGroupType: AttackGroupType) => {
        if (attackGroupType === AttackGroupType.AREA) {
            if (getAreaAttackGroup()) {
                dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: "Area attack group already exists" });
                return;
            }
        }

        console.log('create attack group');
        const action: ActionCreateAttackGroup = {
            type: ActionType.CREATE_ATTACK_GROUP,
            payload: {
                areaId: props.areaId!,
                attackGroupId: crypto.randomUUID(),
                type: attackGroupType
            }
        };

        console.log(JSON.stringify(action));
        putData(`api/games/${gameId}/attackgroup`, { socketId, action: action }).then((resp) => {
            dispatch(action);
            setActiveGroupId(action.payload.attackGroupId);
            if (action.payload.type === AttackGroupType.AREA) {
                const allMonsters = getStackCounters().filter(counter => isMonster(counter));
                if (allMonsters.length > 0) {
                    const addMonstersAction: ActionAddCountersToAttackGroup = {
                        type: ActionType.ADD_COUNTERS_TO_ATTACK_GROUP,
                        payload: {
                            attackGroupId: action.payload.attackGroupId,
                            targetCounterIds: allMonsters.map(monster => monster.id)
                        }
                    };
                    putData(`api/games/${gameId}/attackgroup`, { socketId, action: addMonstersAction }).then((resp) => {
                        dispatch(addMonstersAction);
                    }).catch((resp) => {
                        dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: resp.message });
                    });
                }
            }
        }).catch((resp) => {
            dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: resp.message });
        });
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
        }).catch((resp) => {
            dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: resp.message });
        });
    };

    const removeAttackGroup = (groupId: string) => {
        const action: ActionDeleteAttackGroup = {
            type: ActionType.DELETE_ATTACK_GROUP,
            payload: {
                attackGroupId: groupId
            }
        };

        console.log(JSON.stringify(action));
        putData(`api/games/${gameId}/attackgroup`, { socketId, action: action }).then((resp) => {
            dispatch(action);
            if (activeGroupId === groupId) {
                setActiveGroupId(attackGroups.find(group => group.id !== groupId)?.id || undefined);
            }
        }).catch((resp) => {
            dispatch({ type: ActionType.SET_STATUS_MESSAGE, payload: resp.message });
        });
    }

    const handleSubmit = () => {
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
                                        selected={false}
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
                                <button className="attack-modal-button create-group-btn" onClick={() => createAttackGroup(AttackGroupType.SINGLE_TARGET)} >
                                    Create Single Target Attack
                                </button>
                                <button className="attack-modal-button create-group-btn" onClick={() => createAttackGroup(AttackGroupType.AREA)} disabled={getAreaAttackGroup() !== undefined} >
                                    Create Area Attack
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
                                        selected={false}
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