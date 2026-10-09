// OA-59: the read-only page of a finished survey of another member, opened from the Communauté
// search. The score, the factors and the photos reuse the texts of the survey's own pages.
export const communitySurveyFr = {
  headerTitle: "Relevé de la communauté",
  // OA-115: the status line of the page, like "Brouillon · synchronisé" on one of my surveys.
  statusLine: ({ author, date }: { author: string; date: string }) =>
    `Terminé · ${author} · ${date}`,
  versionChip: (version: number) => `version ${version}`,
  unknownAuthor: "un ancien membre",
  readOnly: "Relevé d'un autre membre : consultation seule.",
  loading: "Chargement du relevé…",
  error: "Ce relevé n'a pas pu être chargé. Vérifiez votre connexion.",
  retry: "Réessayer",
  contextTitle: "Méthode et station",
  rows: {
    method: "Méthode",
    cas: "Cas",
    region: "Région",
    stage: "Étage de végétation",
  },
  photosFailed: "Les photos n'ont pas pu être chargées.",
  // The author line of a parcel history row; the page and row texts live in fr.parcelHistory.
  history: {
    row: ({
      author,
      year,
      version,
    }: {
      author: string
      year: number | null
      version: number | null
    }) =>
      [author, year !== null ? String(year) : null, version !== null ? `version ${version}` : null]
        .filter((part): part is string => part !== null)
        .join(" · "),
  },
  a11y: {
    photo: ({ index, total }: { index: number; total: number }) => `Photo ${index} sur ${total}`,
  },
} as const
