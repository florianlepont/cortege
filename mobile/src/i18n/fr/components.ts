import { IBP_MAX } from "@cortege/ibp-domain"

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
  // Phase 12.2 (D-15): the list score ring and the ten non-interactive factor bars. One label each.
  scoreRing: {
    label: ({ score }: { score: number }) => `Score ${score} sur ${IBP_MAX.total}`,
    none: "Pas de score",
    draft: ({ filled }: { filled: number }) =>
      filled === 1 ? "1 facteur sur 10 rempli" : `${filled} facteurs sur 10 remplis`,
  },
  factorBars: {
    label: (entries: ReadonlyArray<{ letter: string; points: number | null }>) =>
      `Facteurs. ${entries
        .map(({ letter, points }) =>
          points === null ? `${letter} non rempli` : `${letter} ${points} sur 5`,
        )
        .join(", ")}.`,
  },
  // Phase 7 (SYNC-02): the 4-state pill visible in the Home and Mes Relevés headers.
  syncStatusLine: {
    offline: "Hors ligne",
    toSend: ({ count }: { count: number }) =>
      count > 1 ? `${count} relevés à envoyer` : "1 relevé à envoyer",
    syncing: "Synchronisation…",
    a11yHint: "Touchez pour voir le détail de la synchronisation",
  },
} as const
