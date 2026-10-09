// Filled by plan 01.9-22 then 01.9-27; no other plan edits this section.
const plural = (count: number, word: string): string => (count > 1 ? `${word}s` : word)
const totalLabel = (count: number): string => (count > 1 ? "relevés au total" : "relevé au total")
const toFinishLabel = "à terminer"

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
    sectionHeader: ({ title, count }: { title: string; count: number }) => `${title}, ${count}`,
  },
  // OA-53, OA-55: two figures under the title, then the surveys in two sections.
  intro: {
    total: totalLabel,
    toFinish: toFinishLabel,
    // One spoken sentence for the summary card: both figures with their labels.
    summary: ({ total, toFinish }: { total: number; toFinish: number }) =>
      `${total} ${totalLabel(total)}, ${toFinish} ${toFinishLabel}`,
  },
  sections: {
    toFinish: "À terminer",
    finished: "Terminés",
    count: (count: number) => ` · ${count}`,
  },
  // HOME-01: a plain large title, not a themed dashboard hero — see ListHero.tsx.
  hero: {
    title: "Mes relevés",
  },
  // OA-52, OA-54: the search page, one text field, two scopes and a few compact filters.
  search: {
    placeholder: "Rechercher un relevé",
    cancel: "Annuler",
    clear: "Effacer la recherche",
    segments: { mine: "Mes relevés", community: "Communauté" },
    chips: { drafts: "Brouillons", finished: "Terminés", withPhoto: "Avec photo" },
    sort: {
      updated_desc: "Plus récents",
      updated_asc: "Plus anciens",
      site_asc: "Nom A-Z",
    },
    sortA11y: (label: string) => `Tri : ${label}. Toucher pour changer`,
    results: ({ count, query }: { count: number; query: string }) =>
      query.length > 0
        ? `${count} ${plural(count, "résultat")} pour « ${query} »`
        : `${count} ${plural(count, "relevé")}`,
    none: "Aucun relevé ne correspond.",
    communityHint:
      "Dans « Communauté », la recherche porte sur les relevés terminés des autres membres, avec le nom de leur auteur.",
    communityLoading: "Recherche en cours…",
    communityError: "La communauté est injoignable pour le moment. Vérifiez votre connexion.",
    communityNone: "Aucun relevé terminé ne correspond.",
    communityOffline: "La recherche dans la communauté demande une connexion.",
  },
  community: {
    unknownAuthor: "un ancien membre",
    meta: ({ author, date }: { author: string; date: string }) =>
      `par ${author} · Terminé le ${date}`,
    a11y: ({ name, author, score }: { name: string; author: string; score: number }) =>
      `${name}, ${author}, score ${score} sur 50`,
  },
  section: {
    results: "Résultats",
  },
  empty: {
    none: {
      title: "La nature vous attend",
      body: "Commencez votre premier relevé IBP et contribuez à la connaissance de la biodiversité.",
    },
  },
} as const
