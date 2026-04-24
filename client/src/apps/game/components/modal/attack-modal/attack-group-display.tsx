import React from "react";
import "./attack-group-display.css";
import { AttackGroup, Counter, WeaponEffectType } from "../../../../../shared/types/game-types";
import { useSelector } from "react-redux";
import { RootState } from "../../../../../constants/store";
import { isCrew, isMonster, isWeapon } from "../../../../../shared/utils/counter-utils";
import { ScenarioData } from "../../../../../constants/game-constants";

interface AttackGroupDisplayProps {
    attackGroup: AttackGroup
    active: boolean
    groupSelectClick: (groupId: string) => void
    removeGroupClick: (groupId: string) => void
    removeCounterClick: (groupId: string, counterId: string) => void
}

export const AttackGroupDisplay = ({ attackGroup, groupSelectClick, removeGroupClick, removeCounterClick, active }: AttackGroupDisplayProps) => {
    const counterMap = useSelector((state: RootState) => state.counterMap);

    const rightClickHandler = (e: React.MouseEvent, attackGroupId: string, counterId: string) => {
        e.preventDefault();
        removeCounterClick(attackGroupId, counterId);
    };

    const isAreaWeapon = (counter: Counter) => {
        return ScenarioData.weaponMap[counter.weaponType!].effectType === WeaponEffectType.AREA;
    };

    const containsAreaWeapon = [...attackGroup.attackingCounterIds, ...attackGroup.targetCounterIds].some((counterId: string) => {
        const counter = counterMap[counterId];
        return isWeapon(counter) && isAreaWeapon(counter);
    });

    const getCounterName = (counter: Counter) => {
        if (isWeapon(counter)) {
            const ownerCounter = counterMap[counter.ownerCounterId!];
            return `${ownerCounter.name} ${isAreaWeapon(counter) ? '⚠️' : ''}`;
        } else {
            return counter.name || counter.type;
        }
    }

    const renderAreaWarning = () => {
        if (!containsAreaWeapon) return null;

        return (
            <div className="area-warning">
                <span>⚠️ Area weapon detected</span>
            </div>
        )
    };

    return (
        <div key={attackGroup.id} className={`attack-group ${active ? 'active' : ''}`} onClick={() => groupSelectClick(attackGroup.id)}>
            <div className="group-counters">
                <div className="group-counters-list">
                    {[...attackGroup.attackingCounterIds, ...attackGroup.targetCounterIds].map((counterId: string) => {
                        const counter = counterMap[counterId];
                        return (
                            <div key={counterId} className="group-counter" onContextMenu={(e) => rightClickHandler(e, attackGroup.id, counterId)}>
                                <span className="group-counter-name">{getCounterName(counter)}</span><br />
                                <img className="group-counter-image-large" src={`/images/${counter.imageName}.png`} />
                            </div>
                        )
                    })}
                </div>
                {renderAreaWarning()}
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