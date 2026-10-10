/** Monotonic millisecond clock: `performance.now()` when the runtime has it, else `Date.now()`. */
export function monotonicNow(): number {
  const perf = (globalThis as { performance?: { now?: () => number } }).performance
  return typeof perf?.now === "function" ? perf.now() : Date.now()
}
