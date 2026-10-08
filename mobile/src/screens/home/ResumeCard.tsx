import { useMemo, useState } from "react"
import { LayoutChangeEvent, StyleSheet, View } from "react-native"
import { brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { forestAurora } from "../../app/forest-aurora-tokens"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"
import { AppButton } from "../../ui/AppButton"
import { AppText as Text } from "../../ui/AppText"
import { ForestCard } from "../../ui/ForestCard"
import { RESUME_LAYOUT } from "./layout-budget"

const t = fr.home.hero

const FACTOR_COUNT = 10
/** Between the text column and the button. */
const ROW_GAP = brandSpacing4.smd

type ResumeCardProps = {
  /** The draft touched within the resume window, or null for the "start a survey" card. */
  resumeDraft: LocalSurvey | null
  onResume: (surveyId: string) => void
  /** The "start a survey" button of the card without a draft. */
  onCreateSurvey: () => void
}

/**
 * HOME-02, variant I: the compact forest card of Accueil. With a recent draft it only resumes it
 * (title, "n/10 factors" line, ten progress segments, "Reprendre"); without one it is the "start a
 * survey" call to action. Title and button say what the card is, so it has no tag pill (owner check
 * on the iPhone). Text stays on the left so nothing sits under the halo at the top right of the
 * card, and the progress sits a full 24 pt under the button row. 12.2-19 fix round (owner): the
 * "Nouveau relevé" footer read as an action of the draft, so it left the card for `NewSurveyCard`,
 * drawn under it by Accueil only beside a draft. Fourth fix round (owner: the ripples did not
 * please and the full-card contour lines hurt the reading, "un mélange de A et F" from sketch 010):
 * both forms of the card carry the aurora (`ForestCard`'s backdrop: a shield under the text,
 * contours tracing themselves right of the text only) as their one animated layer. Its clear zone
 * is right of the text column and, with a draft, above the progress segments, which sit in the
 * shielded band.
 */
export function ResumeCard({ resumeDraft, onResume, onCreateSurvey }: ResumeCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  // The stored count of filled factors, the same definition as the survey detail. Never
  // `completion_rate / 10`: that percentage also counts the name, the method and the parcel.
  const resumeFactors = resumeDraft
    ? Math.max(0, Math.min(FACTOR_COUNT, Math.round(resumeDraft.factors_filled)))
    : 0
  // The contours are drawn right of the text column only: its end, in the card's space (the row
  // sits at the card's padding, the button a gap after the column).
  const [traceStart, setTraceStart] = useState<number | null>(null)
  const handleButtonLayout = (event: LayoutChangeEvent): void => {
    setTraceStart(RESUME_LAYOUT.padding + event.nativeEvent.layout.x - ROW_GAP)
  }
  // With a draft, the segments sit in the shielded band: it starts half the gap above them.
  const [bandTop, setBandTop] = useState<number | null>(null)
  const handleProgressLayout = (event: LayoutChangeEvent): void => {
    setBandTop(event.nativeEvent.layout.y - RESUME_LAYOUT.progressGap / 2)
  }
  const zone =
    traceStart === null || (resumeDraft && bandTop === null)
      ? null
      : { left: traceStart, bottom: resumeDraft ? (bandTop ?? undefined) : undefined }

  return (
    <ForestCard variant="resume" zone={zone} testID="home-resume-card">
      <View style={styles.main}>
        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={2}>
              {resumeDraft
                ? resumeDraft.site_name
                  ? t.resumeTitle({ name: resumeDraft.site_name })
                  : t.resumeTitleUnnamed
                : t.title}
            </Text>
            <Text style={styles.body}>
              {resumeDraft ? t.resumeBody({ completed: resumeFactors }) : t.body}
            </Text>
          </View>
          <View onLayout={handleButtonLayout} testID="home-resume-button">
            <AppButton
              label={resumeDraft ? t.resumeButton : t.button}
              leadingIcon={resumeDraft ? "play-outline" : "add-outline"}
              variant="glow"
              size="md"
              onPress={resumeDraft ? () => onResume(resumeDraft.id) : onCreateSurvey}
            />
          </View>
        </View>
        {resumeDraft ? (
          <View
            style={styles.progressRow}
            accessible={false}
            onLayout={handleProgressLayout}
            testID="home-resume-progress"
          >
            {Array.from({ length: FACTOR_COUNT }, (_, index) => (
              <View
                key={index}
                testID={index < resumeFactors ? "hero-progress-done" : "hero-progress-todo"}
                style={[
                  styles.progressSegment,
                  index < resumeFactors ? styles.progressSegmentDone : null,
                ]}
              />
            ))}
          </View>
        ) : null}
      </View>
    </ForestCard>
  )
}

function createStyles(theme: BrandTheme) {
  const forest = theme.visual.forest
  return StyleSheet.create({
    main: {
      padding: RESUME_LAYOUT.padding,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: ROW_GAP,
    },
    copy: {
      flex: 1,
      gap: RESUME_LAYOUT.textGap,
      alignItems: "flex-start",
    },
    title: {
      ...brandTypography.screenTitle,
      color: forest.title,
    },
    body: {
      ...brandTypeScale.subhead,
      color: forest.body,
    },
    progressRow: {
      flexDirection: "row",
      alignSelf: "stretch",
      gap: brandSpacing4.xs,
      // Owner check on the iPhone: the button sat too close to the progress. 24 reads as two blocks.
      marginTop: RESUME_LAYOUT.progressGap,
    },
    // Ten equal parts of the inner width: the basis is 0 and nothing sets a minimum width, so the
    // last segment can never run past the right edge of the card.
    progressSegment: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      minWidth: 0,
      height: RESUME_LAYOUT.progressHeight,
      borderRadius: RESUME_LAYOUT.progressHeight / 2,
      backgroundColor: forest.tagFill,
    },
    // The pale forest green: 3:1 in the shielded band over the brightest aurora (token tests).
    progressSegmentDone: {
      backgroundColor: forestAurora.progressDone,
    },
  })
}
