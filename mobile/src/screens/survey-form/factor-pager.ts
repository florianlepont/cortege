import type { FactorKey } from "../../app/types"
import type { FactorProgress } from "./FactorsList"

/**
 * FLOW-04 "next incomplete factor" shortcut: searches forward from `fromIndex` (wrapping around),
 * skipping `fromIndex` itself on the first pass so a tap always moves somewhere when another
 * factor still needs attention. Returns null when every other factor is already complete.
 */
export function findNextIncompleteFactorIndex(
  order: readonly FactorKey[],
  progress: Record<FactorKey, FactorProgress>,
  fromIndex: number,
): number | null {
  const total = order.length
  if (total === 0) return null
  for (let step = 1; step <= total; step += 1) {
    const index = (fromIndex + step) % total
    if (!progress[order[index]].complete) return index
  }
  return null
}

/**
 * OA-111: the letter under a finger on the A to J strip. `x` is the touch position along the strip
 * (0 at its left edge), `width` the strip's width; the ten letters share it evenly, and a finger
 * that slides past either end keeps the first or last letter.
 */
export function letterIndexAt(x: number, width: number, count: number): number {
  if (count <= 0 || !(width > 0) || !Number.isFinite(x)) return 0
  return Math.max(0, Math.min(count - 1, Math.floor((x / width) * count)))
}
