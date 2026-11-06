import type { DmhGroupCode } from "@cortege/ibp-domain"

// Phase 32 (plan 32-10, D-07): every text of the dendromicrohabitat guide, transcribed verbatim from
// the validated content spec docs/specs/dmh-guide-content-v1.md (validated by the owner on
// 2026-10-27): sections 4 (official form names), 5 (type names), 6 (the fifteen group sheets) and 8
// (interface texts). The group labels are never retyped here: they come from
// `factorInput.dmhGroupOptions` through `selectionLabel`. The texts of the list of factor F (the
// entry, the short form titles, the counter) belong to `fr.factorDetail`, not to this module.
//
// Rules of the spec (section 3): the word "dendromicrohabitat" in full, institutions in full, no
// abbreviation outside the allowlist, no type number, no snake case code, no em dash. The gates in
// src/__checks__ and dmh-guide.test.ts enforce it. Do not reword a sentence here: change the spec
// first (a dated revision), then this file, and spec-sync.test.ts keeps the structure equal.

/** The texts of one group sheet (spec section 6). Missing field, missing group: compile error. */
export type DmhGroupText = {
  /** One string of common names, folded for the search. */
  keywords: string
  definition: string
  /** The IBP rule of method version 3.2. */
  ibpRule: string
  /** The rule of method version 3.0, only where it differs (groups 6, 12 and 15). */
  ibpRuleV30?: string
  recognise: string
  confusions: readonly string[]
  /** One sentence, only where the pocket guide threshold differs from the IBP one. */
  difference?: string
  /** The sentence read by a screen reader for the drawing of the group. */
  illustrationAlt: string
}

