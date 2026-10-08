import { useMemo, useState } from "react"
import { type LayoutChangeEvent, StyleSheet, View } from "react-native"
import { brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppText as Text } from "../../ui/AppText"
import { EntranceView } from "../../ui/EntranceView"
import type { ForestTextBlock } from "../../ui/ForestAurora"
import { ForestCard } from "../../ui/ForestCard"

const t = fr.surveyList.intro

type ListSummaryCardProps = { total: number; toFinish: number }

/**
 * The accent of Mes Relevés (D-22): a compact forest card in the Accueil family,
 * that shows the two figures the screen already had (OA-53), how many surveys and how many are left
 * to finish. It is the one forest card of the screen. Both figures stay on the left of the card, on
 * the base forest, so no text sits under the halo at the top right (UI-SPEC); the "to finish"
 * figure takes the light green of the card title as the accent. The card slides in when the screen
 * becomes visible, like the sections of Accueil. 12.2-19 fifth round (owner): it carries the forest
 * mist like Accueil's card, in place of its drifting contours, over the whole card; the two
 * figures are measured as its block of text, softened around by the shield.
 */
export function ListSummaryCard({ total, toFinish }: ListSummaryCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [stats, setStats] = useState<ForestTextBlock | null>(null)
  const handleStatsLayout = (event: LayoutChangeEvent): void => {
    const { x, y, width, height } = event.nativeEvent.layout
    setStats({ x, y, width, height })
  }
  return (
    <EntranceView index={0}>
      <ForestCard
        variant="resume"
        blocks={stats === null ? null : [stats]}
        contentStyle={styles.content}
        testID="list-summary-card"
      >
        <View
          onLayout={handleStatsLayout}
          style={styles.stats}
          accessible
          accessibilityLabel={t.summary({ total, toFinish })}
          testID="list-summary-stats"
        >
          <View style={styles.stat}>
            <Text style={styles.value}>{total}</Text>
            <Text style={styles.label}>{t.total(total)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={[styles.value, styles.valueAccent]}>{toFinish}</Text>
            <Text style={styles.label}>{t.toFinish}</Text>
          </View>
        </View>
      </ForestCard>
    </EntranceView>
  )
}

function createStyles(theme: BrandTheme) {
  const forest = theme.visual.forest
  return StyleSheet.create({
    content: {
      padding: brandSpacing4.md,
    },
    stats: {
      flexDirection: "row",
      alignItems: "stretch",
      alignSelf: "flex-start",
      gap: brandSpacing4.md,
    },
    stat: {
      gap: brandSpacing4.xs,
    },
    // A real rule between the two figures: they are two facts, not one phrase.
    divider: {
      width: 1,
      backgroundColor: forest.tagBorder,
    },
    value: {
      ...brandTypography.screenTitle,
      color: forest.title,
    },
    valueAccent: {
      color: forest.titleAccent,
    },
    label: {
      ...brandTypeScale.footnote,
      color: forest.body,
    },
  })
}
