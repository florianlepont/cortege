import { IBP_METHOD_V3_0, IBP_METHOD_V3_2 } from "@cortege/ibp-domain"

// Filled by plan 01.8-10 (D-02, D-08, D-09, CH-8): the IBP method version, the v3.2 cas and the
// v3.2 factor help. The v3.0 help stays in labels.ts (factorHelp / factorInputHints). Per-cas
// texts are static strings, never functions (the catalogue test renders every function leaf).
export const ibpMethodFr = {
  versionTitle: "Méthode IBP",
  // Keyed by the stored method version tag, which never changes with the language.
  versions: {
    [IBP_METHOD_V3_2]: "IBP v3.2 (2026)",
    [IBP_METHOD_V3_0]: "IBP v3.0 (ancienne méthode)",
  },
  versionHint: "v3.0 : pour refaire un relevé avec la même méthode qu'un relevé précédent",
  versionLockedHint: "La méthode ne change plus une fois le relevé soumis.",
  legacyVersionLabel: "IBP v3.0 (relevé antérieur au choix de la méthode)",
  casTitle: "Cas IBP (contraintes de croissance)",
  casLabels: {
    1: "Cas 1",
    2: "Cas 2",
    3: "Cas 3",
    4: "Cas 4",
  },
  casCaptions: {
    1: "Pas de forte contrainte de croissance : la plupart des forêts tempérées.",
    2: "Station très peu fertile : sol très pauvre, très superficiel, très sec ou engorgé.",
    3: "Subalpin moyen et supérieur, ou contraintes climatiques équivalentes.",
    4: "Méditerranéen thermo et méso, hors zones fraîches ou humides.",
  },
  cas3ScaleLabel: "Échelle du cas 3 pour A et G",
  cas3ScaleHint: "cas 2 en zone de cas 3, ou lapiaz, dune, tourbière, genévrier thurifère",
  switchToV32: "Passer en IBP v3.2",
  switchToV32Hint:
    "Le couvert autochtone passe au facteur A et le cas est proposé d'après la région et l'étage : vérifiez-le.",
  nativeCoverField: "Couvert des essences autochtones (%)",
  factorHelp: {
    A: "Diversité des essences autochtones. On compte les genres d'arbres autochtones du peuplement décrit. Score plafonné à 2 si le couvert de l'ensemble des essences autochtones est inférieur à 50 %.",
    B: "Structure verticale de la végétation. On compte les strates couvrant au moins 20 % de la surface décrite ; les mousses ne comptent pas.",
    C: "Bois morts sur pied de grosse dimension (au moins 1 m de haut). Le score dépend des BMg et BMm par hectare sur la surface décrite.",
    D: "Bois morts au sol de grosse dimension (au moins 1 m de long). Le score dépend des BMg et BMm par hectare sur la surface décrite.",
    E: "Très gros bois vivants. Le score dépend des TGB et GB par hectare sur la surface décrite.",
    F: "Arbres vivants porteurs de dendromicrohabitats. Le score se base sur le nombre d'arbres porteurs par hectare.",
    G: "Milieux ouverts florifères : trouées, lisières (largeur forfaitaire de 2 m) et zones peu denses. La végétation fleurie des strates intermédiaire et haute ne compte pas.",
    H: "Continuité temporelle de l'état boisé : récent, partiel ou ancien, d'après la carte d'état-major, les documents plus récents et les indices de terrain.",
    I: "Milieux aquatiques. On compte les types différents présents dans le peuplement ou en bordure (11 types, dont « Mer ou océan »).",
    J: "Milieux rocheux. On compte les types différents présents dans le peuplement ou en bordure (12 types), sur une surface cumulée de plus de 20 m².",
  },
  factorInputHints: {
    A: [
      "Compter les genres autochtones distincts (pas les espèces), sur arbres vivants de plus de 50 cm et arbres morts ; chênes caducifoliés et chênes sempervirents comptent pour deux.",
      "Arbres seulement : les arbustes d'un genre de la liste ne comptent pas. En cas 2 et 4, des genres méditerranéens s'ajoutent (Ceratonia, Cercis, Olea, Phillyrea, Pistacia).",
      "Seuils : cas 1, 2 et 4 : 0-1/2/3-4/5+ genres => S0/S1/S2/S5 ; cas 3 ou échelle du cas 3 : 0/1/2/3+ => S0/S1/S2/S5 ; plafonné à S2 si couvert autochtone < 50 %.",
    ],
    B: [
      "Compter les strates couvrant au moins 20 % de la surface décrite ; un même ligneux peut compter dans plusieurs strates.",
      "Strates ligneuses, cas 1 : très basse < 1,5 m, basse 1,5-7 m, intermédiaire 7-18 m, haute > 18 m ; cas 2, 3 et 4 : < 1,5 m, 1,5-5 m, 5-12 m, > 12 m.",
      "Seuils : 1 strate = S0, 2 = S1, 3-4 = S2, 5 = S5.",
    ],
    C: [
      "Diamètre à 1,3 m (à 1 m pour une chandelle de 1 à 1,3 m). Cas 1 : BMg > 37,5 cm, BMm 17,5-37,5 cm ; cas 3 et 4 : BMg > 27,5 cm, BMm 17,5-27,5 cm ; cas 2 et essences à croissance lente : BMg > 17,5 cm, BMm 7,5-17,5 cm.",
      "Croissance lente : érable de Montpellier, aulne blanchâtre, arbousier, pommier, merisier à grappes, poirier, sorbiers sauf alisier torminal et cormier. Les morceaux d'un même arbre comptent une fois.",
      "Seuils (par ha) : BMg < 1 et BMg+BMm < 1 = S0 ; BMg < 1 et BMg+BMm >= 1 = S1 ; 1 <= BMg < 3 = S2 ; BMg >= 3 = S5.",
    ],
    D: [
      "Diamètre à 1 m du gros bout. Cas 1 : BMg > 37,5 cm, BMm 17,5-37,5 cm ; cas 3 et 4 : BMg > 27,5 cm, BMm 17,5-27,5 cm ; cas 2 et essences à croissance lente : BMg > 17,5 cm, BMm 7,5-17,5 cm.",
      "Un arbre mort penché dont les branches touchent le sol compte au sol ; les arbres fraîchement abattus en attente d'enlèvement ne comptent pas.",
      "Seuils (par ha) : BMg < 1 et BMg+BMm < 1 = S0 ; BMg < 1 et BMg+BMm >= 1 = S1 ; 1 <= BMg < 3 = S2 ; BMg >= 3 = S5.",
    ],
    E: [
      "Diamètre à 1,3 m côté amont. Cas 1 : TGB > 67,5 cm, GB 47,5-67,5 cm ; cas 3 et 4 : TGB > 57,5 cm, GB 37,5-57,5 cm ; cas 2 et essences à croissance lente : TGB > 37,5 cm, GB 17,5-37,5 cm.",
      "En forêt, les tiges fourchues sous 1,3 m comptent à part ; un arbre de verger compte une fois.",
      "Seuils (par ha) : TGB < 1 et GB+TGB < 1 = S0 ; TGB < 1 et GB+TGB >= 1 = S1 ; 1 <= TGB < 5 = S2 ; TGB >= 5 = S5.",
    ],
    F: [
      "Au plus 2 arbres/ha par groupe de dendromicrohabitats (15 groupes) ; un arbre de verger compte une fois, quel que soit son nombre de tiges.",
      "Groupe 12 : mousses, lichens, lierre, lianes ou fougères (plus de 5 frondes) sur plus de 20 % du tronc, ou gui. Groupe 15 : écoulement de sève ou de résine, frais ou ancien, sur plus de 20 cm.",
      "Groupe 6 : cassure au tronc de plus de 300 cm² (y compris une branche coupée au ras) ; groupe 7 : chicot de plus de 50 cm de long et 20 cm de diamètre, entièrement mort. Seuils : < 2 = S0 ; [2,3[ = S1 ; [3,8[ = S2 ; >= 8 = S5.",
    ],
    G: [
      "Estimer la part de la surface décrite occupée par des milieux ouverts fleuris (0 à 100 %).",
      "Cas 1, 2 et 4 : 0 % = S0 ; moins de 1 % ou plus de 5 % = S2 ; 1 à 5 % = S5.",
      "Cas 3 ou échelle du cas 3 : 0 % = S0 ; moins de 1 % = S2 ; 1 % et plus = S5. Score 0, 2 ou 5.",
    ],
    H: [
      "Saisir 0 (récent), 2 (partiel, ou reboisé après travail du sol sur toute la surface) ou 5 (ancien).",
      "Il fallait au moins 10 % de couvert arboré à la date de référence pour compter comme forêt ; sinon la forêt est récente (0).",
      "Une forêt ancienne fortement pâturée passe à 2 ; un verger (châtaignier, caroubier, noyer, olivier) pâturé ou travaillé sur presque toute la surface aussi.",
    ],
    I: [
      "Types : source ou suintement, rigole ou fossé < 1 m, ruisseau 1-8 m, rivière > 8 m, bras mort, lac, étang ou lagune, mare, tourbière, marais, mer ou océan.",
      "L'eau temporaire compte si elle persiste au-delà des crues ; les ornières en eau ne comptent pas.",
      "Seuils : 0 type = S0, 1 type = S2, 2 types et plus = S5.",
    ],
    J: [
      "Types : falaise plus haute que les arbres adultes, paroi plus basse, dalle, lapiaz ou diaclase, grotte, amas de blocs stable, banc de galets, éboulis instable, chaos de blocs > 2 m, gros blocs (> 20 cm) ou affleurements, dépôt fin peu végétalisé, berge ou talus meuble vertical.",
      "Les roches du lit mineur ne comptent pas ici (elles relèvent des milieux aquatiques).",
      "Seuils : 0 type = S0, 1 type = S2, 2 types et plus = S5.",
    ],
  },
} as const
