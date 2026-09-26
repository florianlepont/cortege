import { StreamableFile } from "@nestjs/common"
import type { Response } from "express"
import { AuthenticatedUser } from "../src/auth/auth.types"
import { encodeListCursor } from "../src/surveys/list-cursor"
import { SurveyEventsService } from "../src/surveys/survey-events.service"
import { SurveysAttachmentsService } from "../src/surveys/surveys-attachments.service"
import { SurveysController } from "../src/surveys/surveys.controller"
import { SurveysService } from "../src/surveys/surveys.service"

// The controller only parses paging parameters and delegates: each route reaches its service
// method with the user, the ids and the body unchanged.
describe("SurveysController", () => {
  const user = { id: "11111111-1111-4111-8111-111111111111" } as AuthenticatedUser

  function setup() {
    const surveys = {
      listForUser: jest.fn().mockResolvedValue("list"),
      upsertForUser: jest.fn().mockResolvedValue("upserted"),
      getSurveyById: jest.fn().mockResolvedValue("survey"),
      patchSurvey: jest.fn().mockResolvedValue("patched"),
      patchSurveyVisibility: jest.fn().mockResolvedValue("visibility"),
      submitSurvey: jest.fn().mockResolvedValue("submitted"),
      deleteSurvey: jest.fn().mockResolvedValue(undefined),
    }
    const attachments = {
      createAttachment: jest.fn().mockResolvedValue("created"),
      listAttachments: jest.fn().mockResolvedValue("attachments"),
      getAttachmentDownload: jest.fn().mockResolvedValue("download"),
      getAttachmentContent: jest
        .fn()
        .mockResolvedValue({ mimeType: "image/jpeg", buffer: Buffer.from("jpg") }),
      uploadAttachment: jest.fn().mockResolvedValue("uploaded"),
      deleteAttachment: jest.fn().mockResolvedValue(undefined),
    }
    const events = { listForSurvey: jest.fn().mockResolvedValue("events") }
    const controller = new SurveysController(
      surveys as unknown as SurveysService,
      attachments as unknown as SurveysAttachmentsService,
      events as unknown as SurveyEventsService,
    )
    return { controller, surveys, attachments, events }
  }

  it("list passes the filters and the parsed page", async () => {
    const { controller, surveys } = setup()
    const after = { t: "2026-01-01T00:00:00.000Z", i: "survey-1" }

    await expect(
      controller.list(
        user,
        "draft",
        "2026-01-01",
        "2026-12-31",
        "oak",
        "5",
        encodeListCursor(after),
      ),
    ).resolves.toBe("list")
    expect(surveys.listForUser).toHaveBeenCalledWith(
      user,
      { status: "draft", from: "2026-01-01", to: "2026-12-31", q: "oak" },
      { limit: 5, after },
    )
  })

  it("list without paging parameters reads the first page", async () => {
    const { controller, surveys } = setup()

    await controller.list(user)
    expect(surveys.listForUser).toHaveBeenCalledWith(
      user,
      { status: undefined, from: undefined, to: undefined, q: undefined },
      { limit: null, after: null },
    )
  })

  it("delegates the survey routes to SurveysService", async () => {
    const { controller, surveys } = setup()
    const body = { id: "survey-1", sync_version: 1, site_name: "Forest" }

    await expect(controller.upsert(user, body)).resolves.toBe("upserted")
    expect(surveys.upsertForUser).toHaveBeenCalledWith(user, body)

    await expect(controller.getById(user, "survey-1")).resolves.toBe("survey")
    expect(surveys.getSurveyById).toHaveBeenCalledWith(user, "survey-1")

    await expect(controller.patch(user, "survey-1", { site_name: "Oaks" })).resolves.toBe("patched")
    expect(surveys.patchSurvey).toHaveBeenCalledWith(user, "survey-1", { site_name: "Oaks" })

    await expect(
      controller.patchVisibility(user, "survey-1", { visibility: "public" }),
    ).resolves.toBe("visibility")
    expect(surveys.patchSurveyVisibility).toHaveBeenCalledWith(user, "survey-1", {
      visibility: "public",
    })

    await expect(controller.submit(user, "survey-1")).resolves.toBe("submitted")
    expect(surveys.submitSurvey).toHaveBeenCalledWith(user, "survey-1")

    await expect(controller.deleteSurvey(user, "survey-1")).resolves.toBeUndefined()
    expect(surveys.deleteSurvey).toHaveBeenCalledWith(user, "survey-1", { allowMissing: true })
  })

  it("delegates the attachment routes to SurveysAttachmentsService", async () => {
    const { controller, attachments } = setup()
    const body = { mime_type: "image/jpeg", size_bytes: 3 }
    const file = { buffer: Buffer.from("jpg"), mimetype: "image/jpeg", size: 3 }

    await expect(controller.createAttachment(user, "survey-1", body)).resolves.toBe("created")
    expect(attachments.createAttachment).toHaveBeenCalledWith(user, "survey-1", body)

    await expect(controller.listAttachments(user, "survey-1")).resolves.toBe("attachments")
    expect(attachments.listAttachments).toHaveBeenCalledWith(user, "survey-1")

    await expect(controller.getAttachmentDownloadUrl(user, "survey-1", "att-1")).resolves.toBe(
      "download",
    )
    expect(attachments.getAttachmentDownload).toHaveBeenCalledWith(user, "survey-1", "att-1")

    await expect(
      controller.uploadAttachment(user, "survey-1", "att-1", "token-1", file),
    ).resolves.toBe("uploaded")
    expect(attachments.uploadAttachment).toHaveBeenCalledWith(
      user,
      "survey-1",
      "att-1",
      "token-1",
      file,
    )

    await expect(controller.deleteAttachment(user, "survey-1", "att-1")).resolves.toBeUndefined()
    expect(attachments.deleteAttachment).toHaveBeenCalledWith(user, "survey-1", "att-1")
  })

  it("streams attachment content with its type and a private cache header", async () => {
    const { controller, attachments } = setup()
    const response = { setHeader: jest.fn() }

    const result = await controller.getAttachmentContent(
      user,
      "survey-1",
      "att-1",
      response as unknown as Response,
    )

    expect(result).toBeInstanceOf(StreamableFile)
    expect(attachments.getAttachmentContent).toHaveBeenCalledWith(user, "survey-1", "att-1")
    expect(response.setHeader).toHaveBeenCalledWith("Content-Type", "image/jpeg")
    expect(response.setHeader).toHaveBeenCalledWith("Cache-Control", "private, max-age=300")
  })

  it("events passes the parsed page to SurveyEventsService", async () => {
    const { controller, events } = setup()

    await expect(controller.events(user, "survey-1", "10")).resolves.toBe("events")
    expect(events.listForSurvey).toHaveBeenCalledWith(user, "survey-1", {
      limit: 10,
      after: null,
    })
  })
})
