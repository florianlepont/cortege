// Filled by plan 01.9-17; no other plan edits this section.
export const factorDetailFr = {
  fieldsProgress: ({ filledCount, totalCount }: { filledCount: number; totalCount: number }) =>
    `${filledCount}/${totalCount} champs`,
  requiredField: ({ label }: { label: string }) => `${label} *`,
  numericPlaceholder: "Saisissez une valeur numérique",
  // OA-30: the help is behind a link, not a card open by default; the sheet closes with its button.
  // Follow-up 32-27: the link is at the top of every factor page, named "Aide au relevé".
  helpLink: "Aide au relevé",
  helpTitle: "Aide au relevé",
  helpClose: "Fermer l'aide",
  // Phase 25.1 (D-12): labels of the optional detail lists that sit next to a scored value.
  companionLabels: {
    evidence: "Sources de la continuité",
  },
  // Keyed by the factor field label the form passes in (see useSurveyForm).
  fieldLabels: {
    genera: "Genres autochtones observés",
    native_cover_percent: "Couvert des essences autochtones (%)",
    strata_count: "Nombre de strates",
    covered_autochthonous_percent: "Couvert autochtone (%)",
    bmg_count: "Nombre de bois morts de grosse dimension (BMg)",
    bmm_count: "Nombre de bois morts de dimension moyenne (BMm)",
    surface_ha: "Surface (ha)",
    tgb_count: "Nombre de très gros bois (TGB)",
    gb_count: "Nombre de gros bois (GB)",
    trees_per_ha: "Arbres par ha",
    open_flowering_percent: "Milieux ouverts fleuris (%)",
    "class_score (0|2|5)": "Classe (0, 2 ou 5)",
    type_count: "Nombre de types",
  },
  // Phase 30 (spec sections 6, 7 and 9, O-12): a factor counted in full ("relevé déplafonné") gets a
  // status chip, a one-line caption above its first field and, for B and F, a detail input. A factor
  // in "relevé plafonné" shows nothing more. H is never counted in full, so it has no caption. The
  // captions avoid the abbreviations of the factor help (BMg, TGB, GB) on purpose.
  countingMode: {
    chip: "Relevé déplafonné",
    A: "Relevé déplafonné : notez tous les genres d'arbres et le couvert des essences autochtones en pourcentage.",
    B: "Relevé déplafonné : notez le couvert de chaque strate en pourcentage de la surface décrite.",
    C: "Relevé déplafonné : comptez tous les bois morts sur pied, sans vous arrêter à un maximum par hectare.",
    D: "Relevé déplafonné : comptez tous les bois morts au sol, sans vous arrêter à un maximum par hectare.",
    E: "Relevé déplafonné : comptez tous les très gros bois et les gros bois vivants, sans vous arrêter à un maximum par hectare.",
    F: "Relevé déplafonné : comptez tous les arbres de chaque groupe sur la surface décrite, sans vous arrêter à un maximum. L'app en déduit le nombre d'arbres par hectare.",
    G: "Relevé déplafonné : notez le pourcentage de milieux ouverts fleuris, sans vous arrêter à 5 %.",
    I: "Relevé déplafonné : notez tous les types observés, sans vous arrêter à deux.",
    J: "Relevé déplafonné : notez tous les types observés, sans vous arrêter à deux.",
    strataTitle: "Couvert de chaque strate",
    strataHelper:
      "Une strate compte à partir de 20 % de couvert. Les strates se superposent : le total peut dépasser 100 %.",
    strataCoverUnit: "%",
    strataCoverPlaceholder: "0",
    strataCounted: ({ count }: { count: number }) =>
      count === 1 ? "1 strate comptée" : `${count} strates comptées`,
    strataFieldA11y: ({ label }: { label: string }) =>
      `Couvert de la strate ${label}, en pourcentage`,
    dmhSurfaceLabel: "Surface décrite pour ce comptage (ha)",
    zoneLine: ({ hectares }: { hectares: string }) => `Surface décrite : ${hectares} ha`,
    fromRoute: "D'après le parcours",
  },
  // Follow-up 32-30: the choice lists of A, B, H, I and J (a grouped list of circles, as F's). A
  // section header is the field's label unless this catalogue names it; A's list has a search field.
  choice: {
    headers: {
      H: "Ancienneté",
    },
    search: {
      placeholder: "Chercher un genre",
      a11yLabel: "Chercher un genre dans la liste",
      clear: "Effacer la recherche",
      empty: "Aucun genre ne correspond à votre recherche.",
    },
  },
  // Follow-up 32-31: the numeric controls of the other factors as grouped rows (a label, then the
  // value and a -/+ capsule). The row label is the field's own label; a percent row drops the
  // trailing "(%)", its value carries the sign.
  valueRows: {
    headers: {
      count: "Comptage",
      surface: "Surface",
      cover: "Couvert",
      percent: "Part de la surface",
    },
    percentSuffix: "\u00a0%",
    spoken: {
      count: ({ text }: { text: string }) => text,
      percent: ({ text }: { text: string }) => `${text} %`,
      hectares: ({ text }: { text: string }) => `${text} hectares`,
    },
    stepper: {
      editHint: "Double-tapez pour saisir la valeur",
      increment: "Augmenter",
      decrement: "Diminuer",
    },
    slider: {
      rowLabel: "Valeur",
      min: "0\u00a0%",
      max: "100\u00a0%",
      a11yLabel: ({ label, percent }: { label: string; percent: number }) =>
        `${label} : ${percent} %`,
      a11yHint: "Glissez pour régler la part",
    },
  },
  // Follow-up 32-29: the one short paragraph that opens each factor page other than F (F's is
  // `dmhList.intro`), in the imperative, saying what to record. Each rests on the factor's help text
  // (`fr.labels.factorHelp`); the differences between the method versions stay in the help sheet.
  // A factor counted in full opens with its `countingMode` sentence instead.
  intro: {
    A: "Notez les genres d'arbres autochtones présents dans le peuplement, puis le couvert des essences autochtones.",
    B: "Comptez les strates de végétation qui couvrent au moins 20 % de la surface décrite.",
    C: "Comptez les bois morts sur pied sur la surface décrite : les grosses dimensions comptent le plus.",
    D: "Comptez les bois morts au sol sur la surface décrite : les grosses dimensions comptent le plus.",
    E: "Comptez les très gros bois et les gros bois vivants sur la surface décrite : les très gros bois comptent le plus.",
    G: "Estimez la part de la surface décrite occupée par des milieux ouverts fleuris.",
    H: "Choisissez l'ancienneté de l'état boisé de la station : récente, partielle ou ancienne.",
    I: "Cochez les types de milieux aquatiques présents dans le peuplement ou en bordure.",
    J: "Cochez les types de milieux rocheux présents dans le peuplement ou en bordure.",
  },
  // Follow-up 32-29: the hero card of every factor but F (F's is `dmhList.hero`): the figure the
  // observer cares about, what it counts and where it comes from. The figure shows a word while it
  // cannot be given yet. The spoken form reads "label, value".
  keyFigure: {
    label: {
      genera: "genres autochtones",
      strata: "strates de végétation",
      standingDeadwoodPerHa: "gros bois morts sur pied par hectare",
      groundDeadwoodPerHa: "gros bois morts au sol par hectare",
      veryLargeTreesPerHa: "très gros bois vivants par hectare",
      floweringOpen: "milieux ouverts fleuris",
      continuity: "continuité boisée",
      aquaticTypes: "types de milieux aquatiques",
      rockyTypes: "types de milieux rocheux",
    },
    sub: {
      fromList: "d'après la liste ci-dessous",
      fromChoices: "d'après vos choix",
      fromStrataCover: "d'après le couvert de chaque strate",
      fromDescribedSurface: "calculé d'après la surface décrite",
      shareOfSurface: "part de la surface",
      continuityAge: "ancienneté de l'état boisé",
    },
    pending: {
      compute: "À calculer",
      choose: "À choisir",
      estimate: "À estimer",
    },
    // A percentage keeps a no-break space before the sign.
    percent: ({ value }: { value: string }) => `${value}\u00A0%`,
    a11y: ({ label, value }: { label: string; value: string }) => `${label}, ${value}`,
    // The quiet pill and its spoken hint are F's (`dmhList.topScoreTrace`, `topScoreHint`).
  },
  // Phase 27 (D-13, D-18), follow-up 32-27: the two small pills at the top of each factor page, a
  // "Douteux" toggle and a "Note" that opens the field in place.
  // Neither changes the score. The note is visible to the members who can read the survey (D-06).
  strip: {
    doubt: {
      label: "Douteux",
      hint: "Signale un doute sur ce facteur. Le score ne change pas.",
    },
    note: {
      // The pill: "Note", or "Note : " and the start of the text once there is one (follow-up 32-27).
      label: "Note",
      withPreview: (preview: string) => `Note : ${preview}`,
      addA11y: (title: string) => `Ajouter une note au facteur ${title}`,
      editA11y: (title: string) => `Modifier la note du facteur ${title}`,
      closeA11y: (title: string) => `Fermer la note du facteur ${title}`,
      fieldLabel: (title: string) => `Note du facteur ${title}`,
      placeholder: "Ce que vous avez vu, pourquoi ce doute…",
      visibility: "Visible par les membres qui peuvent lire le relevé.",
      hint: "300 caractères au plus. Visible par les membres qui peuvent lire le relevé.",
      counter: ({ count, max }: { count: number; max: number }) => `${count} / ${max}`,
      counterA11y: ({ count, max }: { count: number; max: number }) =>
        `${count} caractères sur ${max}`,
    },
  },
  // Phase 32: the dendromicrohabitat group list of factor F
  // Texts verbatim from section 8.1 of docs/specs/dmh-guide-content-v1.md (validated 2026-10-27).
  dmhList: {
    // The one paragraph at the top of the page (follow-up 32-27), in three parts so the cap is
    // semibold: the cap per group, then where the guide is (32-22). The help link ends it.
    intro: {
      capped: {
        lead: "Comptez les arbres vivants porteurs de dendromicrohabitats : ",
        strong: "au plus 2 par groupe et par hectare",
        tail: ". Touchez l'icône i d'un groupe pour apprendre à le reconnaître, même sans réseau.",
      },
      full: {
        lead: "Comptez les arbres vivants porteurs de dendromicrohabitats, groupe par groupe. Pour le score, l'app garde ",
        strong: "au plus 2 arbres par hectare et par groupe",
        tail: ". Touchez l'icône i d'un groupe pour apprendre à le reconnaître, même sans réseau.",
      },
    },
    entry: {
      title: "Guide des dendromicrohabitats",
      caption: "Reconnaître chaque groupe, sans réseau.",
      // The spoken label of the whole entry row: title then caption.
      label: "Guide des dendromicrohabitats. Reconnaître chaque groupe, sans réseau.",
    },
    forms: {
      cavities: "Cavités",
      wounds: "Blessures et bois apparent",
      crown_deadwood: "Bois mort dans le houppier",
      growths: "Excroissances",
      fruiting_bodies: "Champignons et myxomycètes",
      epiphytic: "Plantes, nids et microsols",
      exudates: "Exsudats",
    },
    badge: ({ ticked, total }: { ticked: number; total: number }) => `${ticked} sur ${total}`,
    sectionA11y: ({ form, ticked, total }: { form: string; ticked: number; total: number }) =>
      ticked === 1
        ? `${form}, 1 groupe sur ${total} coché`
        : `${form}, ${ticked} groupes sur ${total} cochés`,
    treesCaption: "Arbres",
    // Follow-up of phase 32 (owner decision 2026-10-28): in the capped survey mode a group holds a
    // whole number of trees per hectare, 0 to 2, and the total is the sum of the groups.
    treesCaptionPerHa: "Arbres par hectare",
    // The hero card under the intro paragraph (follow-up 32-27): a read-only figure, its label and
    // where it comes from. The figure shows "À calculer" while the groups give no figure yet
    // (counted in full without a surface), and its spoken form reads "label, value".
    hero: {
      label: "arbres par hectare",
      subCapped: "somme des groupes comptés",
      subFull: "calculé d'après la surface décrite",
    },
    treesPerHaPending: "À calculer",
    treesPerHaA11y: ({ value }: { value: string }) => `Arbres par hectare, ${value}`,
    // The quiet pill of the hero once the evaluation retains F's top score; the toast that announces
    // it is the pager's (`fr.factorPager.maxScoreToast`).
    topScoreTrace: "Maximum",
    topScoreHint: "Score maximal atteint",
    lockedUntick: "Ramenez le nombre à 0 pour décocher ce groupe.",
    // Follow-up 32-25: the row above the sections that records "no group observed" (0 per hectare).
    none: {
      label: "Aucun arbre porteur de dendromicrohabitats",
      hint: "Enregistre 0 arbre par hectare et décoche les groupes",
      locked: "Ramenez d'abord les nombres des groupes à 0 pour choisir cette ligne.",
      lockedHint: "Ramenez d'abord les nombres des groupes à 0",
    },
    a11y: {
      info: ({ label }: { label: string }) => `En savoir plus sur ${label}`,
      infoHint: "Ouvre le guide à ce groupe",
      tickHint: "Double-tapez pour cocher ou décocher",
      tickLockedHint: "Ramenez d'abord le nombre à 0 pour décocher",
      withCount: ({ label, trees }: { label: string; trees: number }) =>
        `${label}, ${trees === 1 ? "1 arbre" : `${trees} arbres`}`,
      withCountPerHa: ({ label, trees }: { label: string; trees: number }) =>
        `${label}, ${trees === 1 ? "1 arbre" : `${trees} arbres`} par hectare`,
      add: ({ label }: { label: string }) => `Compter un arbre dans ${label}`,
      addHint: "Coche le groupe et compte 1",
    },
    stepper: {
      label: ({ label }: { label: string }) => `Nombre d'arbres, ${label}`,
      value: ({ trees }: { trees: number }) => (trees === 1 ? "1 arbre" : `${trees} arbres`),
      increment: "Ajouter un arbre",
      decrement: "Retirer un arbre",
      editHint: "Double-tapez pour saisir le nombre",
      // The capped survey mode: trees per hectare, held at `max` per group.
      valueCapped: ({ trees, max }: { trees: number; max: number }) =>
        `${trees === 1 ? "1 arbre" : `${trees} arbres`} par hectare, au plus ${max}`,
      editHintCapped: ({ max }: { max: number }) =>
        `Double-tapez pour saisir le nombre, ${max} au plus`,
    },
  },
} as const
