import {
  IBP_METHOD_V3_2,
  allowedFactorAGenusCodes,
  isCnpfFactorAGenusCode,
  isIbpCas,
  resolveMethodVersion,
  scoreGenusCount,
  usesCas3Scale,
  usesSubalpineScale,
} from "@cortege/ibp-domain"
import type { FactorKey } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import { readSelection, selectionLabel } from "../factor-selections"
import type { SelectionFactor } from "../factor-selections"
import { formatDecimal } from "./html"
import type { ExportMethodContext, MethodKey } from "./types"

// The raw observations of each factor as printed lines (phase 25.1, D-01, D-09, D-12). Pure: it
// reads the stored `factors` payload and maps each field to a caption and a value; it never decides
// a class. The class and the points come from the app's single result (`factorEntries`). Display
// arithmetic (a count over the surface) is shown but never used for a class.

const t = fr.surveyExport.factors

/** One printed line: a caption, a value and/or a list of items, and an optional note below. */
export type ObservationLine = {
  caption: string
  value: string | null
  items?: string[]
  note?: string
}

type Raw = Record<string, unknown>

type ObservationContext = { method: ExportMethodContext; points: number | null }

/** The catalogue key of a method version: a null, empty or unknown tag is the legacy v3.0. */
export function methodKeyOf(version: string | null): MethodKey {
  return resolveMethodVersion(version) === IBP_METHOD_V3_2 ? "v3_2" : "v3_0"
}

function asRecord(value: unknown): Raw | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Raw)
    : null
}

