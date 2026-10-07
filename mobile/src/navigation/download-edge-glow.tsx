import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import { EdgePulse } from "../screens/public-map/EdgePulse"
import { useScreenVisible } from "../ui/useScreenVisible"

/**
 * The Explorer's download glow, drawn round the whole screen (12.2-19 fix round, owner: "je
 * m'attendais à avoir un truc qui fasse tout le tour de l'écran"). Inside the Explorer screen the
 * glow lay under the panel, and on iOS the native tab bar is drawn above every screen, so the glow is
 * drawn here instead, as the last child of the navigation layer: above the tab trees, the panel and
 * the tab bar, under the app overlays (sign-in, onboarding). The screen asks for it by rendering
 * `DownloadEdgeGlow`, which holds the request only while that screen can be seen, so the glow never
 * shows over another tab or a pushed page and its loops stop with it.
 */
type GlowRequest = (on: boolean) => void

const DownloadEdgeGlowContext = createContext<GlowRequest | null>(null)

export function DownloadEdgeGlowHost({ children }: { children: ReactNode }) {
  // A count, not a flag: a request taken back and made again in one commit (a remount) never
  // switches the glow off in between.
  const [requests, setRequests] = useState(0)
  const request = useCallback<GlowRequest>((on) => {
    setRequests((count) => Math.max(0, count + (on ? 1 : -1)))
  }, [])
  return (
    <DownloadEdgeGlowContext.Provider value={request}>
      {children}
      {requests > 0 ? <EdgePulse /> : null}
    </DownloadEdgeGlowContext.Provider>
  )
}

/** Rendered by the Explorer while the user chooses the area to download; draws nothing itself. */
export function DownloadEdgeGlow(): null {
  const request = useContext(DownloadEdgeGlowContext)
  const visible = useScreenVisible()
  useEffect(() => {
    if (!request || !visible) return undefined
    request(true)
    return () => request(false)
  }, [request, visible])
  return null
}
