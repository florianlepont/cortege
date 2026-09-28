import { useMemo } from "react"
import { Pressable, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import { FACTOR_TITLES } from "../../app/constants"
import { FactorKey } from "../../app/types"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppCard } from "../../ui/AppCard"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { IbpFactorBars, IbpFactorBarsEntries } from "../../ui/IbpFactorBars"
import { isFactorKey } from "../survey-screen-helpers"
import { createDetailStyles } from "./styles"
import { createSummaryStyles } from "./summary.styles"
import { DisplayedFactorResult, DisplayedScores, NOT_FILLED_CLASS } from "./useLocalDraftSummary"

const FACTOR_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  A: "leaf-outline",
  B: "layers-outline",
  C: "git-branch-outline",
  D: "reorder-three-outline",
  E: "resize-outline",
  F: "sparkles-outline",
  G: "flower-outline",
  H: "git-network-outline",
  I: "water-outline",
  J: "triangle-outline",
}

const f = fr.surveyDetail.factors

type FactorsSectionProps = {
  scores: DisplayedScores | null
  factorEntries: Array<[string, DisplayedFactorResult]>
  useLocalDraftView: boolean
  showLoadingHint: boolean
  canEditSurvey: boolean
  onOpenFactor: (factor: FactorKey) => void
}

// DET-01: the score lives once, in DetailHeader's hero — this section shows the per-factor
// breakdown (IbpFactorBars) and the editable tiles, not the total again.
export function FactorsSection({
  scores,
  factorEntries,
  useLocalDraftView,
  showLoadingHint,
  canEditSurvey,
  onOpenFactor,
}: FactorsSectionProps) {
  const theme = useBrandTheme()
  const sharedStyles = useMemo(() => createDetailStyles(theme), [theme])
  const styles = useMemo(() => createSummaryStyles(theme), [theme])
  const barEntries = useMemo<IbpFactorBarsEntries>(() => {
    const entries: IbpFactorBarsEntries = {}
    for (const [factorCode, factor] of factorEntries) {
      if (isFactorKey(factorCode)) {
        entries[factorCode] = factor.score_points
      }
    }
    return entries
  }, [factorEntries])

  return (
    <AppCard variant="panelElevated" padding={18} style={styles.factorTilesCard}>
      <AppSectionHeader title={f.title} subtitle={f.subtitle} />
      {showLoadingHint ? <Text style={sharedStyles.rowMeta}>{f.loading}</Text> : null}
      {scores ? (
        <>
          {useLocalDraftView ? <Text style={sharedStyles.rowMeta}>{f.localDraftHint}</Text> : null}
          <IbpFactorBars entries={barEntries} />
          <View style={styles.factorTilesGrid}>
            {factorEntries.map(([factorCode, factor]) => (
              <FactorTile
                key={`factor-tile-${factorCode}`}
                factorCode={factorCode}
                factor={factor}
                canEditSurvey={canEditSurvey}
                onOpenFactor={onOpenFactor}
                theme={theme}
                styles={styles}
              />
            ))}
          </View>
        </>
      ) : (
        <Text style={sharedStyles.rowMeta}>{f.notLoaded}</Text>
      )}
    </AppCard>
  )
}

function FactorTile({
  factorCode,
  factor,
  canEditSurvey,
  onOpenFactor,
  theme,
  styles,
}: {
  factorCode: string
  factor: DisplayedFactorResult
  canEditSurvey: boolean
  onOpenFactor: (factor: FactorKey) => void
  theme: BrandTheme
  styles: ReturnType<typeof createSummaryStyles>
}) {
  const factorCompleted = factor.selected_class !== NOT_FILLED_CLASS
  const canOpen = canEditSurvey && isFactorKey(factorCode)
  const title = isFactorKey(factorCode) ? FACTOR_TITLES[factorCode] : f.factorFallback(factorCode)
  const classLabel = factorCompleted ? factor.selected_class : f.notFilled
  const statusColor = factorCompleted ? theme.colors.forest : theme.colors.textSecondary

  return (
    <Pressable
      style={[
        styles.factorTile,
        factorCompleted ? styles.factorTileCompleted : styles.factorTilePending,
        canOpen ? styles.factorTileEditable : null,
      ]}
      onPress={() => {
        if (!canEditSurvey || !isFactorKey(factorCode)) return
        onOpenFactor(factorCode)
      }}
      accessibilityRole="button"
      accessibilityLabel={fr.surveyDetail.a11y.openFactor({ title, value: classLabel })}
      accessibilityState={{ disabled: !canOpen }}
    >
      <View style={styles.factorTileTopRow}>
        <View style={styles.factorTileIdentity}>
          <View style={styles.factorBadge}>
            <Text style={styles.factorBadgeText}>{factorCode}</Text>
          </View>
          <View
            style={[
              styles.factorTileIconWrap,
              factorCompleted
                ? styles.factorTileIconWrapCompleted
                : styles.factorTileIconWrapPending,
            ]}
          >
            <Ionicons
              name={FACTOR_ICONS[factorCode] ?? "ellipse-outline"}
              size={16}
              color={statusColor}
            />
          </View>
        </View>
        <View
          style={[
            styles.factorTileStatusPill,
            factorCompleted
              ? styles.factorTileStatusPillCompleted
              : styles.factorTileStatusPillPending,
          ]}
        >
          <Ionicons
            name={factorCompleted ? "checkmark-circle" : "ellipse-outline"}
            size={12}
            color={statusColor}
          />
        </View>
      </View>
      <Text numberOfLines={2} style={styles.factorTileClass}>
        {title}
      </Text>
      <Text
        style={[
          styles.factorTileCode,
          factorCompleted ? styles.factorTileClassCompleted : styles.factorTileClassPending,
        ]}
      >
        {classLabel}
      </Text>
      {factor.warnings.length > 0 ? (
        <Text style={styles.factorTileWarning}>{f.hasWarning}</Text>
      ) : null}
    </Pressable>
  )
}
