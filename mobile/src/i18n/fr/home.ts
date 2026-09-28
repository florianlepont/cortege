// Filled by plan 01.9-16; no other plan edits this section.
const plural = (count: number, word: string): string => (count > 1 ? `${word}s` : word)

export const homeFr = {
  greeting: "Bonjour",
  greetingWithName: ({ name }: { name: string }) => `Bonjour, ${name}`,
  // HOME-06: the avatar (photo or placeholder) is tappable, navigating to Compte.
  avatar: "Ouvrir Compte",
  alerts: {
    blocked: ({ count }: { count: number }) =>
      `${count} ${plural(count, "relevé")} ${plural(count, "bloqué")}`,
    // SYNC-03: a blocked survey is a conflict, not a connection problem — distinct copy and action
    // from a plain sync error, and an actionable "Voir" instead of a dead-end notice.
    blockedMessage: "Synchronisation en conflit : ouvrez le relevé pour le résoudre.",
    failed: ({ count }: { count: number }) =>
      `${count} ${plural(count, "relevé")} en erreur de sync`,
    failedMessage: "Vérifiez votre connexion pour relancer la synchronisation.",
    actionView: "Voir",
    actionRetry: "Réessayer",
  },
  hero: {
    eyebrow: "COMMENCER",
    title: "Nouveau relevé IBP",
    body: "Localisez une parcelle et démarrez l'inventaire.",
    button: "Démarrer un relevé",
    // HOME-02: the hero becomes a resume action when a draft was touched in the last 48h.
    resumeEyebrow: "REPRENDRE",
    resumeTitle: ({ name }: { name: string }) => `Reprendre ${name}`,
    resumeBody: ({ completed }: { completed: number }) => `${completed}/10 facteurs remplis.`,
    resumeButton: "Reprendre",
    newSurveyButton: "Nouveau relevé",
  },
  nearby: {
    title: "Autour de vous",
    seeMap: "Voir carte ›",
    seeMapLabel: "Voir la carte",
    locationDenied: "Activez la localisation pour voir les parcelles proches.",
    loadError: "Impossible de charger les parcelles. Vérifiez votre connexion.",
    empty: "Aucune parcelle relevée dans un rayon de 2,5 km.",
  },
  sector: {
    label: "SCORE IBP MOYEN DU SECTEUR",
    score: ({ score }: { score: number }) => `${score} / 50`,
    mixedMethods: "méthodes v3.0 et v3.2 mêlées",
    meta: ({ count }: { count: number }) =>
      `${count} ${plural(count, "relevé")} ${plural(count, "analysé")} · rayon ~2,5 km`,
  },
} as const
