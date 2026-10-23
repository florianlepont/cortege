// Phase 30 (plan 30-11): every word of the route step ("Choix du parcours") and of the chooser
// ("Choisir le parcours"). The words are those of the official method (owner decision O-12,
// 2026-10-14): "parcours en plein", "parcours partiel" (par bande ou par placette), "relevé
// plafonné", "relevé déplafonné", "peuplement". Each term carries its one-sentence plain-French
// explanation from spec section 3, shown right under it, so a person who does not know the method
// understands the step (D-05, ROADMAP criterion 2). The word "méthode" is never used for the
// parcours: it stays for "la méthode officielle de l'IBP" and "Méthode IBP" (the version).
//
// The package speaks in codes only; `app/route-text.ts` maps each code to a sentence here. Per-case
// texts are static strings, not functions (the catalogue test renders every function leaf); the few
// functions take numbers or already formatted strings. This wording is a draft for the owner's
// review in plan 30-24 (U-O13, P-4). No em dash, no abbreviation outside the allowlist, no snake
// case token: the catalogue gates and `route-guide.test.ts` enforce it.

// The ten terms of the spec glossary (section 3), written once and reused wherever a term is
// explained, so the sentence under a name and the sentence of the info sheet never drift apart.
const TERM = {
  peuplement: {
    term: "Peuplement",
    text: "Un morceau de forêt homogène : mêmes arbres, même âge, même aspect.",
  },
  parcoursEnPlein: {
    term: "Parcours en plein",
    text: "Vous marchez dans tout le peuplement, par bandes régulières, et vous notez tout ce que vous voyez.",
  },
  parcoursPartiel: {
    term: "Parcours partiel",
    text: "Vous ne décrivez qu'une partie du peuplement, bien choisie (au moins 1 hectare et 10 à 20 % du peuplement), et vous jetez un coup d'œil rapide au reste.",
  },
  parBande: {
    term: "Parcours partiel par bande",
    text: "Vous suivez à pied une allée de 20 à 50 mètres de large.",
  },
  parPlacette: {
    term: "Parcours partiel par placette",
    text: "Vous relevez tout dans une surface de forme simple et de taille connue, un cercle par exemple.",
  },
  relevePlafonne: {
    term: "Relevé plafonné",
    text: "On arrête de compter un élément dès que son score est sûr. C'est le plus rapide et le plus courant.",
  },
  releveDeplafonne: {
    term: "Relevé déplafonné",
    text: "On compte tout, sans s'arrêter, pour les facteurs choisis. C'est plus long, mais cela donne le détail. Réservé aux situations extrêmes et aux études.",
  },
  surfaceDecrite: {
    term: "Surface décrite",
    text: "La surface que vous décrivez réellement, appelée zone de relevé IBP sur la fiche officielle.",
  },
  resteDuPeuplement: {
    term: "Reste du peuplement",
    text: "La partie non parcourue : vous notez seulement ce que vous voyez sans effort, comme une mare, un rocher ou une lisière.",
  },
  dendromicrohabitat: {
    term: "Dendromicrohabitat",
    text: "Un petit abri sur un arbre vivant ou mort : loge de pic, cavité, écorce décollée, champignon, nid.",
  },
} as const

// Field advice of R-12a and R-12b (M p. 7, p. 8, p. 15).
const STRIP_ADVICE =
  "Une bande fait 20 à 50 mètres de large : comptez 10 à 15 mètres de chaque côté si l'on voit mal, 15 à 20 mètres si la visibilité est moyenne, 20 à 25 mètres si l'on voit loin."
const PLOT_ADVICE =
  "Une placette d'un hectare est un cercle de 56,4 mètres de rayon. Une placette de 0,5 hectare a un rayon de 39,9 mètres, une de 0,33 hectare un rayon de 32,6 mètres."

