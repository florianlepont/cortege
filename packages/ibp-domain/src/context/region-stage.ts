// v3.0 station context: the region (ACA = Atlantique, Continental, Alpin; M = Méditerranéen) and
// the vegetation stage. Only the v3.0 rules read them; v3.2 surveys carry `ibp_cas` instead (D-08).

export const REGION_VERSIONS = ["ACA", "M"] as const

export type RegionVersion = (typeof REGION_VERSIONS)[number]

export type VegetationStage =
  | "planitiaire"
  | "collineen"
  | "montagnard"
  | "subalpin"
  | "thermo_mediterraneen"
  | "meso_mediterraneen"
  | "supra_mediterraneen"

/** Stages offered per region, in form order (mobile `VEGETATION_STAGE_OPTIONS_BY_REGION`). */
export const VEGETATION_STAGES_BY_REGION: Readonly<
  Record<RegionVersion, readonly VegetationStage[]>
> = {
  ACA: ["planitiaire", "collineen", "montagnard", "subalpin"],
  M: ["thermo_mediterraneen", "meso_mediterraneen", "supra_mediterraneen"],
}

/** The first stage of each region: the form's default. */
export const DEFAULT_VEGETATION_STAGE_BY_REGION: Readonly<Record<RegionVersion, VegetationStage>> =
  {
    ACA: "planitiaire",
    M: "thermo_mediterraneen",
  }

/**
 * Legacy stage no form offers any more; the pre-01.8 engines scored it with the ACA thresholds and
 * the form maps it to "montagnard".
 */
const MONTAGNARD_MEDITERRANEEN = "montagnard_mediterraneen"

export function normalizeRegion(raw: unknown): RegionVersion | null {
  return raw === "ACA" || raw === "M" ? raw : null
}

/** A stage of `region`, else the region's default (a legacy montagnard_mediterraneen → montagnard). */
export function normalizeVegetationStageForRegion(
  region: RegionVersion,
  stage: unknown,
): VegetationStage {
  if (typeof stage !== "string") {
    return DEFAULT_VEGETATION_STAGE_BY_REGION[region]
  }
  if (region === "ACA" && stage === MONTAGNARD_MEDITERRANEEN) {
    return "montagnard"
  }
  const match = VEGETATION_STAGES_BY_REGION[region].find((option) => option === stage)
  return match ?? DEFAULT_VEGETATION_STAGE_BY_REGION[region]
}

/**
 * Region used for thresholds: a montagnard_mediterraneen stage counts as ACA whatever the stored
 * region (pre-01.8 `resolveThresholdRegion`).
 */
export function resolveThresholdRegion(region: unknown, stage: unknown): RegionVersion | null {
  if (stage === MONTAGNARD_MEDITERRANEEN) {
    return "ACA"
  }
  return normalizeRegion(region)
}

/** v3.0: A and G use the subalpine scale only in region ACA at the subalpine stage. */
export function usesSubalpineScale(region: unknown, stage: unknown): boolean {
  return resolveThresholdRegion(region, stage) === "ACA" && stage === "subalpin"
}
