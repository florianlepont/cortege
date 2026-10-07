// Filled by plan 01.9-17; no other plan edits this section.
export const settingsFr = {
  // DS-12 (UX audit, Phase 12): the theme picker.
  title: "Paramètres",
  appearance: {
    title: "Apparence",
    subtitle: "Thème clair, sombre ou automatique.",
    automatic: "Automatique",
    light: "Clair",
    dark: "Sombre",
  },
  maps: {
    title: "Cartes",
    offlineRow: "Cartes hors ligne",
    // No area yet: the row says what it is for.
    offlineNone: "Aucune zone",
    offlineSummary: ({ count, megabytes }: { count: number; megabytes: string }) =>
      `${count} ${count > 1 ? "zones" : "zone"} · ${megabytes} Mo`,
  },
  about: {
    title: "À propos",
    version: "Version",
    versionUnknown: "Non renseigné",
    credits: "Crédits photographiques",
  },
  account: {
    deleteWarning:
      "Cette action est irréversible. Votre identité (nom, e-mail, photo de profil) sera supprimée ; vos relevés déjà soumis seront anonymisés et conservés à des fins scientifiques.",
    deleteButton: "Supprimer mon compte",
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
