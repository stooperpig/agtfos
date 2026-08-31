import React from "react";
import "./attack-group-display.css";
import { AttackGroup, AttackGroupType, Counter, WeaponEffectType } from "../../../../../shared/types/game-types";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../../../../constants/store";
import { isCrew, isMonster, isWeapon } from "../../../../../shared/utils/counter-utils";
import { ScenarioData } from "../../../../../constants/game-constants";
import { isAreaWeapon, isCollateralEffectWeapon, isMultiAreaWeapon } from "../../../utils/counter-utils";

interface AttackGroupDisplayProps {
    attackGroup: AttackGroup
    active: boolean
    groupSelectClick: (groupId: string) => void
    removeGroupClick: (groupId: string) => void
    removeCounterClick: (groupId: string, counterId: string) => void
}

export const AttackGroupDisplay = ({ attackGroup, groupSelectClick, removeGroupClick, removeCounterClick, active }: AttackGroupDisplayProps) => {
    const dispatch = useAppDispatch();
    const counterMap = useSelector((state: RootState) => state.counterMap);

    const leftClickHandler = (e: React.MouseEvent, attackGroupId: string, counterId: string) => {
        e.preventDefault();
        if (attackGroup.type === AttackGroupType.AREA) {
            const isTargetOrCollateralCounter = attackGroup.targetCounterIds.some((id) => id === counterId) || attackGroup.collateralCounterIds.some((id) => id === counterId);
            if (isTargetOrCollateralCounter) {
                dispatch({ type: 'SET_STATUS_MESSAGE', payload: "You can not remove targets or collateral crew from an area attack group" });
                return;
            }
        }
        removeCounterClick(attackGroupId, counterId);
    };

    const containsMultiAreaWeapon = [...attackGroup.attackingCounterIds, ...attackGroup.targetCounterIds].some((counterId: string) => {
        const counter = counterMap[counterId];
        return isWeapon(counter) && isMultiAreaWeapon(counter);
    });

    const containsCollateralEffectWeapon = [...attackGroup.attackingCounterIds, ...attackGroup.targetCounterIds].some((counterId: string) => {
        const counter = counterMap[counterId];
        return isWeapon(counter) && isCollateralEffectWeapon(counter);
    });

    const getCounterName = (counter: Counter) => {
        if (isWeapon(counter)) {
            const ownerCounter = counterMap[counter.ownerCounterId!];
            return `${ownerCounter.name} ${isMultiAreaWeapon(counter) ? '⚠️' : ''} ${isCollateralEffectWeapon(counter) ? '☢️' : ''}`;
        } else {
            return counter.name || counter.type;
        }
    }

    const renderAreaWarning = () => {
        if (!containsMultiAreaWeapon) return null;

        return (
            <div className="area-warning">
                <span>⚠️ Multiple area weapon detected</span>
            </div>
        )
    };

    const renderCollateralEffectWarning = () => {
        if (!containsCollateralEffectWeapon) return null;

        return (
            <div className="collateral-effect-warning">
                <span>☢️ Collateral effect weapon detected</span>
            </div>
        )
    };

    const renderCounter = (counterId: string) => {
        const counter = counterMap[counterId];

        if (isWeapon(counter)) {
            const ownerCounter = counterMap[counter.ownerCounterId!];
            return (
                <div key={counterId} className="group-counter" onClick={(e) => leftClickHandler(e, attackGroup.id, counterId)}>
                    <span className="group-counter-name">{getCounterName(counter)}</span><br />
                    <div className="group-counter-crew-with-weapon">
                        <img className="group-counter-image-large" src={`/images/${ownerCounter.imageName}.png`} />
                        &#8614;
                        <img className="group-counter-image-large" src={`/images/${counter.imageName}.png`} />
                    </div>
                </div>
            );
        }

        return (
            <div key={counterId} className="group-counter" onClick={(e) => leftClickHandler(e, attackGroup.id, counterId)}>
                <span className="group-counter-name">{getCounterName(counter)}</span><br />
                <img className="group-counter-image-large" src={`/images/${counter.imageName}.png`} />
            </div>
        )
    }

    const renderCollateralCounters = () => {
        if (attackGroup.collateralCounterIds.length === 0) {
            return null;
        }

        return (
            <div className="group-counters-list group-counter-dash-border">
                {[...attackGroup.collateralCounterIds].map((counterId: string) => {
                    return renderCounter(counterId);
                })}
            </div>
        )
    }

    return (
        <div key={attackGroup.id} className={`attack-group ${active ? 'active' : ''}`} onClick={() => groupSelectClick(attackGroup.id)}>
            <div className="attack-group-title">{attackGroup.type === AttackGroupType.AREA ? 'Area Attack' : 'Single Target'}</div>
            <div className="group-counters">
                <div className="group-counters-list">
                    {[...attackGroup.attackingCounterIds, ...attackGroup.targetCounterIds].map((counterId: string) => {
                        return renderCounter(counterId);
                    })}
                </div>
                {renderAreaWarning()}
                {renderCollateralEffectWarning()}
                {renderCollateralCounters()}
            </div>
            <button
                className="remove-group-x-btn"
                onClick={(e) => {
                    e.stopPropagation();
                    removeGroupClick(attackGroup.id);
                }}
                title="Remove group"
            >
                ×
            </button>
        </div>
    )
}