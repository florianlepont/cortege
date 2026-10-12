import type { ReactNode } from "react"
import { EntranceView } from "../../ui/EntranceView"

/**
 * A section of the survey summary that plays its slide-up entrance (D-46) when the page gives it a
 * slot. A section that can draw nothing (photos of a submitted survey, the sync notice, the note)
 * wraps its own content in this, after its null checks, so an empty section leaves no empty
 * wrapper and so no extra gap in the page. Without an `index` it draws its children as they are.
 */
export function OptionalEntrance({
  index,
  children,
}: {
  index: number | undefined
  children: ReactNode
}) {
  return index === undefined ? (
    <>{children}</>
  ) : (
    <EntranceView index={index}>{children}</EntranceView>
  )
}
