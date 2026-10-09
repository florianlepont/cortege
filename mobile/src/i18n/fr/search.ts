// The global search page (phase 25, D-11): every text of the page. Written from the UI-SPEC
// Copywriting Contract with two adjustments:
//   1. Count arguments are destructured (`{ count }`) so the catalogue test's Proxy passes a
//      number to them.
//   2. `rows.parcelMeta` takes `commune: string | null` and `surveyCount: number | null`: the
//      cadastre can miss the commune name, in which case the row reads "Commune {code}"; the
//      survey suffix only appears when a count is known.
// No em dash; the middle dot separates parts of a line.

const plural = (count: number, one: string, many: string) => (count > 1 ? many : one)

export const searchFr = {
  field: {
    placeholder: "Relevé, lieu, parcelle, membre",
    a11yLabel: "Rechercher",
    a11yHint: "Cherche dans vos relevés, la communauté, les lieux et les parcelles",
    clear: "Effacer la recherche",
    busy: "Recherche en cours",
  },
  groups: {
    mine: "Mes relevés",
    community: "Communauté",
    places: "Lieux",
    parcels: "Parcelles",
  },
  best: {
    title: "Meilleur résultat",
    openOnMap: "Voir sur la carte",
    a11y: ({ title, meta }: { title: string; meta: string }) =>
      `Meilleur résultat : ${title}, ${meta}`,
  },
  seeAll: ({ count, capped }: { count: number; capped: boolean }) =>
    `Voir les ${count}${capped ? "+" : ""}`,
  seeAllA11y: ({ group, count }: { group: string; count: number }) =>
    `Voir les ${count} résultats : ${group}`,
  rows: {
    placeKind: {
      municipality: "Commune",
      locality: "Lieu-dit",
      street: "Rue",
      address: "Adresse",
      other: "Lieu",
    },
    placeMeta: ({ kind, context }: { kind: string; context: string | null }) =>
      context ? `${kind} · ${context}` : kind,
    placeA11y: ({ name, meta }: { name: string; meta: string }) => `Lieu : ${name}, ${meta}`,
    parcelTitle: ({ section, number }: { section: string; number: string }) =>
      `Parcelle ${section} ${number}`,
    parcelMeta: ({
      commune,
      code,
      surveyCount,
    }: {
      commune: string | null
      code: string
      surveyCount: number | null
    }) => {
      const place = commune ? `${commune} (${code})` : `Commune ${code}`
      return surveyCount === null
        ? place
        : `${place} · ${surveyCount} ${plural(surveyCount, "relevé", "relevés")}`
    },
    parcelA11y: ({ title, meta }: { title: string; meta: string }) => `${title}, ${meta}`,
    memberMeta: ({ count }: { count: number }) =>
      `${count} ${plural(count, "relevé terminé", "relevés terminés")}`,
    memberA11y: ({ name, meta }: { name: string; meta: string }) => `Membre : ${name}, ${meta}`,
  },
  start: {
    recentTitle: "Recherches récentes",
    recentClear: "Effacer",
    recentClearA11y: "Effacer les recherches récentes",
    recentOpenA11y: (query: string) => `Chercher « ${query} »`,
    recentRemoveA11y: (query: string) => `Retirer « ${query} » des recherches récentes`,
    introTitle: "Que cherchez-vous ?",
    introBody:
      "Un de vos relevés, un relevé de la communauté, un lieu ou une adresse, un numéro de parcelle, ou un membre.",
  },
  noResult: {
    title: (query: string) => `Aucun résultat pour « ${query} »`,
    body: "Vérifiez l'orthographe, ou essayez un lieu, un numéro de parcelle ou le nom d'un membre.",
    offlineTitle: (query: string) => `Aucun de vos relevés ne correspond à « ${query} »`,
    offlineBody:
      "Les relevés de la communauté, les lieux et les parcelles demandent une connexion.",
  },
  offline: {
    community: "Connexion nécessaire pour chercher dans la communauté.",
    places: "Connexion nécessaire pour chercher un lieu.",
    parcels: "Connexion nécessaire pour chercher une parcelle.",
  },
  error: {
    community: "La recherche dans la communauté ne répond pas.",
    places: "La recherche de lieux ne répond pas.",
    parcels: "La recherche de parcelles ne répond pas.",
    rateLimited: "Trop de recherches à la suite. Réessayez dans un instant.",
    retry: "Réessayer",
    retryA11y: (group: string) => `Réessayer la recherche : ${group}`,
  },
  loading: "Recherche en cours…",
  announce: {
    results: ({ count }: { count: number }) => `${count} ${plural(count, "résultat", "résultats")}`,
    none: "Aucun résultat",
  },
  list: {
    title: ({ group, count }: { group: string; count: number }) => `${group} · ${count}`,
    caption: (query: string) => `Pour « ${query} »`,
    memberCaption: (name: string) => `Relevés de ${name}`,
    backLabel: "Rechercher",
  },
} as const
