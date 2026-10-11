// Texts of Phase 28: the basemap swipe mode, the comparison, the overlay bubble, the notices, the
// download card and chip, and the offline layers policy. Layer names are plain French, with none of
// the product codes of the service; the institute's initials appear only in `sources.common`,
// beside its long form (abbreviation gate).
// Source lines were checked on 2026-10-11 against the Géoplateforme records and the capabilities
// document, see 28-RESEARCH.md and 28-02-SUMMARY.md ("Verified records").

// A whole number from 10 Mo, one decimal with a comma below (rounded half up); "0" for nothing.
function megabytes(bytes: number): string {
  if (!(bytes > 0)) return "0"
  if (bytes >= 9_950_000) return String(Math.floor(bytes / 1_000_000 + 0.5))
  const tenths = Math.floor(bytes / 100_000 + 0.5)
  return tenths % 10 === 0 ? String(tenths / 10) : `${Math.floor(tenths / 10)},${tenths % 10}`
}

export const mapLayersFr = {
  basemap: {
    buttonA11y: "Changer de fond de carte",
    buttonHint: "Active le mode de changement de fond : glissez sur la carte",
    buttonActiveValue: "fond modifié",
    done: "Terminé",
    doneA11y: "Terminé : libérer la carte",
    indicatorA11y: ({
      name,
      era,
      index,
      count,
    }: {
      name: string
      era: string
      index: number
      count: number
    }) => `${name}, ${era}, fond ${index} sur ${count}`,
    indicatorHint: "Glissez sur la carte, ou utilisez les actions Fond suivant et Fond précédent",
    actionNext: "Fond suivant",
    actionPrevious: "Fond précédent",
    actionCompareNext: "Comparer avec le fond suivant",
    announceEnter: ({ name, era }: { name: string; era: string }) =>
      `Changement de fond. ${name}, ${era}.`,
    announceChanged: ({ name, era }: { name: string; era: string }) => `${name}, ${era}`,
    hintSwipe: "Glissez · lâchez au milieu pour comparer",
    hintSwipeCompare:
      "Glissez un côté pour changer son fond · tirez la ligne au bord pour quitter la comparaison",
    // Each zone of the swipe has its hint (CONTEXT item 11): cancel, compare, commit.
    hintCancel: "Lâchez pour revenir",
    hintRelease: "Lâchez pour comparer",
    hintChange: "Lâchez pour changer de fond",
    hintNoneAvailable: "Aucun autre fond n'est disponible hors connexion ici.",
    skipped: (count: number) =>
      count > 1
        ? `${count} fonds non téléchargés pour cette zone sont ignorés.`
        : "1 fond non téléchargé pour cette zone est ignoré.",
  },
  layers: {
    map: {
      name: "Plan",
      short: "Plan",
      swipeName: "Plan",
      era: "aujourd'hui",
      source: "Plan : données mises à jour régulièrement par l'IGN.",
    },
    satellite: {
      name: "Satellite",
      short: "Satellite",
      swipeName: "Satellite",
      era: "aujourd'hui",
      source:
        "Satellite : photographies aériennes récentes, millésime variable selon le département.",
    },
    etatMajor: {
      name: "Carte d'état-major (1820-1866)",
      short: "État-major",
      swipeName: "Carte d'état-major",
      era: "1820-1866",
      coverage: "Couvre la France métropolitaine.",
      source: "Carte d'état-major : levés de 1825 à 1866, mises à jour jusqu'en 1889.",
    },
    carte1950: {
      name: "Carte de 1950",
      short: "Carte 1950",
      swipeName: "Carte de 1950",
      era: "vers 1950",
      coverage: "Couvre la France métropolitaine et la plupart des territoires d'outre-mer.",
      source: "Carte de 1950 : cartes au 1 : 50 000, dernière édition disponible vers 1959.",
    },
    photos1950: {
      name: "Photos aériennes (1950-1965)",
      short: "Photos 1950",
      swipeName: "Photos aériennes",
      era: "1950-1965",
      coverage: "Couvre la France métropolitaine et la plupart des territoires d'outre-mer.",
      source: "Photos aériennes : prises de vues de 1950 à 1965, en niveaux de gris.",
    },
    forestTypes: {
      name: "Types de forêt",
      short: "Types de forêt",
      coverage: "Couvre la France métropolitaine.",
      source:
        "Types de forêt : inventaire forestier de 2007 à 2018, millésime variable selon le département, peuplements de 0,5 ha au moins.",
    },
    cadastreSource: "Cadastre : parcellaire en vigueur, mis à jour par l'administration.",
  },
  overlays: {
    buttonA11y: "Superpositions : types de forêt et parcelles",
    buttonHint: "Ouvre les réglages des superpositions",
    buttonActiveValue: "réglages modifiés",
    title: "Superpositions",
    // The transparent layer behind the open bubble: a tap on the map only closes it.
    closeA11y: "Fermer les superpositions",
    forestMeta: "Feuillus, conifères, mélangées",
    forestOffline: "Indisponible hors connexion",
    forestSwitchA11y: "Afficher les types de forêt",
    // The classes of the official legend, in its order: closed forests (broadleaf, conifer, mixed),
    // open forests, poplar plantations, moorland, herbaceous formations.
    legendA11y:
      "Légende des types de forêt : forêts fermées de feuillus, de conifères ou mélangées, forêts ouvertes, peupleraies, landes et formations herbacées",
    // The five colour groups of the legend drawn in the bubble (`forestTypesLegend` in visual-tokens).
    legend: {
      broadleaf: "Feuillus",
      conifer: "Conifères",
      mixed: "Forêts mélangées",
      poplar: "Peupleraies",
      open: "Landes et forêts ouvertes",
    },
    appliesBoth: "S'applique aux deux côtés de la comparaison.",
    parcelsTitle: "Parcelles",
    parcelsAll: "Toutes",
    parcelsWithIbp: "Avec IBP",
    parcelsNone: "Aucune",
    allHelp: "Lignes du cadastre et toutes les parcelles.",
    withIbpHelp: "Seulement les parcelles qui ont un relevé IBP. Pas de lignes du cadastre.",
    noneHelp: "Ni lignes du cadastre ni parcelles. Les parcelles ne sont plus touchables.",
    parcelsGroupA11y: "Parcelles affichées sur la carte",
    allA11y: "Toutes les parcelles et le cadastre",
    withIbpA11y: "Seulement les parcelles avec un relevé IBP, sans le cadastre",
    noneA11y: "Aucune parcelle et pas de cadastre",
  },
  compare: {
    exit: "Quitter la comparaison",
    exitA11yHint: "Revient à un seul fond, celui de gauche",
    hiddenSurveys: "Les relevés sont masqués pendant la comparaison.",
    tagA11y: (name: string) => `${name}`,
    handleA11yLabel: "Séparation de la comparaison",
    handleA11yHint: "Faites glisser, ou balayez vers le haut ou le bas pour la déplacer",
    handleA11yValue: ({ left, right, percent }: { left: string; right: string; percent: number }) =>
      `${left} à gauche, ${right} à droite, séparation à ${percent} %`,
    actionLeftNext: "Fond suivant à gauche",
    actionLeftPrevious: "Fond précédent à gauche",
    actionRightNext: "Fond suivant à droite",
    actionRightPrevious: "Fond précédent à droite",
    announceStart: ({ left, right }: { left: string; right: string }) =>
      `Comparaison : ${left} à gauche, ${right} à droite. Relevés masqués.`,
  },
  sources: {
    common:
      "© Institut national de l'information géographique et forestière (IGN), Géoplateforme, Licence Ouverte. Carte : MapLibre.",
  },
  notice: {
    overzoomBase: "Fond peu détaillé à cette échelle",
    overzoomOverlay: "Superposition peu détaillée à cette échelle",
    outside: (name: string) => `${name} ne couvre pas cette zone.`,
    offlineLayer: (name: string) => `${name} n'est pas téléchargée pour cette zone.`,
    offlineSeveral: "Plusieurs couches ne sont pas téléchargées pour cette zone.",
    loadError: (name: string) => `Impossible d'afficher ${name}.`,
    retry: "Réessayer",
  },
  download: {
    megabytes,
    cardTitle: "Télécharger cette zone",
    estimate: (megabytes: string) => `Environ ${megabytes} Mo pour la zone encadrée en vert`,
    estimateSplit: ({ base, extra }: { base: string; extra: string }) =>
      `Fonds de carte : ${base} Mo. Autres couches : ${extra} Mo.`,
    estimateBaseOnly: "Fonds de carte seulement, réglable dans Paramètres.",
    policyHint: "Réglable dans Paramètres, Cartes.",
    start: "Télécharger",
    startA11y: "Télécharger la zone encadrée en vert",
    closeA11y: "Fermer",
    partial: (names: string) =>
      `Ces couches n'ont pas pu être téléchargées : ${names}. Les fonds de carte fonctionnent hors connexion.`,
    chip: {
      running: (percent: number) => `Téléchargement : ${percent} %`,
      runningA11y: "Téléchargement de la zone",
      announceStarted: "Téléchargement de la zone démarré.",
      done: "Zone disponible hors connexion",
      partial: "Zone enregistrée, sauf certaines couches",
      partialA11y: "Zone enregistrée, sauf certaines couches, toucher pour voir le détail",
      failed: "Téléchargement échoué",
      failedA11y: "Téléchargement échoué, toucher pour réessayer",
    },
  },
  policy: {
    row: "Couches hors ligne",
    valueAll: "Toutes les couches",
    valueBase: "Fonds de carte seulement",
    rowA11y: (value: string) => `Couches hors ligne, ${value}`,
    rowHint: "Ouvre le choix du niveau de téléchargement",
    sheetTitle: "Couches hors ligne",
    sheetMessage:
      "Poids estimé pour une zone de 4 km sur 4 km. Le réglage s'applique aux prochains téléchargements, pas aux zones déjà enregistrées.",
    optionAll: (megabytes: string) => `Toutes les couches · environ ${megabytes} Mo`,
    optionBase: (megabytes: string) => `Fonds de carte seulement · environ ${megabytes} Mo`,
    footer:
      "Fonds de carte seulement garde le plan, le satellite et le cadastre. Toutes les couches ajoute les cartes anciennes, les photos de 1950 et les types de forêt.",
  },
} as const
