// Filled by plan 01.9-22 then 01.9-27; no other plan edits this section.
const plural = (count: number, word: string): string => (count > 1 ? `${word}s` : word)

const activeFilters = (count: number): string =>
  `${count} ${plural(count, "filtre")} ${plural(count, "actif")}`

export const surveyListFr = {
  row: {
    deleteAction: "Supprimer",
    updatedMeta: (date: string) => `· ${date}`,
  },
  a11y: {
    deleteSurvey: (name: string) => `Supprimer le relevé ${name}`,
    openSurvey: ({
      name,
      status,
      updatedAt,
    }: {
      name: string
      status: string
      updatedAt: string
    }) => `${name}, ${status}, mis à jour ${updatedAt}`,
    // HOME-01/LIST: the "+" in the header — Mes Relevés is a pure list now, the create
    // call-to-action moved out of the list body (see the deleted createCard section).
    createSurvey: "Créer un nouveau relevé",
  },
  // HOME-01: a plain large title, not a themed dashboard hero — see ListHero.tsx.
  hero: {
    title: "Mes relevés",
  },
  summary: {
    noLocalSurvey: "Aucun relevé local",
    results: ({ count, query }: { count: number; query: string }) =>
      `${count} ${plural(count, "résultat")} pour « ${query} »`,
    shown: (count: number) => `${count} ${plural(count, "relevé")} ${plural(count, "affiché")}`,
    shownOf: ({ visible, total }: { visible: number; total: number }) =>
      `${visible} sur ${total} relevés affichés`,
    activeFilters,
  },
  filters: {
    title: "Filtres",
    toggle: {
      show: "Afficher les filtres avancés",
      hide: "Masquer les filtres avancés",
      close: "Fermer",
      more: "Plus",
      active: (count: number) => `${count} ${plural(count, "actif")}`,
    },
    search: {
      placeholder: "Rechercher par nom de site",
      clear: "Effacer la recherche",
    },
    sections: {
      status: "Statut",
      from: "Du",
      to: "Au",
      sync: "Synchronisation",
      blocked: "Bloqués",
      attachments: "Pièces jointes",
      sort: "Tri",
    },
    datePlaceholder: "AAAA-MM-JJ",
    reset: "Réinitialiser les filtres",
    // Option labels by filter value.
    options: {
      status: { all: "Tous", draft: "Brouillon", submitted: "Soumis", expired: "Expiré" },
      sync: { all: "Tous", pending: "En attente", synced: "Synchronisé", failed: "Erreur" },
      blocked: { all: "Tous", blocked: "Bloqués", unblocked: "Non bloqués" },
      attachment: { all: "Tous", with: "Avec photo", without: "Sans photo" },
      sort: {
        updated_desc: "Récent en premier",
        updated_asc: "Ancien en premier",
        site_asc: "Site A-Z",
      },
    },
  },
  section: {
    results: "Résultats",
  },
  empty: {
    none: {
      title: "La nature vous attend",
      body: "Commencez votre premier relevé IBP et contribuez à la connaissance de la biodiversité.",
    },
    filtered: {
      title: "Aucun résultat",
      body: "Élargissez les critères ou réinitialisez les filtres pour voir plus de relevés.",
    },
  },
} as const
