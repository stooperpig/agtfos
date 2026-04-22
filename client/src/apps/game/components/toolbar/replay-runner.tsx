import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { RootState } from "../../../../constants/store"
import { ActionType } from "../../../../shared/types/action-types"

export function ReplayRunner() {
  const dispatch = useDispatch()
  const replay = useSelector((state: RootState) => state.replay)

  useEffect(() => {
    if (!replay?.playing) return
    if (replay?.index >= replay?.replayElements.movementElements?.length) return

    const id = setTimeout(() => {
      dispatch({ type: ActionType.REPLAY_STEP_FORWARD })
    }, 500)

    return () => clearTimeout(id)
  }, [replay])

  return null
}