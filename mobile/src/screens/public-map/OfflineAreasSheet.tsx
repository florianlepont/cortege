import { memo, useMemo, useState } from "react"
import { View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { useBrandTheme } from "../../app/theme"
import type { AreaDownloadEstimate } from "../../map/tile-math"
import { fr } from "../../i18n"
import { AppField } from "../../ui/AppField"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { GlassButton } from "../../ui/GlassButton"
import { SheetCloseButton } from "./SheetCloseButton"
import { createPanelStyles, offlineAreasStyles as areaStyles } from "./styles"

const t = fr.offlineMap.areas

const pad = (value: number): string => String(value).padStart(2, "0")

function defaultAreaName(): string {
  const now = new Date()
  const formatted = `${pad(now.getDate())}/${pad(now.getMonth() + 1)} ${pad(now.getHours())}:${pad(now.getMinutes())}`
  return t.defaultName(formatted)
}

export type OfflineAreasSheetProps = {
  downloadingAreaId: string | null
  estimate: AreaDownloadEstimate
  onDownload: (name: string) => void
  onClose: () => void
}

/**
 * Downloaded-area management (REQ-D-area-download): the current viewport's download size
 * estimate and the download. The areas already on the phone are listed and deleted in Paramètres
 * (OA-108), not here (OA-123). Drawn in the
 * Explorer's bottom sheet like every other panel of the map (OA-66).
 */
export const OfflineAreasSheet = memo(function OfflineAreasSheet({
  downloadingAreaId,
  estimate,
  onDownload,
  onClose,
}: OfflineAreasSheetProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createPanelStyles(theme), [theme])
  const [name, setName] = useState(defaultAreaName)
  const downloading = downloadingAreaId !== null
  const handleDownload = (): void => onDownload(name.trim() || defaultAreaName())

  return (
    <View style={styles.card}>
      <AppSectionHeader
        title={t.title}
        subtitle={t.subtitle}
        titleStyle={styles.title}
        subtitleStyle={styles.meta}
        trailing={<SheetCloseButton accessibilityLabel={t.a11y.closeSheet} onPress={onClose} />}
      />

      <AppField
        label={t.nameLabel}
        value={name}
        onChangeText={setName}
        placeholder={t.namePlaceholder}
        containerStyle={areaStyles.nameField}
      />

      <Text style={estimate.exceedsCap ? areaStyles.warning : styles.meta}>
        {estimate.exceedsCap
          ? t.tooLarge
          : t.estimate({ tiles: estimate.totalTileCount, bytes: estimate.estimatedBytes })}
      </Text>

      {/* The panel's one action is the big glass call to action (D-27c, D-28): 12.2-19, the owner
          found the `md` button too thin, so it is `lg` (50 pt) across the whole panel. */}
      <GlassButton
        label={downloading ? t.downloading : t.downloadThisArea}
        size="lg"
        onPress={handleDownload}
        disabled={downloading || estimate.exceedsCap}
        loading={downloading}
        style={areaStyles.downloadButton}
        testID="offline-area-download"
      />
    </View>
  )
})
