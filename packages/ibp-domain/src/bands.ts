// Interpretation bands (GS-2, unchanged between v3.0 and v3.2). All boundaries are lower-inclusive:
// a score equal to a cut-off falls in the higher band (assumption A1: the chart does not say).

/** Maximum scores: stand and management A-G (7 × 5), context H-J (3 × 5), total (GS-1). */
export const IBP_MAX = { stand: 35, context: 15, total: 50 } as const

export type StandBand = "faible" | "assez_faible" | "moyenne" | "assez_forte" | "forte"

export type ContextBand = "faible" | "moyenne" | "forte"

export type TotalBand = StandBand

export type ScoreTone = "low" | "mid" | "high"

function fiveBands(score: number, cutOffs: readonly [number, number, number, number]): StandBand {
  if (score < cutOffs[0]) return "faible"
  if (score < cutOffs[1]) return "assez_faible"
  if (score < cutOffs[2]) return "moyenne"
  if (score < cutOffs[3]) return "assez_forte"
  return "forte"
}

/** "IBP peuplement et gestion" (/35): CNPF chart ticks 7, 14, 21, 28 (v3.2 p. 24). */
export function standBand(score: number): StandBand {
  return fiveBands(score, [7, 14, 21, 28])
}

/** "IBP contexte" (/15): CNPF chart ticks 5 and 10 (v3.2 p. 24). */
export function contextBand(score: number): ContextBand {
  if (score < 5) return "faible"
  if (score < 10) return "moyenne"
  return "forte"
}

/**
 * The /50 total (D-03 amended). CNPF charts no band for the total, only the two axes above. This
 * is an app convention: the stand axis' percentage cut points (20, 40, 60, 80 %) applied to 50,
 * i.e. 10, 20, 30, 40. It is marked for the owner's review at the end of phase 01.8.
 */
export function totalBand(total: number): TotalBand {
  return fiveBands(total, [10, 20, 30, 40])
}

/** Three colour tones for the five bands: faible and assez faible → low, moyenne → mid, rest → high. */
export function bandTone(band: StandBand | ContextBand): ScoreTone {
  switch (band) {
    case "faible":
    case "assez_faible":
      return "low"
    case "moyenne":
      return "mid"
    default:
      return "high"
  }
}
