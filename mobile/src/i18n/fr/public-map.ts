// Filled by plan 01.9-23 then 01.9-28; no other plan edits this section.
// Texts of the public map screen (screens/PublicMapScreen.tsx and screens/public-map/).
// Parameters are counts, scores, dates and region or cas codes only, never survey ids (T-01.9-50).
// IBP totals read out of 50 (phase 01.8, D-03).

const plural = (count: number, one: string, many: string) => (count > 1 ? many : one)

export const publicMapFr = {
  count: (count: number) =>
    count === 0 ? "Aucun relevé ici" : `${count} ${plural(count, "relevé", "relevés")} ici`,
  selected: {
    title: (ibp: number) => `Relevé · IBP ${ibp}/50`,
    meta: ({ region, date }: { region: string; date: string }) => `${region} · ${date}`,
    openSurvey: "Voir le relevé",
    ownSurvey: "C'est votre propre relevé.",
  },
  clusterList: {
    title: (count: number) => `${count} ${plural(count, "relevé", "relevés")} à cet endroit`,
    subtitle: "Les positions sont arrondies à environ 1 km.",
    row: ({ ibp, date }: { ibp: number; date: string }) => `IBP ${ibp}/50 · ${date}`,
  },
  // Method version of a survey (D-10) and its v3.2 cas, shown where v3.0 shows the region.
  method: {
    v3_0: "IBP v3.0",
    v3_2: "IBP v3.2",
  },
  cas: (cas: number) => `Cas ${cas}`,
  cluster: {
    count: (count: number) => (count > 99 ? "99+" : String(count)),
  },
  // MAP-03: the score-band pastille legend, opened by the (i) button beside the count.
  legend: {
    title: "Légende",
    subtitle: "Score IBP du dernier relevé terminé, sur 50.",
    attribution: "Fonds de carte et cadastre : © IGN (Géoplateforme). Carte : MapLibre.",
    low: "Score faible",
    mid: "Score moyen",
    high: "Score élevé",
  },
  alerts: {
    locationDisabled: {
      title: "Localisation désactivée",
      message: "Autorisez l'accès à la localisation pour centrer la carte sur votre position.",
    },
    locationUnavailable: {
      title: "Localisation indisponible",
      message: "Impossible d'obtenir votre position actuelle.",
    },
  },
  a11y: {
    locate: "Centrer la carte sur ma position",
    closeSelection: "Fermer le relevé sélectionné",
    closeClusterList: "Fermer la liste des relevés",
    closeParcelHistory: "Fermer l'historique de la parcelle",
    showLegend: "Afficher la légende des scores",
    hideLegend: "Masquer la légende des scores",
    surveyMarker: (ibp: number) => `Relevé, IBP ${ibp}/50`,
    cluster: (count: number) => `Groupe de ${count} ${plural(count, "relevé", "relevés")}`,
    clusterListItem: ({ ibp, date, region }: { ibp: number; date: string; region: string }) =>
      `Relevé, IBP ${ibp}/50, ${date}, ${region}`,
  },
} as const
