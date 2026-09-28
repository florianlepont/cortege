import { useMemo } from "react"
import { Button, Modal, Platform, Pressable, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import MapView, { Marker } from "react-native-maps"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { brandColors } from "../../app/brand-tokens"
import { useBrandTheme } from "../../app/theme"
import { IgnCadastreTileOverlay } from "../../components/IgnCadastreTileOverlay"
import { ParcelOverlayPolygons } from "../../components/ParcelOverlayPolygons"
import { GlassSurface } from "../../ui/GlassSurface"
import { createParcelStyles } from "./parcels.styles"
import type { ParcelMapState } from "./useParcelMap"
import { fr } from "../../i18n"

// Full-screen parcel map of step 2.
export function ParcelMapModal({
  map,
  siteName,
  selectedParcelIds,
  onToggleParcelSelection,
}: {
  map: ParcelMapState
  siteName: string
  selectedParcelIds: string[]
  onToggleParcelSelection: (parcelId: string) => void
}) {
  const insets = useSafeAreaInsets()
  const theme = useBrandTheme()
  const parcelStyles = useMemo(() => createParcelStyles(theme), [theme])
  const hasParcelSelection = selectedParcelIds.length > 0
  const fullscreenParcelSelectionTitle = hasParcelSelection
    ? fr.surveyForm.parcels.selectionTitle({ count: selectedParcelIds.length })
    : fr.surveyForm.parcels.noSelection

  return (
    <Modal
      visible={map.isParcelMapFullscreenVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={map.closeFullscreenMap}
    >
      <View style={parcelStyles.fullscreenMapScreen}>
        <MapView
          ref={map.setFullscreenMapInstance}
          style={parcelStyles.fullscreenMap}
          initialRegion={map.mapRegion}
          onMapReady={map.handleFullscreenMapReady}
          onRegionChangeComplete={map.handleMapRegionChange}
        >
          <IgnCadastreTileOverlay enabled={map.mapZoom >= 15} zIndex={0} />
          <ParcelOverlayPolygons
            items={map.parcelStatuses}
            selectedParcelIds={selectedParcelIds}
            onParcelPress={onToggleParcelSelection}
          />
          {map.gpsMarker ? <Marker coordinate={map.gpsMarker} /> : null}
        </MapView>

        <View
          pointerEvents="box-none"
          style={[
            parcelStyles.fullscreenMapOverlay,
            {
              paddingTop: insets.top + 8,
              paddingBottom: Math.max(insets.bottom, 12) + 12,
            },
          ]}
        >
          <GlassSurface tone="auto" style={parcelStyles.fullscreenMapTopBar}>
            {Platform.OS === "ios" ? (
              <>
                <Button
                  title={fr.surveyForm.parcels.back}
                  color={brandColors.forest}
                  onPress={map.closeFullscreenMap}
                />
                <Text numberOfLines={1} style={parcelStyles.fullscreenMapTopTitle}>
                  {siteName.trim() || fr.surveyForm.parcels.fullscreenFallbackTitle}
                </Text>
                <Button
                  title={fr.surveyForm.parcels.done}
                  color={brandColors.forest}
                  onPress={map.closeFullscreenMap}
                />
              </>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={fr.surveyForm.a11y.closeFullscreenMap}
                  onPress={map.closeFullscreenMap}
                >
                  <GlassSurface tone="dark" style={parcelStyles.fullscreenMapCloseButton}>
                    <Ionicons name="arrow-back" size={18} color={brandColors.white} />
                    <Text style={parcelStyles.fullscreenMapCloseText}>
                      {fr.surveyForm.parcels.back}
                    </Text>
                  </GlassSurface>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={fr.surveyForm.a11y.doneFullscreenMap}
                  onPress={map.closeFullscreenMap}
                >
                  <GlassSurface tone="dark" style={parcelStyles.fullscreenMapCloseButton}>
                    <Text style={parcelStyles.fullscreenMapCloseText}>
                      {fr.surveyForm.parcels.done}
                    </Text>
                  </GlassSurface>
                </Pressable>
              </>
            )}
          </GlassSurface>

          <View style={parcelStyles.fullscreenMapBottomArea}>
            <View style={parcelStyles.fullscreenMapFloatingActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={fr.surveyForm.a11y.locate}
                accessibilityState={{ busy: map.isAutoLocatingParcels }}
                style={parcelStyles.fullscreenMapActionButton}
                onPress={map.handleLocateParcelsMap}
              >
                <Ionicons
                  name={map.isAutoLocatingParcels ? "hourglass-outline" : "locate-outline"}
                  size={18}
                  color={brandColors.white}
                />
                <Text style={parcelStyles.fullscreenMapActionButtonText}>
                  {fr.surveyForm.parcels.currentPosition}
                </Text>
              </Pressable>
            </View>

            <GlassSurface tone="auto" style={parcelStyles.fullscreenMapBottomSheet}>
              <Text style={parcelStyles.fullscreenMapBottomTitle}>
                {fullscreenParcelSelectionTitle}
              </Text>
              <Text style={parcelStyles.fullscreenMapBottomMeta}>{map.helperText}</Text>
              {!hasParcelSelection ? (
                <View style={parcelStyles.fullscreenMapWarningCard}>
                  <Ionicons name="alert-circle-outline" size={18} color={brandColors.terracotta} />
                  <Text style={parcelStyles.fullscreenMapWarningText}>
                    {fr.surveyForm.parcels.selectAtLeastOne}
                  </Text>
                </View>
              ) : null}
              <Text style={parcelStyles.fullscreenMapBottomHint}>
                {fr.surveyForm.parcels.fullscreenHint}
              </Text>
            </GlassSurface>
          </View>
        </View>
      </View>
    </Modal>
  )
}
