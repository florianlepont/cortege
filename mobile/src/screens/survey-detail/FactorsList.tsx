import { useMemo } from "react"
import { Pressable, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { FACTOR_TITLES } from "../../app/constants"
import { FactorKey } from "../../app/types"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppText as Text } from "../../ui/AppText"
import { isFactorKey } from "../survey-screen-helpers"
import { createScoreStyles } from "./score.styles"
import { DisplayedFactorResult, NOT_FILLED_CLASS } from "./useLocalDraftSummary"

const f = fr.surveyDetail.factors
const s = fr.surveyDetail.scoreScreen
const a11y = fr.surveyDetail.a11y

// Each factor is worth 0 to 5 points once retained (IBP: A to G out of 35, H to J out of 15).
const FACTOR_MAX_POINTS = 5

type FactorsListProps = {
  factorEntries: Array<[string, DisplayedFactorResult]>
  showLoadingHint: boolean
  canEditSurvey: boolean
  onOpenFactor: (factor: FactorKey) => void
}

/**
 * The ten factors as one list (OA-45: the score is shown once, not as a list and as tiles). A row
 * says the factor's points, or "À remplir", and opens the factor to edit it.
 */
export function FactorsList({
  factorEntries,
  showLoadingHint,
  canEditSurvey,
  onOpenFactor,
}: FactorsListProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createScoreStyles(theme), [theme])

  return (
    <View style={styles.listBlock}>
      <Text style={styles.listTitle} accessibilityRole="header">
        {s.factorsTitle}
      </Text>
      {showLoadingHint ? <Text style={styles.hint}>{f.loading}</Text> : null}
      {factorEntries.length === 0 && !showLoadingHint ? (
        <Text style={styles.hint}>{f.notLoaded}</Text>
      ) : null}
      {factorEntries.length > 0 ? (
        <View style={styles.list}>
          {factorEntries.map(([factorCode, factor], index) => {
            const filled = factor.selected_class !== NOT_FILLED_CLASS
            const canOpen = canEditSurvey && isFactorKey(factorCode)
            const title = isFactorKey(factorCode)
              ? FACTOR_TITLES[factorCode]
              : f.factorFallback(factorCode)
            const valueLabel = filled
              ? s.pointsOf({ points: factor.score_points ?? 0, max: FACTOR_MAX_POINTS })
              : s.toFill
            return (
              <Pressable
                key={`factor-row-${factorCode}`}
                style={({ pressed }) => [
                  styles.row,
                  index > 0 ? styles.rowDivider : null,
                  pressed && canOpen ? styles.rowPressed : null,
                ]}
                disabled={!canOpen}
                onPress={() => {
                  if (isFactorKey(factorCode)) onOpenFactor(factorCode)
                }}
                accessibilityRole="button"
                accessibilityLabel={a11y.openFactor({ title, value: valueLabel })}
                accessibilityState={{ disabled: !canOpen }}
              >
                <View style={[styles.badge, filled ? styles.badgeFilled : styles.badgePending]}>
                  <Text style={styles.badgeText}>{factorCode}</Text>
                </View>
                <View style={styles.rowCopy}>
                  <Text numberOfLines={2} style={styles.rowTitle}>
                    {title}
                  </Text>
                  {factor.warnings.length > 0 ? (
                    <Text style={styles.rowWarning}>{f.hasWarning}</Text>
                  ) : null}
                </View>
                {filled ? (
                  <Text style={styles.rowPoints}>
                    {factor.score_points ?? 0}
                    <Text style={styles.rowPointsMax}>{s.maxSuffix(FACTOR_MAX_POINTS)}</Text>
                  </Text>
                ) : (
                  <Text style={styles.rowPending}>{s.toFill}</Text>
                )}
                {canOpen ? (
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                ) : null}
              </Pressable>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}
