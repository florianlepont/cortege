import { useEffect } from "react"
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import { brandColors, brandInteraction, brandRadius, brandSpacing4 } from "../../app/brand-tokens"
import type { NearbyParcel } from "../../hooks/useNearbyParcels"
import { fr } from "../../i18n"
import { useNearbyParcelsState } from "../../state/nearby-parcels-context"
import { AppNotice } from "../../ui/AppNotice"
import { triggerHaptic } from "../survey-list/haptics"

const t = fr.nearbyParcelsSheet
const ROW_HEIGHT = 56

type NearbyParcelsSheetProps = {
  visible: boolean
  onClose: () => void
  selectedParcelIds: string[]
  onToggleParcelSelection: (parcelId: string) => void
}

/** FLOW-10: "Parcelles autour de vous" — a native sheet offered as an alternative to tapping a
 * polygon on the map, reusing the same nearby-parcels context the Home screen's card already
 * loads through (CLAUDE.md: useNearbyParcelsState). */
export function NearbyParcelsSheet({
  visible,
  onClose,
  selectedParcelIds,
  onToggleParcelSelection,
}: NearbyParcelsSheetProps) {
  const { state, load } = useNearbyParcelsState()

  useEffect(() => {
    if (visible) void load()
  }, [visible, load])

  const handleToggle = (parcelId: string): void => {
    triggerHaptic()
    onToggleParcelSelection(parcelId)
  }

  const renderRow = ({ item }: { item: NearbyParcel }) => {
    const checked = selectedParcelIds.includes(item.parcel_id)
    const distance = t.distance({ km: item.distanceKm.toFixed(1) })
    return (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={t.rowA11y({ id: item.parcel_id, distance, checked })}
        onPress={() => handleToggle(item.parcel_id)}
        style={styles.row}
        testID={`nearby-parcel-row-${item.parcel_id}`}
      >
        <Ionicons
          name={checked ? "checkbox" : "square-outline"}
          size={22}
          color={checked ? brandColors.forest : brandColors.textSecondary}
        />
        <View style={styles.rowCopy}>
          <Text style={styles.rowTitle}>{t.parcelLabel({ id: item.parcel_id })}</Text>
          <Text style={styles.rowMeta}>{distance}</Text>
        </View>
      </Pressable>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.close}
            hitSlop={brandInteraction.hitTarget.min}
            onPress={onClose}
            style={styles.closeButton}
            testID="nearby-parcels-sheet-close"
          >
            <Ionicons name="close" size={22} color={brandColors.forest} />
          </Pressable>
        </View>

        {state.locationDenied ? (
          <AppNotice tone="warning" icon="location-outline" message={t.locationDenied} />
        ) : state.error ? (
          <AppNotice tone="danger" icon="cloud-offline-outline" message={t.loadError} />
        ) : state.loading ? (
          <View style={styles.loadingWrap} testID="nearby-parcels-loading">
            <ActivityIndicator color={brandColors.forest} />
            <Text style={styles.loadingText}>{t.loading}</Text>
          </View>
        ) : state.parcels.length === 0 ? (
          <AppNotice tone="info" icon="map-outline" message={t.empty} />
        ) : (
          <FlatList
            data={state.parcels}
            keyExtractor={(item) => item.parcel_id}
            renderItem={renderRow}
            testID="nearby-parcels-list"
          />
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.panel,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: brandSpacing4.md,
    gap: brandSpacing4.sm,
  },
  headerCopy: {
    flex: 1,
    gap: brandSpacing4.xxs,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: brandColors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: brandColors.textSecondary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: brandRadius.field,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brandColors.panelMuted,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: brandSpacing4.sm,
  },
  loadingText: {
    fontSize: 14,
    color: brandColors.textSecondary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: ROW_HEIGHT,
    paddingHorizontal: brandSpacing4.md,
    gap: brandSpacing4.sm,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.divider,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: brandColors.textPrimary,
  },
  rowMeta: {
    fontSize: 12,
    color: brandColors.textSecondary,
  },
})
