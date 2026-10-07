import { useMemo } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  brandInteraction,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"
import { AppButton } from "../../ui/AppButton"
import { AppText as Text } from "../../ui/AppText"
import { ForestCard } from "../../ui/ForestCard"
import { RESUME_LAYOUT } from "./layout-budget"

const t = fr.home.hero

const FACTOR_COUNT = 10

type ResumeCardProps = {
  /** The draft touched within the resume window, or null for the "start a survey" card. */
  resumeDraft: LocalSurvey | null
  onResume: (surveyId: string) => void
  onCreateSurvey: () => void
}

/**
 * HOME-02, variant I: the compact forest card of Accueil. With a recent draft it resumes it (title,
 * "n/10 factors" line, ten progress segments, a plain "new survey" link); without one it invites to
 * start. Title and button say what the card is, so it has no tag pill (owner check on the iPhone).
 * Text stays on the left so nothing sits under the halo at the top right of the card. The progress
 * sits a full 24 pt under the button row, and the "new survey" link has its own footer: a full-width
 * rule in the forest rule token and a slightly lighter band, so the two groups read as distinct
 * (D-20a, owner check on the iPhone: the gap alone was not enough).
 */
export function ResumeCard({ resumeDraft, onResume, onCreateSurvey }: ResumeCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  // The stored count of filled factors, the same definition as the survey detail. Never
  // `completion_rate / 10`: that percentage also counts the name, the method and the parcel.
  const resumeFactors = resumeDraft
    ? Math.max(0, Math.min(FACTOR_COUNT, Math.round(resumeDraft.factors_filled)))
    : 0

  return (
    <ForestCard variant="resume" testID="home-resume-card">
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
          <AppButton
            label={resumeDraft ? t.resumeButton : t.button}
            leadingIcon={resumeDraft ? "play-outline" : "add-outline"}
            variant="glow"
            size="md"
            onPress={resumeDraft ? () => onResume(resumeDraft.id) : onCreateSurvey}
          />
        </View>
        {resumeDraft ? (
          <View style={styles.progressRow} accessible={false}>
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
      {resumeDraft ? (
        <View style={styles.footer} testID="home-resume-footer">
          <Pressable
            style={styles.link}
            onPress={onCreateSurvey}
            accessibilityRole="button"
            accessibilityLabel={t.newSurveyButton}
          >
            <Ionicons name="add-outline" size={18} color={theme.visual.forest.body} />
            <Text style={styles.linkLabel}>{t.newSurveyButton}</Text>
          </Pressable>
        </View>
      ) : null}
    </ForestCard>
  )
}

function createStyles(theme: BrandTheme) {
  const forest = theme.visual.forest
  return StyleSheet.create({
    // The card content has no padding of its own: the footer rule runs edge to edge. The padding
    // of the card body is `main`'s.
    main: {
      padding: RESUME_LAYOUT.padding,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
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
    progressSegmentDone: {
      backgroundColor: forest.glowFallback,
    },
    // D-20a: a full-width rule (the forest tag border, stronger than the card hairline) over a
    // footer band of its own, so "Nouveau relevé" is clearly a second group.
    footer: {
      borderTopWidth: RESUME_LAYOUT.footerRule,
      borderTopColor: forest.tagBorder,
      backgroundColor: forest.tileFill,
      paddingVertical: RESUME_LAYOUT.footerPaddingY,
      paddingHorizontal: brandSpacing4.md,
    },
    link: {
      minHeight: brandInteraction.hitTarget.min,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: brandSpacing4.xs,
    },
    linkLabel: {
      ...brandTypography.button,
      color: forest.body,
    },
  })
}
