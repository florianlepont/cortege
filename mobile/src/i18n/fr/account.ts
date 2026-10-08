// Filled by plan 01.9-15; no other plan edits this section.
// Shared words (Annuler, Enregistrer) come from fr.common.
export const accountFr = {
  fallbackName: "Compte",
  initialsFallback: "A",
  noEmail: "Aucun email associé",
  title: "Compte",
  profile: {
    title: "Profil",
    firstName: "Prénom",
    // ACC-04: a generic example, not a real member's name.
    firstNamePlaceholder: "ex. Marie",
    lastName: "Nom",
    lastNamePlaceholder: "ex. Dupont",
    displayName: "Nom d'affichage",
    displayNamePlaceholder: "ex. M. Dupont",
    // OA-72: the save bar shows only while there are unsaved changes.
    unsavedBar: "Modifications non enregistrées",
    saving: "Enregistrement...",
    save: "Enregistrer",
    cancel: "Annuler",
  },
  email: {
    label: "Email",
    empty: "Non renseigné",
    newLabel: "Nouvel email",
    invalid: "Email invalide",
  },
  password: {
    label: "Mot de passe",
    action: "Réinitialiser",
  },
  // ADR-002's CC-BY-4.0 attribution obligation (Phase 6): the genus-recognition model's training
  // images come from GBIF occurrence media, some CC-BY-licensed and requiring photographer credit.
  credits: {
    label: "Crédits photographiques",
    alertTitle: "Crédits photographiques",
    alertMessage:
      "L'identification de genre par photo (section A) utilise un modèle entraîné sur des images de GBIF.org (Global Biodiversity Information Facility), publiées sous licence CC0 1.0 ou CC BY 4.0. Les images CC BY nécessitent de créditer leurs photographes ; voir gbif.org pour le mécanisme d'attribution complet.",
  },
  logout: "Se déconnecter",
  // ACC-03: the grouped iOS-style list (Profil, Connexion, Se déconnecter). OA-75: the data and
  // about sections live in Paramètres.
  sections: {
    connection: "Connexion",
  },
  alerts: {
    photo: {
      title: "Photo de profil",
      take: "Prendre une photo",
      pick: "Choisir depuis la galerie",
      remove: "Supprimer la photo",
    },
    passwordReset: {
      title: "Réinitialiser le mot de passe",
      message: (email: string) => `Un email de réinitialisation sera envoyé à ${email}.`,
      emailFallback: "votre adresse email",
      confirm: "Envoyer",
    },
    logout: {
      title: "Se déconnecter",
      message: "Vous serez déconnecté de votre compte.",
      confirm: "Se déconnecter",
    },
  },
  a11y: {
    editPhoto: "Modifier la photo de profil",
    editPhotoHint: "Ouvre les options de photo",
    editEmail: "Modifier l'adresse email",
    resetPassword: "Réinitialiser le mot de passe",
  },
} as const
