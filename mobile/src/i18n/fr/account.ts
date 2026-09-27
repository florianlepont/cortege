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
    // ACC-04: a generic example, not a real member's name.
    firstNamePlaceholder: "ex. Marie",
    lastName: "Nom",
    lastNamePlaceholder: "ex. Dupont",
    displayName: "Nom d'affichage",
    displayNamePlaceholder: "ex. M. Dupont",
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
  logout: "Se déconnecter",
  // ACC-03: the grouped iOS-style list (Profil, Connexion, Données, À propos, Se déconnecter).
  sections: {
    connection: "Connexion",
    data: "Données",
    dataRow: "Synchronisation et données",
    about: "À propos",
    version: "Version",
    versionUnknown: "—",
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
