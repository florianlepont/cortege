import { Platform } from "react-native"
import {
  DEFAULT_IBP_METHOD_VERSION,
  IBP_METHOD_V3_2,
  type IbpCas,
  type IbpMethodVersion,
} from "@cortege/ibp-domain"
import { fr } from "../i18n"
import { FactorKey, RegionVersion, VegetationStage } from "./types"
import {
  REGION_OPTIONS,
  VEGETATION_STAGE_OPTIONS_BY_REGION,
  defaultVegetationStageForRegion,
  normalizeVegetationStageForRegion,
} from "./vegetation"

export const DEFAULT_API_URL = Platform.select({
  ios: "http://localhost:3000/v1",
  android: "http://10.0.2.2:3000/v1",
  default: "http://localhost:3000/v1",
})

export const HELP_BY_FACTOR: Record<FactorKey, string> = fr.labels.factorHelp

export const FACTOR_TITLES: Record<FactorKey, string> = fr.labels.factorTitles

export const FACTOR_INPUT_HINTS_BY_FACTOR: Record<FactorKey, readonly string[]> =
  fr.labels.factorInputHints

export type FactorHelpTexts = {
  help: Record<FactorKey, string>
  hints: Record<FactorKey, readonly string[]>
}

/**
 * The factor help and input hints of a survey's method version (D-09, CH-8): the v3.2 texts for
 * v3.2, the v3.0 texts otherwise (null is an untagged legacy survey, so v3.0).
 */
export const helpForMethod = (version: IbpMethodVersion | null): FactorHelpTexts =>
  version === IBP_METHOD_V3_2
    ? { help: fr.ibpMethod.factorHelp, hints: fr.ibpMethod.factorInputHints }
    : { help: fr.labels.factorHelp, hints: fr.labels.factorInputHints }

export {
  REGION_OPTIONS,
  VEGETATION_STAGE_OPTIONS_BY_REGION,
  defaultVegetationStageForRegion,
  normalizeVegetationStageForRegion,
}

export const DEFAULT_SURVEY_FORM = {
  siteName: "",
  regionVersion: "ACA" as RegionVersion,
  vegetationStage: "collineen" as VegetationStage,
  // A new survey follows v3.2 with cas 1 preselected (D-02, D-08; owner review item A6). An
  // untagged legacy draft keeps null (= v3.0) in the form and is never stamped.
  ibpMethodVersion: DEFAULT_IBP_METHOD_VERSION as IbpMethodVersion | null,
  ibpCas: 1 as IbpCas | null,
  ibpCas3Scale: false,
  gpsLocation: {
    lat: "",
    lng: "",
    collected_at: "",
  },
  // The native cover belongs to A (CH-1, BUG-1); B keeps the strata count only.
  factorA: { native_genus_count: "", native_cover_percent: "" },
  factorB: { strata_count: "" },
  factorC: { bmg_count: "", bmm_count: "", surface_ha: "" },
  factorD: { bmg_count: "", bmm_count: "", surface_ha: "" },
  factorE: { tgb_count: "", gb_count: "", surface_ha: "" },
  factorF: { trees_per_ha: "" },
  factorG: { open_flowering_percent: "" },
  factorH: { class_score: "" },
  factorI: { type_count: "" },
  factorJ: { type_count: "" },
}
