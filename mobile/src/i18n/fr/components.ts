// Filled by plan 01.9-16; no other plan edits this section.
// Texts of the shared cards, the splash screen and the ui/ primitives.
export const componentsFr = {
  separator: "·",
  // Phase 7 (HOME-01/HOME-02): replaces DraftCard and ContinueDraftCard, merged into one card.
  surveyProgressCard: {
    progressLabel: "AVANCEMENT",
    factorCount: ({ count }: { count: number }) => `${count}/10`,
    syncBlocked: "Sync bloquée",
    hoursAgo: ({ count }: { count: number }) => `il y a ${count}h`,
    yesterday: "Hier",
    daysAgo: ({ count }: { count: number }) => `il y a ${count}j`,
    resumeLabel: "Reprendre",
    a11y: ({ name, rate }: { name: string; rate: number }) =>
      `Brouillon ${name}, ${rate}% complété`,
  },
  parcelNearbyCard: {
    title: ({ name }: { name: string }) => `Parcelle ${name}`,
    surveyCount: ({ count }: { count: number }) => `${count} relevé${count > 1 ? "s" : ""}`,
    a11y: ({ title, distance }: { title: string; distance: string }) => `${title}, à ${distance}`,
  },
  splash: {
    // Latin species names shown one after the other while the app loads.
    species: [
      "Fagus sylvatica",
      "Dryocopus martius",
      "Quercus robur",
      "Salamandra salamandra",
      "Betula pendula",
      "Sitta europaea",
      "Tilia cordata",
      "Martes martes",
      "Pinus sylvestris",
      "Parus major",
      "Carpinus betulus",
      "Rosalia alpina",
    ],
    cursor: "|",
    loadingLabel: "Chargement en cours",
    loading: "Chargement…",
  },
  appButton: {
    defaultLabel: "Action",
  },
  collapsibleSection: {
    toggleLabel: ({ title, expanded }: { title: string; expanded: boolean }) =>
      `${title}, ${expanded ? "réduire" : "développer"}`,
  },
  ibpScoreBadge: {
    noScore: "—",
    denominator: "/50",
  },
  // Phase 7 (DET-01): horizontal bars replacing the 10-axis radar.
  ibpFactorBars: {
    standGroup: "Peuplement et gestion",
    contextGroup: "Contexte",
    points: ({ points }: { points: number }) => `${points}/5`,
    notFilled: "—",
  },
  // Phase 7 (SYNC-02): the 4-state pill visible in the Home and Mes Relevés headers.
  syncStatusPill: {
    offline: "Hors ligne",
    toSend: ({ count }: { count: number }) => `${count} à envoyer`,
    syncing: "Synchronisation…",
    upToDate: "À jour",
    a11yHint: "Touchez pour voir le détail de la synchronisation",
  },
} as const
