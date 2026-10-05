// Filled by plan 01.9-17; no other plan edits this section.
export const factorDetailFr = {
  fieldsProgress: ({ filledCount, totalCount }: { filledCount: number; totalCount: number }) =>
    `${filledCount}/${totalCount} champs`,
  scorePoints: ({ scoreCount }: { scoreCount: number }) => `${scoreCount} pts`,
  scoreClass: ({ selectedClass }: { selectedClass: string }) => `Classe ${selectedClass}`,
  pending: "En attente",
  scoreHint: "Remplissez tous les champs obligatoires pour calculer le score",
  requiredField: ({ label }: { label: string }) => `${label} *`,
  numericPlaceholder: "Saisissez une valeur numérique",
  // OA-30: the help is behind a link, not a card open by default; the sheet closes with its button.
  helpLink: "Que relever ?",
  helpTitle: "Que relever ?",
  helpClose: "Fermer l'aide",
  // Keyed by the factor field label the form passes in (see useSurveyForm).
  fieldLabels: {
    genera: "Genres autochtones observés",
    native_cover_percent: "Couvert des essences autochtones (%)",
    strata_count: "Nombre de strates",
    covered_autochthonous_percent: "Couvert autochtone (%)",
    bmg_count: "Nombre de BMg",
    bmm_count: "Nombre de BMm",
    surface_ha: "Surface (ha)",
    tgb_count: "Nombre de TGB",
    gb_count: "Nombre de GB",
    trees_per_ha: "Arbres par ha",
    open_flowering_percent: "Milieux ouverts fleuris (%)",
    "class_score (0|2|5)": "Classe (0, 2 ou 5)",
    type_count: "Nombre de types",
  },
} as const
