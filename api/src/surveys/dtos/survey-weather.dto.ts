import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  Max,
  MaxLength,
  Min,
} from "class-validator"
import type { WeatherEditableKey, WeatherSkyCode, WeatherSource } from "@cortege/ibp-domain"
import {
  WEATHER_EDITABLE_KEYS,
  WEATHER_RANGES,
  WEATHER_SKY_CODES,
  WEATHER_SOURCES,
} from "@cortege/ibp-domain"

// Phase 27 (D-09, D-10, D-11): the weather of a survey, nested in SurveyUpsertDto. Every key of
// SurveyWeather must be declared here, because /v1/sync strips undeclared nested keys (whitelist)
// and the overwrite guard of the app needs `edited` and `requested_at` to survive a round trip
// (research Pitfall 3). The numeric bounds come from the package; there is no decimal-places rule,
// so a rounding difference on the phone can never become a fatal sync error. Each key is optional
// and nullable: absent or null means no value.
export class SurveyWeatherDto {
  @IsOptional()
  @IsIn([...WEATHER_SKY_CODES])
  sky?: WeatherSkyCode | null

  @IsOptional()
  @IsNumber()
  @Min(WEATHER_RANGES.temperature_c.min)
  @Max(WEATHER_RANGES.temperature_c.max)
  temperature_c?: number | null

  @IsOptional()
  @IsNumber()
  @Min(WEATHER_RANGES.wind_kmh.min)
  @Max(WEATHER_RANGES.wind_kmh.max)
  wind_kmh?: number | null

  @IsOptional()
  @IsNumber()
  @Min(WEATHER_RANGES.rain_24h_mm.min)
  @Max(WEATHER_RANGES.rain_24h_mm.max)
  rain_24h_mm?: number | null

  @IsOptional()
  @IsISO8601()
  @MaxLength(40)
  observed_at?: string | null

  @IsOptional()
  @IsISO8601()
  @MaxLength(40)
  requested_at?: string | null

  @IsOptional()
  @IsIn([...WEATHER_SOURCES])
  source?: WeatherSource | null

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(WEATHER_EDITABLE_KEYS.length)
  @IsIn([...WEATHER_EDITABLE_KEYS], { each: true })
  edited?: WeatherEditableKey[]
}
