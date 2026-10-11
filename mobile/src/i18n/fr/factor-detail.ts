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
  // Phase 25.1 (D-12): labels of the optional detail lists that sit next to a scored value.
  companionLabels: {
    dmh_groups: "Groupes de dendromicrohabitats observés (facultatif)",
    evidence: "Sources de la continuité (facultatif)",
  },
  // Keyed by the factor field label the form passes in (see useSurveyForm).
  fieldLabels: {
    genera: "Genres autochtones observés",
    native_cover_percent: "Couvert des essences autochtones (%)",
    strata_count: "Nombre de strates",
    covered_autochthonous_percent: "Couvert autochtone (%)",
    bmg_count: "Nombre de bois morts de grosse dimension (BMg)",
    bmm_count: "Nombre de bois morts de dimension moyenne (BMm)",
    surface_ha: "Surface (ha)",
    tgb_count: "Nombre de très gros bois (TGB)",
    gb_count: "Nombre de gros bois (GB)",
    trees_per_ha: "Arbres par ha",
    open_flowering_percent: "Milieux ouverts fleuris (%)",
    "class_score (0|2|5)": "Classe (0, 2 ou 5)",
    type_count: "Nombre de types",
  },
  // Phase 27 (D-13, D-18): the strip under each factor, a "Douteux" flag and a short note.
  // Neither changes the score. The note is visible to the members who can read the survey (D-06).
  strip: {
    doubt: {
      label: "Douteux",
      hint: "Signale un doute sur ce facteur. Le score ne change pas.",
    },
    note: {
      add: "Ajouter une note",
      edit: "Modifier la note",
      close: "Fermer la note",
      addA11y: (title: string) => `Ajouter une note au facteur ${title}`,
      editA11y: (title: string) => `Modifier la note du facteur ${title}`,
      closeA11y: (title: string) => `Fermer la note du facteur ${title}`,
      fieldLabel: (title: string) => `Note du facteur ${title}`,
      placeholder: "Ce que vous avez vu, pourquoi ce doute…",
      visibility: "Visible par les membres qui peuvent lire le relevé.",
      hint: "300 caractères au plus. Visible par les membres qui peuvent lire le relevé.",
      counter: ({ count, max }: { count: number; max: number }) => `${count} / ${max}`,
      counterA11y: ({ count, max }: { count: number; max: number }) =>
        `${count} caractères sur ${max}`,
    },
  },
} as const
