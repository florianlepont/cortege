import { Type } from "class-transformer"
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator"

/** Query of `GET /v1/search/community`. */
export class SearchCommunityQueryDto {
  /** Searched in the site name and the author's display name (accents and case ignored). */
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  q!: string

  /** Narrows the surveys to one author's display name (the members group is then empty). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  author?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number
}

/** Query of `GET /v1/search/places`. */
export class SearchPlacesQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  q!: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number
}

/** Query of `GET /v1/search/parcels`. */
export class SearchParcelsQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  q!: string
}
