import { CNPF_FACTOR_A_GENUS_CODES, type CnpfFactorAGenusCode } from "@cortege/ibp-domain"

// ADR-002 D-04/D-12 (amended 2026-09-26): a confidence label must mean the same reliability
// whichever genus is shown, so "strong" is calibrated per genus (measurement document §15.2 —
// the val-fit, test-reported threshold below which a genus's own top-1 predictions no longer clear
// 90% accuracy). "medium" and "weak" are pooled cut points (§15.4), fit once across all 34 genera
// rather than per genus, because the amendment's headline finding is specifically about "strong"
// over-promising on some genera — the lower bands were never shown to have the same defect.

/**
 * Per-genus calibrated "strong" threshold: the model's raw top-1 softmax score must be at or above
 * this value for the label to promise ~90% reliability for THIS genus specifically (measurement
 * document §15.2, columns "threshold"). Fit on the validation split, reported on the held-out test
 * split — never fit and reported on the same split (§15.1).
 */
export const GENUS_STRONG_THRESHOLD: Readonly<Record<CnpfFactorAGenusCode, number>> = {
  Abies: 0.8463,
  Acer: 0.8456,
  Alnus: 0.714,
  Arbutus: 0.5422,
  Betula: 0.7933,
  Carpinus: 0.9063,
  Castanea: 0.6043,
  Celtis: 0.7863,
  Cupressus: 0.7739,
  Fagus: 0.5766,
  Fraxinus: 0.9265,
  Juglans: 0.7324,
  Juniperus: 0.7253,
  Larix: 0.6946,
  Malus: 0.8138,
  Ostrya: 0.7507,
  Picea: 0.8905,
  Pinus: 0.7214,
  Populus: 0.9152,
  Prunus: 0.9519,
  Pyrus: 0.8806,
  Quercus_deciduae: 0.5064,
  Quercus_sempervirens: 0.7345,
  Salix: 0.8292,
  Sorbus: 0.5467,
  Tamarix: 0.2027,
  Taxus: 0.5876,
  Tilia: 0.7965,
  Ulmus: 0.9453,
  Ceratonia: 0.5058,
  Cercis: 0.4221,
  Olea: 0.6315,
  Phillyrea: 0.7094,
  Pistacia: 0.6373,
}

/** Pooled "medium" cut point, fit on validation / reported on test at 49.73%–50.00% (§15.4). */
export const POOLED_MEDIUM_THRESHOLD = 0.4866

/** Pooled "weak" cut point, fit on validation / reported on test at 30.00%–30.27% (§15.4). */
export const POOLED_WEAK_THRESHOLD = 0.3461

export type ConfidenceLabel = "strong" | "medium" | "weak" | "very-weak"

/** A single genus candidate returned by the classifier, most likely first. */
export type GenusSuggestion = {
  genus: CnpfFactorAGenusCode
  /** Raw top-1 softmax score for this genus, in [0, 1]. */
  confidence: number
  label: ConfidenceLabel
}

/**
 * The three descending cut points below which a score no longer clears "strong", "medium" or
 * "weak" for this genus. The pooled medium/weak cuts (§15.4) assume they sit below the pooled
 * "strong" cut (0.7775); four genera calibrate "strong" lower than that pooled medium cut (Cercis,
 * 0.4221) or even the pooled weak cut (Tamarix, 0.2027). Clamping medium/weak to at most the
 * genus's own strong threshold keeps every band non-overlapping and correctly nested for every
 * genus, instead of a score clearing "strong" also falling inside a nominally lower band.
 */
function bandThresholds(genus: CnpfFactorAGenusCode): {
  strong: number
  medium: number
  weak: number
} {
  const strong = GENUS_STRONG_THRESHOLD[genus]
  const medium = Math.min(POOLED_MEDIUM_THRESHOLD, strong)
  const weak = Math.min(POOLED_WEAK_THRESHOLD, medium)
  return { strong, medium, weak }
}

/** Plain-word confidence label for a raw top-1 score on the given genus (D-12). */
export function classifyConfidence(
  genus: CnpfFactorAGenusCode,
  confidence: number,
): ConfidenceLabel {
  const { strong, medium, weak } = bandThresholds(genus)
  if (confidence >= strong) return "strong"
  if (confidence >= medium) return "medium"
  if (confidence >= weak) return "weak"
  return "very-weak"
}

/**
 * Every CNPF genus has a calibrated threshold — checked once so a future list edit cannot drift.
 * `thresholds` defaults to the real table; a test can pass a deliberately incomplete map to
 * exercise the failure branch.
 */
export function assertAllGenusThresholdsPresent(
  thresholds: Readonly<Partial<Record<CnpfFactorAGenusCode, number>>> = GENUS_STRONG_THRESHOLD,
): void {
  for (const genus of CNPF_FACTOR_A_GENUS_CODES) {
    if (typeof thresholds[genus] !== "number") {
      throw new Error(`Missing calibrated "strong" threshold for genus ${genus}`)
    }
  }
}
