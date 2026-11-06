import type { FactorKeyFigure } from "../../app/factor-key-figure"
import { fr } from "../../i18n"
import { FactorHeroCard } from "./FactorHeroCard"

const t = fr.factorDetail.keyFigure

/**
 * The hero card of a factor other than F (follow-up 32-29): the factor's key figure with its label
 * and where it comes from, all words from the catalogue. The figure itself is computed by
 * `computeFactorKeyFigure`; this only dresses it.
 */
export function FactorKeyHero({ figure }: { figure: FactorKeyFigure }) {
  const pendingText = t.pending[figure.pending]
  const label = t.label[figure.unitKey]
  return (
    <FactorHeroCard
      value={figure.value}
      pendingText={pendingText}
      label={label}
      subLabel={t.sub[figure.subLabelKind]}
      accessibilityLabel={t.a11y({ label, value: figure.value ?? pendingText })}
      topScore={figure.topScore}
      textual={figure.textual}
    />
  )
}
