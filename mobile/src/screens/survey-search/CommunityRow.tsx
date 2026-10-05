import { memo, useMemo } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import type { CommunitySurveyItem } from "@cortege/ibp-domain"
import { brandRadius, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppText as Text } from "../../ui/AppText"
import { IbpScoreBadge } from "../../ui/IbpScoreBadge"

const t = fr.surveyList.community

const formatDay = (iso: string): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

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
      <IbpScoreBadge score={item.ibp_total} size="sm" />
      <View style={styles.content}>
        <Text numberOfLines={2} style={styles.title}>
          {item.site_name.trim() || fr.common.untitledSurvey}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {t.meta({ author, date: formatDay(item.submitted_at) })}
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
      gap: 12,
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.semanticColors.surfaceElevated,
      padding: 12,
    },
    cardPressed: {
      opacity: 0.85,
    },
    content: {
      flex: 1,
      gap: 4,
    },
    title: {
      ...brandTypography.input,
      color: theme.semanticColors.textStrong,
    },
    meta: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
  })
}
