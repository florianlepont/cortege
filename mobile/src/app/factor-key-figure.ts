import {
  allowedScoresFor,
  DENSITY_COUNT_KEYS,
  readDensityPerHa,
  readFactorAGenusCount,
  type GenusCountOutcome,
  type IbpCas,
  type IbpMethodVersion,
} from "@cortege/ibp-domain"
import { fr } from "../i18n"
import { genusListCas, parseGenusListValue } from "./factor-a-genus-list"
import { toFiniteNumberInRange } from "./number-range"
import type { FactorField, FactorKey, FactorRetainedScore } from "./types"

// The key figure of a factor page (follow-up 32-29): the one number the observer cares about,
// shown in the hero card under the intro paragraph. A pure module over the form's fields. Every
// figure is read through the package (A's genus count, the per-hectare densities of C, D and E) or
// through the form's own number rule (the same one the draft payload uses), so no scoring rule is
// repeated here and the score never depends on this file. F has its own hero (the trees per
// hectare, `DmhHeroCard`).

/** The factors that get this generic hero: every factor but F. */
export type KeyFigureFactor = Exclude<FactorKey, "F">

/** Which catalogue label the figure carries (`fr.factorDetail.keyFigure.label`). */
export type KeyFigureUnit = keyof typeof fr.factorDetail.keyFigure.label

/** Which catalogue line says where the figure comes from (`fr.factorDetail.keyFigure.sub`). */
export type KeyFigureSubLabel = keyof typeof fr.factorDetail.keyFigure.sub

/** Which word stands in the figure's place while it is empty (`fr.factorDetail.keyFigure.pending`). */
export type KeyFigurePending = keyof typeof fr.factorDetail.keyFigure.pending

export type FactorKeyFigure = {
  /** The figure as shown ("6", "1,5", "3 %", "Partielle"); null while it cannot be given. */
  value: string | null
  unitKey: KeyFigureUnit
  subLabelKind: KeyFigureSubLabel
  /** The factor's retained score is the highest it can take: the quiet "Maximum" pill shows. */
  topScore: boolean
  /** The figure is a word, not a number: the card sets it at the title size. */
  textual: boolean
  /** The word shown instead of the figure while `value` is null. */
  pending: KeyFigurePending
}

export type KeyFigureInput = {
  factor: KeyFigureFactor
  /** The fields the form hands the page, in the form's fixed order for the factor. */
  fields: readonly FactorField[]
  /** The survey's IBP method; null is an untagged legacy draft (v3.0). */
  methodVersion: IbpMethodVersion | null
  /** The survey's cas: A's genus list allows the Mediterranean genera at cas 2 and 4 only. */
  ibpCas: IbpCas | null
  /** The factor counted in full: B's figure then comes from the cover of each stratum. */
  countedInFull: boolean
  /** The form evaluation's retained score for the factor (the pager already holds it). */
  retainedScore: FactorRetainedScore | null
  /** G lists its zones (follow-up 32-35): its percent is computed from them and the surface. */
  openAreasMode?: boolean
}

export function hasKeyFigure(factor: FactorKey): factor is KeyFigureFactor {
  return factor !== "F"
}

const fieldValue = (fields: readonly FactorField[], index: number): string =>
  fields[index]?.value ?? ""

/** A number the way the draft payload reads it: a whole count at least 0, else null. */
const countOf = (text: string): number | null =>
  toFiniteNumberInRange(text, { min: 0, integer: true })

/** Decimal comma, `decimals` at most, and never a plain "0" for a figure that is above 0. */
function formatDecimal(value: number, decimals: number): string {
  const rounded = Number(value.toFixed(decimals))
  const shown = rounded === 0 && value > 0 ? Number(value.toPrecision(1)) : rounded
  return String(shown).replace(".", ",")
}

/** A's figure from the package's reading of the genus list; anything but a count is no figure. */
export function genusCountFigure(outcome: GenusCountOutcome): string | null {
  return outcome.kind === "count" ? String(outcome.count) : null
}

