import { memo, useState } from "react"
import { Pressable, ScrollView, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import { brandColors } from "../../app/brand-tokens"
import type { AreaDownloadEstimate } from "../../map/tile-math"
import type { OfflineAreaStatus, OfflineAreaSummary } from "../../storage/offline-map"
import { fr } from "../../i18n"
import { AppButton } from "../../ui/AppButton"
import { AppCard } from "../../ui/AppCard"
import { AppField } from "../../ui/AppField"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { AppStatusChip, type AppStatusChipTone } from "../../ui/AppStatusChip"
import { offlineAreasStyles as areaStyles, panelStyles as styles } from "./styles"

const t = fr.offlineMap.areas

const pad = (value: number): string => String(value).padStart(2, "0")

function defaultAreaName(): string {
  const now = new Date()
  const formatted = `${pad(now.getDate())}/${pad(now.getMonth() + 1)} ${pad(now.getHours())}:${pad(now.getMinutes())}`
  return t.defaultName(formatted)
}

const STATUS_LABEL: Record<OfflineAreaStatus, string> = {
  downloading: t.status.downloading,
  ready: t.status.ready,
  failed: t.status.failed,
}

const STATUS_TONE: Record<OfflineAreaStatus, AppStatusChipTone> = {
  downloading: "neutral",
  ready: "success",
  failed: "danger",
}

type AreaRowProps = {
  area: OfflineAreaSummary
  downloading: boolean
  onDelete: (id: string) => void
}

const AreaRow = memo(function AreaRow({ area, downloading, onDelete }: AreaRowProps) {
  const handleDelete = (): void => onDelete(area.id)
  return (
    <View style={areaStyles.row}>
      <View style={areaStyles.rowInfo}>
        <Text style={styles.title}>{area.name}</Text>
        <Text style={styles.meta}>
          {t.progress({ downloaded: area.downloadedTiles, total: area.totalTiles })}
        </Text>
      </View>
      <AppStatusChip label={STATUS_LABEL[area.status]} tone={STATUS_TONE[area.status]} />
      <Pressable
        onPress={handleDelete}
        disabled={downloading}
        accessibilityRole="button"
        accessibilityLabel={t.a11y.deleteArea(area.name)}
        style={areaStyles.deleteButton}
      >
        <Ionicons
          name="trash-outline"
          size={18}
          color={downloading ? brandColors.disabledMuted : brandColors.terracotta}
        />
      </Pressable>
    </View>
  )
})

export type OfflineAreasSheetProps = {
  bottom: number
  areas: OfflineAreaSummary[]
  downloadingAreaId: string | null
  estimate: AreaDownloadEstimate
  onDownload: (name: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

/**
 * Downloaded-area management (REQ-D-area-download): the current viewport's download size
 * estimate and progress, plus the list of already-downloaded areas with delete.
 */
export const OfflineAreasSheet = memo(function OfflineAreasSheet({
  bottom,
  areas,
  downloadingAreaId,
  estimate,
  onDownload,
  onDelete,
  onClose,
}: OfflineAreasSheetProps) {
  const [name, setName] = useState(defaultAreaName)
  const downloading = downloadingAreaId !== null
  const handleDownload = (): void => onDownload(name.trim() || defaultAreaName())

  return (
    <AppCard variant="panelElevated" padding={14} style={[styles.card, { bottom }]}>
      <AppSectionHeader
        title={t.title}
        subtitle={t.subtitle}
        titleStyle={styles.title}
        subtitleStyle={styles.meta}
        trailing={
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t.a11y.closeSheet}
          >
            <Ionicons name="close" size={18} color={brandColors.forest} />
          </Pressable>
        }
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

      <AppButton
        label={downloading ? t.downloading : t.downloadThisArea}
        onPress={handleDownload}
        disabled={downloading || estimate.exceedsCap}
        loading={downloading}
      />

      <ScrollView style={areaStyles.list}>
        {areas.length === 0 ? (
          <Text style={styles.meta}>{t.empty}</Text>
        ) : (
          areas.map((area) => (
            <AreaRow
              key={area.id}
              area={area}
              downloading={area.id === downloadingAreaId}
              onDelete={onDelete}
            />
          ))
        )}
      </ScrollView>
    </AppCard>
  )
})
