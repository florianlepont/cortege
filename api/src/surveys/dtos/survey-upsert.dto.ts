import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Validate,
  ValidateNested,
} from "class-validator"
import { Type } from "class-transformer"
import { IBP_CAS_VALUES, IBP_METHOD_VERSIONS, SURVEY_NOTE_MAX_LENGTH } from "@cortege/ibp-domain"
import { SAFE_ID_PATTERN } from "../../common/safe-id"
import { FactorAnnotationsConstraint } from "./factor-annotations.constraint"
import { MAX_PARCEL_IDS, PARCEL_ID_PATTERN } from "./parcel-id.constants"
import { SurveyRouteConstraint } from "./survey-route.constraint"
import { SurveyRouteDto } from "./survey-route.dto"
import { SurveyWeatherDto } from "./survey-weather.dto"

export class SurveyUpsertDto {
  // D-14: the id can become a storage key segment, so it must be a safe id.
  @IsOptional()
  @IsString()
  @Matches(SAFE_ID_PATTERN)
  id?: string

  @IsOptional()
  @IsNumber()
  sync_version?: number

  @IsOptional()
  @IsString()
  site_name?: string

  @IsOptional()
  @IsEnum(["draft", "submitted", "synced", "error"])
  status?: "draft" | "submitted" | "synced" | "error"

  @IsOptional()
  @IsEnum(["private", "public"])
  visibility?: "private" | "public"

  @IsOptional()
  @IsString()
  @Matches(PARCEL_ID_PATTERN)
  parcel_id?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PARCEL_IDS)
  @IsString({ each: true })
  @Matches(PARCEL_ID_PATTERN, { each: true })
  parcel_ids?: string[]

  @IsOptional()
  @IsNumber()
  observation_year?: number

  @IsOptional()
  @IsNumber()
  version_number?: number

  @IsOptional()
  @IsString()
  previous_survey_id?: string

  @IsOptional()
  @IsEnum(["ACA", "M"])
  region_version?: "ACA" | "M"

  @IsOptional()
  @IsString()
  vegetation_stage?: string

  // Phase 01.8 (D-02, D-08 amended): the survey's IBP method. Absent or null means v3.0. Declared
  // here so /v1/sync, which strips undeclared fields, keeps them (RESEARCH Pitfall 3).
  @IsOptional()
  @IsIn([...IBP_METHOD_VERSIONS])
  ibp_method_version?: string | null

  @IsOptional()
  @IsIn([...IBP_CAS_VALUES])
  ibp_cas?: number | null

  @IsOptional()
  @IsBoolean()
  ibp_cas3_scale?: boolean | null

  // Phase 27 (D-01, D-05): the free note of the whole survey, at most 1000 characters. Declared
  // here so /v1/sync, which strips undeclared fields, keeps it (research Pitfall 3).
  @IsOptional()
  @IsString()
  @MaxLength(SURVEY_NOTE_MAX_LENGTH)
  survey_note?: string | null

  // Phase 27 (D-09): the weather of the visit, a nested object with every key declared.
  @IsOptional()
  @ValidateNested()
  @Type(() => SurveyWeatherDto)
  weather?: SurveyWeatherDto | null

  // Phase 30 (D-08, D-09): the recorded route ("Parcours utilise"), a nested object with every key
  // declared; the cross-field rules are the package's (validateSurveyRoute). Absent or null passes
  // here: whether a route is required is decided by the service (plan 30-10).
  @IsOptional()
  @ValidateNested()
  @Type(() => SurveyRouteDto)
  @Validate(SurveyRouteConstraint)
  survey_route?: SurveyRouteDto | null

  // Phase 27 (D-01, D-23): `factors.annotations` (doubt and note per factor) rides in the factors
  // object; its shape is the package's (factorAnnotationsIssues), not a rule written here.
  @IsOptional()
  @IsObject()
  @Validate(FactorAnnotationsConstraint)
  factors?: Record<string, unknown>

  @IsOptional()
  @IsObject()
  scores?: Record<string, unknown>

  // OA-41: there is no submission deadline any more. Accepted and ignored, because the app builds
  // from before still send it and the pipe rejects unknown properties.
  @IsOptional()
  @IsString()
  expires_at?: string
}
