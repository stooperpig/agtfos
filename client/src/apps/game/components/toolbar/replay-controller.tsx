// ReplayControls.tsx
import React from "react"
import { useDispatch, useSelector } from "react-redux"
import { RootState } from "../../../../constants/store"
import { ActionType } from "../../../../shared/types/action-types"
import { Phase } from "../../../../shared/types/game-types"
import { ReplayRunner } from "./replay-runner"

export default function ReplayControls() {
    const dispatch = useDispatch()
    const replayState = useSelector((state: RootState) => state.replay)
    const phase = useSelector((state: RootState) => state.phase)

    const handleBackward = () => {
        dispatch({ type: ActionType.REPLAY_STEP_BACKWARD })
    }

    const handlePause = () => {
        dispatch({ type: ActionType.REPLAY_PAUSE })
    }

    const handlePlay = () => {
        dispatch({ type: ActionType.REPLAY_PLAY, payload: true })
    }

    const handleForward = () => {
        dispatch({ type: ActionType.REPLAY_STEP_FORWARD })
    }

    const handleEnd = () => {
        if (replayState) {
            //const max = phase === Phase.ATTACK ? replayState.replayElements.movementElements?.length - 1 : replayState.replayElements.attackElements.length - 1
            const action = { type: ActionType.REPLAY_END }
            dispatch(action)
        }
    }

    const handleStart = () => {
        dispatch({ type: ActionType.REPLAY_START })
    }

    return (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button onClick={handleStart} disabled={replayState?.index === -1}>⏮ Start</button>

            <button onClick={handleBackward} disabled={replayState?.index === -1}>
                ◀ Step
            </button>

            {replayState?.playing ? (
                <button onClick={handlePause}>⏸ Pause</button>
            ) : (
                <button onClick={handlePlay}>▶ Play</button>
            )}

            <button
                onClick={handleForward}
                disabled={!replayState || replayState?.index >= (phase === Phase.CREW_MOVE ? replayState?.replayElements.attackElements.length - 1 : replayState?.replayElements.movementElements?.length - 1)}
            >
                Step ▶
            </button>

            <button onClick={handleEnd} disabled={!replayState || replayState?.index >= (phase === Phase.CREW_MOVE ? replayState?.replayElements.attackElements.length - 1 : replayState?.replayElements.movementElements?.length - 1)}>⏭ End</button>

            <span>
                {replayState ? replayState?.index + 1 : 0} / {phase === Phase.CREW_MOVE ? replayState?.replayElements.attackElements.length : replayState?.replayElements.movementElements?.length ?? 0}
            </span>

            <ReplayRunner />
        </div>
    )
}