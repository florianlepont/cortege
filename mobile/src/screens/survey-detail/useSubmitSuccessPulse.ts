import { useEffect, useRef, useState } from "react"
import { feedback } from "../../ui/feedback"

const BEFORE_SUBMIT = new Set(["draft", "error"])
const AFTER_SUBMIT = new Set(["submitted", "synced"])

/**
 * Counts successful submits seen while the screen is open (D-08, action feedback). A submit
 * succeeds when the survey's status goes from "draft" or "error" to "submitted" or "synced": the
 * success haptic fires and the returned counter goes up by one, which the score card's halo reads
 * as its pulse trigger. Nothing fires on the first render (a survey opened already submitted), nor
 * when "submitted" turns into "synced" (the same submit, only synced afterwards). Observation
 * only: the submit logic itself is not touched.
 */
export function useSubmitSuccessPulse(status: string): number {
  const previous = useRef(status)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const before = previous.current
    previous.current = status
    if (BEFORE_SUBMIT.has(before) && AFTER_SUBMIT.has(status)) {
      feedback.notify.success()
      setCount((current) => current + 1)
    }
  }, [status])

  return count
}
