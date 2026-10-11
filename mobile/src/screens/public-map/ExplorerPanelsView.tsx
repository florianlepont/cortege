import type { ReactNode } from "react"
import { StyleSheet } from "react-native"
import type { AreaDownloadStatus } from "../../hooks/useOfflineAreas"
import { fr } from "../../i18n"
import type { MapLayerKey } from "../../map/layers"
import type { AreaLayersEstimate } from "../../map/offline-estimate"
import { AppPressable } from "../../ui/AppPressable"
import { DownloadCard } from "./DownloadCard"
import { DownloadChip } from "./DownloadChip"
import { MapNoticeStack } from "./MapNoticeStack"
import { OverlayBubble } from "./OverlayBubble"
import { OverlayButton } from "./OverlayButton"
import type { ExplorerLayers } from "./useExplorerLayers"
import { useDownloadAnnouncements } from "./useDownloadAnnouncements"
import type { ExplorerPanels } from "./useExplorerPanels"

const NO_FAILED_LAYERS: readonly MapLayerKey[] = []

export type ExplorerPanelsViewProps = {
  panels: ExplorerPanels
  layers: ExplorerLayers
  /** The download shown by the chip, or null. */
  downloadStatus: AreaDownloadStatus | null
  /** The weight of the framed area, for the card. */
  estimate: AreaLayersEstimate
  /** A download is running (started here or earlier): the card's button is disabled. */
  downloading: boolean
  /** Starts the download of the framed area under that name. */
  onDownload: (name: string) => void
  /** "Réessayer" of the card's failed view: downloads the framed area again. */
  onRetry: () => void
  /** The finished chip has been shown for its 4 s. */
  onClearStatus: () => void
  /** "Réessayer" of the error notice: the style is asked again. */
  onRetryStyle: () => void
  /** The card's drawn height, for the locate arrow's lift. */
  onCardHeight: (height: number) => void
  /** False offline when Types de forêt is not downloaded for the view. */
  forestAvailable: boolean
  /** The card's distance from the bottom of the screen (tab bar plus 14). */
  cardBottom: number
  /**
   * The map's own controls (capsule, locate arrow, legend). They are drawn above the bubble's
   * backdrop, so a tap on them acts at once, and under the card, which covers the legend.
   */
  children?: ReactNode
}

/**
 * Every floating panel of the Explorer in one element (UI-SPEC sections 2, 6 and 8): the overlay
 * button, the bubble with the transparent layer behind it, the compact download card, the chip and
 * the notices column. It renders only: the state lives in `useExplorerPanels` and
 * `useExplorerLayers`, the screen wires them. It also hosts the screen-level announcements of a
 * download, which go on while the chip is hidden.
 */
export function ExplorerPanelsView({
  panels,
  layers,
  downloadStatus,
  estimate,
  downloading,
  onDownload,
  onRetry,
  onClearStatus,
  onRetryStyle,
  onCardHeight,
  forestAvailable,
  cardBottom,
  children,
}: ExplorerPanelsViewProps) {
  useDownloadAnnouncements(downloadStatus)
  const { actions, state } = layers.layers
  const bubbleOpen = panels.panel === "bubble"
  const failedLayers =
    downloadStatus?.phase === "done" ? downloadStatus.failedLayers : NO_FAILED_LAYERS

  // The download starts and the card closes at once: the chip carries the progress from here.
  const download = (name: string) => {
    onDownload(name)
    panels.closePanel()
  }
  const retry = () => {
    onRetry()
    panels.closePanel()
  }
  // Only a failed or a partial chip is pressable: the card reopens on that result.
  const reopenResult = () =>
    panels.openCardOn(downloadStatus?.phase === "failed" ? "failed" : "partial")

  return (
    <>
      {bubbleOpen ? (
        <AppPressable
          testID="overlay-bubble-backdrop"
          disableScale
          disableRipple
          style={StyleSheet.absoluteFill}
          onPress={panels.closeBubble}
          accessibilityRole="button"
          accessibilityLabel={fr.mapLayers.overlays.closeA11y}
        />
      ) : null}
      <OverlayButton
        top={layers.overlayButtonTop}
        active={layers.layers.overlayDot}
        expanded={bubbleOpen}
        onPress={panels.toggleBubble}
      />
      {children}
      {bubbleOpen ? (
        <OverlayBubble
          top={layers.overlayButtonTop}
          forest={state.overlay}
          forestAvailable={forestAvailable}
          parcels={state.parcels}
          comparing={state.compare !== null}
          onToggleForest={actions.toggleOverlay}
          onChangeParcels={actions.setParcels}
        />
      ) : null}
      <MapNoticeStack notices={layers.notices} top={layers.noticesTop} onRetry={onRetryStyle} />
      <DownloadChip
        status={downloadStatus}
        visible={layers.chipShown}
        top={layers.capsuleTop}
        onPress={reopenResult}
        onExpire={onClearStatus}
      />
      {panels.panel === "card" ? (
        <DownloadCard
          estimate={estimate}
          view={panels.cardView}
          failedLayers={failedLayers}
          runningElsewhere={downloading}
          bottom={cardBottom}
          onDownload={download}
          onRetry={retry}
          onDone={panels.closeAll}
          onClose={panels.closePanel}
          onHeight={onCardHeight}
        />
      ) : null}
    </>
  )
}
