import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import {
  brandDefaultFontFamily,
  brandFontScaleCaps,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { factorRatio, factorTone, MAX_FACTOR_POINTS } from "../../app/ibp-display"
import type { DeltaCardState } from "../../app/parcel-history"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppCard } from "../../ui/AppCard"
import { AppText as Text } from "../../ui/AppText"

const t = fr.parcelHistory.page.deltas

export type FactorDeltasCardProps = {
  state: Extract<DeltaCardState, { kind: "card" }>
}

/**
 * The ten factors A to J against the survey just before the current one (D-07): a bar of the
 * current points in the factor tone and the signed change. Display only: no press, no ripple, no
 * animation (the curve is the page's one animated layer). Each row is one accessible text.
 */
export function FactorDeltasCard({ state }: FactorDeltasCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const deltaColor = (delta: number | null): string => {
    if (delta === null || delta === 0) return theme.colors.textSecondary
    return delta > 0 ? theme.onSurface.success : theme.onSurface.danger
  }

  return (
    <AppCard variant="glass" padding={brandSpacing4.md}>
      <Text style={styles.title}>{t.title(state.titleYear)}</Text>
      <Text style={styles.total}>{t.total(state.total)}</Text>
      <View style={styles.rows}>
        {state.rows.map(({ factor, points, delta }) => {
          const ratio = factorRatio(points)
          return (
            <View
              key={factor}
              style={styles.row}
              accessible
              accessibilityLabel={t.row({ letter: factor, points, max: MAX_FACTOR_POINTS, delta })}
              testID={`factor-delta-${factor}`}
            >
              <Text style={styles.letter} maxFontSizeMultiplier={brandFontScaleCaps.button}>
                {factor}
              </Text>
              <View style={styles.track}>
                {ratio > 0 && points !== null ? (
                  <View
                    testID={`factor-delta-fill-${factor}`}
                    style={[
                      styles.fill,
                      {
                        width: `${ratio * 100}%`,
                        backgroundColor: theme.visual.factorBar[factorTone(points)].base,
                      },
                    ]}
                  />
                ) : null}
              </View>
              <Text
                style={[styles.delta, { color: deltaColor(delta) }]}
                maxFontSizeMultiplier={brandFontScaleCaps.button}
              >
                {delta === null ? t.none : t.value(delta)}
              </Text>
            </View>
          )
        })}
      </View>
    </AppCard>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    title: {
      ...brandTypography.input,
      color: theme.colors.textPrimary,
    },
    total: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      marginTop: brandSpacing4.xs,
      color: theme.colors.textSecondary,
    },
    rows: {
      marginTop: brandSpacing4.smd,
    },
    row: {
      height: 32,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
    },
    letter: {
      ...brandTypography.sectionHeader,
      width: 20,
      color: theme.colors.textPrimary,
    },
    track: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      overflow: "hidden",
      backgroundColor: theme.visual.score.track,
    },
    fill: {
      height: 8,
      borderRadius: 4,
    },
    delta: {
      ...brandTypography.sectionHeader,
      minWidth: 40,
      textAlign: "right",
    },
  })
}