// The zone and complement checks (spec section 5, "Contrôles de la surface décrite"). Shared with
// `validation.ts`.
const ZONE_ISSUES = {
  zoneNotPositive: "Indiquez une surface supérieure à 0.",
  zoneTooLarge: "Cette surface semble trop grande. Vérifiez-la.",
  zoneAboveStand: "La surface décrite ne peut pas dépasser celle du peuplement.",
  partialOverHalf:
    "Vous décrivez plus de la moitié du peuplement : le parcourir en entier serait plus simple.",
  partialBelowMinimum:
    "Un parcours partiel décrit au moins 1 hectare : cette surface est plus petite.",
  complementBelowZone:
    "La surface totale évaluée ne peut pas être plus petite que la surface décrite.",
} as const

export const routeGuideFr = {
  screen: {
    title: "Choix du parcours",
    know: "Je connais déjà mon parcours",
    use: "Utiliser ce parcours",
    saveError: "Le parcours n'a pas pu être enregistré.",
    retry: "Réessayer",
    // Phase 30, owner check 2026-10: the pinned button of every question reads like the first
    // three steps of the creation.
    next: "Continuer",
    edit: "Modifier",
    // The result screen's heading, the same large heading as a question (steps 1 to 5 share it).
    result: {
      suggestedTitle: "Voici le parcours conseillé",
      suggestedLead: "Il découle de vos réponses. Vous pouvez en changer.",
      chosenTitle: "Voici votre parcours",
      chosenLead: "Vous l'avez choisi vous-même. Vous pouvez encore le changer.",
    },
  },
  questions: {
    surface: {
      title: "Quelle est la surface du peuplement ?",
      why: "La surface décide si vous pouvez tout parcourir ou seulement une partie.",
      short: "Surface",
      label: "Surface en hectares",
      suffix: "ha",
      estimated:
        "Estimée d'après les parcelles que vous avez choisies. Corrigez-la si votre peuplement est plus petit ou plus grand.",
      unknown:
        "La surface n'a pas pu être calculée. Indiquez-la : le calcul se fait aussi sans connexion.",
      aid: "Un hectare, c'est un carré de 100 mètres de côté.",
      // O-10: linear stands are out of scope, one fixed sentence and no question.
      linearHelp:
        "Les haies et les alignements d'arbres de moins de 15 mètres de large ne sont pas pris en charge : les seuils de l'IBP sont calculés par hectare.",
      value: (hectares: string) => `${hectares} ha`,
      valueEstimated: (hectares: string) => `${hectares} ha, estimée`,
      subStand: "Quelle est la surface d'un des morceaux ?",
      subStandWhy:
        "Faites un relevé par morceau homogène. Indiquez la surface du premier morceau, vous ferez les autres ensuite.",
    },
    homogeneity: {
      title: "Le peuplement est-il homogène ?",
      why: "Un peuplement homogène se décrit bien par une partie. Un peuplement varié demande de tout voir.",
      short: "Aspect",
      options: {
        homogeneous: {
          title: "Oui, plutôt homogène",
          caption:
            "Mêmes arbres, même âge, même aspect partout. Par exemple : plantation, taillis de châtaignier, jeune peuplement.",
        },
        heterogeneous: {
          title: "Non, il est varié",
          caption:
            "Plusieurs essences, plusieurs âges, des trouées. Par exemple : futaie irrégulière mélangée.",
        },
      },
      answers: {
        homogeneous: "Homogène",
        heterogeneous: "Varié",
      },
    },
    difficulty: {
      title: "Est-il difficile à observer ?",
      why: "Quand on voit mal ou qu'on avance mal, décrire une partie bien choisie fait gagner du temps.",
      short: "Observation",
      options: {
        hard: {
          title: "Oui, c'est difficile",
          caption:
            "On voit à moins de 10 à 15 mètres, on avance mal dans la végétation, ou le relief est accidenté.",
        },
        easy: {
          title: "Non, c'est facile",
          caption: "On voit loin et on marche sans peine.",
        },
      },
      answers: {
        hard: "Difficile à observer",
        easy: "Facile à observer",
      },
    },
    narrow: {
      title: "Le peuplement fait-il moins de 100 mètres de large ?",
      why: "Un peuplement étroit se décrit mieux en bande qu'en placette.",
      short: "Largeur",
      options: {
        yes: {
          title: "Oui, il est étroit",
          caption: "Moins de 100 mètres d'un bord à l'autre.",
        },
        no: {
          title: "Non, il est large",
          caption: "Assez large pour y placer un grand cercle.",
        },
      },
      answers: {
        narrow: "Étroit",
        wide: "Large",
      },
    },
    // O-04: information only. These answers never move the parcours or the mode de relevé.
    refine: {
      title: "Pour affiner",
      lead: "Ces réponses ne changent pas le parcours conseillé. Elles servent seulement à vous donner des repères sur la durée. Vous pouvez les laisser vides.",
      experienceLabel: "Connaissez-vous déjà l'IBP ?",
      experienceShort: "Expérience",
      experienceRegular: "Oui, j'en ai déjà fait",
      experienceBeginner: "Non, c'est nouveau pour moi",
      hoursLabel: "Temps disponible, en heures",
      hoursShort: "Temps disponible",
      hoursSuffix: "heures",
      hoursInvalid: "Indiquez un nombre d'heures supérieur à 0 et au plus 24, ou laissez vide.",
      hoursValue: ({ hours, text }: { hours: number; text: string }) =>
        hours < 2 ? `${text} heure` : `${text} heures`,
    },
  },
  routes: {
    full: {
      name: TERM.parcoursEnPlein.term,
      // The one short line of the cards; the full words (explanation, does, suits) are the sheet of
      // the card's information glyph.
      short: "Tout le peuplement, par bandes régulières.",
      explanation: TERM.parcoursEnPlein.text,
      does: "Vous décrivez la surface entière du peuplement : la surface décrite est celle du peuplement.",
      suits:
        "Convient aux petits peuplements (jusqu'à 1 hectare) et aux peuplements variés et faciles à observer, jusqu'à 5 hectares.",
    },
    partialStrip: {
      name: TERM.parBande.term,
      short: "Une partie du peuplement, en bande.",
      explanation: TERM.parcoursPartiel.text,
      does: `${TERM.parBande.text} ${STRIP_ADVICE}`,
      suits: "Convient aux peuplements variés, difficiles à observer ou étroits.",
    },
    partialPlot: {
      name: TERM.parPlacette.term,
      short: "Une partie du peuplement, en placette de 1 ha.",
      explanation: TERM.parcoursPartiel.text,
      does: `${TERM.parPlacette.text} ${PLOT_ADVICE}`,
      suits: "Convient aux peuplements homogènes, faciles à observer et assez larges.",
    },
  },
  counting: {
    caption: "Mode de relevé",
    capped: {
      name: TERM.relevePlafonne.term,
      short: "On arrête de compter quand le score est sûr.",
      explanation: TERM.relevePlafonne.text,
    },
    uncapped: {
      name: TERM.releveDeplafonne.term,
      short: "On compte tout, facteur par facteur.",
      explanation: TERM.releveDeplafonne.text,
    },
    // M chapter 8: the déplafonné mode answers "certaines situations extrêmes" and the studies.
    rareNotice:
      "Le relevé déplafonné est réservé aux situations extrêmes, par exemple des scores toujours au maximum ou toujours nuls, et aux études. Le relevé plafonné suffit dans la grande majorité des cas.",
    factorsLead: "Quels facteurs comptez-vous en entier ? Plus il y en a, plus le relevé est long.",
    presetsTitle: "Préréglages",
    presets: {
      allFactors: "Tous les facteurs",
      alwaysMax: "Scores toujours au maximum",
      minimum: "Scores minimum",
      custom: "Choisir moi-même",
    },
    presetCaptions: {
      allFactors: "Tout compter, pour des études ou des travaux de recherche.",
      alwaysMax:
        "Pour un peuplement dont certains scores sont toujours au maximum, par exemple une forêt à forte maturité.",
      minimum:
        "Pour un peuplement dont certains scores sont toujours nuls, comme une jeune plantation.",
      custom: "Vous choisissez les facteurs un par un.",
    },
    // R-17: advice for the preset that starts from many factors.
    presetNote:
      "Pour les bois morts de dimension moyenne et les gros bois, gardez le plafond de 1 arbre par hectare, sauf besoin particulier.",
    atLeastOne: "Choisissez au moins un facteur.",
    keptValues:
      "Les valeurs déjà saisies en relevé déplafonné sont conservées, mais elles ne seront plus affichées.",
  },
  suggestion: {
    eyebrowSuggested: "Parcours conseillé",
    eyebrowChosen: "Parcours choisi par vous",
    surfaceLine: (hectares: string) => `Surface décrite : ${hectares} ha`,
    countedLead: "Facteurs comptés en entier",
    change: "Changer de parcours",
    restore: "Revenir au parcours conseillé",
    reasonsTitle: "Pourquoi ce conseil ?",
    adviceTitle: "Conseil",
  },
  largeStand: {
    title: "Votre peuplement est grand. Deux façons de faire",
    short: "Grand peuplement",
    recommended: "Conseillé",
    subdivide: {
      title: "Découper en sous-peuplements",
      caption:
        "Le plus fidèle à la méthode officielle de l'IBP : vous faites un relevé par morceau homogène.",
    },
    partial: {
      title: "Parcours partiel, sans découper",
      caption: "Vous décrivez une partie du peuplement entier.",
    },
    subdivideNotice: "Faites un relevé par morceau : indiquez la surface du premier morceau.",
    subdivideCta: "Indiquer la surface d'un morceau",
  },
  // One sentence per reason code of the package (RouteReasonCode), keyed in camel case.
  reasons: {
    wholeStandSmall:
      "Votre peuplement fait un hectare ou moins : le plus simple est de le parcourir en entier.",
    wholeStandHeterogeneous:
      "Le peuplement est varié et facile à observer : il vaut mieux le parcourir en entier pour ne rien manquer.",
    partialHardToObserve:
      "Le peuplement est difficile à observer : décrire seulement une partie, en bande, vous fera gagner du temps.",
    partialHomogeneous:
      "Le peuplement est homogène : une partie bien choisie le représente, inutile de le parcourir en entier.",
    partialMediumStand:
      "Au-delà de 5 hectares, la méthode officielle de l'IBP recommande de décrire seulement une partie du peuplement.",
    largeStand:
      "Au-dessus de 10 hectares pour un peuplement varié, ou de 20 hectares pour un peuplement homogène, la méthode officielle de l'IBP conseille de le découper en morceaux homogènes, ou d'en décrire seulement une partie.",
    partialStripWhy:
      "Les bandes conviennent aux peuplements variés, étroits ou difficiles à parcourir.",
    partialPlotWhy:
      "Les placettes conviennent aux peuplements homogènes, larges et faciles à parcourir.",
    complementAdvised:
      "Un coup d'œil au reste du peuplement améliore la précision pour quelques facteurs faciles à repérer : genres d'arbres, milieux ouverts et lisières, milieux aquatiques et rocheux.",
    cappedDefault:
      "Relevé plafonné : on arrête de compter un élément dès que son score est sûr. C'est le plus rapide et le plus courant.",
  },
  warnings: {
    smallStand: "Sous 0,5 hectare, l'IBP est moins pertinent.",
    partialOverHalf: ZONE_ISSUES.partialOverHalf,
  },
  // Advice is information, never a rule (R-18 to R-21, O-04).
  advice: {
    duration: ({ range }: { range: string }) =>
      `Pour cette surface : ${range}, repère officiel pour une personne habituée à l'IBP.`,
    // Wording of the duration range (S p. 19; M p. 17): minutes below two hours, then hours rounded
    // to the half hour. `app/route-text.ts` computes the numbers, the words stay here.
    durationUnderMinute: "moins d'une minute",
    durationMinutes: ({ min, max }: { min: number; max: number }) =>
      min === max ? `${min} ${min === 1 ? "minute" : "minutes"}` : `${min} à ${max} minutes`,
    durationHours: ({ min, max }: { min: string; max: string }) =>
      min === max ? `environ ${min} heures` : `environ ${min} à ${max} heures`,
    durationNote:
      "Ces durées sont des repères de la méthode officielle de l'IBP, pas une règle : elles ne changent pas le parcours conseillé.",
    uncappedLonger: "Le relevé déplafonné demande plus de temps.",
    beginner:
      "L'IBP est nouveau pour vous : prévoyez plus de temps, car un débutant en a besoin de plus.",
    timeShort:
      "Vous avez prévu moins de temps que ce parcours n'en demande. Prévoyez plus de temps, ou décrivez une partie du peuplement seulement.",
  },
  surfaceErrors: {
    missing: "Indiquez la surface du peuplement.",
    invalid:
      "Cette surface n'est pas possible : indiquez un nombre d'hectares supérieur à 0, pas trop grand. Vérifiez-la.",
  },
  details: {
    title: "Détails du parcours",
    fullLine: (hectares: string) => `Vous décrivez tout le peuplement : ${hectares} ha.`,
    zoneLabel: "Surface que vous allez décrire",
    zoneHelperFull: "Indiquez la surface du peuplement que vous décrivez.",
    zoneHelperPartial:
      "Au moins 1 hectare, et entre 10 % (peuplement homogène) et 20 % (peuplement varié) de la surface du peuplement.",
    stripAdvice: STRIP_ADVICE,
    plotAdvice: PLOT_ADVICE,
    plotsAdded:
      "Si vous parcourez plusieurs placettes, additionnez leurs surfaces : tout reste sur une seule fiche.",
    complementLabel: "Regarder aussi le reste du peuplement",
    complementHint:
      "Un coup d'œil rapide à ce que vous n'avez pas parcouru : genres d'arbres, milieux ouverts et lisières, milieux aquatiques et rocheux. Cela améliore la précision.",
    totalLabel: "Surface totale évaluée",
    countedLead: "Facteurs comptés en entier",
    countedLine: (factors: string) => `Facteurs comptés en entier : ${factors}`,
    editCountingA11y: "Modifier les facteurs comptés en entier",
    issues: ZONE_ISSUES,
  },
  chooser: {
    title: "Choisir le parcours",
    // The header of a draft that already has a route (Contexte, "Modifier le parcours").
    titleEdit: "Modifier le parcours",
    cancel: "Annuler",
    parcours: "Parcours",
    counting: "Mode de relevé",
    details: "Détails",
    recommended: "Conseillé",
    // One help line under the intro, edit mode only: "Pas sûr ?" then the accent link.
    adviseLead: "Pas sûr ?",
    advise: "Être conseillé",
    // Read by a screen reader on the disabled button of the chooser: its name, then why.
    useDisabledA11y:
      "Utiliser ce parcours. Choisissez d'abord un parcours et vérifiez les détails.",
  },
  glossary: {
    close: "Fermer",
    terms: {
      peuplement: TERM.peuplement,
      parcoursEnPlein: TERM.parcoursEnPlein,
      parcoursPartiel: TERM.parcoursPartiel,
      parBande: TERM.parBande,
      parPlacette: TERM.parPlacette,
      relevePlafonne: TERM.relevePlafonne,
      releveDeplafonne: TERM.releveDeplafonne,
      surfaceDecrite: TERM.surfaceDecrite,
      resteDuPeuplement: TERM.resteDuPeuplement,
      dendromicrohabitat: TERM.dendromicrohabitat,
    },
  },
  a11y: {
    optionLabel: ({ label, caption }: { label: string; caption: string }) => `${label}. ${caption}`,
    optionLabelTagged: ({ label, tag, caption }: { label: string; tag: string; caption: string }) =>
      `${label}, ${tag}. ${caption}`,
    suggestionCard: ({
      eyebrow,
      route,
      counting,
      hectares,
    }: {
      eyebrow: string
      route: string
      counting: string
      hectares: string
    }) => `${eyebrow} : ${route}. ${counting}. Surface décrite ${hectares} hectares.`,
    suggestionCardNoZone: ({
      eyebrow,
      route,
      counting,
    }: {
      eyebrow: string
      route: string
      counting: string
    }) => `${eyebrow} : ${route}. ${counting}.`,
    suggestionChanged: ({ route, counting }: { route: string; counting: string }) =>
      `Parcours conseillé : ${route}. ${counting}.`,
    surfaceField: "Surface du peuplement en hectares",
    hoursField: "Temps disponible en heures",
    zoneField: "Surface que vous allez décrire en hectares",
    totalField: "Surface totale évaluée en hectares",
    glossaryInfo: (term: string) => `Comprendre : ${term}`,
    questionInfo: (title: string) => `Aide : ${title}`,
  },
} as const
