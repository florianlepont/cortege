import { memo, useMemo } from "react"
import { StyleSheet, View } from "react-native"
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

type CommunityRowProps = { item: CommunitySurveyItem }

/**
 * A finished survey of another member (OA-52): its name, its author, the date and the score. It
 * is read-only for now: a member's survey has no page of its own yet.
 */
function CommunityRowComponent({ item }: CommunityRowProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const author = item.author_name?.trim() || t.unknownAuthor
  return (
    <View
      accessible
      accessibilityLabel={t.a11y({ name: item.site_name, author, score: item.ibp_total })}
      style={styles.card}
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
    </View>
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
