import { IBP_MAX } from "@cortege/ibp-domain"

// Texts printed in the on-device PDF export (REQ-C-pdf-export, ROADMAP Phases 10 and 25.1). The HTML
// is rendered by expo-print, never shown as an app screen, so it has its own catalogue section
// rather than reusing survey-detail's (written for on-screen labels). Every word the PDF prints
// comes from here (D-08 of phase 25.1) and the section follows the same no em dash rule as the rest
// of the catalogue. Functions only interpolate: numbers arrive under count-like keys (`count`,
// `total`) and drive a plural; every other argument is a string formatted by the caller.

const SCALE_B = "1 strate = 0 ; 2 strates = 1 ; 3 ou 4 strates = 2 ; 5 strates = 5."
const SCALE_F =
  "Moins de 2 arbres/ha = 0 ; de 2 à moins de 3 = 1 ; de 3 à moins de 8 = 2 ; 8 arbres/ha et plus = 5 (au plus 2 arbres/ha par groupe)."
const SCALE_H =
  "Forêt récente = 0 ; état boisé partiellement continu, ou continu mais reboisé avec travail du sol en plein = 2 ; forêt ancienne = 5."
const SCALE_TYPES = "Aucun type = 0 ; 1 type = 2 ; 2 types et plus = 5."
const SCALE_C_V32 =
  "BMg < 1/ha et BMg + BMm < 1/ha = 0 ; BMg < 1/ha et BMg + BMm ≥ 1/ha = 1 ; 1/ha ≤ BMg < 3/ha = 2 ; BMg ≥ 3/ha = 5."
const SCALE_C_V30 =
  "BMg < 1/ha et BMm < 1/ha = 0 ; BMg < 1/ha et BMm ≥ 1/ha = 1 ; 1/ha ≤ BMg < 3/ha = 2 ; BMg ≥ 3/ha = 5."

