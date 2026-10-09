import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  brandDefaultFontFamily,
  brandFontScaleCaps,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import type { TrendSummary } from "../../app/parcel-history"
import { type BrandTheme, useBrandTheme } from "../../app/theme"
import type { TrendInputPoint } from "../../app/trend-geometry"
import { fr } from "../../i18n"
import { AppText as Text } from "../../ui/AppText"
import { ForestCard } from "../../ui/ForestCard"
import { TrendCurve } from "./TrendCurve"

const t = fr.parcelHistory.page.trend

type TrendCardProps = {
  trend: TrendSummary
  points: TrendInputPoint[]
}

/** The two parts of the title: the strong part, then the accent part (empty when there is none). */
function titleParts(trend: Exclude<TrendSummary, { kind: "none" }>): [string, string] {
  if (trend.kind === "change") return [t.titleStrong(trend.delta), t.titleAccent(trend.sinceYear)]
  const strong = trend.method === null ? t.newMethodUnknown : t.newMethodStrong(trend.method)
  return [strong, trend.year === null ? "" : t.newMethodAccent(trend.year)]
}

/**
 * The trend card of the parcel history (D-06, D-10): a forest card whose title states the trend,
 * the curve of the totals, and a one-line notice when the curve spans two methods. The card runs
 * without its own aurora: the curve's draw-in is the page's one animated hero layer.
 */
export function TrendCard({ trend, points }: TrendCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  if (trend.kind === "none") return null

  const [strong, accent] = titleParts(trend)
  const label = fr.parcelHistory.page.trend.a11y(points) + (trend.mixed ? t.a11yMixed : "")

  return (
    <ForestCard variant="hero" motion={false} contentStyle={styles.content}>
      <Text style={styles.title} maxFontSizeMultiplier={brandFontScaleCaps.title} numberOfLines={2}>
        <Text style={styles.strong} maxFontSizeMultiplier={brandFontScaleCaps.title}>
          {strong}
        </Text>
        {accent !== "" ? (
          <Text style={styles.accent} maxFontSizeMultiplier={brandFontScaleCaps.title}>
            {accent}
          </Text>
        ) : null}
      </Text>
      <View style={styles.curve}>
        <TrendCurve points={points} accessibilityLabel={label} />
      </View>
      {trend.mixed ? (
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={16} color={theme.visual.forest.body} />
          <Text
            style={styles.noticeText}
            maxFontSizeMultiplier={brandFontScaleCaps.label}
            numberOfLines={2}
          >
            {t.mixed}
          </Text>
        </View>
      ) : null}
    </ForestCard>
  )
}

function createStyles(theme: BrandTheme) {
  const { forest } = theme.visual
  return StyleSheet.create({
    content: { padding: brandSpacing4.md },
    title: { ...brandTypography.screenTitle },
    strong: { ...brandTypography.screenTitle, color: forest.title },
    accent: { ...brandTypography.screenTitle, color: forest.titleAccent },
    curve: { marginTop: brandSpacing4.smd },
    notice: {
      marginTop: brandSpacing4.sm,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: brandSpacing4.sm,
    },
    noticeText: {
      ...brandTypeScale.footnote,
      flex: 1,
      fontFamily: brandDefaultFontFamily,
      color: forest.body,
    },
  })
}
