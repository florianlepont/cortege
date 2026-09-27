import {
  DEFAULT_VEGETATION_STAGE_BY_REGION,
  REGION_VERSIONS,
  VEGETATION_STAGES_BY_REGION,
} from "@cortege/ibp-domain"
import { fr } from "../i18n"
import { RegionVersion, VegetationStage } from "./types"

// The v3.0 station context: the regions, stages, defaults and normaliser come from the shared
// package (phase 01.8); this module only adds the French labels of the form's chips.
export { normalizeVegetationStageForRegion } from "@cortege/ibp-domain"

const regions = fr.labels.regions
const stages = fr.labels.vegetationStages

export const REGION_OPTIONS: Array<{ value: RegionVersion; label: string }> = REGION_VERSIONS.map(
  (region) => ({ value: region, label: regions[region] }),
)

const stageOptions = (region: RegionVersion): Array<{ value: VegetationStage; label: string }> =>
  VEGETATION_STAGES_BY_REGION[region].map((stage) => ({ value: stage, label: stages[stage] }))

export const VEGETATION_STAGE_OPTIONS_BY_REGION: Record<
  RegionVersion,
  Array<{ value: VegetationStage; label: string }>
> = {
  ACA: stageOptions("ACA"),
  M: stageOptions("M"),
}

export const defaultVegetationStageForRegion = (region: RegionVersion): VegetationStage =>
  DEFAULT_VEGETATION_STAGE_BY_REGION[region]
