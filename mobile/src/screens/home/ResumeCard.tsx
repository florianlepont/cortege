import { useMemo } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  brandInteraction,
  brandRadius,
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
 * start. Text stays on the left so nothing sits under the halo at the top right of the card.
 */
export function ResumeCard({ resumeDraft, onResume, onCreateSurvey }: ResumeCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const resumeFactors = resumeDraft
    ? Math.round(Math.max(0, Math.min(100, resumeDraft.completion_rate)) / 10)
    : 0

  return (
    <ForestCard variant="resume" contentStyle={styles.content} testID="home-resume-card">
      <View style={styles.row}>
        <View style={styles.copy}>
          <View style={styles.tag}>
            <Text style={styles.tagLabel}>{resumeDraft ? t.resumeEyebrow : t.eyebrow}</Text>
          </View>
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
        <>
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
          <Pressable
            style={styles.link}
            onPress={onCreateSurvey}
            accessibilityRole="button"
            accessibilityLabel={t.newSurveyButton}
          >
            <Ionicons name="add-outline" size={18} color={theme.visual.forest.body} />
            <Text style={styles.linkLabel}>{t.newSurveyButton}</Text>
          </Pressable>
        </>
      ) : null}
    </ForestCard>
  )
}

function createStyles(theme: BrandTheme) {
  const forest = theme.visual.forest
  return StyleSheet.create({
    content: {
      padding: brandSpacing4.md,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
    },
    copy: {
      flex: 1,
      gap: brandSpacing4.xs,
      alignItems: "flex-start",
    },
    tag: {
      backgroundColor: forest.tagFill,
      borderWidth: 1,
      borderColor: forest.tagBorder,
      borderRadius: brandRadius.pill,
      paddingHorizontal: brandSpacing4.smd,
      paddingVertical: brandSpacing4.xxs,
    },
    tagLabel: {
      ...brandTypography.heroEyebrow,
      color: forest.tagText,
      textTransform: "uppercase",
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
      gap: brandSpacing4.xs,
      marginTop: brandSpacing4.smd,
    },
    progressSegment: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: forest.tagFill,
    },
    progressSegmentDone: {
      backgroundColor: forest.glowFallback,
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
