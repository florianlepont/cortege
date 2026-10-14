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
    // D-32: the old "Contexte et parcelles" page is two pages.
    surveyContext: "Contexte",
    surveyParcelsPage: "Parcelles",
    surveyScore: "Facteurs IBP",
    surveyHistory: "Historique de la parcelle",
    communityHistory: "Historique de la parcelle",
    surveyJournal: "Journal du relevé",
    newSurvey: "Nouveau relevé",
    editSurvey: "Modifier le relevé",
    factor: (factor: string) => `Facteur ${factor}`,
    parcels: "Parcelles",
    parcelsWizard: "Étape 4 sur 5",
    offlineAreas: "Cartes hors ligne",
    account: "Compte",
    settings: "Paramètres",
  },
  // The survey pages wait for the selected survey (SelectedSurveyGate).
  surveyLoading: "Chargement du relevé…",
  a11y: {
    openSettings: "Ouvrir les paramètres",
  },
} as const
