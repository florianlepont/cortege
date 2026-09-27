// Filled by plan 01.9-17; no other plan edits this section.
export const settingsFr = {
  account: {
    title: "Compte",
    subtitle: "Gestion de votre compte et de vos données.",
    deleteWarning:
      "Cette action est irréversible. Votre identité (nom, e-mail, photo de profil) sera supprimée ; vos relevés déjà soumis seront anonymisés et conservés à des fins scientifiques.",
    deleteButton: "Supprimer mon compte",
  },
  sync: {
    title: "Synchronisation",
    subtitle: "Rafraîchir l'état local et les données serveur.",
    syncNow: "Synchroniser maintenant",
    advanced: "Avancé",
    pullChanges: "Récupérer les changements serveur",
    refreshLocalList: "Rafraîchir la liste locale",
    refreshAttachments: "Rafraîchir les pièces jointes",
  },
  devTools: {
    title: "Outils développeur",
    badge: "DEV",
    apiUrl: "URL de l'API",
    resetIbpData: "Vider la base IBP",
    resetUserData: "Vider la base utilisateur",
  },
  alerts: {
    resetIbpData: {
      title: "Vider la base IBP",
      message: "Toutes les données IBP locales seront supprimées.",
    },
    resetUserData: {
      title: "Vider la base utilisateur",
      message: "Toutes les données utilisateur locales seront supprimées.",
    },
    empty: "Vider",
  },
} as const
