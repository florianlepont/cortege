import { useCallback, useEffect, useMemo, useRef } from "react"

export const HOLD_REPEAT_INTERVAL_MS = 120
export const HOLD_ACCELERATE_AFTER_TICKS = 6
export const HOLD_ACCELERATE_FURTHER_AFTER_TICKS = 15

type HoldRepeatOptions = {
  /** The current count, or null when there is none (the last known value is then kept). */
  value: number | null
  min: number
  max: number
  onChange: (next: number) => void
}

/** The press-and-hold engine shared by FactorCounterInput and DmhCounterStepper: one step at
 * once, then every 120 ms, doubled after 6 ticks and times five after 15, clamped to [min, max]. */
export function useHoldRepeat({ value, min, max, onChange }: HoldRepeatOptions): {
  start: (delta: number) => void
  stop: () => void
} {
  const currentRef = useRef<number>(value ?? min)
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (value !== null) currentRef.current = value
  }, [value])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const stop = useCallback((): void => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const start = useCallback(
    (delta: number): void => {
      const applyDelta = (step: number): void => {
        const next = Math.min(max, Math.max(min, currentRef.current + step))
        currentRef.current = next
        onChangeRef.current(next)
      }
      // A second press in without a press out must not leave an orphan interval running.
      stop()
      applyDelta(delta)
      let ticks = 0
      intervalRef.current = setInterval(() => {
        ticks += 1
        const accelerated =
          ticks > HOLD_ACCELERATE_FURTHER_AFTER_TICKS
            ? delta * 5
            : ticks > HOLD_ACCELERATE_AFTER_TICKS
              ? delta * 2
              : delta
        applyDelta(accelerated)
      }, HOLD_REPEAT_INTERVAL_MS)
    },
    [max, min, stop],
  )

  return useMemo(() => ({ start, stop }), [start, stop])
}
