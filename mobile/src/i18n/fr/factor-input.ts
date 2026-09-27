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
  },
  slider: {
    decrease: ({ label }: { label: string }) => `Diminuer ${label} de 5 %`,
    increase: ({ label }: { label: string }) => `Augmenter ${label} de 5 %`,
    valueLabel: ({ label, percent }: { label: string; percent: number }) =>
      `${label} : ${percent} %`,
    fieldLabel: ({ label, percent }: { label: string; percent: number }) =>
      `${label} — ${percent} %`,
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
  // FLOW-01: factors I and J are checkable chips with a derived count (only the count is sent to
  // the domain package — see packages/ibp-domain/src/rules/common.ts scoreFactorIJ). These labels
  // are illustrative field categories, not a reproduction of the CNPF methodology's own taxonomy
  // (that PDF is not redistributed in this repo, docs/references/).
  aquaticHabitatOptions: [
    { value: "spring", label: "Source" },
    { value: "stream", label: "Ruisseau" },
    { value: "pond", label: "Mare ou étang" },
    { value: "temporary_wetland", label: "Zone humide temporaire" },
    { value: "other_water", label: "Autre point d'eau" },
  ],
  rockyHabitatOptions: [
    { value: "outcrop", label: "Affleurement rocheux" },
    { value: "scree", label: "Éboulis" },
    { value: "cliff", label: "Falaise" },
    { value: "boulders", label: "Blocs ou blocailles" },
    { value: "cavity", label: "Cavité ou fissure" },
  ],
  // FLOW-01: factor H segmented control (0/2/5 only, BUG-2).
  continuityOptions: [
    { value: "0", label: "Récente" },
    { value: "2", label: "Partielle" },
    { value: "5", label: "Ancienne" },
  ],
} as const
