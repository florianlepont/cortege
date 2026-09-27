import { View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { brandColors } from "../../app/brand-tokens"
import { fr } from "../../i18n"
import { getIbpScoreColors } from "../../ui/IbpScoreBadge"
import { styles } from "./styles"

type SectorScoreCardProps = {
  score: number
  analysedCount: number
  // The averaged parcels follow more than one IBP method version (01.8 owner review).
  mixedMethods?: boolean
}

const DOT_COUNT = 10
const POINTS_PER_DOT = 5

// Average IBP total (out of 50) of the surveyed parcels around the user, as 10 dots of 5 points.
export function SectorScoreCard({
  score,
  analysedCount,
  mixedMethods = false,
}: SectorScoreCardProps) {
  const dotColor = getIbpScoreColors(score).background
  const filledCount = Math.round(score / POINTS_PER_DOT)

  return (
    <View style={styles.sectorCard}>
      <View style={styles.sectorHeader}>
        <Text style={styles.sectorLabel}>{fr.home.sector.label}</Text>
        <Text style={styles.sectorScore}>{fr.home.sector.score({ score })}</Text>
      </View>
      <View style={styles.scoreDotsRow}>
        {Array.from({ length: DOT_COUNT }, (_, i) => (
          <View
            key={i}
            testID="sector-score-dot"
            style={[
              styles.scoreDot,
              { backgroundColor: i < filledCount ? dotColor : brandColors.divider },
            ]}
          />
        ))}
      </View>
      <Text style={styles.sectorMeta}>{fr.home.sector.meta({ count: analysedCount })}</Text>
      {mixedMethods ? <Text style={styles.sectorMeta}>{fr.home.sector.mixedMethods}</Text> : null}
    </View>
  )
}
