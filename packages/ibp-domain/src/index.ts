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
  ALLOWED_SCORES_BY_FACTOR,
  allowedScoresFor,
  isAllowedFactorScore,
  scoreFloweringPercent,
  scoreGenusCount,
  scoreStrataCount,
  scoreTreeDensity,
  scoreTypeCount,
} from "./rules/scales"

export { IBP_MAX, bandTone, contextBand, standBand, totalBand } from "./bands"
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
