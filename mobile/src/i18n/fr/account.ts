// Filled by plan 01.9-15; no other plan edits this section.
// Shared words (Annuler, Enregistrer) come from fr.common.
export const accountFr = {
  fallbackName: "Compte",
  initialsFallback: "A",
  noEmail: "Aucun email associé",
  defaultRole: "membre",
  profile: {
    title: "Profil",
    unsaved: "Non sauvegardé",
    saved: "Sauvegardé",
    firstName: "Prénom",
    firstNamePlaceholder: "Florian",
    lastName: "Nom",
    lastNamePlaceholder: "Lepont",
    displayName: "Nom d'affichage",
    displayNamePlaceholder: "ex. F. Lepont",
    saving: "Enregistrement...",
    save: "Enregistrer le profil",
  },
  email: {
    label: "Email",
    empty: "—",
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
    action: "Voir",
    alertTitle: "Crédits photographiques",
    alertMessage:
      "L'identification de genre par photo (section A) utilise un modèle entraîné sur des images de GBIF.org (Global Biodiversity Information Facility), publiées sous licence CC0 1.0 ou CC BY 4.0. Les images CC BY nécessitent de créditer leurs photographes ; voir gbif.org pour le mécanisme d'attribution complet.",
  },
  logout: "Se déconnecter",
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
    credits: "Voir les crédits photographiques",
  },
} as const
