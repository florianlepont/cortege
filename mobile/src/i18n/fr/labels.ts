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
    E: "Tres gros bois vivants",
    F: "Dendromicrohabitats",
    G: "Milieux ouverts floriferes",
    H: "Continuite boisee",
    I: "Milieux aquatiques",
    J: "Milieux rocheux",
  },
  factorHelp: {
    A: "Diversité des essences autochtones. Le relevé compte les genres autochtones observés dans le peuplement, d'après la définition IBP. Score plafonné à 2 si le couvert des essences autochtones est inférieur à 50 %.",
    B: "Structure verticale de la végétation. On compte le nombre de strates occupées (seuil de 20 % de recouvrement).",
    C: "Bois morts sur pied de grosse dimension. On calcule un score avec BMg/BMm ramenes a l'hectare sur la surface decrite.",
    D: "Bois morts au sol de grosse dimension. On calcule un score avec BMg/BMm ramenes a l'hectare sur la surface decrite.",
    E: "Tres gros bois vivants. Le score depend des TGB/GB par hectare sur la surface prospectee.",
    F: "Arbres vivants porteurs de dendromicrohabitats. Le score se base sur le nombre d'arbres porteurs par hectare.",
    G: "Milieux ouverts floriferes. Le score est derive du pourcentage de surface ouverte fleurie dans la zone decrite.",
    H: "Continuite temporelle de l'etat boise. Ce facteur classe la station en recent, partiel ou ancien.",
    I: "Milieux aquatiques. On compte le nombre de types differents presents dans ou en bordure du peuplement.",
    J: "Milieux rocheux. On compte le nombre de types differents presents dans ou en bordure du peuplement.",
  },
  factorInputHints: {
    A: [
      "Compter les genres autochtones distincts (pas les especes), sur arbres vivants (> 50 cm) et arbres morts.",
      "Saisir le nombre de genres observés, puis le couvert des essences autochtones (0 à 100 %).",
      "Seuils IBP : subalpin 0/1/2/3+ => S0/S1/S2/S5 ; autres étages 0-1/2/3-4/5+ => S0/S1/S2/S5 ; plafonné à S2 si couvert autochtone < 50 %.",
    ],
    B: [
      "Compter les strates couvrant au moins 20% de la surface decrite (1 ligneux peut compter dans plusieurs strates).",
      "Saisir le nombre de strates ; le couvert des essences autochtones se saisit au facteur A.",
      "Seuils IBP : 1 strate = S0, 2 = S1, 3-4 = S2, 5 = S5.",
    ],
    C: [
      "Compter les bois morts sur pied >= 1 m: BMg (grosse dimension) et BMm (dimension moyenne), puis la surface en ha.",
      "Renseigner bmg_count, bmm_count, surface_ha (> 0).",
      "Seuils (par ha): BMg<1 et BMm<1=S0 ; BMg<1 et BMm>=1=S1 ; 1<=BMg<3=S2 ; BMg>=3=S5.",
    ],
    D: [
      "Compter les bois morts au sol >= 1 m (BMg/BMm), puis la surface prospectee en ha.",
      "Renseigner bmg_count, bmm_count, surface_ha (> 0).",
      "Seuils (par ha): BMg<1 et BMm<1=S0 ; BMg<1 et BMm>=1=S1 ; 1<=BMg<3=S2 ; BMg>=3=S5.",
    ],
    E: [
      "Compter TGB et GB vivants, puis la surface en ha.",
      "Renseigner tgb_count, gb_count, surface_ha (> 0).",
      "Seuils (par ha): TGB<1 et GB<1=S0 ; TGB<1 et GB>=1=S1 ; 1<=TGB<5=S2 ; TGB>=5=S5.",
    ],
    F: [
      "Compter les arbres vivants porteurs de dendromicrohabitats (typologie IBP, groupes de dmh).",
      "Renseigner trees_per_ha. En protocole detaille, le comptage est plafonne a 2 arbres/ha par groupe de dmh.",
      "Seuils IBP: <2=S0 ; [2,3[=S1 ; [3,8[=S2 ; >=8=S5.",
    ],
    G: [
      "Estimer la part de surface de milieux ouverts floriferes (trouees, lisiere, zones peu denses).",
      "Renseigner open_flowering_percent (0..100).",
      "Seuils IBP : 0 % = S0 ; hors subalpin : ]0,1[ % ou > 5 % = S2, [1,5] % = S5 ; subalpin : ]0,1[ % = S2, >= 1 % = S5. Score 0, 2 ou 5.",
    ],
    H: [
      "Qualifier la continuite boisee: recent / partiel / ancien (cartes et observations de terrain).",
      "Renseigner class_score avec 0 (recent), 2 (partiel) ou 5 (ancien).",
      "Seules les valeurs 0, 2 ou 5 sont acceptées.",
    ],
    I: [
      "Compter les types de milieux aquatiques differents (interieur ou bordure), naturels ou artificiels.",
      "Les milieux temporaires comptent seulement si l eau persiste assez pour une flore/faune specifique.",
      "Renseigner type_count ; seuils: 0 type=S0, 1 type=S2, 2 types et +=S5.",
    ],
    J: [
      "Compter les types de milieux rocheux differents (interieur ou bordure), surface cumulee significative.",
      "Ne pas compter les elements du lit mineur dans ce facteur (ils relevent du contexte aquatique).",
      "Renseigner type_count ; seuils: 0 type=S0, 1 type=S2, 2 types et +=S5.",
    ],
  },
  attachmentPreview: {
    missing: "Photo introuvable sur cet appareil. Supprimez-la ou reprenez la photo.",
    loading: "Photo en cours de chargement…",
    unavailable: "Photo non disponible pour le moment.",
  },
} as const