const groups = {
  dmh_01: {
    keywords:
      "pic, loge, loge de pic, trou de pic, trou rond, nid, nidification, flute, pic noir, pic epeiche, pic vert",
    definition:
      "Une loge de pic est un trou rond, creusé par un pic dans un tronc ou une grosse branche pour y nicher. Elle compte même si un autre animal l'occupe aujourd'hui.",
    ibpRule:
      "Les quatre sortes de loges comptent, selon la taille de l'entrée : petite (moins de 4 cm), moyenne (de 4 à 7 cm), grande (plus de 10 cm), ou « flûte », c'est-à-dire au moins trois loges alignées sur le tronc dont l'entrée dépasse 3 cm (fiche de l'IBP, pages 3 et 12).",
    recognise:
      "Cherchez une entrée nette, au bord franc, ronde ou ovale et haute pour les plus gros pics. Les petites loges sont souvent dans une branche morte, les moyennes dans du bois en décomposition, les grandes sur un tronc sans branche. Dans une flûte, deux loges voisines sont séparées d'au plus 2 m.",
    confusions: [
      "Un trou en entonnoir, plus large à l'entrée qu'au fond, creusé par un pic pour se nourrir, n'est pas une loge : il va dans le groupe 4.",
      "Une ouverture irrégulière qui laisse voir du terreau brun et friable est une cavité à terreau : elle va dans le groupe 2.",
      "De petits trous d'insectes dispersés ne sont pas des loges : ils vont dans le groupe 3 s'ils dépassent 2 cm, sinon ils ne comptent pas.",
    ],
    illustrationAlt:
      "Un tronc portant une grande loge ovale et, plus bas, deux petites loges rondes au centre sombre.",
  },
  dmh_02: {
    keywords:
      "terreau, cavite, creux, carie, arbre creux, tronc creux, pied creux, cheminee, branche creuse",
    definition:
      "Une cavité à terreau est un creux du bois, abrité de la pluie par un plafond, qui contient du terreau : une matière brune et friable faite de bois décomposé, de déjections et de restes d'animaux. Elle peut se trouver au pied de l'arbre, plus haut dans le tronc ou dans une grosse branche creuse.",
    ibpRule:
      "L'ouverture doit mesurer plus de 10 cm, ou plus de 30 cm si la cavité est semi-ouverte (la pluie peut y entrer) ou ouverte vers le haut comme une cheminée (fiche de l'IBP, pages 3 et 12).",
    recognise:
      "Regardez un creux dont l'ouverture est plus large que celle d'une loge de pic, aux bords irréguliers, sombre à l'intérieur. Le terreau se voit à l'ouverture ou sur le plancher du creux. Au pied de l'arbre, le plancher touche le sol, même si l'entrée est assez haute sur le tronc ; dans le tronc, le plancher est au-dessus du sol. Une branche creuse forme un tube dans une grosse branche brisée.",
    confusions: [
      "Un creux à fond dur, sans terreau, entre les racines ou dans le tronc est une concavité : il va dans le groupe 4.",
      "Dans une fourche, une cuvette qui retient l'eau est une concavité (groupe 4) ; si le bois y est altéré, c'est une cavité à terreau.",
      "Un simple tas de terre ou de feuilles au pied de l'arbre n'est pas du terreau : il ne compte pas.",
      "Une loge de pic est un trou rond et net, sans terreau : elle va dans le groupe 1.",
    ],
    illustrationAlt:
      "Un pied de tronc vu de l'extérieur, puis en coupe : une cavité voûtée avec du terreau au fond.",
  },
  dmh_03: {
    keywords:
      "insecte, trou d'insecte, galerie, scolyte, orifice, larve, xylophage, sciure, tunnel",
    definition:
      "Ce sont des trous de sortie et des galeries creusés dans le bois par des larves d'insectes qui se nourrissent de bois. Les galeries forment un réseau de couloirs et de chambres, que l'on voit surtout là où l'écorce est tombée.",
    ibpRule: "Un orifice compte à partir de 2 cm de diamètre (fiche de l'IBP, pages 3 et 12).",
    recognise:
      "Cherchez des trous ronds ou ovales de plus de 2 cm dans l'écorce ou dans le bois, souvent entourés de fine sciure. Là où l'écorce est tombée, les galeries se voient gravées dans le bois : un couloir principal et des couloirs plus fins qui partent de chaque côté. Approchez-vous de l'arbre et mesurez le trou avant de le compter.",
    confusions: [
      "De minuscules trous dispersés, de moins de 2 cm, ne comptent pas.",
      "Un trou net et rond avec une chambre à l'intérieur est une loge de pic : il va dans le groupe 1.",
      "Une poche de pourriture n'est pas un trou d'insecte : elle ne compte pas ; une grande fente va dans le groupe 6.",
    ],
    difference:
      "Le guide de poche retient aussi de nombreux orifices plus petits répartis sur plus de 300 cm2 (environ 17 cm sur 17 cm), l'IBP retient seulement les orifices de plus de 2 cm.",
    illustrationAlt:
      "Un tronc avec des trous ronds et, au centre, une plaque d'écorce tombée montrant des galeries dans le bois.",
  },
  dmh_04: {
    keywords:
      "concavite, creux, cuvette, dendrotelme, eau, fourche, racine, contrefort, trou de nourrissage, pic",
    definition:
      "Une concavité est un creux ou une cuvette dans le bois, sec ou rempli d'eau, sans terreau, qui n'a pas été creusé par un insecte. Elle prend quatre formes : la cuvette qui retient l'eau de pluie (dendrotelme), le trou en entonnoir qu'un pic creuse pour se nourrir, le creux à fond dur dans le tronc et le creux entre les racines et le sol.",
    ibpRule:
      "L'ouverture doit dépasser 10 cm et la profondeur aussi (fiche de l'IBP, pages 3 et 12).",
    recognise:
      "Le creux a un fond dur et des parois couvertes d'écorce ou de bois sain, sans matière brune qui s'effrite. Au pied de l'arbre, c'est un vide entre des racines ou des contreforts et le sol. Dans une fourche ou sur une grosse branche, c'est une cuvette qui garde l'eau de pluie et des feuilles mortes. Le trou de nourrissage d'un pic est conique : plus large à l'ouverture qu'au fond.",
    confusions: [
      "Si le creux contient du terreau brun et friable, c'est une cavité à terreau : elle va dans le groupe 2.",
      "Un trou rond et net, creusé par un pic pour nicher, est une loge de pic : il va dans le groupe 1.",
      "Une écorce arrachée, sans profondeur, n'est pas une concavité : elle va dans le groupe 5.",
    ],
    difference:
      "Le guide de poche retient plus de 15 cm d'ouverture pour la cuvette qui retient l'eau et une pente du toit de moins de 45 degrés pour le creux entre les racines, l'IBP retient plus de 10 cm d'ouverture et ne mentionne pas de pente.",
    illustrationAlt:
      "Une cuvette au creux d'une fourche, et un autre tronc dont le pied s'ouvre en arche.",
  },
  dmh_05: {
    keywords:
      "bois nu, ecorce tombee, ecorce arrachee, ecorce decollee, brulure, feu, blessure, aubier, cicatrice, abri, chauve-souris",
    definition:
      "L'aubier apparent est le bois clair mis à nu parce que l'écorce a disparu : écorce arrachée, cicatrice de feu, ou écorce décollée qui laisse un vide derrière elle. L'écorce peut avoir été arrachée par un abattage, un débardage, une chute d'arbre ou de pierres, ou par un animal.",
    ibpRule:
      "Comptent le bois sans écorce ou la blessure de feu sur plus de 600 cm2 (environ 25 cm sur 25 cm), ou l'écorce décollée avec un vide de plus de 1 cm derrière elle et plus de 10 cm de large et de haut (fiche de l'IBP, pages 3 et 12).",
    recognise:
      "Une plage de bois clair et lisse apparaît dans l'écorce, et l'écorce forme un bord net tout autour. Une écorce décollée se détache du tronc comme une plaque : elle forme un abri si son ouverture est en bas, une poche si elle est en haut. Une cicatrice de feu est souvent triangulaire à la base du tronc, avec du bois noirci.",
    confusions: [
      "Une petite éraflure de l'écorce, sous 600 cm2, ne compte pas.",
      "Un bois mis à nu par un éclatement du tronc, une cassure ou une longue fente va dans le groupe 6.",
      "Un creux profond avec du terreau est une cavité à terreau : il va dans le groupe 2.",
      "Un champignon qui pousse sur la plage nue ne la remplace pas : l'arbre compte aussi dans le groupe 10 ou 11.",
    ],
    difference:
      "Le guide de poche retient plus de 300 cm2 de bois sans écorce, l'IBP retient plus de 600 cm2 (environ 25 cm sur 25 cm).",
    illustrationAlt:
      "Une plage de bois nu aux bords irréguliers sur un tronc, avec une plaque d'écorce décollée sur le côté.",
  },
  dmh_06: {
    keywords:
      "cime brisee, fente, fissure, eclatement, cassure, bris, charpentiere, branche arrachee, foudre, bois de coeur, fourche, castor",
    definition:
      "Du bois de cœur, parfois aussi de l'aubier, est mis à nu sur un arbre vivant par une cassure ou un éclatement du bois : cime brisée, grosse branche arrachée au niveau du tronc, ou fente. Le bord de la blessure est entouré de bois vivant.",
    ibpRule:
      "Comptent une cime brisée de plus de 20 cm de diamètre, un bris de charpentière au niveau du tronc sur plus de 300 cm2 (environ 17 cm sur 17 cm), ou une fente de plus de 1 cm de large, de plus de 10 cm de profondeur et de plus de 30 cm de long (fiche de l'IBP, pages 3 et 12).",
    ibpRuleV30:
      "Comptent une cime brisée de plus de 20 cm de diamètre, un bris de charpentière au niveau du tronc de plus de 20 cm de diamètre ou de plus de 300 cm2, ou une fente de plus de 1 cm de large, de plus de 10 cm de profondeur et de plus de 30 cm de long (fiche de l'IBP version 3.0).",
    recognise:
      "Le bois est nu parce qu'il a cassé ou éclaté, pas seulement parce que l'écorce est tombée : bord déchiqueté, esquilles, ou fente longue et ouverte. Le bord de la blessure est souvent entouré d'un bourrelet d'écorce vivante qui cherche à la refermer. Une fente causée par la foudre est souvent en spirale, avec plusieurs fentes et du bois éclaté. Regardez aussi les fourches : une fente peut s'ouvrir à l'insertion de deux branches.",
    confusions: [
      "Si seule l'écorce a disparu, sans cassure ni fente, c'est de l'aubier apparent : il va dans le groupe 5.",
      "Une branche cassée dont le bout éclaté reste dans le houppier, sans toucher le tronc, va dans le groupe 7.",
      "Une branche coupée compte ici seulement si elle est coupée à ras du tronc et si la surface sans écorce dépasse 300 cm2 ; si le reste de la branche est entièrement mort, long de plus de 50 cm et de plus de 20 cm de diamètre, elle va dans le groupe 7 ; dans les autres cas, elle ne compte pas.",
      "Une vieille souche bien séparée des brins vivants d'une cépée ne compte pas.",
    ],
    difference:
      "Le guide de poche retient aussi les entailles de castor sur plus de 300 cm2, l'IBP ne les retient pas.",
    illustrationAlt:
      "Un tronc avec, sur le côté, une cassure déchiquetée et, au milieu, une longue fente en zigzag.",
  },
  dmh_07: {
    keywords:
      "bois mort, branche morte, cime morte, houppier, couronne, charpentiere, moignon, vestige, chandelle",
    definition:
      "C'est du bois mort encore attaché à l'arbre vivant, dans le houppier : grosses branches mortes, cime entièrement morte, ou reste éclaté d'une grosse branche cassée. Ce bois sèche et chauffe au soleil, et abrite d'autres espèces que le bois mort tombé au sol.",
    ibpRule:
      "Comptent des branches mortes de plus de 20 cm de diamètre et de plus de 50 cm de long, ou de plus de 3 cm de diamètre si plus de 20 % du houppier est mort ; une cime morte de plus de 20 cm de diamètre à la base ; le reste d'une grosse branche cassée, de plus de 20 cm de diamètre et de plus de 50 cm de long (fiche de l'IBP, pages 3 et 12).",
    recognise:
      "Reculez et regardez dans le houppier : des branches sans feuilles ni aiguilles au milieu d'un feuillage vivant, une pointe morte au sommet, ou un moignon épais et éclaté. Les petites brindilles mortes ne comptent pas : il faut du gros bois, ou une grande part du houppier morte.",
    confusions: [
      "Une cime cassée qui met à nu le bois du tronc vivant va dans le groupe 6.",
      "Un arbre sans feuilles en hiver n'a pas forcément de bois mort : regardez les bourgeons et l'écorce avant de conclure.",
      "Des brindilles mortes isolées ne comptent pas.",
      "Un arbre entièrement mort ne compte pas : la méthode ne compte que les arbres vivants.",
    ],
    difference:
      "Le guide de poche retient des branches de plus de 10 cm de diamètre, ou de plus de 3 cm avec plus de 10 % du houppier mort, et une cime morte de plus de 10 cm à la base, l'IBP retient plus de 20 cm de diamètre avec plus de 50 cm de long, ou plus de 20 % du houppier mort, et plus de 20 cm à la base pour la cime.",
    illustrationAlt:
      "À gauche un houppier feuillu vivant ; à droite de grosses branches mortes sans feuilles et une pointe morte.",
  },
  dmh_08: {
    keywords:
      "balai de sorciere, brogne, gourmand, rameaux, pousses, touffe, rejets, bourgeons dormants",
    definition:
      "C'est un amas dense de jeunes pousses qui sortent d'un même point : soit un balai de sorcière, boule de rameaux serrés sur une branche, soit une brogne, touffe de gourmands sur le tronc. Ces pousses naissent de bourgeons dormants de l'arbre.",
    ibpRule:
      "Comptent un balai de sorcière de plus de 50 cm, ou une brogne de plus de 5 gourmands (fiche de l'IBP, pages 3 et 13).",
    recognise:
      "Un balai de sorcière se voit surtout dans le houppier, ou en hiver sur un arbre sans feuilles : une grosse boule de petites tiges serrées, sans ramification régulière, bien plus épaisse que la branche qui la porte. Une brogne est une touffe de pousses fines qui sortent directement de l'écorce du tronc. Comptez les pousses de la touffe : il en faut plus de 5.",
    confusions: [
      "Une boule de gui ressemble à un balai de sorcière, surtout en hiver : le gui est une plante qui vit sur l'arbre, aux tiges fourchues et aux feuilles épaisses, et il va dans le groupe 12.",
      "Quelques gourmands isolés, 5 ou moins, ne comptent pas.",
      "Un enchevêtrement de rameaux morts ne compte pas ici : un balai de sorcière est fait de pousses vivantes.",
      "Un nid d'oiseau vu d'en bas peut ressembler à un balai : il est fait de branchages posés, avec un creux sur le dessus, et il va dans le groupe 13 s'il dépasse 50 cm.",
    ],
    illustrationAlt:
      "Une touffe de pousses fines sur un tronc, et une grosse boule de rameaux enchevêtrés au bout d'une branche.",
  },
  dmh_09: {
    keywords:
      "loupe, chancre, bosse, excroissance, tumeur, broussin, bourrelet, boule de bois, galle",
    definition:
      "C'est une excroissance du tronc en forme de boule de bois plus ou moins compacte. La loupe est un renflement arrondi, à l'écorce rugueuse, dont le bois reste sain ; le chancre est une plaie malade, où le bois est pourri et l'écorce ouverte.",
    ibpRule:
      "La loupe ou le chancre doit dépasser 20 cm de diamètre (fiche de l'IBP, pages 3 et 13).",
    recognise:
      "La loupe se voit de profil comme une bosse arrondie sur le tronc, que l'écorce continue de recouvrir. Le chancre est une plaie irrégulière, souvent enfoncée, avec des bourrelets en cercles autour d'un centre sombre ou pourri, une écorce ouverte ou craquelée et parfois du bois visible. Mesurez la plus grande largeur de l'excroissance.",
    confusions: [
      "Une touffe de pousses serrées sur le tronc est une brogne : elle va dans le groupe 8.",
      "Un creux est un trou, une loupe est une bosse : un creux dans le tronc va dans le groupe 2 ou 4.",
      "Les galles sont de petites déformations des feuilles, des rameaux ou des bourgeons : ce ne sont pas des loupes et elles ne comptent pas pour l'IBP.",
      "Une loupe et un chancre comptent tous deux ici : inutile de les distinguer pour le comptage, ils vont dans le groupe 9.",
    ],
    illustrationAlt:
      "Un renflement arrondi sur le profil d'un tronc, et une plaie à bourrelets emboîtés avec un centre hachuré.",
  },
  dmh_10: {
    keywords:
      "champignon, polypore, amadouvier, sabot, console, perenne, champignon dur, ligneux, tubes",
    definition:
      "C'est la fructification d'un champignon du bois qui vit plusieurs années : un polypore en console ou en sabot, dur comme du bois. Il grossit chaque année et ajoute une couche de tubes sous lui.",
    ibpRule:
      "Un polypore pérenne compte à partir de 5 cm de diamètre (fiche de l'IBP, pages 3 et 13).",
    recognise:
      "Cherchez une console ou un sabot dur sur le tronc, dont le dessus porte des bourrelets en arcs et dont le dessous est percé de petits pores. On ne l'écrase pas à la main. Il reste en place toute l'année, et sur la tranche d'un vieux champignon on voit plusieurs couches de tubes superposées.",
    confusions: [
      "Un champignon mou ou élastique, avec une seule couche de tubes, est éphémère : il va dans le groupe 11.",
      "Un champignon charnu à lamelles est éphémère, même s'il est gros : il va dans le groupe 11.",
      "Une croûte noire et dure en pustule ou en demi-sphère n'est pas un polypore : elle ne compte pas pour l'IBP.",
      "Un champignon posé sur une plage de bois nu compte ici, et l'arbre compte aussi dans le groupe 5 ou 6 : un arbre compte une fois par groupe.",
    ],
    illustrationAlt:
      "Un tronc portant trois champignons durs en console, aux bourrelets en arcs concentriques.",
  },
  dmh_11: {
    keywords:
      "champignon, polypore annuel, agaricale, lamelles, chapeau, ephemere, mou, charnu, myxomycete, croute",
    definition:
      "Ce sont des fructifications de champignons du bois qui ne poussent qu'une année et restent au moins quelques semaines : petits polypores souples en console, ou gros champignons charnus à lamelles qui poussent sur le bois.",
    ibpRule:
      "Un polypore annuel ou un champignon charnu à lamelles compte s'il dépasse 5 cm de diamètre, ou s'il y en a plus de 10 ensemble (fiche de l'IBP, pages 3 et 13).",
    recognise:
      "Cherchez des consoles minces ou des chapeaux fixés directement sur l'écorce ou sur le bois nu, sur le tronc ou une branche d'un arbre vivant. Un polypore annuel est souple ou coriace, jamais dur comme du bois, avec une seule couche de tubes. Un champignon à lamelles est épais et charnu, et se décompose vite.",
    confusions: [
      "Un polypore dur, ligneux, qui dure des années est un champignon pérenne : il va dans le groupe 10.",
      "Un champignon qui pousse sur le sol n'est pas un dendromicrohabitat : il ne compte pas.",
      "Les croûtes de champignons, les petites pustules noires et dures et les masses gélatineuses de myxomycètes sont décrites par le guide de poche, mais ne comptent pas pour l'IBP.",
      "Les mousses et les lichens sur l'écorce vont dans le groupe 12.",
    ],
    illustrationAlt:
      "Une souche avec trois petites consoles superposées d'un côté et un champignon à chapeau de l'autre.",
  },
  dmh_12: {
    keywords:
      "mousse, lichen, lierre, liane, clematite, fougere, gui, epiphyte, plante, parasite, bryophyte",
    definition:
      "Ce sont des mousses, des lichens, des plantes grimpantes, des fougères et du gui qui utilisent l'arbre surtout comme support. Le gui puise un peu de la sève de l'arbre ; mousses et lichens s'en servent seulement comme appui.",
    ibpRule:
      "Comptent des mousses, des lichens ou du lierre et des lianes sur plus de 20 % du tronc, pour au moins l'un de ces types ; des fougères de plus de 5 frondes ; du gui avec 10 boules de plus de 20 cm de diamètre (fiche de l'IBP, pages 3 et 13).",
    ibpRuleV30:
      "Comptent des mousses, des lichens ou du lierre et des lianes sur plus de 20 % du tronc, ou du gui avec 10 boules de plus de 20 cm de diamètre. Les fougères ne comptent pas dans la version 3.0 (fiche de l'IBP version 3.0).",
    recognise:
      "Les mousses forment un tapis vert, les lichens des lobes plats ou de petits buissons gris-vert collés à l'écorce. Le lierre ou la clématite monte le long du tronc. Les fougères poussent directement sur le tronc ou à l'insertion d'une branche. Le gui est une touffe ronde et verte, bien visible dans le houppier.",
    confusions: [
      "Le gui ressemble à un balai de sorcière, qui est une touffe de rameaux de l'arbre lui-même : le balai va dans le groupe 8.",
      "Une pellicule verte ou sale, sans relief, n'est pas de la mousse : elle ne compte pas.",
      "Les champignons, même sur un lichen, ne comptent pas ici : ils vont dans le groupe 10 ou 11.",
      "Une herbe ou un arbuste qui pousse au pied de l'arbre ne compte pas ; le lierre ou la liane qui monte sur le tronc compte, même enracinée dans le sol.",
    ],
    difference:
      "Le guide de poche retient plus de 10 % du tronc pour les mousses, les lichens (sur plus de 1 cm d'épaisseur) et le lierre, et une seule boule de gui de plus de 20 cm, l'IBP retient plus de 20 % du tronc pour au moins l'un de ces types et 10 boules de gui de plus de 20 cm.",
    illustrationAlt:
      "Un tronc avec mousse, lierre grimpant, lichens, fougère, et une touffe de gui sur une branche.",
  },
  dmh_13: {
    keywords: "nid, oiseau, rapace, ecureuil, branchages, aire, vertebre, rongeur, fourche",
    definition:
      "C'est un gros nid d'oiseau ou de rongeur, fait de branchages et posé dans une fourche ou contre le tronc. Les loges de pic ne sont pas des nids ici : elles ont leur propre groupe.",
    ibpRule:
      "Seul un gros nid de vertébré compte, de plus de 50 cm de diamètre (fiche de l'IBP, pages 3 et 13).",
    recognise:
      "Cherchez, souvent en regardant d'en dessous, une plate-forme ou une boule de branchages entrecroisés dans une fourche, contre le tronc ou dans le houppier. Un nid a un creux sur le dessus, et ses brindilles partent dans tous les sens. Pour compter, il doit dépasser 50 cm, donc être bien plus large que la branche qui le porte.",
    confusions: [
      "Une loge de pic ou une cavité occupée par un oiseau va dans le groupe 1 ou 2 : elle ne compte pas ici.",
      "Un balai de sorcière ou une boule de gui, vus d'en bas, ressemblent à un nid : le balai va dans le groupe 8, le gui dans le groupe 12.",
      "Un peu de terre prise dans une fourche est un microsol, pas un nid : elle va dans le groupe 14.",
      "Un nid d'insectes, comme celui des chenilles processionnaires, est décrit par le guide de poche mais ne compte pas pour l'IBP.",
    ],
    difference:
      "Le guide de poche retient les nids de vertébré de plus de 10 cm de diamètre, l'IBP retient seulement les gros nids de plus de 50 cm de diamètre.",
    illustrationAlt:
      "Un gros nid de branchages avec deux œufs, posé au sommet d'un tronc qui s'évase.",
  },
  dmh_14: {
    keywords: "microsol, terre, humus, fourche, houppier, couronne, racines, mousse, sol aerien",
    definition:
      "Un microsol est une petite couche de sol jeune qui se forme sur l'arbre lui-même, à partir de brindilles, de feuilles, d'écorce et de mousses décomposées. On le trouve surtout dans le houppier, dans une fourche ou sur une zone plate d'une grosse branche, et des racines fines de l'arbre y pénètrent souvent.",
    ibpRule:
      "Seul le microsol du houppier compte, à toute hauteur dans l'arbre (fiche de l'IBP, pages 3 et 13).",
    recognise:
      "Cherchez une terre sombre et friable, comme du terreau de jardin, installée dans une fourche, au creux d'une grosse branche ou sur une zone plate du houppier. Elle porte souvent de la mousse ou de petites plantes, et des racines fines y descendent. On la trouve surtout sur de vieux arbres.",
    confusions: [
      "Du bois pourri au fond d'une cavité est du terreau : il va dans le groupe 2.",
      "Des feuilles qui s'accumulent sans former d'humus, sur du bois abîmé ou une souche, ne sont pas un microsol ; dans une fourche, c'est une cuvette à eau (groupe 4) ou une cavité à terreau si le bois est altéré (groupe 2).",
      "Un nid est fait de branchages posés, pas de terre : il va dans le groupe 13.",
      "Les plantes qui poussent dans ce sol se comptent à part, dans le groupe 12.",
    ],
    difference:
      "Le guide de poche retient trois sortes de microsols (sur l'écorce du tronc, entre les écorces et dans le houppier), l'IBP retient seulement celui du houppier.",
    illustrationAlt:
      "Une grosse fourche de deux branches avec, dans l'angle, un tas de terre sombre portant un peu de mousse.",
  },
  dmh_15: {
    keywords: "seve, resine, coulee, ecoulement, suintement, blessure, conifere, exsudat, gomme",
    definition:
      "Une coulée est un écoulement de sève (sur les feuillus, liquide et sombre) ou de résine (sur les conifères, épaisse, collante, jaune ou blanchâtre) qui part d'une blessure ou d'une fente et descend le long de l'écorce.",
    ibpRule:
      "La coulée doit mesurer plus de 20 cm de long : sève active, ou résine fraîche ou ancienne (fiche de l'IBP, pages 4 et 13).",
    ibpRuleV30:
      "Seule compte une coulée de sève active de plus de 20 cm de long (fiche de l'IBP version 3.0).",
    recognise:
      "Une traînée mouillée et brillante part d'une blessure, d'une fente ou d'un moignon de branche et descend le long de l'écorce. La résine forme une masse épaisse, jaune, ambrée ou blanchâtre, qui durcit à l'air, sur un conifère. Mesurez la coulée sur toute sa longueur.",
    confusions: [
      "Une trace de pluie ou d'algues ne part pas d'une blessure : elle ne compte pas.",
      "Une coulée de sève sèche et ancienne n'est plus une coulée active : elle ne compte pas.",
      "Un bois mis à nu sans écoulement va dans le groupe 5 ou 6, selon que seule l'écorce manque ou que le bois est cassé.",
      "Une coulée de moins de 20 cm ne compte pas, même si elle est active.",
    ],
    difference:
      "Le guide de poche retient une coulée de plus de 10 cm de long, l'IBP retient plus de 20 cm.",
    illustrationAlt:
      "Une longue coulée de sève sous une blessure, et une coulée de résine épaisse sur une écorce de conifère.",
  },
} as const satisfies Record<DmhGroupCode, DmhGroupText>

