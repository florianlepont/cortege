// Filled by plan 01.9-17; no other plan edits this section.
// Domain labels shown on several screens (regions, vegetation stages, factor
// titles and help, photo preview states). Keys are the stored values, which
// never change with the language.
export const labelsFr = {
  regions: {
    ACA: "Régions atlantique, continentale et alpine",
    M: "Méditerranéenne",
  },
  vegetationStages: {
    planitiaire: "Planitiaire",
    collineen: "Collinéen",
    montagnard: "Montagnard",
    subalpin: "Subalpin",
    thermo_mediterraneen: "Thermo-méditerranéen",
    meso_mediterraneen: "Méso-méditerranéen",
    supra_mediterraneen: "Supra-méditerranéen",
  },
  factorTitles: {
    A: "Essences autochtones",
    B: "Structure verticale",
    C: "Bois morts sur pied",
    D: "Bois morts au sol",
    E: "Très gros bois vivants",
    F: "Dendromicrohabitats",
    G: "Milieux ouverts florifères",
    H: "Continuité boisée",
    I: "Milieux aquatiques",
    J: "Milieux rocheux",
  },
  factorHelp: {
    A: "Diversité des essences autochtones. Le relevé compte les genres autochtones observés dans le peuplement, d'après la définition IBP. Score plafonné à 2 si le couvert des essences autochtones est inférieur à 50 %.",
    B: "Structure verticale de la végétation. On compte le nombre de strates occupées (seuil de 20 % de recouvrement).",
    C: "Bois morts sur pied. On calcule un score avec le nombre par hectare de bois morts de grosse dimension (BMg) et de bois morts de dimension moyenne (BMm) sur la surface décrite.",
    D: "Bois morts au sol. On calcule un score avec le nombre par hectare de bois morts de grosse dimension (BMg) et de bois morts de dimension moyenne (BMm) sur la surface décrite.",
    E: "Arbres vivants de très grand diamètre. Le score dépend du nombre par hectare de très gros bois (TGB) et de gros bois (GB) sur la surface prospectée.",
    F: "Arbres vivants porteurs de dendromicrohabitats. Le score se base sur le nombre d'arbres porteurs par hectare.",
    G: "Milieux ouverts florifères. Le score est dérivé du pourcentage de surface ouverte fleurie dans la zone décrite.",
    H: "Continuité temporelle de l'état boisé. Ce facteur classe la station en récent, partiel ou ancien.",
    I: "Milieux aquatiques. On compte le nombre de types différents présents dans ou en bordure du peuplement.",
    J: "Milieux rocheux. On compte le nombre de types différents présents dans ou en bordure du peuplement.",
  },
  factorInputHints: {
    A: [
      "Compter les genres autochtones distincts (pas les espèces), sur arbres vivants (> 50 cm) et arbres morts.",
      "Saisir le nombre de genres observés, puis le couvert des essences autochtones (0 à 100 %).",
      "Seuils IBP : étage subalpin : 0 genre = 0 ; 1 genre = 1 ; 2 genres = 2 ; 3 genres et plus = 5 ; autres étages : 0 ou 1 genre = 0 ; 2 genres = 1 ; 3 ou 4 genres = 2 ; 5 genres et plus = 5 ; plafonné à 2 points si couvert autochtone < 50 %.",
    ],
    B: [
      "Compter les strates couvrant au moins 20% de la surface décrite (1 ligneux peut compter dans plusieurs strates).",
      "Saisir le nombre de strates ; le couvert des essences autochtones se saisit au facteur A.",
      "Seuils IBP : 1 strate = 0, 2 = 1, 3-4 = 2, 5 = 5.",
    ],
    C: [
      "Compter les bois morts sur pied >= 1 m : bois morts de grosse dimension (BMg) et bois morts de dimension moyenne (BMm), puis la surface en ha.",
      "Renseignez le nombre de bois morts de grosse dimension, de dimension moyenne et la surface décrite (plus de 0 ha).",
      "Seuils (par ha) : BMg < 1 et BMm < 1 = 0 ; BMg < 1 et BMm >= 1 = 1 ; 1 <= BMg < 3 = 2 ; BMg >= 3 = 5.",
    ],
    D: [
      "Compter les bois morts au sol >= 1 m (grosse dimension et dimension moyenne), puis la surface prospectée en ha.",
      "Renseignez le nombre de bois morts de grosse dimension, de dimension moyenne et la surface décrite (plus de 0 ha).",
      "Seuils (par ha) : BMg < 1 et BMm < 1 = 0 ; BMg < 1 et BMm >= 1 = 1 ; 1 <= BMg < 3 = 2 ; BMg >= 3 = 5.",
    ],
    E: [
      "Compter les très gros bois (TGB) et les gros bois (GB) vivants, puis la surface en ha.",
      "Renseignez le nombre de très gros bois, de gros bois et la surface décrite (plus de 0 ha).",
      "Seuils (par ha) : TGB < 1 et GB < 1 = 0 ; TGB < 1 et GB >= 1 = 1 ; 1 <= TGB < 5 = 2 ; TGB >= 5 = 5.",
    ],
    F: [
      "Compter les arbres vivants porteurs de dendromicrohabitats (typologie IBP, groupes de dendromicrohabitats).",
      "Renseignez le nombre d'arbres par hectare. Pour le score, l'app garde au plus 2 arbres par hectare et par groupe de dendromicrohabitats.",
      "Seuils IBP : < 2 = 0 ; [2,3[ = 1 ; [3,8[ = 2 ; >= 8 = 5.",
    ],
    G: [
      "Estimer la part de surface de milieux ouverts florifères (trouées, lisière, zones peu denses).",
      "Renseignez la part de milieux ouverts fleuris, de 0 à 100 %.",
      "Seuils IBP : 0 % = 0 ; hors subalpin : ]0,1[ % ou > 5 % = 2, [1,5] % = 5 ; subalpin : ]0,1[ % = 2, >= 1 % = 5. Score 0, 2 ou 5.",
    ],
    H: [
      "Qualifier la continuité boisée : récent, partiel ou ancien (cartes et observations de terrain).",
      "Choisissez la classe : 0 (récent), 2 (partiel) ou 5 (ancien).",
      "Seules les valeurs 0, 2 ou 5 sont acceptées.",
    ],
    I: [
      "Compter les types de milieux aquatiques différents (intérieur ou bordure), naturels ou artificiels.",
      "Les milieux temporaires comptent seulement si l'eau persiste assez pour une flore ou une faune spécifique.",
      "Renseignez le nombre de types ; seuils : 0 type = 0, 1 type = 2, 2 types et plus = 5.",
    ],
    J: [
      "Compter les types de milieux rocheux différents (intérieur ou bordure), surface cumulée significative.",
      "Ne pas compter les éléments du lit mineur dans ce facteur (ils relèvent du contexte aquatique).",
      "Renseignez le nombre de types ; seuils : 0 type = 0, 1 type = 2, 2 types et plus = 5.",
    ],
  },
  attachmentPreview: {
    missing: "Photo introuvable sur cet appareil. Supprimez-la ou reprenez la photo.",
    loading: "Photo en cours de chargement…",
    unavailable: "Photo non disponible pour le moment.",
  },
} as const
