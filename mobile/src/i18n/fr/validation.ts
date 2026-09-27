// Form validation messages of hooks/useSurveyForm.ts (plan 01.9-21, D-06).
// Keyed on the raw factor field names (D-12 item 3, checked in 01.9-32 against
// packages/ibp-domain: native_genus_count, strata_count, bmg_count, bmm_count,
// surface_ha, tgb_count, gb_count, trees_per_ha, open_flowering_percent,
// class_score, type_count are unchanged in packages/ibp-domain/src/rules/*.ts
// and packages/ibp-domain/src/rules/common.ts). This catalogue only formats
// the client-side text-input rules (required/number/integer/min/max/oneOf);
// it is independent of evaluateIbp's own issue codes (factor_required,
// factor_invalid_raw, factor_invalid_score, factor_incomplete,
// ibp_method_version_unsupported), which are unchanged too and are not
// surfaced through these per-field messages. Keep these field names in sync
// with the package if a factor's raw shape ever changes.

const formatNumber = (value: number): string => String(value).replace(".", ",")

export const validationFr = {
  // Label per form field key; also shown as the field label in the factor detail.
  fields: {
    siteName: "Nom du site",
    native_genus_count: "Nombre de genres autochtones",
    native_cover_percent: "Couvert des essences autochtones (%)",
    strata_count: "Nombre de strates",
    covered_autochthonous_percent: "Couvert autochtone (%)",
    bmg_count: "Nombre de BMg",
    bmm_count: "Nombre de BMm",
    surface_ha: "Surface (ha)",
    tgb_count: "Nombre de TGB",
    gb_count: "Nombre de GB",
    trees_per_ha: "Arbres par ha",
    open_flowering_percent: "Milieux ouverts fleuris (%)",
    class_score: "Classe (0, 2 ou 5)",
    type_count: "Nombre de types",
  },
  rules: {
    required: (label: string) => `${label} : champ obligatoire`,
    number: (label: string) => `${label} : saisissez un nombre`,
    integer: (label: string) => `${label} : saisissez un nombre entier`,
    min: (label: string, min: number) =>
      `${label} : la valeur doit être au moins ${formatNumber(min)}`,
    max: (label: string, max: number) =>
      `${label} : la valeur doit être au plus ${formatNumber(max)}`,
    oneOf: (label: string, allowed: string) => `${label} : valeurs possibles ${allowed}`,
  },
} as const
