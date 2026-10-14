import { memo, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { brandRadius, brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppText as Text } from "../../ui/AppText"
import { AppPressable } from "../../ui/AppPressable"
import type { GuideRow } from "./route-guide-model"
import { rowTexts } from "./question-text"

type AnswerRowProps = {
  row: GuideRow
  onReopen: (id: GuideRow["id"]) => void
}

/**
 * An answered question collapsed to one line (UI-SPEC section 3): the short question over the
 * answer, "Modifier" at the end. The whole row is one 56 pt button that reopens the question.
 */
export const AnswerRow = memo(function AnswerRow({ row, onReopen }: AnswerRowProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { question, answer } = rowTexts(row)

  return (
    <AppPressable
      style={styles.row}
      onPress={() => onReopen(row.id)}
      accessibilityRole="button"
      accessibilityLabel={fr.routeGuide.a11y.answerRow({ question, answer })}
      accessibilityHint={fr.routeGuide.a11y.answerRowHint}
      testID={`route-answer-${row.id}`}
    >
      <View style={styles.copy}>
        <Text style={styles.caption}>{question}</Text>
        <Text style={styles.value}>{answer}</Text>
      </View>
      <Text style={styles.edit} accessible={false} importantForAccessibility="no">
        {fr.routeGuide.screen.edit}
      </Text>
    </AppPressable>
  )
})

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
      minHeight: 56,
      paddingVertical: brandSpacing4.smd,
      paddingHorizontal: brandSpacing4.md,
      borderRadius: brandRadius.field,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.semanticColors.surfaceElevated,
    },
    copy: {
      flex: 1,
      gap: brandSpacing4.xxs,
    },
    caption: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    value: {
      ...brandTypeScale.headline,
      fontFamily: brandTypography.navTitle.fontFamily,
      color: theme.colors.textPrimary,
    },
    edit: {
      ...brandTypeScale.subhead,
      fontFamily: brandTypography.navTitle.fontFamily,
      color: theme.semanticColors.accent,
    },
  })
}
