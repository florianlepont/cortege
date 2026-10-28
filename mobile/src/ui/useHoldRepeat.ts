import { useCallback, useEffect, useMemo, useRef } from "react"

// Follow-up 32-26 (owner: "ultra sensible, partout"). A quick tap is one step and never a repeat;
// a repeat needs a deliberate hold. Values chosen for a gloved or wet thumb in the field:
// - nothing happens while the finger rests for less than 600 ms (a tap is a press and release);
// - the hold then counts one step at once, and five per second after it (every 200 ms);
// - only after 2 more seconds of holding does it double to ten per second (every 100 ms), never
//   faster and never more than one step at a time.
export const HOLD_REPEAT_DELAY_MS = 600
export const HOLD_REPEAT_INTERVAL_MS = 200
export const HOLD_REPEAT_FAST_INTERVAL_MS = 100
export const HOLD_ACCELERATE_AFTER_MS = 2000
const SLOW_TICKS = HOLD_ACCELERATE_AFTER_MS / HOLD_REPEAT_INTERVAL_MS
// The `onPress` of a released hold comes right after its `onPressOut`: within this window it is
// that one and is ignored. Later, an `onPress` is a new activation (a screen reader's double tap
// sends one with no press in).
const HOLD_RELEASE_WINDOW_MS = 250

/**
 * Where a step comes from: a `tap` (press and release), the first step of a deliberate `hold`, or
 * a later `repeat` of that hold. A control gives its haptic for the first two only.
 */
export type HoldStepKind = "tap" | "hold" | "repeat"

type HoldRepeatOptions = {
  /** The current count, or null when there is none (the last known value is then kept). */
  value: number | null
  min: number
  max: number
  onChange: (next: number, kind: HoldStepKind) => void
}

/**
 * The press-and-hold engine shared by FactorCounterInput and DmhCounterStepper. Wire it to a
 * Pressable like this: `onPressIn={() => begin(delta)}`, `onPressOut={end}`, `onPress={() =>
 * tap(delta)}`. The step of a quick tap is made by `onPress`, which React Native sends only when
 * the finger is released inside the target: a touch that slides out, a press the system cancels
 * and a scroll gesture that takes over the touch all end in `onPressOut` alone, so they never
 * count and never leave a timer running. A hold is a press that lasts HOLD_REPEAT_DELAY_MS; the
 * `onPress` that follows its release is ignored. The result is clamped to [min, max].
 */
export function useHoldRepeat({ value, min, max, onChange }: HoldRepeatOptions): {
  begin: (delta: number) => void
  end: () => void
  tap: (delta: number) => void
} {
  const currentRef = useRef<number>(value ?? min)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // True from the first step of a hold until the next press starts: the release's `onPress` is then
  // not a tap.
  const heldRef = useRef(false)
  const releasedAtRef = useRef(0)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (value !== null) currentRef.current = value
  }, [value])

  const clear = useCallback((): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => clear, [clear])

  const end = useCallback((): void => {
    if (heldRef.current) releasedAtRef.current = Date.now()
    clear()
  }, [clear])

  const apply = useCallback(
    (delta: number, kind: HoldStepKind): void => {
      const next = Math.min(max, Math.max(min, currentRef.current + delta))
      currentRef.current = next
      onChangeRef.current(next, kind)
    },
    [max, min],
  )

  const begin = useCallback(
    (delta: number): void => {
      // A second press in without a press out must not leave a timer running.
      clear()
      heldRef.current = false
      const schedule = (ticks: number): void => {
        timerRef.current = setTimeout(
          () => {
            apply(delta, "repeat")
            schedule(ticks + 1)
          },
          ticks >= SLOW_TICKS ? HOLD_REPEAT_FAST_INTERVAL_MS : HOLD_REPEAT_INTERVAL_MS,
        )
      }
      timerRef.current = setTimeout(() => {
        heldRef.current = true
        apply(delta, "hold")
        schedule(0)
      }, HOLD_REPEAT_DELAY_MS)
    },
    [apply, clear],
  )

  const tap = useCallback(
    (delta: number): void => {
      const afterHold =
        heldRef.current && Date.now() - releasedAtRef.current < HOLD_RELEASE_WINDOW_MS
      heldRef.current = false
      if (afterHold) return
      apply(delta, "tap")
    },
    [apply],
  )

  return useMemo(() => ({ begin, end, tap }), [begin, end, tap])
}
