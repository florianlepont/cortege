import { useScreenCovered } from "./screen-cover-context"
import { useScreenFocus } from "./useScreenFocus"

/**
 * Whether the screen that renders this hook can be seen: focused in its navigator and not covered
 * by an app overlay. Entrances that must be noticed start when this turns true, not at mount.
 */
export function useScreenVisible(): boolean {
  const focused = useScreenFocus()
  const covered = useScreenCovered()
  return focused && !covered
}
