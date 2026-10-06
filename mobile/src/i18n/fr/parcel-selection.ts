// Filled by plan 01.9-17; no other plan edits this section.
export const parcelSelectionFr = {
  currentPosition: "Ma position",
  // Name of the offline area when the survey has no name yet.
  areaSiteFallback: "la parcelle choisie",
  selectedCount: ({ count }: { count: number }) =>
    count > 1 ? `${count} parcelles sélectionnées` : `${count} parcelle sélectionnée`,
  noSelection: "Aucune parcelle sélectionnée",
  loadingOverlay: "Chargement des parcelles…",
  visibleCount: ({ count }: { count: number }) =>
    count > 1 ? `${count} parcelles visibles` : `${count} parcelle visible`,
  zoomToSelect: "Zoomez pour sélectionner des parcelles",
  selectionRequired: "Sélectionnez au moins une parcelle pour continuer.",
  tapHint: "Touchez les parcelles pour les ajouter ou les retirer de ce relevé.",
  saving: "Enregistrement…",
  done: "Terminé",
  continue: "Continuer",
  // The legend of the parcel colours, same place and look as the Explorer's (OA-59 batch).
  legend: {
    title: "Légende",
    subtitle: "Parcelles cadastrales.",
    selected: "Parcelle de ce relevé",
    studied: "Déjà étudiée",
    neutral: "Pas encore étudiée",
    zoomIn: "Zoomez davantage",
  },
} as const
