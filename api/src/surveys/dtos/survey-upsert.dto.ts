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
} from "class-validator"
import { IBP_CAS_VALUES, IBP_METHOD_VERSIONS } from "@cortege/ibp-domain"
import { SAFE_ID_PATTERN } from "../../common/safe-id"
import { MAX_PARCEL_IDS, PARCEL_ID_PATTERN } from "./parcel-id.constants"

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

  @IsOptional()
  @IsObject()
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
