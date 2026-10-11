// The texts of the abbreviation registry (D-04): one entry per abbreviation that the app writes out
// or explains, shared by every screen and by the PDF. The policy (allowlist, info, written-out,
// dev-only) lives in the gate `src/__checks__/abbreviations.test.ts` (D-05, D-11).
export const abbreviationsFr = {
  terms: {
    IBP: {
      long: "Indice de Biodiversité Potentielle",
      explanation:
        "Un score sur 50 qui estime à quel point une forêt peut accueillir une biodiversité riche. Il additionne dix facteurs observés sur le terrain, sept sur le peuplement et sa gestion (sur 35) et trois sur le contexte (sur 15).",
    },
    BMg: {
      long: "bois morts de grosse dimension",
      explanation:
        "Arbres morts, debout ou au sol, de gros diamètre. Les classes de diamètre dépendent du cas de la méthode.",
    },
    BMm: {
      long: "bois morts de dimension moyenne",
      explanation:
        "Arbres morts, debout ou au sol, de diamètre moyen. Les classes de diamètre dépendent du cas de la méthode.",
    },
    TGB: {
      long: "très gros bois",
      explanation:
        "Les plus gros arbres vivants du peuplement. Le seuil de diamètre dépend du cas de la méthode.",
    },
    GB: {
      long: "gros bois",
      explanation:
        "Les arbres vivants de gros diamètre. Le seuil de diamètre dépend du cas de la méthode.",
    },
    IGN: {
      long: "Institut national de l'information géographique et forestière",
      explanation: "L'organisme public qui produit les cartes et le cadastre utilisés par l'app.",
    },
    GBIF: {
      long: "Global Biodiversity Information Facility",
      explanation:
        "Un réseau international qui rassemble des observations d'espèces en libre accès.",
    },
    CC0: {
      long: "Creative Commons",
      explanation:
        "Une licence qui place l'image dans le domaine public, sans condition de réutilisation.",
    },
    "CC BY": {
      long: "Creative Commons",
      explanation:
        "Une licence qui autorise la réutilisation de l'image à condition d'en citer l'auteur.",
    },
    "WGS 84": {
      long: "système géodésique mondial",
      explanation:
        "Le système de coordonnées utilisé par les GPS pour situer un point sur la Terre.",
    },
  },
  sheet: {
    open: ({ term }: { term: string }) => `Que signifie ${term} ?`,
    close: "Fermer",
  },
} as const

export type AbbreviationTerm = keyof typeof abbreviationsFr.terms
