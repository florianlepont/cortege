import { useEffect, useRef, useState } from "react"
import { feedback } from "../../ui/feedback"

// The stored statuses of a survey not finished yet: "draft", "synced" (a draft the sync engine
// sent) and "error" (a draft whose last send failed).
const BEFORE_FINISH = new Set(["draft", "synced", "error"])

/**
 * Counts the surveys finished while the screen is open (D-08, D-25). A finish succeeds when the
 * stored status becomes "submitted": only `submitSurvey`'s success path writes it on the phone, so
 * this is the finish result itself, wherever the finish was started. The success haptic fires and
 * the returned counter goes up by one; the summary reads it to scroll to the score card, which
 * pulses its halo and pops. An ordinary draft sync ("draft" to "synced") is not a finish and does
 * nothing, and nothing fires on the first render (a survey opened already finished).
 */
export function useSubmitSuccessPulse(status: string): number {
  const previous = useRef(status)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const before = previous.current
    previous.current = status
    if (BEFORE_FINISH.has(before) && status === "submitted") {
      feedback.notify.success()
      setCount((current) => current + 1)
    }
  }, [status])

  return count
}
