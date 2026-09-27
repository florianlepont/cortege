import { useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native"
import * as ImagePicker from "expo-image-picker"
import { Ionicons } from "@expo/vector-icons"
import type { CnpfFactorAGenusCode } from "@cortege/ibp-domain"
import {
  brandColors,
  brandRadius,
  brandSpacing,
  brandSpacing4,
  brandTypography,
} from "../app/brand-tokens"
import { confidenceLine } from "../app/genus-recognition-text"
import type { GenusSuggestion } from "../recognition/calibration"
import { classifyGenusPhoto } from "../recognition/genusClassifierModel"
import { fr } from "../i18n"
import { AppButton } from "./AppButton"
import { AppCard } from "./AppCard"
import { AppText as Text } from "./AppText"

const t = fr.genusRecognition

// D-11: the most likely genus first, alternatives underneath. D-04: every genus stays a candidate
// (rankGenusSuggestions never filters), so this cap is purely a display choice, not a withholding.
const MAX_ALTERNATIVES_SHOWN = 4

type Step =
  | { kind: "idle" }
  | { kind: "classifying" }
  | { kind: "results"; suggestions: GenusSuggestion[] }
  | { kind: "unavailable"; message: string }

type GenusRecognitionModalProps = {
  visible: boolean
  onClose: () => void
  /** The surveyor confirmed this suggestion - the caller adds it to Factor A's genus list (D-13). */
  onConfirmGenus: (genus: CnpfFactorAGenusCode) => void
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
}: GenusRecognitionModalProps) {
  const [step, setStep] = useState<Step>({ kind: "idle" })

  const handleClose = (): void => {
    setStep({ kind: "idle" })
    onClose()
  }

  const handleCapture = async (): Promise<void> => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      setStep({ kind: "unavailable", message: t.cameraPermissionRequired })
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    })
    if (result.canceled || result.assets.length === 0) {
      return
    }

    setStep({ kind: "classifying" })
    const outcome = await classifyGenusPhoto(result.assets[0].uri)
    if (outcome.status === "ok") {
      setStep({ kind: "results", suggestions: outcome.suggestions })
    } else {
      setStep({ kind: "unavailable", message: t.unavailableMessage })
    }
  }

  const handleConfirm = (genus: CnpfFactorAGenusCode): void => {
    onConfirmGenus(genus)
    handleClose()
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>{t.modalTitle}</Text>
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel={t.close}
            testID="genus-recognition-close"
          >
            <Ionicons name="close" size={24} color={brandColors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {step.kind === "idle" ? (
            <View style={styles.block}>
              <Text style={styles.bodyText}>{t.captureIntro}</Text>
              <AppButton
                label={t.takePhoto}
                onPress={() => void handleCapture()}
                testID="genus-recognition-capture"
              />
            </View>
          ) : null}

          {step.kind === "classifying" ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={brandColors.forest} />
              <Text style={styles.bodyText}>{t.classifying}</Text>
            </View>
          ) : null}

          {step.kind === "unavailable" ? (
            <View style={styles.block}>
              <Text style={styles.bodyText}>{step.message}</Text>
              <AppButton
                label={t.retakePhoto}
                variant="secondary"
                onPress={() => void handleCapture()}
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
                      label={t.confirmGenus}
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
                onPress={() => void handleCapture()}
              />
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: brandColors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: brandSpacing.md,
    paddingTop: brandSpacing.md,
    paddingBottom: brandSpacing4.sm,
  },
  title: {
    ...brandTypography.sectionTitle,
    color: brandColors.forest,
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
    color: brandColors.textPrimary,
  },
  sectionTitle: {
    ...brandTypography.sectionTitle,
    fontSize: 18,
    color: brandColors.forest,
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
    color: brandColors.moss,
  },
  resultGenus: {
    ...brandTypography.sectionBody,
    fontWeight: "700",
    color: brandColors.textPrimary,
  },
  resultConfidence: {
    ...brandTypography.meta,
    color: brandColors.textSecondary,
  },
})