export const dmhGuideFr = {
  sheet: {
    title: "Dendromicrohabitats",
    back: "Tous les groupes",
    backA11y: "Retour à tous les groupes",
    close: "Fermer le guide",
    lead: "Un dendromicrohabitat est un petit milieu de vie porté par un arbre : une cavité, une écorce décollée, un champignon, un nid. L'IBP en compte quinze groupes, à partir d'un seuil de taille.",
    rowHint: "Ouvre la fiche du groupe",
    sourcesLink: "Sources et licence",
    groupAnnounce: ({ label }: { label: string }) => `Groupe ${label}`,
    catalogueAnnounce: "Tous les groupes",
  },
  search: {
    label: "Rechercher un groupe",
    placeholder: "Rechercher : pic, lierre, gui",
    clear: "Effacer la recherche",
    found: ({ count }: { count: number }) =>
      count === 1 ? "1 groupe trouvé" : `${count} groupes trouvés`,
    emptyTitle: "Aucun groupe trouvé",
    emptyBody: "Essayez un mot courant : pic, lierre, gui, champignon, nid.",
    emptyAction: "Voir les 15 groupes",
  },
  group: {
    form: ({ form }: { form: string }) => `Forme : ${form}`,
    definitionTitle: "De quoi s'agit-il ?",
    ibpTitle: "Ce qui compte pour l'IBP",
    methodNote: {
      v30: "Texte pour la méthode IBP version 3.0",
      v32: "Texte pour la méthode IBP version 3.2",
    },
    recogniseTitle: "Comment le reconnaître",
    confusionsTitle: "Confusions fréquentes",
    typesTitle: "Types décrits par le guide de poche",
    typesCounted: "Comptés par l'IBP",
    typesNotCounted: "Décrits, mais non comptés par l'IBP",
    typeCountedA11y: ({ name }: { name: string }) => `${name}. Compté par l'IBP`,
    typeNotCountedA11y: ({ name }: { name: string }) => `${name}. Non compté par l'IBP`,
    differenceTitle: "Le seuil de l'IBP, pas celui du guide de poche",
    differenceLead: "Pour l'IBP, suivez toujours le seuil de l'IBP.",
    footer: "Description : guide de poche des dendromicrohabitats, 2024. Seuils : IBP version 3.2.",
  },
  sources: {
    title: "Sources et licence",
    lead: "Les textes de ce guide sont écrits par l'association Etats Sauvages à partir des documents ci-dessous. Aucun texte ni aucune image de ces documents n'est reproduit.",
    authors: "Auteurs",
    publisher: "Éditeur",
    year: "Année",
    usedFor: "Utilisé pour",
    precedence:
      "Pour le relevé, les seuils de l'IBP version 3.2 font foi. Le guide de poche sert à reconnaître les éléments.",
    drawings: "Dessins originaux de l'association Etats Sauvages.",
    offline: "Tout le guide est dans l'application. Il fonctionne sans réseau.",
    consulted: "Documents consultés le 23 octobre 2026.",
    documents: [
      {
        title: "Guide de poche des dendromicrohabitats, deuxième édition",
        authors: "Bütler, Lachat, Krumm, Kraus et Larrieu",
        publisher:
          "Institut fédéral de recherches sur la forêt, la neige et le paysage, Birmensdorf",
        year: "2024",
        usedFor: "la description des types de chaque groupe",
      },
      {
        title:
          "Tree related microhabitats in temperate and Mediterranean European forests: a hierarchical typology for inventory standardization",
        authors:
          "Larrieu, Paillet, Winter, Bütler, Kraus, Krumm, Lachat, Michel, Regnery et Vandekerkhove",
        publisher: "revue Ecological Indicators, volume 84",
        year: "2018",
        usedFor: "la typologie en quinze groupes",
      },
      {
        title:
          "Indice de Biodiversité Potentielle pour les forêts de France métropolitaine, version 3.2",
        authors: "Gonin, Larrieu, Marty, Baiges, Corezzola, Miozzo et Palero",
        publisher:
          "Centre national de la propriété forestière et unité Dynafor de l'Institut national de recherche pour l'agriculture, l'alimentation et l'environnement",
        year: "2026",
        usedFor: "les seuils de comptage",
      },
    ],
  },
  // The seven official form names of the pocket guide (spec section 4), shown on a group page.
  forms: {
    cavities: "Cavités",
    wounds: "Blessures et bois apparent",
    crown_deadwood: "Bois mort dans le houppier",
    growths: "Excroissances",
    fruiting_bodies: "Sporophores de champignons et myxomycètes",
    epiphytic: "Structures épiphytiques, épixyliques ou parasites",
    exudates: "Exsudats",
  },
  // The 52 type names of the 2024 pocket guide, keyed by their number there. The number is a key
  // only and is never shown (spec section 3).
  types: {
    1: "Loge de petite taille",
    2: "Loge de taille moyenne",
    3: "Loge de grande taille",
    4: "Flûte de pic",
    5: "Cavité à terreau de pied",
    6: "Cavité à terreau de tronc",
    7: "Cavité à terreau semi-ouverte",
    8: "Cavité à terreau ouverte vers le haut, en contact avec le sol",
    9: "Cavité à terreau ouverte vers le haut, sans contact avec le sol",
    10: "Branche creuse",
    11: "Orifices et galeries d'insectes",
    12: "Dendrotelme",
    13: "Trou de nourrissage de pic",
    14: "Concavité à fond dur de tronc",
    15: "Concavité racinaire",
    16: "Bois sans écorce",
    17: "Blessure due au feu",
    18: "Écorce décollée formant un abri",
    19: "Écorce décollée formant une poche",
    20: "Cime brisée",
    21: "Bris de charpentière",
    22: "Fente",
    23: "Fente causée par la foudre",
    24: "Fente à l'insertion d'une fourche",
    25: "Entailles de castor",
    26: "Branches mortes",
    27: "Cime morte",
    28: "Vestige de charpentière brisée",
    29: "Balai de sorcière",
    30: "Gourmands ou brogne",
    31: "Galles",
    32: "Loupe",
    33: "Chancre",
    34: "Polypore pérenne",
    35: "Polypore annuel",
    36: "Agaricale charnue",
    37: "Champignons corticoïdes",
    38: "Pyrénomycète",
    39: "Myxomycète",
    40: "Bryophyte (mousse et hépatique)",
    41: "Lichen foliacé ou fruticuleux",
    42: "Lierre ou liane",
    43: "Fougère",
    44: "Gui",
    45: "Nid de vertébré",
    46: "Nid d'invertébré",
    47: "Microsol d'écorce",
    48: "Microsol d'entre-écorce",
    49: "Microsol du houppier",
    50: "Dépôt d'argile ou de limon",
    51: "Coulée de sève",
    52: "Coulée de résine",
  },
  groups,
} as const
