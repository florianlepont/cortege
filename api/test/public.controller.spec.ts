import { StreamableFile } from "@nestjs/common"
import type { Response } from "express"
import { CommunitySurveysService } from "../src/surveys/community-surveys.service"
import { PublicController } from "../src/surveys/public.controller"
import { PublicMapService } from "../src/surveys/public-map.service"

// The controller only delegates: each public route reaches its service method with the query or
// the ids unchanged.
describe("PublicController", () => {
  function setup() {
    const publicMap = {
      getPublicMapItems: jest.fn().mockResolvedValue("items"),
      searchCommunitySurveys: jest.fn().mockResolvedValue("search"),
      getPublicParcelStatuses: jest.fn().mockResolvedValue("statuses"),
    }
    const community = {
      getDetail: jest.fn().mockResolvedValue("detail"),
      listAttachments: jest.fn().mockResolvedValue("attachments"),
      getAttachmentDownload: jest.fn().mockResolvedValue("download"),
      getAttachmentContent: jest
        .fn()
        .mockResolvedValue({ mimeType: "image/jpeg", buffer: Buffer.from("jpg") }),
    }
    const controller = new PublicController(
      publicMap as unknown as PublicMapService,
      community as unknown as CommunitySurveysService,
    )
    return { controller, publicMap, community }
  }

  it("delegates the map, the search and the parcel statuses", async () => {
    const { controller, publicMap } = setup()
    await expect(controller.getMapItems({ region: "ACA" })).resolves.toBe("items")
    await expect(controller.searchCommunitySurveys({ q: "bois", limit: 5 })).resolves.toBe("search")
    await expect(controller.getParcelStatuses({ bbox: "1,2,3,4" } as never)).resolves.toBe(
      "statuses",
    )
    expect(publicMap.getPublicMapItems).toHaveBeenCalledWith({ region: "ACA" })
    expect(publicMap.searchCommunitySurveys).toHaveBeenCalledWith({ q: "bois", limit: 5 })
  })

  it("delegates the community survey page and its photos", async () => {
    const { controller, community } = setup()
    await expect(controller.getCommunitySurvey("s-1")).resolves.toBe("detail")
    await expect(controller.listCommunityAttachments("s-1")).resolves.toBe("attachments")
    await expect(controller.getCommunityAttachmentDownloadUrl("s-1", "a-1")).resolves.toBe(
      "download",
    )
    expect(community.getDetail).toHaveBeenCalledWith("s-1")
    expect(community.getAttachmentDownload).toHaveBeenCalledWith("s-1", "a-1")
  })

  it("streams a photo with its type and a private cache header", async () => {
    const { controller } = setup()
    const response = { setHeader: jest.fn() } as unknown as Response

    const content = await controller.getCommunityAttachmentContent("s-1", "a-1", response)

    expect(content).toBeInstanceOf(StreamableFile)
    expect(response.setHeader).toHaveBeenCalledWith("Content-Type", "image/jpeg")
    expect(response.setHeader).toHaveBeenCalledWith("Cache-Control", "private, max-age=300")
  })
})
