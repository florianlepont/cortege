// Filled by plan 01.9-17; no other plan edits this section.
export const factorDetailFr = {
  fieldsProgress: ({ filledCount, totalCount }: { filledCount: number; totalCount: number }) =>
    `${filledCount}/${totalCount} champs`,
  requiredField: ({ label }: { label: string }) => `${label} *`,
  numericPlaceholder: "Saisissez une valeur numérique",
  // OA-30: the help is behind a link, not a card open by default; the sheet closes with its button.
  helpLink: "Que relever ?",
  helpTitle: "Que relever ?",
  helpClose: "Fermer l'aide",
  // Phase 25.1 (D-12): labels of the optional detail lists that sit next to a scored value.
  companionLabels: {
    dmh_groups: "Groupes de dendromicrohabitats observés",
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
    F: "Relevé déplafonné : comptez les arbres porteurs de dendromicrohabitats, groupe par groupe. Pour le score, l'app garde au plus 2 arbres par hectare et par groupe.",
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
    dmhTitle: "Arbres par groupe de dendromicrohabitats",
    dmhHelper: "Pour le score, l'app garde au plus 2 arbres par hectare et par groupe.",
    dmhSurfaceLabel: "Surface décrite pour ce comptage (ha)",
    zoneLine: ({ hectares }: { hectares: string }) => `Surface décrite : ${hectares} ha`,
    fromRoute: "D'après le parcours",
  },
  // Phase 27 (D-13, D-18): the strip under each factor, a "Douteux" flag and a short note.
  // Neither changes the score. The note is visible to the members who can read the survey (D-06).
  strip: {
    doubt: {
      label: "Douteux",
      hint: "Signale un doute sur ce facteur. Le score ne change pas.",
    },
    note: {
      add: "Ajouter une note",
      edit: "Modifier la note",
      close: "Fermer la note",
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
    // The one helper line under the heading: where the guide is (32-22).
    infoHelper: "Touchez l'icône i d'un groupe pour apprendre à le reconnaître, même sans réseau.",
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
    summaryNone: "Aucun groupe coché.",
    summaryCapped: ({ groups }: { groups: number }) =>
      groups === 1 ? "1 groupe coché" : `${groups} groupes cochés`,
    summaryFull: ({ groups, trees }: { groups: number; trees: number }) =>
      `${groups === 1 ? "1 groupe" : `${groups} groupes`}, ${trees === 1 ? "1 arbre" : `${trees} arbres`}`,
    treesCaption: "Arbres",
    // Follow-up of phase 32 (owner decision 2026-10-28): in the capped survey mode a group holds a
    // whole number of trees per hectare, 0 to 2, and the total is the sum of the groups.
    treesCaptionPerHa: "Arbres par hectare",
    // The sum of the groups is the figure of the sum line below it (follow-up 32-26).
    cappedHelper:
      "Comptez au plus 2 arbres par hectare pour chaque groupe : la somme donne le total.",
    // The sum line of the counting modes (follow-up 32-26): a plain line, not a field. It shows
    // "À calculer" while the groups give no figure yet (counted in full without a surface), and its
    // spoken form reads "label, value".
    sumLabel: "Arbres par hectare :",
    treesPerHaPending: "À calculer",
    treesPerHaA11y: ({ value }: { value: string }) => `Arbres par hectare, ${value}`,
    // Beside the sum once the evaluation retains F's top score; the toast that announces it is the
    // pager's (`fr.factorPager.maxScoreToast`).
    topScoreTrace: "maximum",
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
