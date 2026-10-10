// Phase 3 (FLOW-01/02): the four FactorInput variants and their shared a11y copy.
export const factorInputFr = {
  counter: {
    decrease: ({ label }: { label: string }) => `Diminuer ${label}`,
    increase: ({ label }: { label: string }) => `Augmenter ${label}`,
    editValue: ({ label, value }: { label: string; value: string }) =>
      `${label}, valeur actuelle ${value}. Toucher pour saisir un nombre`,
  },
  segmented: {
    a11yHint: "Choisissez une seule valeur",
  },
  chips: {
    selectedCount: ({ count }: { count: number }) =>
      count === 0 ? "Aucun sélectionné" : count === 1 ? "1 sélectionné" : `${count} sélectionnés`,
    // Phase 25.1 (D-12): a draft saved before the detail was stored has a count and no selection.
    legacyCount: ({ count }: { count: number }) =>
      count === 1
        ? "1 coché avant l'enregistrement du détail : cochez pour préciser"
        : `${count} cochés avant l'enregistrement du détail : cochez pour préciser`,
  },
  slider: {
    decrease: ({ label }: { label: string }) => `Diminuer ${label} de 5 %`,
    increase: ({ label }: { label: string }) => `Augmenter ${label} de 5 %`,
    valueLabel: ({ label, percent }: { label: string; percent: number }) =>
      `${label} : ${percent} %`,
    fieldLabel: ({ label, percent }: { label: string; percent: number }) =>
      `${label} : ${percent} %`,
  },
  // FLOW-01: factor B (5 strata tiers, chip-derived count). Height thresholds vary by cas/version
  // and are already shown in FactorDetailScreen's "Que relever" hints panel, so the tier names
  // stay generic here.
  strataOptions: [
    { value: "very_low", label: "Très basse" },
    { value: "low", label: "Basse" },
    { value: "intermediate", label: "Intermédiaire" },
    { value: "high", label: "Haute" },
    { value: "herbaceous", label: "Herbacée / semi-ligneuse" },
  ],
  // Phase 25.1 (D-09, D-12): the official CNPF typology of aquatic habitats (factor I) per method.
  // The stored option codes are shared across methods, so a code of the other method stays valid.
  aquaticHabitatTypes: {
    v3_2: [
      { value: "spring_seep", label: "Source ou suintement" },
      {
        value: "rill_ditch",
        label: "Ruisselet, fossé humide non entretenu ou petit canal (moins de 1 m)",
      },
      { value: "small_stream", label: "Petit cours d'eau (1 à 8 m)" },
      { value: "river", label: "Rivière ou fleuve, estuaire ou delta (plus de 8 m)" },
      { value: "oxbow", label: "Bras mort" },
      { value: "lake", label: "Lac ou plan d'eau profond" },
      { value: "pond_lagoon", label: "Étang, lagune ou plan d'eau peu profond" },
      { value: "pool", label: "Mare ou autre petit point d'eau" },
      { value: "peat_bog", label: "Tourbière" },
      { value: "marsh", label: "Zone marécageuse" },
      { value: "sea", label: "Mer ou océan" },
    ],
    v3_0: [
      { value: "spring_seep", label: "Source ou suintement" },
      {
        value: "rill_ditch",
        label: "Ruisselet, fossé humide non entretenu ou petit canal (moins de 1 m)",
      },
      { value: "small_stream", label: "Petit cours d'eau (1 à 8 m)" },
      { value: "river", label: "Rivière ou fleuve, estuaire ou delta (plus de 8 m)" },
      { value: "oxbow", label: "Bras mort" },
      { value: "lake", label: "Lac ou plan d'eau profond" },
      { value: "pond_lagoon", label: "Étang, lagune ou plan d'eau peu profond" },
      { value: "pool", label: "Mare ou autre petit point d'eau" },
      { value: "peat_bog", label: "Tourbière" },
      { value: "marsh", label: "Zone marécageuse" },
    ],
  },
  // Factor J: the official CNPF typology of rocky habitats per method.
  rockyHabitatTypes: {
    v3_2: [
      { value: "cliff_high", label: "Falaise ou paroi plus haute que les arbres adultes" },
      { value: "rock_wall_low", label: "Paroi rocheuse plus basse que les arbres adultes" },
      { value: "slab", label: "Dalle" },
      { value: "lapiaz", label: "Lapiaz ou grande diaclase fraîche" },
      { value: "cave", label: "Grotte ou gouffre" },
      { value: "unstable_scree", label: "Éboulis instable" },
      {
        value: "stable_blocks",
        label:
          "Amoncellement de blocs stables (éboulis stable, tas de pierres, ruine, murette de plus de 20 m)",
      },
      { value: "boulder_chaos", label: "Chaos de blocs de plus de 2 m" },
      {
        value: "large_blocks",
        label: "Gros blocs (plus de 20 cm) ou affleurements autres que dalle ou lapiaz",
      },
      { value: "pebble_bank", label: "Banc de galets (hors lit mineur)" },
      {
        value: "fine_sediment",
        label: "Dépôt de sédiments fins peu végétalisé (dépôt alluvial hors lit mineur, dune)",
      },
      {
        value: "loose_bank",
        label: "Berge verticale meuble ou paroi de matériau meuble peu végétalisée",
      },
    ],
    v3_0: [
      { value: "cliff_high", label: "Falaise plus haute que le peuplement" },
      { value: "slab", label: "Dalle" },
      { value: "lapiaz", label: "Lapiaz ou diaclase" },
      { value: "cave", label: "Grotte ou gouffre" },
      { value: "stable_blocks", label: "Amoncellement de blocs stables" },
      { value: "pebble_bank", label: "Banc de galets" },
      { value: "unstable_scree", label: "Éboulis instable" },
      { value: "boulder_chaos", label: "Chaos de blocs de plus de 2 m" },
      {
        value: "lower_rock",
        label: "Rocher plus bas que le peuplement (gros blocs, paroi basse, affleurement)",
      },
    ],
  },
  // Factor F: the 15 dendromicrohabitat groups of the CNPF sheet, same for both methods.
  dmhGroupOptions: [
    { value: "dmh_01", label: "1. Loges de pic" },
    { value: "dmh_02", label: "2. Cavités à terreau" },
    { value: "dmh_03", label: "3. Orifices et galeries d'insectes" },
    { value: "dmh_04", label: "4. Concavités" },
    { value: "dmh_05", label: "5. Aubier apparent" },
    { value: "dmh_06", label: "6. Aubier et bois de cœur apparents" },
    { value: "dmh_07", label: "7. Bois mort dans le houppier" },
    { value: "dmh_08", label: "8. Agglomérations de gourmands ou de rameaux" },
    { value: "dmh_09", label: "9. Loupes et chancres" },
    { value: "dmh_10", label: "10. Champignons pérennes" },
    { value: "dmh_11", label: "11. Champignons éphémères" },
    { value: "dmh_12", label: "12. Plantes et lichens épiphytiques ou parasites" },
    { value: "dmh_13", label: "13. Nids" },
    { value: "dmh_14", label: "14. Microsols" },
    { value: "dmh_15", label: "15. Coulées de sève et de résine" },
  ],
  // Factor H: the three sources of the continuity of the forest state on the CNPF sheet.
  continuityEvidenceOptions: [
    { value: "etat_major_map", label: "Carte de l'état-major" },
    { value: "later_documents", label: "Photos aériennes ou documents postérieurs" },
    { value: "field_signs", label: "Indices de terrain" },
  ],
  // FLOW-01: factor H segmented control (0/2/5 only, BUG-2).
  continuityOptions: [
    { value: "0", label: "Récente" },
    { value: "2", label: "Partielle" },
    { value: "5", label: "Ancienne" },
  ],
} as const
