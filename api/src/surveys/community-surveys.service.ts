import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import type {
  CommunitySurveyAttachment,
  CommunitySurveyDetail,
  CommunitySurveyHistoryItem,
} from "@cortege/ibp-domain"
import { DatabaseService } from "../database/database.service"
import { DOWNLOAD_URL_TTL_SECONDS, StorageService } from "../storage/storage.service"
import { ParcelsService } from "./parcels.service"
import { COMMUNITY_HISTORY_LIMIT, PUBLIC_SURVEY_PREDICATE } from "./public-map.queries"
import { toFiniteNumber } from "./surveys-normalize.utils"

type DetailDbRow = {
  id: string
  site_name: string
  parcel_id: string | null
  observation_year: number | null
  version_number: number | null
  region_version: string | null
  vegetation_stage: string | null
  ibp_method_version: string | null
  ibp_cas: number | null
  ibp_cas3_scale: boolean | null
  scores: Record<string, unknown>
  factor_results: Record<string, unknown>
  submitted_at: string
  author_name: string | null
  parcel_ids: string[] | null
}

type HistoryDbRow = {
  id: string
  site_name: string
  observation_year: number | null
  version_number: number | null
  scores: Record<string, unknown>
  submitted_at: string
  author_name: string | null
}

type AttachmentDbRow = {
  id: string
  storage_key: string
  mime_type: string | null
  size_bytes: number | null
  created_at: string
  uploaded_at: string | null
}

/**
 * Read-only access to the finished surveys of every member (association-only sharing, like the
 * map and the community search): the survey page, its photos and the history of its parcels.
 * Nothing here writes, and a draft or deleted survey answers 404 as if it did not exist.
 */
@Injectable()
export class CommunitySurveysService {
  constructor(
    private readonly db: DatabaseService,
    private readonly storage: StorageService,
    private readonly parcels: ParcelsService,
  ) {}

  async getDetail(surveyId: string): Promise<CommunitySurveyDetail> {
    const result = await this.db.query<DetailDbRow>(
      `SELECT
         s.id,
         s.site_name,
         s.parcel_id,
         s.observation_year,
         s.version_number,
         s.region_version,
         s.vegetation_stage,
         s.ibp_method_version,
         s.ibp_cas,
         s.ibp_cas3_scale,
         s.scores,
         s.factor_results,
         s.submitted_at::text,
         u.display_name AS author_name,
         (SELECT array_agg(sp.parcel_id ORDER BY sp.parcel_id) FROM survey_parcels sp WHERE sp.survey_id = s.id) AS parcel_ids
       FROM surveys s
       LEFT JOIN users u
         ON u.id = s.user_id
       WHERE s.id = $1
         AND ${PUBLIC_SURVEY_PREDICATE}
         AND s.submitted_at IS NOT NULL`,
      [surveyId],
    )
    const row = result.rows[0]
    if (!row) {
      throw new NotFoundException("Survey not found")
    }

    const history = await this.db.query<HistoryDbRow>(
      `SELECT
         s.id,
         s.site_name,
         s.observation_year,
         s.version_number,
         s.scores,
         s.submitted_at::text,
         u.display_name AS author_name
       FROM surveys s
       LEFT JOIN users u
         ON u.id = s.user_id
       WHERE ${PUBLIC_SURVEY_PREDICATE}
         AND s.submitted_at IS NOT NULL
         AND EXISTS (
           SELECT 1
           FROM survey_parcels other
           JOIN survey_parcels mine
             ON mine.parcel_id = other.parcel_id
           WHERE other.survey_id = s.id
             AND mine.survey_id = $1
         )
       ORDER BY s.observation_year ASC NULLS LAST, s.version_number ASC NULLS LAST, s.submitted_at ASC
       LIMIT $2`,
      [surveyId, COMMUNITY_HISTORY_LIMIT],
    )

    const location = await this.parcels.displayLocation(this.db, row.id, row.parcel_id)

    return {
      survey_id: row.id,
      site_name: row.site_name,
      author_name: row.author_name,
      submitted_at: row.submitted_at,
      observation_year: row.observation_year,
      version_number: row.version_number,
      region_version: row.region_version,
      vegetation_stage: row.vegetation_stage,
      ibp_method_version: row.ibp_method_version,
      ibp_cas: row.ibp_cas,
      ibp_cas3_scale: row.ibp_cas3_scale === true,
      scores: row.scores,
      factor_results: row.factor_results,
      // A legacy survey linked by `parcel_id` only still has its one parcel.
      parcel_ids: row.parcel_ids ?? (row.parcel_id ? [row.parcel_id] : []),
      // Exact, like the public map since 2026-10-08 (owner decision): internal use, to revisit.
      display_location: location,
      history: history.rows.map(
        (item): CommunitySurveyHistoryItem => ({
          survey_id: item.id,
          site_name: item.site_name,
          author_name: item.author_name,
          observation_year: item.observation_year,
          version_number: item.version_number,
          ibp_total: toFiniteNumber(item.scores?.ibp_total) ?? 0,
          submitted_at: item.submitted_at,
          is_current: item.id === row.id,
        }),
      ),
    }
  }

