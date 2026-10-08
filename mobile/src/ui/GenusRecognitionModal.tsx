import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { Camera } from "expo-camera"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import type { CnpfFactorAGenusCode } from "@cortege/ibp-domain"
import { brandRadius, brandSpacing, brandSpacing4, brandTypography } from "../app/brand-tokens"
import { confidenceLine } from "../app/genus-recognition-text"
import type { GenusSuggestion } from "../recognition/calibration"
import { classifyGenusPhoto } from "../recognition/genusClassifierModel"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { AppButton } from "./AppButton"
import { AppCard } from "./AppCard"
import { AppText as Text } from "./AppText"
import { GenusCameraView } from "./GenusCameraView"

const t = fr.genusRecognition

// D-11: the most likely genus first, alternatives underneath. D-04: every genus stays a candidate
// (rankGenusSuggestions never filters), so this cap is purely a display choice, not a withholding.
const MAX_ALTERNATIVES_SHOWN = 4

type Step =
  | { kind: "idle" }
  // The live camera; `returnTo` is where closing it goes back to (the results of a retake).
  | { kind: "camera"; returnTo: Step | null }
  | { kind: "classifying" }
  | { kind: "results"; suggestions: GenusSuggestion[] }
  | { kind: "unavailable"; message: string }

type GenusRecognitionModalProps = {
  visible: boolean
  onClose: () => void
  /** The surveyor confirmed this suggestion - the caller adds it to Factor A's genus list (D-13). */
  onConfirmGenus: (genus: CnpfFactorAGenusCode) => void
  /** The confirm button's text, when the genus does not go into the open survey's Factor A. */
  confirmLabel?: string
}

/**
 * Photograph-a-tree entry point for Factor A (ADR-002 D-06/D-08/D-10/D-11/D-13). The recognition
 * photo is never persisted here or by any caller: only the classifier's in-memory result crosses
 * back out through `onConfirmGenus`, and re-entering this modal always starts a fresh capture.
 */
export function GenusRecognitionModal({
  visible,
  onClose,
  onConfirmGenus,
  confirmLabel,
}: GenusRecognitionModalProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const insets = useSafeAreaInsets()
  const [step, setStep] = useState<Step>({ kind: "idle" })

  const handleClose = (): void => {
    setStep({ kind: "idle" })
    onClose()
  }

  // OA-33: the camera opens as soon as the sheet does, with a framing guide; there is no "take a
  // photo" step in between. Closing that first camera closes the sheet; closing a retake's camera
  // goes back to the results it came from.
  const openCamera = async (returnTo: Step | null = null): Promise<void> => {
    const permission = await Camera.requestCameraPermissionsAsync()
    if (!permission.granted) {
      setStep({ kind: "unavailable", message: t.cameraPermissionRequired })
      return
    }
    setStep({ kind: "camera", returnTo })
  }

  const handleCameraClose = (): void => {
    if (step.kind === "camera" && step.returnTo) {
      setStep(step.returnTo)
      return
    }
    handleClose()
  }

  const handlePhoto = async (uri: string): Promise<void> => {
    setStep({ kind: "classifying" })
    const outcome = await classifyGenusPhoto(uri)
    if (outcome.status === "ok") {
      setStep({ kind: "results", suggestions: outcome.suggestions })
    } else {
      setStep({ kind: "unavailable", message: t.unavailableMessage })
    }
  }

  useEffect(() => {
    if (visible) void openCamera()
    // Only the sheet opening opens the camera; openCamera is recreated on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const handleConfirm = (genus: CnpfFactorAGenusCode): void => {
    onConfirmGenus(genus)
    handleClose()
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={step.kind === "camera" ? handleCameraClose : handleClose}
    >
      {step.kind === "camera" ? (
        <GenusCameraView
          onCapture={(uri) => void handlePhoto(uri)}
          onClose={handleCameraClose}
          onError={() => setStep({ kind: "unavailable", message: t.captureFailed })}
        />
      ) : (
        <View style={styles.screen}>
          <View style={[styles.header, { paddingTop: insets.top + brandSpacing.md }]}>
            <Text style={styles.title}>{t.modalTitle}</Text>
            <Pressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel={t.close}
              testID="genus-recognition-close"
            >
              <Ionicons name="close-outline" size={24} color={theme.colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {step.kind === "idle" ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.forest} />
              </View>
            ) : null}

            {step.kind === "classifying" ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.forest} />
                <Text style={styles.bodyText}>{t.classifying}</Text>
              </View>
            ) : null}

            {step.kind === "unavailable" ? (
              <View style={styles.block}>
                <Text style={styles.bodyText}>{step.message}</Text>
                <AppButton
                  label={t.retakePhoto}
                  variant="secondary"
                  onPress={() => void openCamera(step)}
                />
                <AppButton
                  label={t.unavailableAction}
                  onPress={handleClose}
                  testID="genus-recognition-fallback"
                />
              </View>
            ) : null}

            {step.kind === "results" ? (
              <View style={styles.block}>
                <Text style={styles.sectionTitle}>{t.resultsTitle}</Text>
                {step.suggestions.slice(0, 1 + MAX_ALTERNATIVES_SHOWN).map((suggestion, index) => (
                  <AppCard
                    key={suggestion.genus}
                    variant="panelElevated"
                    padding={14}
                    style={styles.resultCard}
                  >
                    <View style={styles.resultRow}>
                      <View style={styles.resultCopy}>
                        {index === 0 ? (
                          <Text style={styles.mostLikelyBadge}>{t.mostLikelyBadge}</Text>
                        ) : null}
                        <Text style={styles.resultGenus}>
                          {fr.genus.displayName[suggestion.genus]}
                        </Text>
                        <Text style={styles.resultConfidence}>
                          {confidenceLine(suggestion.label)}
                        </Text>
                      </View>
                      <AppButton
                        label={confirmLabel ?? t.confirmGenus}
                        size="sm"
                        onPress={() => handleConfirm(suggestion.genus)}
                        testID={`genus-recognition-confirm-${suggestion.genus}`}
                      />
                    </View>
                  </AppCard>
                ))}
                <AppButton
                  label={t.tryAnotherPhoto}
                  variant="secondary"
                  onPress={() => void openCamera(step)}
                />
              </View>
            ) : null}
          </ScrollView>
        </View>
      )}
    </Modal>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.semanticColors.backgroundCanvas,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: brandSpacing.md,
      paddingBottom: brandSpacing4.sm,
    },
    title: {
      ...brandTypography.sectionTitle,
      color: theme.semanticColors.textStrong,
    },
    content: {
      padding: brandSpacing.md,
      gap: brandSpacing4.md,
    },
    block: {
      gap: brandSpacing4.md,
    },
    centered: {
      alignItems: "center",
      gap: brandSpacing4.md,
      paddingVertical: brandSpacing.lg,
    },
    bodyText: {
      ...brandTypography.sectionBody,
      color: theme.colors.textPrimary,
    },
    sectionTitle: {
      ...brandTypography.sectionTitle,
      fontSize: 18,
      color: theme.semanticColors.textStrong,
    },
    resultCard: {
      borderRadius: brandRadius.field,
    },
    resultRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.md,
    },
    resultCopy: {
      flex: 1,
      gap: 2,
    },
    mostLikelyBadge: {
      ...brandTypography.meta,
      fontWeight: "700",
      color: theme.colors.moss,
    },
    resultGenus: {
      ...brandTypography.sectionBody,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    resultConfidence: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
  })
}
