import { createContext, useContext } from "react"

/**
 * Follow-up 32-33: a control that owns a horizontal drag (the percent track) asks the pages that
 * scroll around it to hold still while a finger is on it, so the track moves and the page does not
 * (the factor pager's horizontal scroll and the vertical scroll of the page both obey). Outside a
 * provider the call does nothing.
 */
export type SetScrollLocked = (locked: boolean) => void

const noop: SetScrollLocked = () => undefined

const ScrollLockContext = createContext<SetScrollLocked>(noop)

export const ScrollLockProvider = ScrollLockContext.Provider

export function useScrollLock(): SetScrollLocked {
  return useContext(ScrollLockContext)
}
