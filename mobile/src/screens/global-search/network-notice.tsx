import type { ReactElement } from "react"
import type { SearchGroupState } from "../../hooks/useSearchGroup"
import { SearchGroupNotice } from "./SearchGroupNotice"
import type { SearchNoticeGroup } from "./SearchGroupNotice"

export const isLoading = (state: SearchGroupState<unknown>) =>
  state.status === "waiting" || state.status === "loading"

/**
 * The line that stands in for the rows of a network group: no connection, a failed request (that
 * group alone re-runs), or the first load. A group that has rows keeps them while it loads again.
 */
export function networkNotice(
  group: SearchNoticeGroup,
  state: SearchGroupState<unknown>,
): ReactElement | null {
  if (state.status === "offline") {
    return <SearchGroupNotice key="notice" group={group} variant="offline" />
  }
  if (state.status === "error") {
    return (
      <SearchGroupNotice
        key="notice"
        group={group}
        variant="error"
        error={state.error}
        onRetry={state.retry}
      />
    )
  }
  if (isLoading(state) && state.data === null) {
    return <SearchGroupNotice key="notice" group={group} variant="loading" />
  }
  return null
}
