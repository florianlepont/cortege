import { useState } from "react"
import type { PublicMapItem } from "../../app/types"
import { useStableActions } from "../../state/useLatestCallback"

/** The floating panels of the Explorer. One value at a time: they exclude each other. */
export type ExplorerPanel = "card" | "bubble" | "cluster" | null

/** What the download card shows: the estimate, or a result reopened from the chip. */
export type ExplorerCardView = "form" | "failed" | "partial"

type Options = {
  /** Drops a finished download's outcome (a running one stays). */
  clearDownloadStatus: () => void
  /**
   * Told whenever the bubble or the card opens. The swipe mode ends then (UI-SPEC sections 2 and
   * 6); it is a stable callback the screen fills after the swipe hook runs, so this hook never
   * depends on the swipe hook.
   */
  onPanelOpen: () => void
}

export type ExplorerPanelsActions = {
  /** The capsule's download button: the card on its form, the previous outcome dropped. */
  openCard: () => void
  /** A failed or partial chip: the card on that view, the status kept. */
  openCardOn: (view: "failed" | "partial") => void
  /** The overlay button: opens the bubble (closing the card) or closes it. */
  toggleBubble: () => void
  /** A tap on the map while the bubble is open: closes it and nothing else. */
  closeBubble: () => void
  openClusterList: (items: PublicMapItem[]) => void
  /** A marker was chosen: only an open cluster list closes. */
  closeCluster: () => void
  /** Closes the card (or any panel) and leaves the download's status alone: the chip keeps it. */
  closePanel: () => void
  /** Closes whichever panel is open and drops a finished download's outcome. */
  closeAll: () => void
  /** The download of the shown area started: the area is chosen. */
  chooseArea: () => void
  /** The download was refused or failed: the area can be moved and chosen again. */
  unchooseArea: () => void
}

export type ExplorerPanels = ExplorerPanelsActions & {
  panel: ExplorerPanel
  cardView: ExplorerCardView
  clusterItems: PublicMapItem[] | null
  /** Set once a download of the shown area started from the open card. */
  areaChosen: boolean
}

/**
 * Which floating panel of the Explorer is open (download card, overlay bubble, cluster list), the
 * card's view, and the list's items. Every function keeps its identity.
 */
export function useExplorerPanels({ clearDownloadStatus, onPanelOpen }: Options): ExplorerPanels {
  const [panel, setPanel] = useState<ExplorerPanel>(null)
  const [cardView, setCardView] = useState<ExplorerCardView>("form")
  const [clusterItems, setClusterItems] = useState<PublicMapItem[] | null>(null)
  // Set once a download of the shown area has started from the open card: the area is chosen, so
  // the green edge goes. A refused or failed download clears it (the user moves the map and tries
  // again); reopening the card starts a new choice.
  const [areaChosen, setAreaChosen] = useState(false)

  const actions = useStableActions<ExplorerPanelsActions>({
    openCard: () => {
      setClusterItems(null)
      setAreaChosen(false)
      setCardView("form")
      // A finished download's outcome is not shown again; a running one keeps its chip.
      clearDownloadStatus()
      setPanel("card")
      onPanelOpen()
    },
    openCardOn: (view) => {
      setClusterItems(null)
      setCardView(view)
      setPanel("card")
      onPanelOpen()
    },
    toggleBubble: () => {
      if (panel === "bubble") {
        setPanel(null)
        return
      }
      setClusterItems(null)
      setPanel("bubble")
      onPanelOpen()
    },
    closeBubble: () => setPanel((current) => (current === "bubble" ? null : current)),
    openClusterList: (items) => {
      setClusterItems(items)
      setPanel("cluster")
    },
    closeCluster: () => {
      setClusterItems(null)
      setPanel((current) => (current === "cluster" ? null : current))
    },
    closePanel: () => {
      setPanel(null)
      setClusterItems(null)
    },
    closeAll: () => {
      setPanel(null)
      setClusterItems(null)
      clearDownloadStatus()
    },
    chooseArea: () => setAreaChosen(true),
    unchooseArea: () => setAreaChosen(false),
  })

  return { ...actions, panel, cardView, clusterItems, areaChosen }
}
