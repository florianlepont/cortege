import { Module } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { AuthModule } from "../auth/auth.module"
import { appConfigOf } from "../config/app-config"
import { StorageModule } from "../storage/storage.module"
import { CadastreProviderService } from "./cadastre-provider.service"
import { CommunitySurveysService } from "./community-surveys.service"
import { GeocoderService } from "./geocoder.service"
import { MapStylesController } from "./map-styles.controller"
import { MapStylesService } from "./map-styles.service"
import { ParcelSearchService } from "./parcel-search.service"
import { ParcelsController } from "./parcels.controller"
import { ParcelsService } from "./parcels.service"
import { PublicController } from "./public.controller"
import { PublicMapService } from "./public-map.service"
import { SearchController } from "./search.controller"
import { SearchService } from "./search.service"
import { SurveysController } from "./surveys.controller"
import { SurveysDataModule } from "./surveys-data.module"
import { SurveysService } from "./surveys.service"
import { SurveysAttachmentsService } from "./surveys-attachments.service"
import { SurveysSyncService } from "./surveys-sync.service"
import { IbpRulesService } from "./ibp-rules.service"
import { SyncController } from "./sync.controller"
import { WeatherController } from "./weather.controller"
import { WEATHER_PROVIDER_TOKEN, createWeatherProvider } from "./weather-provider"
import { WeatherService } from "./weather.service"

@Module({
  imports: [AuthModule, StorageModule, SurveysDataModule],
  controllers: [
    SurveysController,
    SyncController,
    PublicController,
    ParcelsController,
    SearchController,
    MapStylesController,
    WeatherController,
  ],
  providers: [
    SurveysService,
    SurveysAttachmentsService,
    SurveysSyncService,
    IbpRulesService,
    CadastreProviderService,
    ParcelsService,
    PublicMapService,
    CommunitySurveysService,
    SearchService,
    GeocoderService,
    ParcelSearchService,
    MapStylesService,
    WeatherService,
    {
      provide: WEATHER_PROVIDER_TOKEN,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createWeatherProvider(appConfigOf(config).weather),
    },
  ],
})
export class SurveysModule {}
