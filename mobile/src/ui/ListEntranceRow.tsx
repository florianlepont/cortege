import { useState } from "react"
import type { ReactNode } from "react"
import { EntranceView } from "./EntranceView"

type ListEntranceRowProps = {
  /** Position of the row in its list: the stagger, and whether it may animate at all. */
  index: number
  /** From `useListEntrance`: asked once, when the row mounts. */
  canAnimate: (index: number) => boolean
  children: ReactNode
}

/**
 * One row of Mes Relevés or of the search results. Rows 0 to 7 that mount with the screen slide up
 * when it becomes visible (`EntranceView`); any other row, and any row the list remounts later,
 * renders its children as they are. The choice is made once per mount, so scrolling never starts
 * an entrance.
 */
export function ListEntranceRow({ index, canAnimate, children }: ListEntranceRowProps) {
  const [animated] = useState(() => canAnimate(index))
  return animated ? <EntranceView index={index}>{children}</EntranceView> : <>{children}</>
}
