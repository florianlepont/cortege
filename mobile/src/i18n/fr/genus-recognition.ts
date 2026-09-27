// Phase 6 (ADR-002 D-10/D-11/D-12/D-13): Factor A's photo-based genus suggestion. Wording for the
// four calibrated confidence levels is this phase's own choice (ADR-002 leaves it to Phase 6); the
// cut points themselves come from measurement (mobile/src/recognition/calibration.ts).
export const genusRecognitionFr = {
  entryButton: "Identifier par photo",
  modalTitle: "Identifier un genre",
  captureIntro:
    "Photographiez un seul sujet : un arbre entier, une feuille ou un morceau d'écorce.",
  takePhoto: "Prendre une photo",
  retakePhoto: "Reprendre une photo",
  cameraPermissionRequired: "Autorisez l'accès à l'appareil photo pour identifier un genre.",
  noPhotoCaptured: "Aucune photo prise.",
  captureFailed: "La prise de photo a échoué. Réessayez ou saisissez le genre manuellement.",
  classifying: "Analyse de la photo…",
  resultsTitle: "Genres suggérés",
  mostLikelyBadge: "Le plus probable",
  confirmGenus: "Ajouter ce genre",
  genusAdded: "Genre ajouté à la liste.",
  close: "Fermer",
  cancel: "Annuler",
  tryAnotherPhoto: "Essayer une autre photo",
  confidence: {
    strong: "Fiable",
    medium: "Modérée",
    weak: "Faible",
    "very-weak": "Très faible",
  },
  confidenceHint: {
    strong: "Le modèle reconnaît ce genre de façon fiable.",
    medium: "Le modèle hésite un peu : vérifiez avant de confirmer.",
    weak: "Le modèle est peu sûr de cette suggestion.",
    "very-weak": "Le modèle n'est presque pas sûr de cette suggestion.",
  },
  unavailableTitle: "Identification indisponible",
  unavailableMessage:
    "Le modèle d'identification n'a pas pu être chargé. Vous pouvez toujours ajouter le genre manuellement dans la liste ci-dessus.",
  unavailableAction: "Continuer sans identification",
  inferenceFailed:
    "L'analyse de la photo a échoué. Vous pouvez réessayer ou ajouter le genre manuellement.",
} as const