/** A finite number from a stored field, else null (a string or NaN is not a reading). */
function finite(raw: Raw | null, key: string): number | null {
  const value = raw?.[key]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function valueLine(caption: string, value: string | null): ObservationLine[] {
  return value === null ? [] : [{ caption, value }]
}

function numberLine(raw: Raw | null, key: string, caption: string): ObservationLine[] {
  const value = finite(raw, key)
  return valueLine(caption, value === null ? null : formatDecimal(value))
}

function percentLine(raw: Raw | null, key: string, caption: string): ObservationLine[] {
  const value = finite(raw, key)
  return valueLine(caption, value === null ? null : t.percent({ value: formatDecimal(value) }))
}

function surfaceLine(raw: Raw | null): ObservationLine[] {
  const surface = finite(raw, "surface_ha")
  return valueLine(
    t.surface,
    surface === null ? null : t.surfaceValue({ value: formatDecimal(surface) }),
  )
}

/** A count with its per-hectare value; the bare count when the surface cannot divide. */
function densityLine(raw: Raw | null, key: string, caption: string): ObservationLine[] {
  const count = finite(raw, key)
  if (count === null) return []
  const surface = finite(raw, "surface_ha")
  const value =
    surface !== null && surface > 0
      ? t.countPerHa({ value: formatDecimal(count), perHa: formatDecimal(count / surface) })
      : formatDecimal(count)
  return [{ caption, value }]
}

/** The stored labels of a detail array, in the survey's wording; none when nothing is stored. */
function selectionItems(
  rawFactor: unknown,
  factor: SelectionFactor,
  method: ExportMethodContext,
): string[] {
  const labels: string[] = []
  for (const code of readSelection(rawFactor, factor) ?? []) {
    const label = selectionLabel(factor, code, method.version)
    if (label !== null) labels.push(label)
  }
  return labels
}

function itemsLine(caption: string, items: string[]): ObservationLine[] {
  return items.length > 0 ? [{ caption, value: null, items }] : []
}

function genusName(code: string): string {
  const display = fr.genus.displayName[code as keyof typeof fr.genus.displayName]
  return `${display} (${code.replace(/_/g, " ")})`
}

/** The legacy bare genus count of a survey recorded before the genus list (domain key order). */
function legacyGenusCount(raw: Raw | null): number | null {
  for (const key of ["native_genus_count", "autochthonous_genus_count", "count"]) {
    const value = finite(raw, key)
    if (value !== null) return value
  }
  return null
}

/** A's native cover: A first, then the pre-01.8 location under B (what `readNativeCover` reads). */
function nativeCover(rawA: Raw | null, rawB: Raw | null): number | null {
  return (
    finite(rawA, "native_cover_percent") ??
    finite(rawB, "covered_autochthonous_percent") ??
    finite(rawB, "native_cover_percent")
  )
}

/** Whether A uses the restricted genus scale: cas-3 scale in v3.2, subalpine stage in v3.0. */
function usesRestrictedScale(method: ExportMethodContext): boolean {
  return methodKeyOf(method.version) === "v3_2"
    ? usesCas3Scale({ ibp_cas: method.ibpCas, ibp_cas3_scale: method.ibpCas3Scale })
    : usesSubalpineScale(method.regionVersion, method.vegetationStage)
}

function factorA(factors: Raw, context: ObservationContext): ObservationLine[] {
  const { method, points } = context
  const rawA = asRecord(factors.A)
  if (rawA === null) return []
  const lines: ObservationLine[] = []

  // v3.0 has no cas: only the main genera count (the domain passes null there).
  const cas =
    methodKeyOf(method.version) === "v3_2" && isIbpCas(method.ibpCas) ? method.ibpCas : null
  const allowed = new Set<string>(allowedFactorAGenusCodes(cas))
  let counted: number | null = null

  if (Array.isArray(rawA.genera)) {
    const seen = new Set<string>()
    const items: string[] = []
    const countedCodes = new Set<string>()
    for (const code of rawA.genera) {
      if (typeof code !== "string" || seen.has(code) || !isCnpfFactorAGenusCode(code)) continue
      seen.add(code)
      if (allowed.has(code)) {
        countedCodes.add(code)
        items.push(genusName(code))
      } else {
        items.push(`${genusName(code)}, ${t.genusNotCounted}`)
      }
    }
    counted = countedCodes.size
    if (items.length === 0) lines.push({ caption: t.genera, value: t.generaNone })
    else {
      lines.push({ caption: t.genera, value: null, items })
      lines.push({ caption: t.genusCount({ count: counted }), value: null })
    }
  } else {
    const legacy = legacyGenusCount(rawA)
    if (legacy !== null) {
      counted = legacy
      lines.push({ caption: t.genera, value: t.legacyGenusCount({ count: legacy }) })
    }
  }

  const cover = nativeCover(rawA, asRecord(factors.B))
  if (cover !== null) {
    const line: ObservationLine = {
      caption: t.nativeCover,
      value: t.percent({ value: formatDecimal(cover) }),
    }
    // The cap note only when the cap changed the score: the genus score alone would be above 2.
    if (
      cover < 50 &&
      points === 2 &&
      counted !== null &&
      scoreGenusCount(counted, usesRestrictedScale(method)) > 2
    ) {
      line.note = t.coverCapped
    }
    lines.push(line)
  }
  return lines
}

function factorB(factors: Raw, method: ExportMethodContext): ObservationLine[] {
  const rawB = asRecord(factors.B)
  return [
    ...numberLine(rawB, "strata_count", t.strataCount),
    ...itemsLine(t.strata, selectionItems(rawB, "B", method)),
  ]
}

function densityPair(
  factors: Raw,
  key: "C" | "D" | "E",
  first: [string, string],
  second: [string, string],
): ObservationLine[] {
  const raw = asRecord(factors[key])
  return [
    ...densityLine(raw, first[0], first[1]),
    ...densityLine(raw, second[0], second[1]),
    ...surfaceLine(raw),
  ]
}

function factorF(factors: Raw, method: ExportMethodContext): ObservationLine[] {
  const rawF = asRecord(factors.F)
  const trees = finite(rawF, "trees_per_ha")
  return [
    ...valueLine(
      t.treesPerHa,
      trees === null ? null : t.treesPerHaValue({ value: formatDecimal(trees) }),
    ),
    ...itemsLine(t.dmhGroups, selectionItems(rawF, "F", method)),
  ]
}

function factorH(factors: Raw, method: ExportMethodContext): ObservationLine[] {
  const rawH = asRecord(factors.H)
  const score = finite(rawH, "class_score")
  const option = fr.factorInput.continuityOptions.find((entry) => entry.value === String(score))
  return [
    ...valueLine(t.continuity, option?.label ?? null),
    ...itemsLine(t.evidence, selectionItems(rawH, "H", method)),
  ]
}

function typesFactor(
  factors: Raw,
  factor: "I" | "J",
  caption: string,
  method: ExportMethodContext,
): ObservationLine[] {
  const raw = asRecord(factors[factor])
  return [
    ...numberLine(raw, "type_count", t.typeCount),
    ...itemsLine(caption, selectionItems(raw, factor, method)),
  ]
}

/**
 * The lines printed for one factor, from the stored raw factors. An absent factor object gives an
 * empty list; an unknown code or a non-finite number is skipped, never printed as stored.
 */
export function buildFactorObservations(
  factor: FactorKey,
  rawFactors: Record<string, unknown>,
  context: ObservationContext,
): ObservationLine[] {
  const { method } = context
  switch (factor) {
    case "A":
      return factorA(rawFactors, context)
    case "B":
      return factorB(rawFactors, method)
    case "C":
    case "D":
      return densityPair(rawFactors, factor, ["bmg_count", t.bmg], ["bmm_count", t.bmm])
    case "E":
      return densityPair(rawFactors, "E", ["tgb_count", t.tgb], ["gb_count", t.gb])
    case "F":
      return factorF(rawFactors, method)
    case "G":
      return percentLine(asRecord(rawFactors.G), "open_flowering_percent", t.openFlowering)
    case "H":
      return factorH(rawFactors, method)
    case "I":
      return typesFactor(rawFactors, "I", t.aquaticTypes, method)
    case "J":
      return typesFactor(rawFactors, "J", t.rockyTypes, method)
  }
}
