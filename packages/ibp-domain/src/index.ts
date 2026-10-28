// Public entry of @cortege/ibp-domain: the only module the API and the app import.
export * from "./factors"
export * from "./method-version"
export * from "./contract"

export {
  DEFAULT_VEGETATION_STAGE_BY_REGION,
  REGION_VERSIONS,
  VEGETATION_STAGES_BY_REGION,
  normalizeRegion,
  normalizeVegetationStageForRegion,
  usesSubalpineScale,
} from "./context/region-stage"
export type { RegionVersion, VegetationStage } from "./context/region-stage"

export { IBP_CAS_VALUES, casFromRegionStage, isIbpCas, usesCas3Scale } from "./context/cas"
export type { IbpCas } from "./context/cas"

export {
  FACTOR_ANNOTATIONS_KEY,
  FACTOR_NOTE_MAX_LENGTH,
  SURVEY_NOTE_MAX_LENGTH,
  WEATHER_EDITABLE_KEYS,
  WEATHER_LOOKBACK_MS,
  WEATHER_RANGES,
  WEATHER_SKY_CODES,
  WEATHER_SOURCES,
  canonicalFactorAnnotations,
  factorAnnotationsIssues,
  isWeatherSkyCode,
  normalizeNoteText,
  readFactorAnnotations,
  withFactorAnnotations,
} from "./conditions"

export * from "./route"

export {
  B_STRATUM_CODES,
  DMH_GROUP_CODES,
  DMH_GROUP_DENSITY_CAP_PER_HA,
  STRATUM_MIN_COVER_PERCENT,
  UNCAPPED_DETAIL_KEYS,
  cappedDmhCounts,
  cappedDmhTotalPerHa,
  dmhDensityPerHa,
  readDmhCounts,
  readStrataCover,
  strataCountFromCover,
} from "./factor-details"
export type {
  BStratumCode,
  DmhCounts,
  DmhDensity,
  DmhGroupCode,
  StrataCover,
} from "./factor-details"

export {
  allowedFactorAGenusCodes,
  CNPF_FACTOR_A_GENUS_CODES,
  CNPF_FACTOR_A_MAIN_GENERA,
  CNPF_FACTOR_A_SUPPLEMENTARY_GENERA,
  isCnpfFactorAGenusCode,
  isSupplementaryFactorAGenus,
} from "./genus"
export type { CnpfFactorAGenusCode } from "./genus"

export {
  ALLOWED_SCORES_BY_FACTOR,
  allowedScoresFor,
  isAllowedFactorScore,
  scoreFloweringPercent,
  scoreGenusCount,
  scoreStrataCount,
  scoreTreeDensity,
  scoreTypeCount,
} from "./rules/scales"

// Read-only readers of the raw inputs the scorers use, for the figures the app shows beside a
// factor (A's genus count, the per-hectare densities of C, D and E). The scorers call the same
// code, so a displayed figure can never drift from the one the score is read from.
export {
  DENSITY_COUNT_KEYS,
  densityLowerCountNeeded,
  readDensityPerHa,
  readFactorAGenusCount,
} from "./rules/common"
export type { DensityFactor, DensityPerHa, GenusCountOutcome } from "./rules/common"

export {
  CONTEXT_BAND_CUT_OFFS,
  IBP_MAX,
  STAND_BAND_CUT_OFFS,
  bandTone,
  contextBand,
  standBand,
  totalBand,
} from "./bands"
export type { ContextBand, ScoreTone, StandBand, TotalBand } from "./bands"

export { computeRetainedScores, computeTotals, evaluateIbp } from "./evaluate"
export type {
  FactorRetainedScore,
  IbpEvaluation,
  IbpEvaluationInput,
  IbpEvaluationMode,
  IbpSurveyContext,
  IbpValidationIssue,
} from "./evaluate"

export { evaluateSubmitReadiness } from "./readiness"
export type { SubmitReadiness, SubmitReadinessField } from "./readiness"

export { migrateDraftToV32 } from "./migrate"

// The parity fixture, exported from the main entry: the only path the API (node10), Metro and
// both Jest mappers all resolve (RESEARCH §2.3).
export { IBP_MIGRATION_CASES, IBP_PARITY_CASES, IBP_READINESS_CASES } from "./parity/cases"
export type { IbpMigrationCase, IbpParityCase, IbpReadinessCase } from "./parity/cases"