function genusFigure(input: KeyFigureInput): string | null {
  // v3.0 has no cas: its supplementary genera never count, as the scorer reads them.
  const cas = genusListCas(input.methodVersion, input.ibpCas)
  const genera = parseGenusListValue(fieldValue(input.fields, 0))
  return genusCountFigure(readFactorAGenusCount({ genera }, cas))
}

/** C, D and E: the figure of the upper class per hectare, only with both counts and a surface. */
function densityFigure(input: KeyFigureInput, factor: "C" | "D" | "E"): string | null {
  const [upperKey, lowerKey] = DENSITY_COUNT_KEYS[factor]
  // A count or a surface the form would not store is null here, so the package reads no density.
  const density = readDensityPerHa(factor, {
    [upperKey]: countOf(fieldValue(input.fields, 0)),
    [lowerKey]: countOf(fieldValue(input.fields, 1)),
    surface_ha: toFiniteNumberInRange(fieldValue(input.fields, 2), { min: 0.000001 }),
  })
  return density === null ? null : formatDecimal(density.upperPerHa, 1)
}

function floweringFigure(input: KeyFigureInput): string | null {
  const percent = toFiniteNumberInRange(fieldValue(input.fields, 0), { min: 0, max: 100 })
  return percent === null
    ? null
    : fr.factorDetail.keyFigure.percent({ value: formatDecimal(percent, 2) })
}

function continuityFigure(input: KeyFigureInput): string | null {
  const chosen = fieldValue(input.fields, 0).trim()
  return fr.factorInput.continuityOptions.find((option) => option.value === chosen)?.label ?? null
}

const typeCountFigure = (input: KeyFigureInput): string =>
  String(countOf(fieldValue(input.fields, 0)) ?? 0)

/**
 * The key figure of a factor page. `topScore` follows the rule F uses: the retained score equals
 * the highest score the package allows for the factor.
 */
export function computeFactorKeyFigure(input: KeyFigureInput): FactorKeyFigure {
  const { factor } = input
  const topScore =
    input.retainedScore !== null &&
    input.retainedScore.score === Math.max(...allowedScoresFor(factor))
  const base = { topScore, textual: false, pending: "compute" } as const
  switch (factor) {
    case "A":
      return { ...base, value: genusFigure(input), unitKey: "genera", subLabelKind: "fromList" }
    case "B":
      return {
        ...base,
        value: String(countOf(fieldValue(input.fields, 0)) ?? 0),
        unitKey: "strata",
        subLabelKind: input.countedInFull ? "fromStrataCover" : "fromChoices",
      }
    case "C":
      return {
        ...base,
        value: densityFigure(input, "C"),
        unitKey: "standingDeadwoodPerHa",
        subLabelKind: "fromDescribedSurface",
      }
    case "D":
      return {
        ...base,
        value: densityFigure(input, "D"),
        unitKey: "groundDeadwoodPerHa",
        subLabelKind: "fromDescribedSurface",
      }
    case "E":
      return {
        ...base,
        value: densityFigure(input, "E"),
        unitKey: "veryLargeTreesPerHa",
        subLabelKind: "fromDescribedSurface",
      }
    case "G":
      return {
        ...base,
        value: floweringFigure(input),
        unitKey: "floweringOpen",
        subLabelKind: input.openAreasMode === true ? "fromZones" : "shareOfSurface",
        pending: input.openAreasMode === true ? "compute" : "estimate",
      }
    case "H":
      return {
        ...base,
        value: continuityFigure(input),
        unitKey: "continuity",
        subLabelKind: "continuityAge",
        textual: true,
        pending: "choose",
      }
    case "I":
      return {
        ...base,
        value: typeCountFigure(input),
        unitKey: "aquaticTypes",
        subLabelKind: "fromChoices",
      }
    case "J":
      return {
        ...base,
        value: typeCountFigure(input),
        unitKey: "rockyTypes",
        subLabelKind: "fromChoices",
      }
  }
}
