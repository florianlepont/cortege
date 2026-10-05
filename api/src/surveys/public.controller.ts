import { Controller, Get, Param, Query, Res, StreamableFile, UseGuards } from "@nestjs/common"
import type { Response } from "express"
import { AuthGuard } from "../auth/auth.guard"
import { SafeIdPipe } from "../common/safe-id.pipe"
import { CommunitySurveysService } from "./community-surveys.service"
import { PublicMapService } from "./public-map.service"
import { CommunitySurveysQueryDto } from "./dtos/community-surveys-query.dto"
import { PublicMapItemsQueryDto } from "./dtos/public-map-items-query.dto"
import { PublicParcelStatusesQueryDto } from "./dtos/public-parcel-statuses-query.dto"

@Controller("public")
@UseGuards(AuthGuard)
export class PublicController {
  constructor(
    private readonly publicMap: PublicMapService,
    private readonly community: CommunitySurveysService,
  ) {}

  @Get("map-items")
  async getMapItems(@Query() query: PublicMapItemsQueryDto) {
    return this.publicMap.getPublicMapItems(query)
  }

  @Get("community-surveys")
  async searchCommunitySurveys(@Query() query: CommunitySurveysQueryDto) {
    return this.publicMap.searchCommunitySurveys(query)
  }

  @Get("community-surveys/:id")
  async getCommunitySurvey(@Param("id", SafeIdPipe) id: string) {
    return this.community.getDetail(id)
  }

  @Get("community-surveys/:id/attachments")
  async listCommunityAttachments(@Param("id", SafeIdPipe) id: string) {
    return this.community.listAttachments(id)
  }

  @Get("community-surveys/:id/attachments/:attachmentId/download-url")
  async getCommunityAttachmentDownloadUrl(
    @Param("id", SafeIdPipe) id: string,
    @Param("attachmentId", SafeIdPipe) attachmentId: string,
  ) {
    return this.community.getAttachmentDownload(id, attachmentId)
  }

  @Get("community-surveys/:id/attachments/:attachmentId/content")
  async getCommunityAttachmentContent(
    @Param("id", SafeIdPipe) id: string,
    @Param("attachmentId", SafeIdPipe) attachmentId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const content = await this.community.getAttachmentContent(id, attachmentId)
    response.setHeader("Content-Type", content.mimeType)
    response.setHeader("Cache-Control", "private, max-age=300")
    return new StreamableFile(content.buffer)
  }

  @Get("parcels/status")
  async getParcelStatuses(@Query() query: PublicParcelStatusesQueryDto) {
    return this.publicMap.getPublicParcelStatuses(query)
  }
}
