import { IBP_MAX } from "@cortege/ibp-domain"
import { surveyFinishFr } from "./survey-finish"

// Phase 27: what a screen reader hears after a factor row's title and value (D-13). Nothing is
// added for a plain row, so the spoken label of an unannotated factor is unchanged.
function factorFlags({ doubtful, hasNote }: { doubtful?: boolean; hasNote?: boolean }): string {
  return `${doubtful ? ", incertitude signalée" : ""}${hasNote ? ", avec une note" : ""}`
}

// Filled by plan 01.9-12; no other plan edits this section. Plan 01.8-14 added the method
// version texts, the totals out of 50 (built from IBP_MAX) and the CNPF band names.
export const surveyDetailFr = {
  // The "…" menu holds "Renommer" (iOS large title, editable survey), "Journal du relevé" (D-02,
  // own survey only) and "Supprimer" (the native menu on iOS, a sheet elsewhere). Sharing is its
  // own header button (OA-48).
  menu: {
    share: "Partager",
    // 12.2-17: on iOS the survey's name is the native large title, which is not a button: renaming
    // moves to the "…" menu.
    rename: "Renommer",
    journal: "Journal du relevé",
    delete: "Supprimer",
    cancel: "Annuler",
  },
  // OA-37: the status is said in words, one line under the title: "Brouillon · pas encore
  // synchronisé". "Brouillon complet" says the ten factors and the information are filled in.
  header: {
    renameLabel: "Nom du relevé",
    renamePlaceholder: "Nom du relevé",
    status: {
      draft: "Brouillon",
      draftComplete: "Brouillon complet",
      finished: "Terminé",
    },
    sync: {
      synced: "synchronisé",
      pending: "pas encore synchronisé",
      // Phase 30: the draft has no parcours yet, so it is held on the phone.
      routePending: "parcours à choisir",
      // D-25: a finished survey whose last changes are still being sent, said discreetly.
      sending: "synchronisation en cours",
      error: "échec de la synchronisation",
      blocked: "synchronisation bloquée",
    },
    syncSuffix: (sync: string) => `· ${sync}`,
    updatedAt: (date: string) => `Mis à jour ${date}`,
  },
  metric: {
    localDraftScore: "Score du brouillon",
    ibpTotal: "IBP total",
    factorsReady: "Facteurs remplis",
    factorsCount: (count: number) => `${count}/10`,
    unknown: "Non renseigné",
    total: (points: number) => `${points} / ${IBP_MAX.total}`,
    outOfTotal: `/ ${IBP_MAX.total}`,
    withBand: ({ score, band }: { score: string; band: string }) => `${score} · ${band}`,
  },
  // OA-40: no lock and no deadline. One button at the bottom, greyed with what is missing until
  // the survey can be finished. D-25: no sync step, the finish sends the last changes itself; an
  // unnamed draft is asked for a name (it never leaves the phone, OA-18).
  cta: {
    finish: "Terminer le relevé",
    start: "Commencer la notation",
    // A draft with no route starts with the route: the button opens the route step (edit mode).
    defineRoute: "Définir le parcours",
    continue: "Continuer la notation",
    contextMissing: "Complétez le contexte pour terminer",
    remainingUnknown: "Remplissez les 10 facteurs pour terminer",
    nameRequired: "Nommez le relevé pour le terminer",
    // Phase 30 (O-19): a draft with no route cannot be finished until its parcours is chosen.
    routeRequired: "Choisissez le parcours pour terminer",
    blocked: "Synchronisation bloquée",
  },
  scoreCard: {
    caption: "Score IBP",
    draftCaption: "Score IBP du brouillon",
    factorsFilled: (filled: number) =>
      filled === 1 ? "1 facteur sur 10 rempli" : `${filled} facteurs sur 10 remplis`,
    allFilled: "Les 10 facteurs sont remplis",
    outOf: ({ max }: { max: number }) => `/ ${max}`,
  },
  photos: {
    title: "Photos",
    add: "Ajouter",
    countSuffix: (count: number) => ` · ${count}`,
    // The line of the dashed tile of a draft without photo (pressable like "Ajouter").
    emptyAdd: "Ajouter une photo",
    emptyReadOnly: "Aucune photo sur ce relevé.",
    // One short word in the tile of a photo that cannot be shown (the full sentence is the
    // accessibility value of the tile, `labels.attachmentPreview`).
    tileMissing: "Introuvable",
    tileUnavailable: "Indisponible",
  },
  map: {
    parcelCount: (count: number) => (count === 1 ? "1 parcelle" : `${count} parcelles`),
    noParcel: "Aucune parcelle choisie",
    // OA-59: opens Explorer on the survey.
    seeOnMap: "Voir sur la carte",
  },
  rows: {
    // D-32: "Contexte et parcelles" is split into "Contexte" (method, cas, weather) and "Parcelles".
    // 2026-10-14 (owner decision): the parcels page also holds the "Parcours utilisé" card, so it is
    // "Parcelles et parcours" (map, list, route, offline map).
    context: "Contexte",
    parcels: "Parcelles",
    // D-34: the row and its page are named for what they hold, the ten factors. The score card
    // above keeps "Score IBP".
    score: "Facteurs IBP",
    history: "Historique",
    contextValue: ({ method, cas }: { method: string; cas: string | null }) =>
      cas ? `${method} · cas ${cas}` : method,
    scoreValue: (filled: number) => `${filled} sur 10`,
    parcelsValue: (count: number) => (count === 1 ? "1 parcelle" : `${count} parcelles`),
    parcelsNone: "Aucune",
    // Phase 30 (U-O9, moved from Contexte on 2026-10-14): the short name of the parcours follows
    // the parcel count, on the same line ("2 parcelles · Parcours en plein").
    parcelsValueWithRoute: ({ parcels, route }: { parcels: string; route: string }) =>
      `${parcels} · ${route}`,
    // Value of the parcel history row (D-01). The arrow is U+2192; the owner phone check
    // (plan 24-12) verifies the glyph, fallback: " à ".
    historyValue: ({ first, latest }: { first: number; latest: number }) =>
      `${first} \u2192 ${latest}`,
    historyCount: (count: number) => (count === 1 ? "1 relevé" : `${count} relevés`),
    historyFirst: "Premier relevé",
    historyUnavailable: "Indisponible",
    historyNoParcel: "Aucune parcelle",
  },
  // The sub-pages of the summary (OA-46, D-32): "Parcelles et parcours" holds the map, the list, the
  // editing button, the "Parcours utilisé" card and the offline map.
  parcelsScreen: {
    parcelsHeading: (count: number) => `Parcelles · ${count}`,
    noParcel: "Aucune parcelle choisie pour ce relevé.",
    editParcels: "Modifier les parcelles",
    parcelLabel: (position: number) => `Parcelle ${position}`,
  },
  scoreScreen: {
    standLabel: "Peuplement et gestion (A à G)",
    contextLabel: "Contexte (H à J)",
    factorsTitle: "Facteurs",
    toFill: "À remplir",
    pointsOf: ({ points, max }: { points: number; max: number }) => `${points} / ${max}`,
    maxSuffix: (max: number) => ` / ${max}`,
  },
  summary: {
    submittedTitle: "Relevé terminé",
    submittedMessage: "Ce relevé est désormais en lecture seule.",
    contextTitle: "Méthode et station",
    contextSubtitle: "Méthode IBP et contexte de station utilisés pour le calcul.",
    editParcels: "Modifier les parcelles",
    region: (label: string) => `Région : ${label}`,
    vegetation: (label: string) => `Végétation : ${label}`,
    // Filled by plan 01.8-14: the method version on the detail (D-02, D-08).
    unknownMethod: "Méthode IBP non reconnue",
    casMissing: "Choisissez le cas IBP de la station : il est requis pour soumettre le relevé.",
  },
  // Phase 30 (spec section 9, O-12): the "Parcours utilisé" card of the Contexte page, after "Méthode
  // et station". The words are those of the official method; the values of the parcours and of the
  // mode de relevé come from `fr.routeGuide` through `app/route-text.ts`. Read-only text after the
  // submit, with the "Modifier le parcours" link on a draft only.
  route: {
    title: "Parcours utilisé",
    parcours: "Parcours",
    counting: "Mode de relevé",
    countedFactors: "Facteurs comptés en entier",
    // "A Essences autochtones": the letter, then the title of the factor.
    factorItem: ({ letter, title }: { letter: string; title: string }) => `${letter} ${title}`,
    zone: "Surface décrite",
    zoneValue: (hectares: string) => `${hectares} ha`,
    complement: "Reste du peuplement",
    complementDone: (total: string) => `Regardé rapidement, surface totale évaluée ${total} ha`,
    complementNo: "Non regardé",
    choice: "Choix",
    choiceGuide: "Conseillé par l'app d'après vos réponses",
    choiceObserver: "Choisi par vous",
    answers: "Vos réponses",
    // The pieces of the "Vos réponses" sentence: "Peuplement de 8 ha, homogène, facile à observer".
    answerParts: {
      standSurface: (hectares: string) => `Peuplement de ${hectares} ha`,
      pieceSurface: (hectares: string) => `Morceau de ${hectares} ha`,
      subdivided: "peuplement découpé en sous-peuplements",
      homogeneous: "homogène",
      heterogeneous: "varié",
      easy: "facile à observer",
      hard: "difficile à observer",
      narrow: "étroit",
      wide: "large",
      beginner: "IBP nouveau pour vous",
      hoursAvailable: ({ hours, text }: { hours: number; text: string }) =>
        hours < 2 ? `${text} heure disponible` : `${text} heures disponibles`,
    },
    edit: "Modifier le parcours",
    editA11y: "Modifier le parcours de ce relevé",
    // A draft that has no route yet (an older draft): the parcours must be chosen to finish it.
    none: "Parcours à choisir",
    noneBody: "Choisissez le parcours pour pouvoir terminer ce relevé.",
    choose: "Choisir le parcours",
    chooseA11y: "Choisir le parcours de ce relevé",
    // A survey finished before this phase has no route: nothing is invented (P-3).
    legacyRow: "Parcours : non renseigné",
    legacyBody: "Ce relevé a été fait avant l'assistant de choix du parcours.",
  },
  factors: {
    title: "Facteurs IBP",
    subtitle: "Ouvrez un facteur pour modifier les observations et le score.",
    loading: "Chargement des facteurs…",
    localDraftHint: "Score du brouillon local, d'après les dernières modifications.",
    factorFallback: (code: string) => `Facteur ${code}`,
    notFilled: "Non renseigné",
    hasWarning: "Avertissement",
    notLoaded: "Les facteurs ne sont pas encore chargés.",
    // Phase 27 (D-13, D-17): the doubt flag and the folded note on a score row.
    doubtBadge: "Incertitude",
    noteMore: "Lire la suite",
    noteMoreA11y: "Lire la suite, développe la note",
    noteLess: "Réduire",
    noteLessA11y: "Réduire la note",
  },
  // CNPF interpretation bands of the sub-scores (D-03 amended), keyed by the package's band ids.
  bands: {
    stand: {
      faible: "faible",
      assez_faible: "assez faible",
      moyenne: "moyenne",
      assez_forte: "assez forte",
      forte: "forte",
    },
    context: {
      faible: "faible",
      moyenne: "moyenne",
      forte: "forte",
    },
  },
  // DET-04: the sync-error notice's own integrated action (no separate equal-weight button row);
  // export/delete moved into the header's "…" menu (fr.surveyDetail.menu).
  actions: {
    retryNow: "Réessayer maintenant",
    discardLocalChange: "Annuler la modification locale",
    exportFailed: "L'export du PDF a échoué. Réessayez.",
    exportShareUnavailable: "Aucune application de partage n'est disponible sur cet appareil.",
  },
  // "Journal du relevé" (D-11): the change log of the survey, a page of its own.
  journal: {
    subtitle: "Ce qui s'est passé sur ce relevé.",
  },
  events: {
    title: "Journal du relevé",
    subtitle: "Synchronisation et étapes de ce relevé.",
    loading: "Chargement de l'historique…",
    empty: "Aucun événement chargé pour l'instant.",
  },
  // Event types written by the API (survey_events.event_type, data contract).
  eventTypes: {
    created: "Relevé créé",
    updated: "Relevé modifié",
    submitted: "Relevé soumis",
    synced: "Relevé synchronisé",
    sync_failed: "Échec de la synchronisation",
    expired: "Relevé expiré",
    visibility_changed: "Visibilité modifiée",
    deleted: "Relevé supprimé",
    reported: "Relevé signalé",
    attachment_created: "Photo ajoutée",
    attachment_uploaded: "Photo envoyée",
    attachment_deleted: "Photo supprimée",
    backfilled: "Données complétées",
  },
  unknownEventType: "Autre événement",
  // Developer-only tab (shouldShowDevTools); the field names stay technical.
  debug: {
    snapshotTitle: "Instantané de débogage",
    snapshotSubtitle: "État local et synchronisé de ce relevé.",
    imagesTitle: "Débogage des images",
    imagesSubtitle: "Pièces jointes locales et métadonnées de synchronisation.",
    eventsTitle: "Événements bruts",
    eventsSubtitle: "Type et contenu de chaque événement.",
    noSyncError: "Aucune erreur de synchronisation.",
    noAttachment: "Aucune pièce jointe locale.",
    simulateMissingFile: "Simuler un fichier manquant",
    yes: "oui",
    no: "non",
    none: "aucun",
    field: ({ name, value }: { name: string; value: string }) => `${name} : ${value}`,
    attachmentIndex: (position: number) => `Photo ${position}`,
    size: ({ bytes, kilobytes }: { bytes: string; kilobytes: string }) =>
      `taille : ${bytes} octets (${kilobytes} Ko)`,
  },
  alerts: {
    readOnlyTitle: "Relevé en lecture seule",
    uploadDisabled: "Ce relevé est soumis : l'ajout de photos est désactivé.",
    deletionDisabled: "Ce relevé est soumis : la suppression de photos est désactivée.",
    addPhotoTitle: "Ajouter une photo",
    addPhotoMessage: "Comment voulez-vous ajouter une photo ?",
    takePhoto: "Prendre une photo",
    pickFromGallery: "Choisir dans la galerie",
    deletePhotoTitle: "Supprimer la photo",
    deletePhotoMessage: "Retirer cette photo du relevé ?",
    invalidNameTitle: "Nom invalide",
    invalidNameMessage: "Le nom du relevé ne peut pas être vide.",
  },
  // Phase 29 (D-15): the read-only line under the status line of the owner's finished survey. A
  // draft has none, the finish sheet shows the choice. "Partagé" is the wire value "public",
  // never shown (D-02).
  visibility: {
    line: {
      finished: {
        shared: surveyFinishFr.options.shared.label,
        private: surveyFinishFr.options.private.label,
      },
    },
  },
  a11y: {
    openMenu: (name: string) => `Actions du relevé ${name}`,
    shareSurvey: (name: string) => `Partager le relevé ${name} en PDF`,
    renameSurvey: (name: string) => `Renommer le relevé ${name}`,
    finishSurvey: (name: string) => `Terminer le relevé ${name}`,
    editParcels: (name: string) => `Modifier les parcelles du relevé ${name}`,
    // The map card of the summary opens the Parcelles page (D-32).
    openParcels: (name: string) => `Ouvrir les parcelles du relevé ${name}`,
    mapPreview: (name: string) => `Carte du relevé ${name}`,
    seeOnMap: (name: string) => `Voir le relevé ${name} sur la carte`,
    scoreSummary: (value: string) => `Score IBP, ${value}`,
    addPhoto: "Ajouter une photo",
    photo: ({ position, total }: { position: number; total: number }) =>
      `Photo ${position} sur ${total}`,
    deletePhoto: ({ position, total }: { position: number; total: number }) =>
      `Supprimer la photo ${position} sur ${total}`,
    openFactor: ({
      title,
      value,
      doubtful,
      hasNote,
    }: {
      title: string
      value: string
      doubtful?: boolean
      hasNote?: boolean
    }) => `Ouvrir le facteur ${title}, ${value}${factorFlags({ doubtful, hasNote })}`,
    // The same row on a submitted survey or another member's survey: it opens nothing.
    factorReadOnly: ({
      title,
      value,
      doubtful,
      hasNote,
    }: {
      title: string
      value: string
      doubtful?: boolean
      hasNote?: boolean
    }) => `${title}, ${value}${factorFlags({ doubtful, hasNote })}`,
    // `text` is the state phrase in lower case, without its parenthesis.
    visibilityLine: ({ text }: { text: string }) =>
      `Visibilité : ${text}. Ne peut plus être modifiée.`,
    historyRow: ({ label, value }: { label: string; value: string }) => `${label}. ${value}`,
    historyRange: ({ first, latest }: { first: number; latest: number }) =>
      `de ${first} à ${latest} sur ${IBP_MAX.total}`,
  },
} as const
