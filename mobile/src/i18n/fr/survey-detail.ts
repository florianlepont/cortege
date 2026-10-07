import { IBP_MAX } from "@cortege/ibp-domain"

// Filled by plan 01.9-12; no other plan edits this section. Plan 01.8-14 added the method
// version texts, the totals out of 50 (built from IBP_MAX) and the CNPF band names.
export const surveyDetailFr = {
  // OA-49/50: the "…" menu now only holds the destructive action (the native menu on iOS, a sheet
  // elsewhere). Sharing is its own header button (OA-48), renaming the pencil next to the title.
  menu: {
    share: "Partager",
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
    standScore: (points: number) => `P/G ${points} / ${IBP_MAX.stand}`,
    contextScore: (points: number) => `C ${points} / ${IBP_MAX.context}`,
    withBand: ({ score, band }: { score: string; band: string }) => `${score} · ${band}`,
  },
  // OA-40: no lock and no deadline. One button at the bottom, greyed with what is missing until
  // the survey can be finished. D-25: no sync step, the finish sends the last changes itself; an
  // unnamed draft is asked for a name (it never leaves the phone, OA-18).
  cta: {
    finish: "Terminer le relevé",
    start: "Commencer la notation",
    continue: "Continuer la notation",
    contextMissing: "Complétez le contexte pour terminer",
    remainingUnknown: "Remplissez les 10 facteurs pour terminer",
    nameRequired: "Nommez le relevé pour le terminer",
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
    empty: "Aucune photo pour l'instant.",
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
    context: "Contexte et parcelles",
    score: "Score IBP",
    history: "Historique",
    contextValue: ({ method, cas }: { method: string; cas: string | null }) =>
      cas ? `${method} · cas ${cas}` : method,
    scoreValue: (filled: number) => `${filled} sur 10`,
    historyEmpty: "Voir les étapes",
  },
  // The two sub-pages of the summary (OA-46).
  contextScreen: {
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
  factors: {
    title: "Score IBP",
    subtitle: "Ouvrez un facteur pour modifier les observations et le score.",
    loading: "Chargement des facteurs…",
    localDraftHint: "Score du brouillon local, d'après les dernières modifications.",
    factorFallback: (code: string) => `Facteur ${code}`,
    notFilled: "Non renseigné",
    hasWarning: "Avertissement",
    notLoaded: "Les facteurs ne sont pas encore chargés.",
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
  events: {
    title: "Historique du relevé",
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
    eventsSubtitle: "Type et contenu JSON de chaque événement.",
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
  a11y: {
    openMenu: (name: string) => `Actions du relevé ${name}`,
    shareSurvey: (name: string) => `Partager le relevé ${name} en PDF`,
    renameSurvey: (name: string) => `Renommer le relevé ${name}`,
    finishSurvey: (name: string) => `Terminer le relevé ${name}`,
    editParcels: (name: string) => `Modifier les parcelles du relevé ${name}`,
    mapPreview: (name: string) => `Carte du relevé ${name}`,
    seeOnMap: (name: string) => `Voir le relevé ${name} sur la carte`,
    scoreSummary: (value: string) => `Score IBP, ${value}`,
    addPhoto: "Ajouter une photo",
    photo: ({ position, total }: { position: number; total: number }) =>
      `Photo ${position} sur ${total}`,
    deletePhoto: ({ position, total }: { position: number; total: number }) =>
      `Supprimer la photo ${position} sur ${total}`,
    openFactor: ({ title, value }: { title: string; value: string }) =>
      `Ouvrir le facteur ${title}, ${value}`,
  },
  // Previous submitted surveys on the same parcel, and the deltas of this survey against the
  // latest one (REQ-B-survey-detail, REQ-C-versioning). Row/delta formatting is shared with the
  // Explorer map's parcel-history panel via fr.parcelHistory.
  versionHistory: {
    title: "Versions précédentes",
    subtitle: "Relevés déjà soumis sur cette même parcelle.",
    loading: "Chargement des versions précédentes…",
    loadFailed: "Impossible de charger les versions précédentes.",
    none: "Premier relevé soumis sur cette parcelle.",
    sinceLatest: "Évolution depuis la version précédente",
    factorDelta: (factor: string, value: string) => `${factor} ${value}`,
  },
} as const
