import { useEffect, useMemo, useState } from "react"
import { StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { CnpfFactorAGenusCode } from "@cortege/ibp-domain"
import { brandRadius, brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"
import { AppNotice } from "../../ui/AppNotice"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { AppText as Text } from "../../ui/AppText"
import { GenusRecognitionModal } from "../../ui/GenusRecognitionModal"
import { GenusTargetSheet } from "./GenusTargetSheet"
import {
  HOME_GAPS,
  TOOL_TILE_GAP,
  TOOL_TILE_ICON,
  TOOL_TILE_ICON_GAP,
  TOOL_TILE_MIN_HEIGHT,
  TOOL_TILE_PADDING,
} from "./layout-budget"
import { AppPressable } from "../../ui/AppPressable"

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
const PAGE_H = brandSpacing4.md

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
  /** Opens the dendromicrohabitat guide sheet over Accueil (phase 32, owner request). */
  onOpenDmhGuide: () => void
}

/**
 * OA-107: the tools that help fill in the factors, launched from Accueil. The photo identification
 * (the same tool as in factor A) opens the camera at once; its confirmed genus is not kept as an
 * object of its own: it goes into a survey in progress, or starts a survey with it. Beside it, on the
 * same line, the dendromicrohabitat guide (phase 32): the same sheet as in factor F, read offline.
 */
export function ToolsSection({
  surveys,
  onAddGenusToSurvey,
  onStartSurveyWithGenus,
  onOpenDmhGuide,
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
  const targets = genus
    ? openDrafts(surveys).map((survey) => ({
        id: survey.id,
        name: survey.site_name?.trim() || fr.common.untitledSurvey,
        progress: survey.factors_filled,
      }))
    : []
  const addToSurvey = (surveyId: string): void => {
    if (genus === null) return
    const chosen = genus
    const target = targets.find((entry) => entry.id === surveyId)
    void onAddGenusToSurvey(surveyId, chosen).then((added) =>
      setNotice(
        added
          ? {
              tone: "success",
              message: t.genusAdded({
                genus: fr.genus.displayName[chosen],
                name: target?.name ?? fr.common.untitledSurvey,
              }),
            }
          : { tone: "warning", message: t.addFailed },
      ),
    )
  }

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
        <ToolCard
          styles={styles}
          iconName="camera-outline"
          title={t.identify.title}
          body={t.identify.body}
          a11y={t.identify.a11y}
          testID="tool-identify-tree"
          onPress={() => setIdentifying(true)}
        />
        <ToolCard
          styles={styles}
          iconName="book-outline"
          title={t.guide.title}
          body={t.guide.body}
          a11y={t.guide.a11y}
          testID="tool-dmh-guide"
          onPress={onOpenDmhGuide}
        />
      </View>

      <GenusRecognitionModal
        visible={identifying}
        onClose={() => setIdentifying(false)}
        onConfirmGenus={setGenus}
        confirmLabel={t.identify.confirm}
      />
      <GenusTargetSheet
        visible={sheetOpen}
        genusName={genusName}
        targets={targets}
        onStartSurvey={() => {
          if (genus !== null) onStartSurveyWithGenus(genus)
        }}
        onChooseTarget={addToSurvey}
        onClose={closeSheet}
      />
    </View>
  )
}

type ToolCardProps = {
  styles: ReturnType<typeof createStyles>
  iconName: "camera-outline" | "book-outline"
  title: string
  body: string
  a11y: string
  testID: string
  onPress: () => void
}

/** One half-width tool tile: the icon tile on top, then the title and one short line. */
function ToolCard({ styles, iconName, title, body, a11y, testID, onPress }: ToolCardProps) {
  const theme = useBrandTheme()
  return (
    <AppPressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      testID={testID}
    >
      <View style={styles.icon}>
        <Ionicons name={iconName} size={22} color={theme.semanticColors.onCtaPrimary} />
      </View>
      <View style={styles.copy}>
        <Text
          style={styles.cardTitle}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {title}
        </Text>
        <Text style={styles.cardBody} numberOfLines={2}>
          {body}
        </Text>
      </View>
    </AppPressable>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    section: {
      marginTop: HOME_GAPS.section,
    },
    header: {
      paddingHorizontal: PAGE_H,
      marginBottom: HOME_GAPS.sectionHeader,
    },
    notice: {
      marginHorizontal: PAGE_H,
      marginBottom: brandSpacing4.smd,
    },
    // Owner request 2026-10-28: the two tools side by side, two half-width tiles on one line. The
    // row stretches them to the same height.
    row: {
      flexDirection: "row",
      paddingHorizontal: PAGE_H,
      gap: TOOL_TILE_GAP,
    },
    card: {
      flex: 1,
      minHeight: TOOL_TILE_MIN_HEIGHT,
      gap: TOOL_TILE_ICON_GAP,
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: theme.visual.glass.cardBorder,
      backgroundColor: theme.visual.glass.cardFill,
      boxShadow: theme.visual.glass.cardShadow,
      padding: TOOL_TILE_PADDING,
    },
    copy: {
      alignSelf: "stretch",
    },
    icon: {
      width: TOOL_TILE_ICON,
      height: TOOL_TILE_ICON,
      borderRadius: brandRadius.badgeSm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.semanticColors.ctaPrimary,
    },
    cardTitle: {
      ...brandTypography.button,
      fontSize: brandTypeScale.subhead.fontSize,
      color: theme.semanticColors.textStrong,
    },
    cardBody: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
  })
}
