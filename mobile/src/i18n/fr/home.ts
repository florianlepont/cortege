// Filled by plan 01.9-16; no other plan edits this section.
const plural = (count: number, word: string): string => (count > 1 ? `${word}s` : word)

export const homeFr = {
  greeting: "Bonjour",
  // OA-12: shown under the pull-to-refresh spinner.
  refreshTitle: "Récupération des nouveaux relevés du serveur",
  greetingWithName: ({ name }: { name: string }) => `Bonjour, ${name}`,
  // HOME-06: the avatar (photo or placeholder) is tappable, navigating to Compte.
  avatar: "Ouvrir Compte",
  alerts: {
    blocked: ({ count }: { count: number }) =>
      `${count} ${plural(count, "relevé")} ${plural(count, "bloqué")}`,
    // SYNC-03: a blocked survey is not a connection problem, so it gets its own copy and an
    // actionable "Voir". OA-18: a block is not always a conflict, so the copy names no cause; the
    // list and the survey show the actual reason.
    blockedMessage: "Synchronisation bloquée : ouvrez le relevé pour voir pourquoi.",
    failed: ({ count }: { count: number }) =>
      `${count} ${plural(count, "relevé")} en erreur de sync`,
    failedMessage: "Vérifiez votre connexion pour relancer la synchronisation.",
    actionView: "Voir",
    actionRetry: "Réessayer",
  },
  hero: {
    title: "Nouveau relevé IBP",
    body: "Localisez une parcelle et démarrez l'inventaire.",
    button: "Démarrer un relevé",
    // HOME-02: the hero becomes a resume action when a draft was touched in the last 48h.
    // OA-84: the button already says "Reprendre"; the title is the survey. No tag pill (12.2-10).
    resumeTitle: ({ name }: { name: string }) => name,
    resumeTitleUnnamed: "Votre relevé en cours",
    resumeBody: ({ completed }: { completed: number }) => `${completed}/10 facteurs remplis.`,
    resumeButton: "Reprendre",
    newSurveyButton: "Nouveau relevé",
  },
  // OA-107: the tools that help fill in the factors. Identifying a tree by photo is the first.
  tools: {
    title: "Outils",
    identify: {
      title: "Identifier un arbre",
      body: "Le genre à partir d'une photo.",
      a11y: "Identifier un arbre par photo",
      // The button of a result says where it leads: a survey is chosen next (OA-114).
      confirm: "Utiliser dans un relevé",
    },
    // OA-114: the native sheet that follows. Starting a survey is the main action, adding to a
    // survey in progress the alternative.
    chooseSurveyTitle: ({ genus }: { genus: string }) => genus,
    startSurvey: "Commencer un relevé avec ce genre",
    addToSurveyTitle: "Ou l'ajouter à un relevé en cours",
    addToSurveyFooter: "Le genre est ajouté au facteur A du relevé choisi.",
    noOpenSurvey: "Aucun relevé en cours.",
    close: "Fermer",
    cancel: "Annuler",
    genusAdded: ({ genus, name }: { genus: string; name: string }) =>
      `${genus} ajouté au facteur A de « ${name} »`,
    addFailed: "Le genre n'a pas pu être ajouté à ce relevé.",
    dismissNotice: "Fermer le message",
  },
  nearby: {
    title: "Autour de vous",
    seeMap: "Explorer ›",
    seeMapLabel: "Voir la carte",
    locationDenied: "Activez la localisation pour voir les parcelles proches.",
    loadError: "Impossible de charger les parcelles. Vérifiez votre connexion.",
    empty: "Aucune parcelle relevée à moins de 2,5 km. Lancez-vous !",
    summary: ({ count }: { count: number }) =>
      `${count} ${plural(count, "parcelle")} ${plural(count, "relevée")}`,
    radius: "dans un rayon de 2,5 km autour de vous",
  },
  sector: {
    label: "SCORE MOYEN DU SECTEUR",
    score: ({ score }: { score: number }) => `${score} / 50`,
    mixedMethods: "méthodes v3.0 et v3.2 mêlées",
  },
} as const
