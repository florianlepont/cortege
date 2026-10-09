import { Module } from "@nestjs/common"
import { AuthModule } from "../auth/auth.module"
import { StorageModule } from "../storage/storage.module"
import { CadastreProviderService } from "./cadastre-provider.service"
import { CommunitySurveysService } from "./community-surveys.service"
import { GeocoderService } from "./geocoder.service"
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

@Module({
  imports: [AuthModule, StorageModule, SurveysDataModule],
  controllers: [
    SurveysController,
    SyncController,
    PublicController,
    ParcelsController,
    SearchController,
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
  ],
})
export class SurveysModule {}
