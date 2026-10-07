import type { ReactNode } from "react"
import { brandMotion } from "../../app/brand-tokens"
import { EntranceView } from "../../ui/EntranceView"

type PanelRowEntranceProps = {
  /** Position of the row in its panel: the stagger, and whether it slides in at all. */
  index: number
  children: ReactNode
}

/**
 * One row of an Explorer panel list (cluster list, parcel history), 12.2-18. Rows 0 to 7 slide up
 * with the 40 ms stagger when the panel mounts (`EntranceView`, Reduce Motion shows them at once);
 * later rows render as they are, so a long list never queues animations (T-12.2-36).
 */
export function PanelRowEntrance({ index, children }: PanelRowEntranceProps) {
  if (index >= brandMotion.staggerMax) return <>{children}</>
  return <EntranceView index={index}>{children}</EntranceView>
}
