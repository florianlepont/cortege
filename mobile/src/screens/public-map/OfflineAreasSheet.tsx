import { memo, useCallback, useMemo, useState } from "react"
import { Keyboard, LayoutChangeEvent, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { brandComponentTokens } from "../../app/brand-tokens"
import { useBrandTheme } from "../../app/theme"
import type { AreaDownloadStatus } from "../../hooks/useOfflineAreas"
import type { AreaDownloadEstimate } from "../../map/tile-math"
import { fr } from "../../i18n"
import { AppField } from "../../ui/AppField"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { GlassButton } from "../../ui/GlassButton"
import { DownloadStatusView, measureStatuses } from "./DownloadStatusView"
import { SheetCloseButton } from "./SheetCloseButton"
import { createPanelStyles, offlineAreasStyles as areaStyles } from "./styles"

const t = fr.offlineMap.areas

const noop = (): void => undefined

const pad = (value: number): string => String(value).padStart(2, "0")

function defaultAreaName(): string {
  const now = new Date()
  const formatted = `${pad(now.getDate())}/${pad(now.getMonth() + 1)} ${pad(now.getHours())}:${pad(now.getMinutes())}`
  return t.defaultName(formatted)
}

export type OfflineAreasSheetProps = {
  downloadingAreaId: string | null
  /** The download started from this panel: its bar while it runs, then its outcome. */
  downloadStatus: AreaDownloadStatus | null
  estimate: AreaDownloadEstimate
  onDownload: (name: string) => void
  /** "Terminé" once the area is on the phone: closes the panel. */
  onDone: () => void
  /** "Réessayer" after a failure: the same name, the area shown now. */
  onRetry: (name: string) => void
  onClose: () => void
}

/**
 * Downloaded-area management (REQ-D-area-download): the current viewport's download size
 * estimate and the download. The areas already on the phone are listed and deleted in Paramètres
 * (OA-108), not here (OA-123). Drawn in the
 * Explorer's bottom sheet like every other panel of the map (OA-66).
 *
 * Once a download has started (12.2-19 third round), the panel shows its progress bar, then its
 * outcome (`DownloadStatusView`), over the form. The panel keeps one height in every state, the
 * tallest one, measured: the form stays in the flow (hidden under a status), and unseen copies of
 * the three statuses are laid out with the panel's real width and text size, their tallest height
 * the body's minimum. The estimate (or the size warning) and the button stack in the flow, so
 * nothing can overlap whatever the text size, the screen or the keyboard.
 */
export const OfflineAreasSheet = memo(function OfflineAreasSheet({
  downloadingAreaId,
  downloadStatus,
  estimate,
  onDownload,
  onDone,
  onRetry,
  onClose,
}: OfflineAreasSheetProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createPanelStyles(theme), [theme])
  const [name, setName] = useState(defaultAreaName)
  const downloading = downloadingAreaId !== null
  const handleDownload = (): void => {
    // The form goes under the progress: the keyboard of its name field goes with it.
    Keyboard.dismiss()
    onDownload(name.trim() || defaultAreaName())
  }
  const formHidden = downloadStatus !== null
  // The tallest of the three statuses, as laid out (never a fixed number).
  const [statusHeights, setStatusHeights] = useState<Record<string, number>>({})
  const reserved = Math.max(0, ...Object.values(statusHeights))
  const measure = useCallback((phase: string, event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout
    setStatusHeights((current) =>
      current[phase] === height ? current : { ...current, [phase]: height },
    )
  }, [])
  const measured = useMemo(
    () => measureStatuses(downloadStatus?.name ?? name, estimate.totalTileCount),
    [downloadStatus?.name, name, estimate.totalTileCount],
  )

  return (
    <View style={styles.card}>
      <AppSectionHeader
        title={t.title}
        subtitle={t.subtitle}
        titleStyle={styles.title}
        subtitleStyle={styles.meta}
        trailing={<SheetCloseButton accessibilityLabel={t.a11y.closeSheet} onPress={onClose} />}
      />

      <View testID="offline-area-body" style={{ minHeight: reserved }}>
        <View
          testID="offline-area-form"
          pointerEvents={formHidden ? "none" : "auto"}
          accessibilityElementsHidden={formHidden}
          importantForAccessibility={formHidden ? "no-hide-descendants" : "auto"}
          style={[areaStyles.form, formHidden ? areaStyles.hidden : null]}
        >
          <AppField
            label={t.nameLabel}
            value={name}
            onChangeText={setName}
            placeholder={t.namePlaceholder}
            containerStyle={areaStyles.nameField}
          />

          <Text style={estimate.exceedsCap ? styles.warning : styles.meta}>
            {estimate.exceedsCap
              ? t.tooLarge
              : t.estimate({ tiles: estimate.totalTileCount, bytes: estimate.estimatedBytes })}
          </Text>

          {/* The panel's one action is the big glass call to action (D-27c, D-28), across the whole
              panel. 12.2-19: the owner found the `md` 44 pt too thin and the `lg` 50 pt too big, so
              it is 46 pt (`button.minHeightPanel`), the regular control drawn taller. */}
          <GlassButton
            label={downloading ? t.downloading : t.downloadThisArea}
            size="md"
            minHeight={brandComponentTokens.button.minHeightPanel}
            onPress={handleDownload}
            disabled={downloading || estimate.exceedsCap}
            loading={downloading}
            style={areaStyles.downloadButton}
            testID="offline-area-download"
          />
        </View>
        <View
          testID="offline-area-measure"
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[areaStyles.statusLayer, areaStyles.hidden]}
        >
          {measured.map((status) => (
            <View
              key={status.phase}
              testID={`offline-area-measure-${status.phase}`}
              onLayout={(event) => measure(status.phase, event)}
              style={areaStyles.statusLayer}
            >
              <DownloadStatusView status={status} announce={false} onDone={noop} onRetry={noop} />
            </View>
          ))}
        </View>
        {downloadStatus ? (
          <View style={areaStyles.statusLayer}>
            <DownloadStatusView
              key={downloadStatus.areaId}
              status={downloadStatus}
              onDone={onDone}
              onRetry={() => onRetry(downloadStatus.name)}
            />
          </View>
        ) : null}
      </View>
    </View>
  )
})
