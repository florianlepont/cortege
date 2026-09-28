import { StyleSheet, View } from "react-native"
import { AppText as Text } from "./AppText"
import { bandTone, totalBand } from "@cortege/ibp-domain"
import { brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { fr } from "../i18n"

type IbpScoreBadgeProps = {
  score: number | null | undefined
  size?: "sm" | "md"
}

// Colours of an IBP total out of 50, from the package's total band (01.8 D-03 amended).
// Phase 12 (DS-12): the tones themselves now invert with the app theme, so this takes the resolved
// theme instead of reading a static token.
export function getIbpScoreColors(score: number | null | undefined, theme: BrandTheme) {
  if (score == null) return theme.ibpScoreColors.empty
  return theme.ibpScoreColors[bandTone(totalBand(score))]
}

export function IbpScoreBadge({ score, size = "md" }: IbpScoreBadgeProps) {
  const theme = useBrandTheme()
  const colors = getIbpScoreColors(score, theme)
  const isSm = size === "sm"

  return (
    <View
      style={[
        styles.badge,
        isSm ? styles.badgeSm : styles.badgeMd,
        { backgroundColor: colors.background },
      ]}
    >
      <Text style={[styles.score, isSm ? styles.scoreSm : styles.scoreMd, { color: colors.text }]}>
        {score != null ? String(score) : fr.components.ibpScoreBadge.noScore}
      </Text>
      <Text style={[styles.denom, { color: colors.text }]}>
        {fr.components.ibpScoreBadge.denominator}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeMd: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  badgeSm: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  score: {
    fontWeight: "900",
    lineHeight: undefined,
  },
  scoreMd: {
    fontSize: 20,
  },
  scoreSm: {
    fontSize: 14,
  },
  denom: {
    ...brandTypography.meta,
    lineHeight: 12,
  },
})
