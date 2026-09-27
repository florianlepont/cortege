// Texts of the parcel survey-history panel (REQ-B-survey-detail, REQ-C-versioning), shared by the
// Explorer map (screens/public-map/ParcelHistoryCard.tsx) and the survey detail history section
// (screens/survey-detail/HistorySection.tsx). Parameters are counts, scores, years and deltas
// only, never survey ids.

const signed = (value: number): string => (value > 0 ? `+${value}` : String(value))

export const parcelHistoryFr = {
  title: "Historique de la parcelle",
  loading: "Chargement de l'historique…",
  loadFailed: "Impossible de charger l'historique de cette parcelle.",
  empty: "Aucun relevé précédent sur cette parcelle.",
  entry: ({
    year,
    version,
    isLatest,
  }: {
    year: number | null
    version: number | null
    isLatest: boolean
  }) =>
    [
      year !== null ? `${year}` : null,
      version !== null ? `v${version}` : null,
      isLatest ? "Dernier relevé" : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Relevé",
  total: (points: number) => `IBP ${points}/50`,
  delta: {
    total: (value: number) => `Total ${signed(value)}`,
    stand: (value: number) => `P/G ${signed(value)}`,
    context: (value: number) => `C ${signed(value)}`,
    unavailable: "Pas de comparaison possible",
  },
  a11y: {
    openParcelHistory: "Voir l'historique de cette parcelle",
  },
} as const