export const surveyExportFr = {
  documentTitle: (siteName: string) => `Relevé IBP : ${siteName}`,
  sheetTitle: "Relevé IBP",
  sheetSubtitle: "Indice de Biodiversité Potentielle",
  appName: "Cortège",
  progress: "Préparation du PDF…",
  identity: {
    heading: "Identification du relevé",
    site: "Site",
    parcels: "Parcelle(s) cadastrale(s)",
    noParcel: "Non renseignée",
    observationYear: "Année d'observation",
    versionNumber: "Version du relevé",
    date: "Date",
    method: "Méthode IBP",
    unknown: "Non renseigné",
    observer: "Observateur",
    coordinates: "Coordonnées",
    coordinatesValue: ({ lat, lng }: { lat: string; lng: string }) => `${lat}, ${lng} (WGS 84)`,
    commune: "Commune (code INSEE)",
    department: "Département",
    surveyMode: "Mode de relevé",
    cappedMode: "Relevé plafonné, aucun facteur déplafonné",
  },
  method: {
    heading: "Critères de diagnostic",
    version: "Version IBP",
    cas: "Cas",
    cas3Scale: "Échelle des facteurs A et G",
    region: "Région",
    stage: "Étage de végétation",
  },
  scores: {
    title: "Score IBP",
    total: (points: number) => `${points} / ${IBP_MAX.total}`,
    stand: (points: number) => `Peuplement et gestion : ${points} / ${IBP_MAX.stand}`,
    context: (points: number) => `Contexte : ${points} / ${IBP_MAX.context}`,
    factorHeader: "Facteur",
    classHeader: "Classe",
    notFilled: "Non renseigné",
    totalHeading: "Total IBP",
    standHeading: "Peuplement et gestion forestière",
    contextHeading: "Contexte",
    outOf: ({ points, max }: { points: string; max: string }) => `${points} / ${max}`,
    band: ({ band }: { band: string }) => `Niveau ${band}`,
    provisional: ({ count }: { count: number }) =>
      `Score provisoire : ${count} ${count === 1 ? "facteur non renseigné" : "facteurs non renseignés"}`,
    chartHeading: "Score par facteur",
    chartA11y: "Diagramme des points des dix facteurs, de A à J",
  },
  factors: {
    standGroup: "Facteurs liés au peuplement et à la gestion forestière",
    contextGroup: "Facteurs liés au contexte",
    observed: "Relevé",
    retainedClass: "Classe retenue",
    pointsOutOfFive: ({ points }: { points: string }) => `${points} / 5`,
    scale: "Barème",
    missing: "Facteur non renseigné",
    genera: "Genres autochtones relevés",
    generaNone: "Aucun genre saisi",
    genusCount: ({ count }: { count: number }) =>
      count === 1 ? `${count} genre compté` : `${count} genres comptés`,
    genusNotCounted: "non compté pour ce cas",
    legacyGenusCount: ({ count }: { count: number }) =>
      `${count} ${count === 1 ? "genre" : "genres"} (saisie antérieure, sans la liste)`,
    nativeCover: "Couvert des essences autochtones",
    coverCapped: "Score plafonné à 2 : couvert des essences autochtones inférieur à 50 %",
    percent: ({ value }: { value: string }) => `${value} %`,
    strataCount: "Nombre de strates",
    strata: "Strates présentes",
    bmg: "Bois morts de grosse dimension (BMg)",
    bmm: "Bois morts de dimension moyenne (BMm)",
    tgb: "Très gros bois (TGB)",
    gb: "Gros bois (GB)",
    surface: "Surface décrite",
    surfaceValue: ({ value }: { value: string }) => `${value} ha`,
    countPerHa: ({ value, perHa }: { value: string; perHa: string }) => `${value} (${perHa} / ha)`,
    treesPerHa: "Arbres porteurs de dendromicrohabitats",
    treesPerHaValue: ({ value }: { value: string }) => `${value} arbres / ha`,
    dmhGroups: "Groupes de dendromicrohabitats observés",
    openFlowering: "Milieux ouverts florifères",
    continuity: "Continuité de l'état boisé",
    evidence: "Sources",
    typeCount: "Nombre de types",
    aquaticTypes: "Types de milieux aquatiques",
    rockyTypes: "Types de milieux rocheux",
  },
  // The "Score =" column of the CNPF sheet (v3.2) and the on-screen hints (v3.0), as display text.
  // The retained class and points printed next to them always come from the domain result.
  scaleLines: {
    v3_2: {
      A: "Cas 1, 2 et 4 : 0 ou 1 genre = 0 ; 2 genres = 1 ; 3 ou 4 genres = 2 ; 5 genres et plus = 5. Cas 3 : 0 genre = 0 ; 1 genre = 1 ; 2 genres = 2 ; 3 genres et plus = 5. Score plafonné à 2 si le couvert des essences autochtones est inférieur à 50 %.",
      B: SCALE_B,
      C: SCALE_C_V32,
      D: SCALE_C_V32,
      E: "TGB < 1/ha et GB + TGB < 1/ha = 0 ; TGB < 1/ha et GB + TGB ≥ 1/ha = 1 ; 1/ha ≤ TGB < 5/ha = 2 ; TGB ≥ 5/ha = 5.",
      F: SCALE_F,
      G: "Cas 1, 2 et 4 : 0 % = 0 ; moins de 1 % ou plus de 5 % = 2 ; de 1 à 5 % = 5. Cas 3 : 0 % = 0 ; moins de 1 % = 2 ; 1 % et plus = 5.",
      H: SCALE_H,
      I: SCALE_TYPES,
      J: SCALE_TYPES,
    },
    v3_0: {
      A: "Étage subalpin : 0 genre = 0 ; 1 genre = 1 ; 2 genres = 2 ; 3 genres et plus = 5. Autres étages : 0 ou 1 genre = 0 ; 2 genres = 1 ; 3 ou 4 genres = 2 ; 5 genres et plus = 5. Score plafonné à 2 si le couvert des essences autochtones est inférieur à 50 %.",
      B: SCALE_B,
      C: SCALE_C_V30,
      D: SCALE_C_V30,
      E: "TGB < 1/ha et GB < 1/ha = 0 ; TGB < 1/ha et GB ≥ 1/ha = 1 ; 1/ha ≤ TGB < 5/ha = 2 ; TGB ≥ 5/ha = 5.",
      F: SCALE_F,
      G: "Hors étage subalpin : 0 % = 0 ; moins de 1 % ou plus de 5 % = 2 ; de 1 à 5 % = 5. Étage subalpin : 0 % = 0 ; moins de 1 % = 2 ; 1 % et plus = 5.",
      H: SCALE_H,
      I: SCALE_TYPES,
      J: SCALE_TYPES,
    },
  },
  draft: {
    banner: "Brouillon, non soumis",
    watermark: "Brouillon",
  },
  map: {
    heading: "Localisation",
    source: "Fond de carte : IGN",
    north: "N",
    scaleValue: ({ metres }: { metres: string }) => `${metres} m`,
    scaleKm: ({ km }: { km: string }) => `${km} km`,
    parcels: "Parcelles",
    outlineOnly: "Fond de carte non disponible sur cet appareil : contour des parcelles seul.",
    noOutline: "Contour des parcelles non disponible sur cet appareil.",
    noParcel: "Aucune parcelle liée à ce relevé.",
  },
  trend: {
    heading: "Évolution de la parcelle",
    cachedAt: ({ date }: { date: string }) => `Historique enregistré sur l'appareil le ${date}.`,
    unavailable:
      "Historique de la parcelle non disponible sur cet appareil : ouvrez le relevé une fois connecté pour l'enregistrer.",
    noParcel: "Aucune parcelle liée à ce relevé : pas d'historique.",
    first: "Premier relevé de cette parcelle : pas encore d'évolution à montrer.",
    deltaHeading: ({ year }: { year: string }) => `Évolution par facteur depuis ${year}`,
    deltaHeadingNoYear: "Évolution par facteur depuis le relevé précédent",
    differentMethod: "Le relevé précédent suit une autre méthode : pas de comparaison par facteur.",
    curveA11y: "Courbe des totaux IBP des relevés de la parcelle",
  },
  photos: {
    heading: "Photos",
    caption: ({ index, total }: { index: string; total: number }) => `Photo ${index} sur ${total}`,
    capped: ({ shown, total }: { shown: string; total: number }) =>
      `${shown} photos sur ${total} sont reproduites.`,
    unavailable: ({ count }: { count: number }) =>
      count === 1
        ? `${count} photo n'est pas disponible sur cet appareil.`
        : `${count} photos ne sont pas disponibles sur cet appareil.`,
  },
  page: {
    number: ({ index, total }: { index: string; total: number }) => `Page ${index} / ${total}`,
    generatedAt: ({ date }: { date: string }) => `Généré le ${date}`,
  },
  file: {
    prefix: "Cortege-IBP",
    draftSuffix: "brouillon",
    fallbackSite: "releve",
  },
  footer: (generatedAt: string) => `Généré le ${generatedAt} par l'application Cortège.`,
  shareDialogTitle: (siteName: string) => `Partager le relevé ${siteName}`,
} as const
