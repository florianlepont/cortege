import { useEffect, useRef, useState } from "react"

/**
 * True for `durationMs` after each new `nonce` (a counter the caller bumps to say "show it now"),
 * false before, after the delay, and while the nonce is null. The value present at mount is not a
 * trigger (a counter that starts at 0 shows nothing); only a change is. A new nonce restarts the
 * delay; the timer is cleared on unmount. Used by the pills that show for a few seconds.
 */
export function useTransientFlag(nonce: number | null, durationMs: number): boolean {
  const [active, setActive] = useState(false)
  const initial = useRef(nonce)

  useEffect(() => {
    if (nonce === null || nonce === initial.current) {
      return undefined
    }
    setActive(true)
    const timer = setTimeout(() => setActive(false), durationMs)
    return () => clearTimeout(timer)
  }, [nonce, durationMs])

  useEffect(() => {
    if (nonce === null) setActive(false)
  }, [nonce])

  return active
}
