import "./attack-replay-modal.css";
import { useState } from "react";
import React from "react";
import Modal from "../modal";
import { Stack, Counter, CounterType, AttackGroup, WeaponEffectType, AttackGroupType, WeaponTargetType, ReplayAttackElement } from "../../../../../shared/types/game-types";
import { isCrew, isMonster, isWeapon } from "../../../../../shared/utils/counter-utils";
import { RootState, useAppDispatch, useAppSelector } from "../../../../../constants/store";
import { getWeaponTargetType, isAreaWeapon } from "../../../utils/counter-utils";
import { ActionAddCountersToAttackGroup, ActionCreateAttackGroup, ActionDeleteAttackGroup, ActionRemoveCounterFromAttackGroup, ActionSetStatusMessage, ActionType } from "../../../../../shared/types/action-types";
import { putData } from "../../../../../api/api-utils";
import { socketId } from '../../../../../api/web-socket';


interface PropTypes {
    closeHandler: () => void;
    show: boolean;
    title: string;
}

export const AttackReplayModal = (props: PropTypes) => {
    const dispatch = useAppDispatch();
    const stateReplay = useAppSelector((state: RootState) => state.replay);
    const counterMap = useAppSelector((state: RootState) => state.counterMap);

    const handleClose = () => {
        props.closeHandler();
    }

    const renderCounterImage = (counter: Counter) => {
        const imageUrl = `/images/${counter.imageName}.png`;
        //todo: remove the counter id display;
        return (
            <span key={counter.id}>
                {counter.id}
                <img
                    className="attack-replay-counter-image"
                    src={imageUrl}
                    alt={`${counter.name} ${counter.id}`}
                    title={`${counter.name} ${counter.id}`}
                />
            </span>
        );
    }

    const renderCounterImages = (counterIds: string[], isAttacker: boolean = false) => {
        return (
            <div className="attack-replay-counter-images">
                {counterIds.map((counterId, index) => {
                    const counter = counterMap[counterId];
                    if (!counter) return null;

                    // If this is an attacker and the counter is a weapon with an owner, show the owner instead
                    let displayCounter = counter;
                    if (isAttacker && isWeapon(counter) && counter.ownerCounterId) {
                        const ownerCounter = counterMap[counter.ownerCounterId];
                        if (ownerCounter) {
                            return (
                                <div key={index}>
                                    {renderCounterImage(ownerCounter)}
                                    &#8614;
                                    {renderCounterImage(counter)}
                                </div>
                            )
                        }

                    }

                    return renderCounterImage(displayCounter);
                })}
            </div>
        );
    };

    const handleElementClick = (element: ReplayAttackElement) => {
        const targetCounterIds = element.targetCounterIds;
        const areaId = targetCounterIds[0] ? counterMap[targetCounterIds[0]]?.areaId : null;
        if (areaId) {
            dispatch({ type: ActionType.SELECT_AREA, payload: { areaId: areaId, clearSelectedCounterIds: true } });
        }
    };

    if (props.show && stateReplay?.replayElements.attackElements) {
        const attackReplayElements = stateReplay.replayElements.attackElements;
        return (
            <Modal showHideClassName='modal display-block' title={props.title} handleClose={handleClose}>
                <div className='attack-replay-modal'>
                    <div className="attack-replay-modal-list">
                        {attackReplayElements && attackReplayElements.length > 0 ? (
                            attackReplayElements.map((element: ReplayAttackElement, index: number) => (
                                <div key={index} className="attack-replay-item" onClick={() => handleElementClick(element)}>
                                    <div className="attack-replay-attackers">
                                        <div className="attack-replay-label">Attackers:</div>
                                        {renderCounterImages(element.attackingCounterIds, true)}
                                    </div>
                                    <div className="attack-replay-targets">
                                        <div className="attack-replay-label">{`Targets:`}</div>
                                        {renderCounterImages(element.targetCounterIds, false)}
                                    </div>
                                    <div className="attack-replay-result">
                                        Result: {element.result.attackResult}
                                        {element.result.numberOfDice ? ` (${element.result.numberOfDice} dice)` : ''}
                                        {element.result.roll !== undefined ? ` - Roll: ${element.result.roll}` : ''}
                                    </div>
                                    <div className="attack-replay-message">
                                        {element.result.message}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="attack-replay-empty">No attack replay data available</div>
                        )}
                    </div>
                </div>
            </Modal>
        )
    } else {
        return null;
    }
}