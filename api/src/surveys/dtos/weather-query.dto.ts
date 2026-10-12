import { Type } from "class-transformer"
import { IsISO8601, IsNumber, IsOptional, Max, MaxLength, Min } from "class-validator"

/**
 * Query of `GET /v1/weather` (D-08). The app sends the parcel centre rounded to 4 decimals (about
 * 10 m) and the survey time; the server never trusts them further than these bounds (T-27-19).
 */
export class WeatherQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number

  /** ISO 8601 time of the survey; absent means now. Older than 24 h answers too_old (D-20). */
  @IsOptional()
  @IsISO8601()
  @MaxLength(40)
  at?: string
}
