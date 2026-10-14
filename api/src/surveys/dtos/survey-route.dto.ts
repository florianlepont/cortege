import {
  ArrayMaxSize,
  Equals,
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from "class-validator"
import { Type } from "class-transformer"
import type {
  CountingMode,
  RouteChosenBy,
  RouteExperience,
  RouteHomogeneity,
  RouteMethod,
  UncappableFactor,
} from "@cortege/ibp-domain"
import {
  COUNTING_MODES,
  ROUTE_CHOSEN_BY_VALUES,
  ROUTE_EXPERIENCE_VALUES,
  ROUTE_HOMOGENEITY_VALUES,
  ROUTE_HOURS_MAX,
  ROUTE_METHODS,
  ROUTE_SURFACE_MAX_HA,
  SURVEY_ROUTE_VERSION,
  UNCAPPABLE_FACTORS,
} from "@cortege/ibp-domain"

// Phase 30 (D-08, D-09): the recorded route ("Parcours utilise"), nested in SurveyUpsertDto. Every
// key of the package type SurveyRoute (spec docs/specs/route-choice-rules-v1.md section 8) is
// declared here, because /v1/sync strips undeclared nested keys (whitelist) and POST /v1/surveys
// rejects them (forbidNonWhitelisted); an undeclared key would otherwise be lost silently on a
// replay (Phase 27 Pitfall 3). Enums and bounds come from the package constants. The cross-field
// rules (a complement only on a partial route, factors only when uncapped, a total not below the
// zone, canonical rounding and order) are written once, in the package validator, and applied by
// SurveyRouteConstraint on the whole record. The record holds no free text.
// Phase 31 will extend this DTO for its trace reference.

// Answers of the guide: only the questions that were needed and answered are present.
export class SurveyRouteAnswersDto {
  @IsNumber()
  @Min(0)
  @Max(ROUTE_SURFACE_MAX_HA)
  surface_ha!: number

  @IsOptional()
  @IsIn([...ROUTE_HOMOGENEITY_VALUES])
  homogeneity?: RouteHomogeneity

  @IsOptional()
  @IsBoolean()
  difficulty?: boolean

  @IsOptional()
  @IsBoolean()
  narrow?: boolean

  @IsOptional()
  @IsIn([...ROUTE_EXPERIENCE_VALUES])
  experience?: RouteExperience

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(ROUTE_HOURS_MAX)
  hours_available?: number

  @IsOptional()
  @IsBoolean()
  subdivided?: boolean
}

// What the guide last proposed.
export class SurveyRouteSuggestionDto {
  @IsIn([...ROUTE_METHODS])
  method!: RouteMethod

  @IsIn([...COUNTING_MODES])
  counting!: CountingMode
}

// What led to the choice.
export class SurveyRouteGuideDto {
  @IsIn([...ROUTE_CHOSEN_BY_VALUES])
  chosen_by!: RouteChosenBy

  @IsOptional()
  @ValidateNested()
  @Type(() => SurveyRouteSuggestionDto)
  suggested?: SurveyRouteSuggestionDto

  @IsOptional()
  @ValidateNested()
  @Type(() => SurveyRouteAnswersDto)
  answers?: SurveyRouteAnswersDto
}

// "Releve complementaire dans la zone non echantillonnee" of a partial route.
export class SurveyRouteComplementDto {
  @IsBoolean()
  done!: boolean

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(ROUTE_SURFACE_MAX_HA)
  total_surface_ha?: number
}

export class SurveyRouteDto {
  @Equals(SURVEY_ROUTE_VERSION)
  version!: 1

  @IsIn([...ROUTE_METHODS])
  method!: RouteMethod

  @IsIn([...COUNTING_MODES])
  counting!: CountingMode

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(UNCAPPABLE_FACTORS.length)
  @IsIn([...UNCAPPABLE_FACTORS], { each: true })
  uncapped_factors?: UncappableFactor[]

  @IsNumber()
  @Min(0)
  @Max(ROUTE_SURFACE_MAX_HA)
  zone_surface_ha!: number

  @IsOptional()
  @ValidateNested()
  @Type(() => SurveyRouteComplementDto)
  complement?: SurveyRouteComplementDto

  @IsDefined()
  @ValidateNested()
  @Type(() => SurveyRouteGuideDto)
  guide!: SurveyRouteGuideDto
}
