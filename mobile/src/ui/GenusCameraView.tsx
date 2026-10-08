import { useMemo, useRef, useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { CameraView } from "expo-camera"
import { Ionicons } from "@expo/vector-icons"
import { brandCameraTokens, brandColors, brandSpacing, brandTypography } from "../app/brand-tokens"
import { fr } from "../i18n"
import { AppText as Text } from "./AppText"
import { useSafeAreaInsets } from "react-native-safe-area-context"

const t = fr.genusRecognition

/** The square the subject has to fill: the corner brackets drawn over the preview. */
const GUIDE_SIZE = 300
const CORNER_LENGTH = 54
const CORNER_WIDTH = 4
const CORNER_RADIUS = 20

type GenusCameraViewProps = {
  /** The photo was taken: its file URI, kept in memory by the caller and never saved. */
  onCapture: (uri: string) => void
  onClose: () => void
  /** The camera could not take the photo. */
  onError: () => void
}

/**
 * The live camera of the genus recognition (OA-33): the preview full screen, a framing guide
 * that says what to photograph (one subject, filling the frame) and a shutter. It replaces the
 * system camera, which has no room for a guide.
 */
export function GenusCameraView({ onCapture, onClose, onError }: GenusCameraViewProps) {
  const styles = useMemo(() => createStyles(), [])
  const insets = useSafeAreaInsets()
  const cameraRef = useRef<CameraView>(null)
  const [capturing, setCapturing] = useState(false)

  const handleShutter = async (): Promise<void> => {
    if (capturing || !cameraRef.current) return
    setCapturing(true)
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.8 })
      onCapture(picture.uri)
    } catch {
      onError()
    } finally {
      setCapturing(false)
    }
  }

  return (
    <View style={styles.screen}>
      <CameraView ref={cameraRef} style={styles.preview} facing="back" />

      <View style={[styles.topBar, { paddingTop: insets.top + brandSpacing.sm }]}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t.closeCamera}
          style={styles.closeButton}
          testID="genus-camera-close"
        >
          <Ionicons name="close-outline" size={22} color={brandCameraTokens.guide} />
        </Pressable>
        <Text style={styles.title}>{t.modalTitle}</Text>
        <View style={styles.closeButton} />
      </View>

      <View style={styles.guideLayer} pointerEvents="none">
        <View accessible accessibilityLabel={t.guideA11y} style={styles.guide}>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
        </View>
        <View style={styles.hint}>
          <Text style={styles.hintText}>{t.captureHint}</Text>
        </View>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + brandSpacing.lg }]}>
        <Pressable
          onPress={() => void handleShutter()}
          disabled={capturing}
          accessibilityRole="button"
          accessibilityLabel={t.takePhotoButton}
          accessibilityState={{ disabled: capturing }}
          style={styles.shutterRing}
          testID="genus-camera-shutter"
        >
          <View style={styles.shutterDot} />
        </Pressable>
      </View>
    </View>
  )
}

function createStyles() {
  const corner = {
    position: "absolute" as const,
    width: CORNER_LENGTH,
    height: CORNER_LENGTH,
    borderColor: brandCameraTokens.guide,
  }
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: brandColors.black,
    },
    preview: {
      ...StyleSheet.absoluteFill,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: brandSpacing.md,
    },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: brandCameraTokens.controlBackground,
    },
    title: {
      ...brandTypography.sectionTitle,
      fontSize: 17,
      color: brandCameraTokens.guide,
    },
    guideLayer: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
      gap: brandSpacing.lg,
      paddingHorizontal: brandSpacing.lg,
    },
    guide: {
      width: GUIDE_SIZE,
      height: GUIDE_SIZE,
    },
    corner,
    cornerTopLeft: {
      top: 0,
      left: 0,
      borderTopWidth: CORNER_WIDTH,
      borderLeftWidth: CORNER_WIDTH,
      borderTopLeftRadius: CORNER_RADIUS,
    },
    cornerTopRight: {
      top: 0,
      right: 0,
      borderTopWidth: CORNER_WIDTH,
      borderRightWidth: CORNER_WIDTH,
      borderTopRightRadius: CORNER_RADIUS,
    },
    cornerBottomRight: {
      bottom: 0,
      right: 0,
      borderBottomWidth: CORNER_WIDTH,
      borderRightWidth: CORNER_WIDTH,
      borderBottomRightRadius: CORNER_RADIUS,
    },
    cornerBottomLeft: {
      bottom: 0,
      left: 0,
      borderBottomWidth: CORNER_WIDTH,
      borderLeftWidth: CORNER_WIDTH,
      borderBottomLeftRadius: CORNER_RADIUS,
    },
    hint: {
      borderRadius: 18,
      paddingHorizontal: brandSpacing.md,
      paddingVertical: 12,
      backgroundColor: brandCameraTokens.hintBackground,
    },
    hintText: {
      ...brandTypography.sectionBody,
      fontSize: 17,
      textAlign: "center",
      color: brandCameraTokens.guide,
    },
    bottomBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
    },
    shutterRing: {
      width: 76,
      height: 76,
      borderRadius: 38,
      borderWidth: 5,
      borderColor: brandCameraTokens.guide,
      backgroundColor: brandCameraTokens.shutterRing,
      alignItems: "center",
      justifyContent: "center",
    },
    shutterDot: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: brandCameraTokens.guide,
    },
  })
}