  async listAttachments(surveyId: string): Promise<{ items: CommunitySurveyAttachment[] }> {
    await this.assertPublicSurvey(surveyId)
    const result = await this.db.query<AttachmentDbRow>(
      `SELECT id, storage_key, mime_type, size_bytes, created_at::text, uploaded_at::text
       FROM attachments
       WHERE survey_id = $1 AND deleted_at IS NULL AND uploaded_at IS NOT NULL
       ORDER BY created_at DESC, id DESC`,
      [surveyId],
    )
    return {
      items: result.rows.map((row) => ({
        id: row.id,
        mime_type: row.mime_type,
        size_bytes: row.size_bytes,
        created_at: row.created_at,
      })),
    }
  }

  async getAttachmentDownload(
    surveyId: string,
    attachmentId: string,
  ): Promise<{ url: string; expires_at: string; requires_auth: boolean }> {
    await this.assertPublicSurvey(surveyId)
    const attachment = await this.getUploadedAttachmentOrThrow(surveyId, attachmentId)
    const expiresAt = new Date(Date.now() + DOWNLOAD_URL_TTL_SECONDS * 1000).toISOString()
    if (this.storage.mode === "minio") {
      return {
        url: await this.storage.presignGet(attachment.storage_key),
        expires_at: expiresAt,
        requires_auth: false,
      }
    }
    return {
      url: `/public/community-surveys/${surveyId}/attachments/${attachmentId}/content`,
      expires_at: expiresAt,
      requires_auth: true,
    }
  }

  async getAttachmentContent(
    surveyId: string,
    attachmentId: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    await this.assertPublicSurvey(surveyId)
    if (this.storage.mode !== "local") {
      throw new NotFoundException("Attachment content not found")
    }
    const attachment = await this.getUploadedAttachmentOrThrow(surveyId, attachmentId)
    // StorageService refuses keys that resolve outside the upload root (400): answered as 404.
    const buffer = await this.storage.getObject(attachment.storage_key).catch((err: unknown) => {
      if (err instanceof BadRequestException) return null
      throw err
    })
    if (!buffer) {
      throw new NotFoundException("Attachment content not found")
    }
    return { buffer, mimeType: attachment.mime_type ?? "application/octet-stream" }
  }

  private async assertPublicSurvey(surveyId: string): Promise<void> {
    const result = await this.db.query<{ id: string }>(
      `SELECT s.id FROM surveys s WHERE s.id = $1 AND ${PUBLIC_SURVEY_PREDICATE}`,
      [surveyId],
    )
    if (result.rows.length === 0) {
      throw new NotFoundException("Survey not found")
    }
  }

  private async getUploadedAttachmentOrThrow(
    surveyId: string,
    attachmentId: string,
  ): Promise<AttachmentDbRow> {
    const result = await this.db.query<AttachmentDbRow>(
      `SELECT id, storage_key, mime_type, size_bytes, created_at::text, uploaded_at::text
       FROM attachments
       WHERE id = $1 AND survey_id = $2 AND deleted_at IS NULL`,
      [attachmentId, surveyId],
    )
    const attachment = result.rows[0]
    if (!attachment) {
      throw new NotFoundException("Attachment not found")
    }
    if (!attachment.uploaded_at) {
      throw new ConflictException({
        code: "attachment_not_uploaded",
        message: "Attachment has not been uploaded yet",
      })
    }
    return attachment
  }
}
