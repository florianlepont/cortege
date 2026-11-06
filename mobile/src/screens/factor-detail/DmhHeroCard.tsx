import { fr } from "../../i18n"
import { FactorHeroCard } from "./FactorHeroCard"

const t = fr.factorDetail.dmhList

type DmhHeroCardProps = {
  /** F's stored trees per hectare as text ("" while nothing is derived). */
  treesPerHaText: string
  /** At least one group has a count: an empty figure then reads "À calculer", not 0. */
  counted: boolean
  /** Counted in full: the figure comes from the described surface, not from the sum alone. */
  countedInFull: boolean
  /** The evaluation retains F's highest score: the quiet "Maximum" pill shows. */
  topScoreReached: boolean
}

/**
 * Factor F's "Arbres par hectare" hero (follow-up 32-27): a thin wrapper of the generic
 * `FactorHeroCard` (follow-up 32-29) that keeps F's own strings and test ids. The stored figure
 * shows (an older typed number stays until a counter replaces it); with nothing stored it is 0, or
 * "À calculer" once a count exists but no figure can be derived (counted in full without a surface).
 */
export function DmhHeroCard({
  treesPerHaText,
  counted,
  countedInFull,
  topScoreReached,
}: DmhHeroCardProps) {
  const empty = treesPerHaText.trim() === ""
  const value = empty ? (counted ? null : "0") : treesPerHaText
  return (
    <FactorHeroCard
      value={value}
      pendingText={t.treesPerHaPending}
      label={t.hero.label}
      subLabel={countedInFull ? t.hero.subFull : t.hero.subCapped}
      accessibilityLabel={t.treesPerHaA11y({ value: value ?? t.treesPerHaPending })}
      topScore={topScoreReached}
      testID="trees-per-ha-value"
      topScoreTestID="trees-top-score-trace"
    />
  )
}
