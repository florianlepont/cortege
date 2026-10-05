// OA-59: the read-only page of a finished survey of another member, opened from the Communauté
// search. The score, the factors and the photos reuse the texts of the survey's own pages.
export const communitySurveyFr = {
  headerTitle: "Relevé de la communauté",
  meta: ({ author, date }: { author: string; date: string }) => `par ${author} · le ${date}`,
  unknownAuthor: "un ancien membre",
  versionLine: ({ year, version }: { year: number | null; version: number | null }) =>
    [year !== null ? `Année ${year}` : null, version !== null ? `version ${version}` : null]
      .filter((part): part is string => part !== null)
      .join(" · "),
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
  history: {
    title: "Autres relevés de ces parcelles",
    current: "Ce relevé",
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
    total: (score: number) => `${score} / 50`,
    open: ({ name, total }: { name: string; total: number }) =>
      `${name}, ${total} sur 50. Ouvrir ce relevé`,
  },
  a11y: {
    photo: ({ index, total }: { index: number; total: number }) => `Photo ${index} sur ${total}`,
  },
} as const
