import { memo, useMemo } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import type { CommunitySurveyItem } from "@cortege/ibp-domain"
import {
  brandInteraction,
  brandRadius,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { formatDay } from "../../app/formatters"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppText as Text } from "../../ui/AppText"
import { ScoreRing } from "../../ui/ScoreRing"

const t = fr.surveyList.community

type CommunityRowProps = { item: CommunitySurveyItem; onOpen: (surveyId: string) => void }

/**
 * A finished survey of another member (OA-52): its name, its author, the date and the score. It
 * opens the read-only page of that survey (OA-59).
 */
function CommunityRowComponent({ item, onOpen }: CommunityRowProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const author = item.author_name?.trim() || t.unknownAuthor
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.a11y({ name: item.site_name, author, score: item.ibp_total })}
      onPress={() => onOpen(item.survey_id)}
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
      testID={`community-row-${item.survey_id}`}
    >
      <ScoreRing score={item.ibp_total} />
      <View style={styles.content}>
        <Text numberOfLines={2} style={styles.title}>
          {item.site_name.trim() || fr.common.untitledSurvey}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {t.meta({ author, date: formatDay(item.submitted_at, "short") })}
        </Text>
      </View>
    </Pressable>
  )
}

export const CommunityRow = memo(CommunityRowComponent)

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
      minHeight: brandInteraction.hitTarget.min,
      borderRadius: brandRadius.card,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: theme.visual.glass.cardBorder,
      backgroundColor: theme.visual.glass.cardFill,
      boxShadow: theme.visual.glass.cardShadow,
      paddingVertical: brandSpacing4.smd,
      paddingHorizontal: brandSpacing4.md,
    },
    cardPressed: {
      opacity: 0.85,
    },
    content: {
      flex: 1,
      gap: brandSpacing4.xs,
    },
    title: {
      ...brandTypography.input,
      lineHeight: 22,
      color: theme.semanticColors.textStrong,
    },
    meta: {
      ...brandTypeScale.footnote,
      color: theme.colors.textSecondary,
    },
  })
}
