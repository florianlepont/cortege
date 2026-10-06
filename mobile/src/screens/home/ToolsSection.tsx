import { useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { CnpfFactorAGenusCode } from "@cortege/ibp-domain"
import { brandSpacing, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"
import { AppActionSheet } from "../../ui/AppActionSheet"
import { AppNotice } from "../../ui/AppNotice"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { AppText as Text } from "../../ui/AppText"
import { GenusRecognitionModal } from "../../ui/GenusRecognitionModal"

const t = fr.home.tools

/** The most recent drafts first: the surveys a genus can still be added to. */
const MAX_SURVEYS_OFFERED = 5

/**
 * The recognition sheet closes before the survey sheet opens: iOS drops a modal presented while
 * another is still sliding away.
 */
const SHEET_DELAY_MS = 450
const NOTICE_MS = 5000
/** The same page margin as the rest of Accueil (home/styles.ts). */
const PAGE_H = 20

export function openDrafts(surveys: LocalSurvey[]): LocalSurvey[] {
  return surveys
    .filter((survey) => survey.status !== "submitted")
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, MAX_SURVEYS_OFFERED)
}

type ToolsSectionProps = {
  surveys: LocalSurvey[]
  /** False when the genus could not be added (a submitted survey, one that no longer exists). */
  onAddGenusToSurvey: (surveyId: string, genus: CnpfFactorAGenusCode) => Promise<boolean>
  onStartSurveyWithGenus: (genus: CnpfFactorAGenusCode) => void
}

/**
 * OA-107: the tools that help fill in the factors, launched from Accueil. The photo identification
 * (the same tool as in factor A) opens the camera at once; its confirmed genus is not kept as an
 * object of its own: it goes into a survey in progress, or starts a survey with it.
 */
export function ToolsSection({
  surveys,
  onAddGenusToSurvey,
  onStartSurveyWithGenus,
}: ToolsSectionProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [identifying, setIdentifying] = useState(false)
  const [genus, setGenus] = useState<CnpfFactorAGenusCode | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [notice, setNotice] = useState<{ message: string; tone: "success" | "warning" } | null>(
    null,
  )

  useEffect(() => {
    if (genus === null || identifying) return
    const timer = setTimeout(() => setSheetOpen(true), SHEET_DELAY_MS)
    return () => clearTimeout(timer)
  }, [genus, identifying])

  useEffect(() => {
    if (notice === null) return
    const timer = setTimeout(() => setNotice(null), NOTICE_MS)
    return () => clearTimeout(timer)
  }, [notice])

  const closeSheet = (): void => {
    setSheetOpen(false)
    setGenus(null)
  }

  const genusName = genus ? fr.genus.displayName[genus] : ""
  const options = genus
    ? [
        ...openDrafts(surveys).map((survey) => ({
          label: survey.site_name?.trim() || fr.common.untitledSurvey,
          onPress: () => {
            const chosen = genus
            void onAddGenusToSurvey(survey.id, chosen).then((added) =>
              setNotice(
                added
                  ? {
                      tone: "success",
                      message: t.genusAdded({
                        genus: fr.genus.displayName[chosen],
                        name: survey.site_name?.trim() || fr.common.untitledSurvey,
                      }),
                    }
                  : { tone: "warning", message: t.addFailed },
              ),
            )
          },
        })),
        {
          label: t.startSurvey,
          onPress: () => onStartSurveyWithGenus(genus),
        },
      ]
    : []

  return (
    <View style={styles.section}>
      <AppSectionHeader title={t.title} style={styles.header} />
      {notice ? (
        <AppNotice
          tone={notice.tone}
          icon={notice.tone === "success" ? "checkmark-circle-outline" : "alert-circle-outline"}
          message={notice.message}
          action={{ label: t.dismissNotice, onPress: () => setNotice(null) }}
          style={styles.notice}
        />
      ) : null}
      <View style={styles.row}>
        <Pressable
          style={styles.card}
          onPress={() => setIdentifying(true)}
          accessibilityRole="button"
          accessibilityLabel={t.identify.a11y}
          testID="tool-identify-tree"
        >
          <View style={styles.icon}>
            <Ionicons name="camera-outline" size={22} color={theme.semanticColors.onCtaPrimary} />
          </View>
          <Text style={styles.cardTitle}>{t.identify.title}</Text>
          <Text style={styles.cardBody}>{t.identify.body}</Text>
        </Pressable>
      </View>

      <GenusRecognitionModal
        visible={identifying}
        onClose={() => setIdentifying(false)}
        onConfirmGenus={setGenus}
      />
      <AppActionSheet
        visible={sheetOpen}
        onClose={closeSheet}
        title={t.chooseSurveyTitle({ genus: genusName })}
        options={options}
        cancelLabel={t.cancel}
      />
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    section: {
      marginTop: brandSpacing.xl + 4,
    },
    header: {
      paddingHorizontal: PAGE_H,
      marginBottom: 14,
    },
    notice: {
      marginHorizontal: PAGE_H,
      marginBottom: 12,
    },
    row: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: PAGE_H,
    },
    card: {
      flex: 1,
      maxWidth: 220,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: theme.semanticColors.ctaPrimary,
      backgroundColor: theme.semanticColors.surfaceElevated,
      padding: 14,
      gap: 6,
    },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.semanticColors.ctaPrimary,
    },
    cardTitle: {
      ...brandTypography.button,
      fontSize: 15,
      color: theme.semanticColors.textStrong,
    },
    cardBody: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
  })
}
