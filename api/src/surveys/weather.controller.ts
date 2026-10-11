import { Controller, Get, Query, UseGuards } from "@nestjs/common"
import { Throttle } from "@nestjs/throttler"
import { AuthGuard } from "../auth/auth.guard"
import { WEATHER_THROTTLE } from "../common/rate-limit.config"
import { WeatherQueryDto } from "./dtos/weather-query.dto"
import { WeatherService } from "./weather.service"

/**
 * The observed weather at a point and a time (D-08, phase 27). The app never calls the provider:
 * this route is the only door, behind the auth guard and its own throttle. The handler only
 * delegates; the rules live in `WeatherService`.
 */
@Controller("weather")
@UseGuards(AuthGuard)
export class WeatherController {
  constructor(private readonly weather: WeatherService) {}

  @Get()
  @Throttle(WEATHER_THROTTLE)
  async get(@Query() query: WeatherQueryDto) {
    return this.weather.lookup({ lat: query.lat, lng: query.lng, at: query.at })
  }
}
