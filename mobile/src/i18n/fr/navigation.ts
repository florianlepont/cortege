// Filled by plan 01.9-25; no other plan edits this section.
// Tab titles are keyed by root tab route name, so the tab maps stay typed by
// `keyof RootTabParamList`.
export const navigationFr = {
  tabs: {
    home: "Accueil",
    surveys: "Mes Relevés",
    publicMap: "Explorer",
    search: "Rechercher",
    account: "Compte",
  },
  headers: {
    surveys: "Mes Relevés",
    communitySurvey: "Relevé de la communauté",
    surveyContext: "Contexte et parcelles",
    surveyScore: "Score IBP",
    surveyHistory: "Historique",
    surveyJournal: "Journal du relevé",
    newSurvey: "Nouveau relevé",
    editSurvey: "Modifier le relevé",
    factor: (factor: string) => `Facteur ${factor}`,
    parcels: "Parcelles",
    parcelsWizard: "Étape 4 sur 4",
    offlineAreas: "Cartes hors ligne",
    account: "Compte",
    settings: "Paramètres",
  },
  search: {
    placeholder: "Rechercher des relevés",
  },
  a11y: {
    openSettings: "Ouvrir les paramètres",
  },
} as const
