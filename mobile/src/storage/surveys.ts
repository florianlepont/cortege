import { randomUUID } from "expo-crypto"
import { getDb } from "./db"
import { runInTransaction } from "./transaction"
import { deleteAttachmentFile, deleteAllAttachmentFiles } from "./attachment-files"
import { LOCAL_OWNER_SUB_KEY, LOCAL_OWNER_EMAIL_KEY } from "./local-owner"
import { PARCEL_HISTORY_KEY_PREFIX } from "./parcel-history-cache"
import { SEARCH_RECENTS_KEY } from "./search-recents"
import {
  LocalSurvey,
  LocalAttachment,
  LocalAttachmentInput,
  DraftInput,
  UpdateDraftInput,
  SurveyQueuePayload,
  SurveyDeleteQueuePayload,
  AttachmentDeleteQueuePayload,
  AttachmentQueuePayload,
} from "./types"
import {
  applyMethodFields,
  normalizeParcelIds,
  computeCompletionRate,
  computePayloadCompletion,
  computePayloadFactorsFilled,
  isSurveyQueuePayload,
  isAttachmentQueuePayload,
  isAttachmentDeleteQueuePayload,
  safeParseJson,
  deleteQueuedSurveyUpserts,
} from "./utils"

export async function createLocalDraft(input: DraftInput): Promise<LocalSurvey> {
  const id = randomUUID()
  const now = new Date().toISOString()
  // The method fields are written only when the input has them: no stamping (01.8, D-10 amended).
  const payload = applyMethodFields(
    {
      id,
      sync_version: 1,
      site_name: input.site_name,
      status: "draft",
      visibility: "private",
      parcel_ids: normalizeParcelIds(input.parcel_ids),
      factors: input.factors,
    },
    input,
  )

  await runInTransaction(async (tx) => {
    await tx.runAsync(
      `INSERT INTO local_surveys (id, site_name, status, visibility, sync_version, sync_state, last_sync_error, last_sync_error_code, last_sync_error_at, sync_blocked, payload_json, payload_completion, payload_factors_filled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.site_name,
        "draft",
        "private",
        1,
        "pending",
        null,
        null,
        null,
        0,
        JSON.stringify(payload),
        // Precomputed so the list never parses payloads (01.9 D-03).
        computePayloadCompletion(payload),
        computePayloadFactorsFilled(payload),
        now,
        now,
      ],
    )

    await tx.runAsync(
      `INSERT INTO sync_queue (survey_id, op_type, payload, status, retry_count, next_retry_at, created_at, updated_at)
       VALUES (?, 'survey_upsert', ?, 'pending', 0, NULL, ?, ?)`,
      [id, JSON.stringify(payload), now, now],
    )
  })

  return {
    id,
    site_name: input.site_name,
    status: "draft",
    visibility: "private",
    sync_version: 1,
    sync_state: "pending",
    last_sync_error: null,
    last_sync_error_code: null,
    last_sync_error_at: null,
    sync_blocked: 0,
    created_at: now,
    updated_at: now,
    completion_rate: computeCompletionRate("draft", payload),
    factors_filled: computePayloadFactorsFilled(payload),
  }
}

export async function queueLocalAttachment(input: LocalAttachmentInput): Promise<LocalAttachment> {
  const now = new Date().toISOString()
  const localAttachmentId = randomUUID()

  await runInTransaction(async (tx) => {
    const survey = await tx.getFirstAsync<{ id: string }>(
      `SELECT id FROM local_surveys WHERE id = ?`,
      [input.survey_id],
    )
    if (!survey?.id) {
      throw new Error(`Unknown local survey: ${input.survey_id}`)
    }

    const queuePayload: AttachmentQueuePayload = {
      kind: "attachment_upload",
      local_attachment_id: localAttachmentId,
      survey_id: input.survey_id,
      local_uri: input.local_uri,
      mime_type: input.mime_type,
      size_bytes: input.size_bytes,
      captured_at: input.captured_at,
      metadata: input.metadata ?? {},
    }

    await tx.runAsync(
      `INSERT INTO local_attachments (
        id, survey_id, local_uri, mime_type, size_bytes, sync_state, remote_attachment_id, storage_key, upload_url, confirm_url, last_sync_error, last_sync_error_code, last_sync_error_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)`,
      [
        localAttachmentId,
        input.survey_id,
        input.local_uri,
        input.mime_type,
        input.size_bytes,
        now,
        now,
      ],
    )

    await tx.runAsync(
      `INSERT INTO sync_queue (survey_id, op_type, payload, status, retry_count, next_retry_at, created_at, updated_at)
       VALUES (?, 'attachment_upload', ?, 'pending', 0, NULL, ?, ?)`,
      [input.survey_id, JSON.stringify(queuePayload), now, now],
    )
  })

  return {
    id: localAttachmentId,
    survey_id: input.survey_id,
    local_uri: input.local_uri,
    mime_type: input.mime_type,
    size_bytes: input.size_bytes,
    sync_state: "pending",
    remote_attachment_id: null,
    storage_key: null,
    upload_url: null,
    confirm_url: null,
    last_sync_error: null,
    last_sync_error_code: null,
    last_sync_error_at: null,
    updated_at: now,
    file_state: "local",
  }
}

export async function queueDeleteAttachment(
  surveyId: string,
  localAttachmentId: string,
): Promise<{
  queued_delete: boolean
  removed_local: boolean
  remote_attachment_id: string | null
}> {
  const now = new Date().toISOString()
  let fileToDelete: string | null = null

  const result = await runInTransaction(async (tx) => {
    const attachment = await tx.getFirstAsync<{
      id: string
      survey_id: string
      local_uri: string
      remote_attachment_id: string | null
    }>(
      `SELECT id, survey_id, local_uri, remote_attachment_id
       FROM local_attachments
       WHERE id = ? AND survey_id = ?`,
      [localAttachmentId, surveyId],
    )

    if (!attachment?.id) {
      return { queued_delete: false, removed_local: false, remote_attachment_id: null }
    }

    const queueRows = await tx.getAllAsync<Array<{ id: number; payload: string }>[number]>(
      `SELECT id, payload
       FROM sync_queue
       WHERE survey_id = ?`,
      [surveyId],
    )

    for (const row of queueRows) {
      const payload = safeParseJson(row.payload)
      if (isAttachmentQueuePayload(payload) && payload.local_attachment_id === localAttachmentId) {
        await tx.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [row.id])
        continue
      }
      if (
        isAttachmentDeleteQueuePayload(payload) &&
        payload.attachment_id === attachment.remote_attachment_id
      ) {
        await tx.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [row.id])
      }
    }

    if (attachment.remote_attachment_id) {
      const deletePayload: AttachmentDeleteQueuePayload = {
        kind: "attachment_delete",
        survey_id: surveyId,
        attachment_id: attachment.remote_attachment_id,
      }

      await tx.runAsync(
        `INSERT INTO sync_queue (survey_id, op_type, payload, status, retry_count, next_retry_at, created_at, updated_at)
         VALUES (?, 'attachment_delete', ?, 'pending', 0, NULL, ?, ?)`,
        [surveyId, JSON.stringify(deletePayload), now, now],
      )
    }

    await tx.runAsync(`DELETE FROM local_attachments WHERE id = ?`, [localAttachmentId])

    fileToDelete = attachment.local_uri

    return {
      queued_delete: Boolean(attachment.remote_attachment_id),
      removed_local: true,
      remote_attachment_id: attachment.remote_attachment_id,
    }
  })

  if (fileToDelete) {
    await deleteAttachmentFile(fileToDelete).catch(() => {})
  }

  return result
}

export async function queueDeleteSurvey(surveyId: string): Promise<{ queued_delete: boolean }> {
  const now = new Date().toISOString()
  let filesToDelete: string[] = []

  const result = await runInTransaction(async (tx) => {
    const survey = await tx.getFirstAsync<Pick<LocalSurvey, "id" | "sync_state">>(
      `SELECT id, sync_state
       FROM local_surveys
       WHERE id = ?`,
      [surveyId],
    )

    if (!survey?.id) {
      return { queued_delete: false }
    }

    const attachments = await tx.getAllAsync<{ local_uri: string }>(
      `SELECT local_uri FROM local_attachments WHERE survey_id = ?`,
      [surveyId],
    )
    filesToDelete = attachments.map((attachment) => attachment.local_uri)

    await tx.runAsync(`DELETE FROM sync_queue WHERE survey_id = ?`, [surveyId])

    // Keep remote state consistent even for unknown sync history by issuing an idempotent delete op.
    const payload: SurveyDeleteQueuePayload = {
      kind: "survey_delete",
      survey_id: surveyId,
    }

    await tx.runAsync(
      `INSERT INTO sync_queue (survey_id, op_type, payload, status, retry_count, next_retry_at, created_at, updated_at)
       VALUES (?, 'survey_delete', ?, 'pending', 0, NULL, ?, ?)`,
      [surveyId, JSON.stringify(payload), now, now],
    )

    // Immediate local purge; server deletion will complete asynchronously.
    await tx.runAsync(`DELETE FROM local_attachments WHERE survey_id = ?`, [surveyId])
    await tx.runAsync(`DELETE FROM local_surveys WHERE id = ?`, [surveyId])

    return { queued_delete: true }
  })

  for (const fileUri of filesToDelete) {
    await deleteAttachmentFile(fileUri).catch(() => {})
  }

  return result
}

export async function getLocalSurveyDraft(surveyId: string): Promise<SurveyQueuePayload | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<{
    id: string
    site_name: string
    visibility: string | null
    sync_version: number
    payload_json: string | null
  }>(
    `SELECT id, site_name, visibility, sync_version, payload_json
     FROM local_surveys
     WHERE id = ?`,
    [surveyId],
  )

  if (!row?.id) {
    return null
  }

  const parsedPayload = row.payload_json ? safeParseJson(row.payload_json) : null
  if (isSurveyQueuePayload(parsedPayload)) {
    return parsedPayload
  }

  return {
    id: row.id,
    sync_version: row.sync_version,
    site_name: row.site_name,
    status: "draft",
    visibility: row.visibility === "public" ? "public" : "private",
    parcel_ids: [],
    factors: {},
  }
}

/**
 * Best-effort cache of server-assigned fields the mobile app never writes itself
 * (observation year, version number). Called whenever the canonical survey detail loads while
 * online, so a later PDF export (phase 10, D-01) can read them with no API call, including after
 * an app restart in airplane mode. Never touches payload_completion: neither field affects it.
 */
export async function cacheSurveyCanonicalFields(
  surveyId: string,
  fields: { observation_year?: number | null; version_number?: number | null },
): Promise<void> {
  await runInTransaction(async (tx) => {
    const row = await tx.getFirstAsync<{ payload_json: string | null }>(
      `SELECT payload_json FROM local_surveys WHERE id = ?`,
      [surveyId],
    )
    if (!row) {
      return
    }

    const parsedPayload = row.payload_json ? safeParseJson(row.payload_json) : null
    const basePayload = isSurveyQueuePayload(parsedPayload) ? parsedPayload : null
    if (!basePayload) {
      return
    }

    const nextPayload: SurveyQueuePayload = { ...basePayload }
    if (typeof fields.observation_year === "number") {
      nextPayload.observation_year = fields.observation_year
    }
    if (typeof fields.version_number === "number") {
      nextPayload.version_number = fields.version_number
    }

    await tx.runAsync(`UPDATE local_surveys SET payload_json = ? WHERE id = ?`, [
      JSON.stringify(nextPayload),
      surveyId,
    ])
  })
}

export async function updateLocalDraft(input: UpdateDraftInput): Promise<LocalSurvey> {
  const now = new Date().toISOString()

  const { nextPayload, nextSyncVersion, createdAt } = await runInTransaction(async (tx) => {
    const existing = await tx.getFirstAsync<{
      id: string
      site_name: string
      status: string
      visibility: string | null
      sync_version: number
      created_at: string | null
      payload_json: string | null
    }>(
      `SELECT id, site_name, status, visibility, sync_version, created_at, payload_json
       FROM local_surveys
       WHERE id = ?`,
      [input.survey_id],
    )

    if (!existing?.id) {
      throw new Error(`Unknown local survey: ${input.survey_id}`)
    }

    const parsedPayload = existing.payload_json ? safeParseJson(existing.payload_json) : null
    const basePayload = isSurveyQueuePayload(parsedPayload)
      ? parsedPayload
      : {
          id: existing.id,
          sync_version: existing.sync_version,
          site_name: existing.site_name,
          status: existing.status || "draft",
          visibility: existing.visibility === "public" ? "public" : "private",
          parcel_ids: [],
          factors: {},
        }

    const nextSyncVersion = Math.max(
      1,
      Number(basePayload.sync_version ?? existing.sync_version ?? 0) + 1,
    )
    const nextPayload: SurveyQueuePayload = applyMethodFields(
      {
        ...basePayload,
        id: input.survey_id,
        sync_version: nextSyncVersion,
        site_name: input.site_name,
        status: "draft",
        visibility:
          input.visibility ??
          (basePayload.visibility as "private" | "public" | undefined) ??
          "private",
        parcel_ids: normalizeParcelIds(input.parcel_ids),
        factors: input.factors,
      },
      input,
    )

    await deleteQueuedSurveyUpserts(tx, input.survey_id)

    await tx.runAsync(
      `INSERT INTO sync_queue (survey_id, op_type, payload, status, retry_count, next_retry_at, created_at, updated_at)
       VALUES (?, 'survey_upsert', ?, 'pending', 0, NULL, ?, ?)`,
      [input.survey_id, JSON.stringify(nextPayload), now, now],
    )

    await tx.runAsync(
      `UPDATE local_surveys
       SET site_name = ?,
           status = 'draft',
           visibility = ?,
           sync_version = ?,
           sync_state = 'pending',
           last_sync_error = NULL,
           last_sync_error_code = NULL,
           last_sync_error_at = NULL,
           sync_blocked = 0,
           payload_json = ?,
           payload_completion = ?,
           payload_factors_filled = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        input.site_name,
        nextPayload.visibility === "public" ? "public" : "private",
        nextSyncVersion,
        JSON.stringify(nextPayload),
        // Precomputed so the list never parses payloads (01.9 D-03).
        computePayloadCompletion(nextPayload),
        computePayloadFactorsFilled(nextPayload),
        now,
        input.survey_id,
      ],
    )

    return { nextPayload, nextSyncVersion, createdAt: existing.created_at }
  })

  return {
    id: input.survey_id,
    site_name: input.site_name,
    status: "draft",
    visibility: nextPayload.visibility === "public" ? "public" : "private",
    sync_version: nextSyncVersion,
    sync_state: "pending",
    last_sync_error: null,
    last_sync_error_code: null,
    last_sync_error_at: null,
    sync_blocked: 0,
    created_at: createdAt ?? now,
    updated_at: now,
    completion_rate: computeCompletionRate("draft", nextPayload),
    factors_filled: computePayloadFactorsFilled(nextPayload),
  }
}

export async function listLocalSurveys(): Promise<LocalSurvey[]> {
  const db = await getDb()
  // 12.2-14: factors_filled is the stored payload_factors_filled, the app's single definition of
  // "factors filled" (never payload_completion / 10, which counts name, method and parcel too).
  // 01.9 D-03: completion was stored at write time (payload_completion) and
  // "submitted = 100" is applied here in SQL, so the list never parses payload_json in JS.
  // 12.2-14: the row score ring of a submitted survey reads the server total the pull stored in the
  // payload (`scores.ibp_total`) with SQLite's json_extract: inside the engine, only for submitted
  // rows (the CASE skips the others), only when the payload is valid JSON and the value is a
  // number. Nothing is parsed per row in JS and the raw payload is never selected.
  return db.getAllAsync<LocalSurvey>(
    `SELECT id, site_name, status, visibility, sync_version, sync_state, last_sync_error, last_sync_error_code, last_sync_error_at, sync_blocked, created_at, updated_at,
       CASE WHEN status = 'submitted' THEN 100 ELSE payload_completion END AS completion_rate,
       payload_factors_filled AS factors_filled,
       CASE WHEN status = 'submitted' AND json_valid(payload_json)
         THEN CASE WHEN json_type(payload_json, '$.scores.ibp_total') IN ('integer', 'real')
           THEN json_extract(payload_json, '$.scores.ibp_total') END
       END AS ibp_total
     FROM local_surveys
     ORDER BY updated_at DESC`,
  )
}

export async function listLocalAttachments(surveyId?: string): Promise<LocalAttachment[]> {
  const db = await getDb()
  if (surveyId) {
    return db.getAllAsync<LocalAttachment>(
      `SELECT id, survey_id, local_uri, mime_type, size_bytes, sync_state, remote_attachment_id, storage_key, upload_url, confirm_url, last_sync_error, last_sync_error_code, last_sync_error_at, updated_at, file_state
       FROM local_attachments
       WHERE survey_id = ?
       ORDER BY updated_at DESC`,
      [surveyId],
    )
  }

  return db.getAllAsync<LocalAttachment>(
    `SELECT id, survey_id, local_uri, mime_type, size_bytes, sync_state, remote_attachment_id, storage_key, upload_url, confirm_url, last_sync_error, last_sync_error_code, last_sync_error_at, updated_at, file_state
     FROM local_attachments
     ORDER BY updated_at DESC`,
  )
}

/**
 * The image attachments of a survey in the order they were taken (phase 25.1, D-05): `created_at`
 * ascending, the id breaking a tie. `listLocalAttachments` orders by `updated_at`, which moves with
 * the sync state, so it is not the shooting order.
 */
export async function listSurveyPhotosInCaptureOrder(surveyId: string): Promise<LocalAttachment[]> {
  const db = await getDb()
  return db.getAllAsync<LocalAttachment>(
    `SELECT id, survey_id, local_uri, mime_type, size_bytes, sync_state, remote_attachment_id, storage_key, upload_url, confirm_url, last_sync_error, last_sync_error_code, last_sync_error_at, updated_at, file_state
     FROM local_attachments
     WHERE survey_id = ? AND mime_type LIKE 'image/%'
     ORDER BY created_at ASC, id ASC`,
    [surveyId],
  )
}

export async function clearLocalIbpData(): Promise<void> {
  await runInTransaction(async (tx) => {
    await tx.runAsync(`DELETE FROM sync_queue`)
    await tx.runAsync(`DELETE FROM local_attachments`)
    await tx.runAsync(`DELETE FROM local_surveys`)
    await tx.runAsync(`DELETE FROM local_meta WHERE key = 'downsync_cursor'`)
    await tx.runAsync(`DELETE FROM local_meta WHERE key IN (?, ?, ?)`, [
      LOCAL_OWNER_SUB_KEY,
      LOCAL_OWNER_EMAIL_KEY,
      SEARCH_RECENTS_KEY,
    ])
    // Exact prefix match: a LIKE pattern would treat the underscore as a wildcard (D-13).
    await tx.runAsync(`DELETE FROM local_meta WHERE instr(key, ?) = 1`, [PARCEL_HISTORY_KEY_PREFIX])
  })

  await deleteAllAttachmentFiles().catch(() => {})
}

export async function hasPendingSyncWork(): Promise<boolean> {
  const db = await getDb()
  const nowIso = new Date().toISOString()
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count
     FROM sync_queue
     WHERE status = 'pending'
        OR (status = 'failed' AND (next_retry_at IS NULL OR next_retry_at <= ?))`,
    [nowIso],
  )
  return Number(row?.count ?? 0) > 0
}

export async function retrySurveyNow(surveyId: string): Promise<{ queued: number }> {
  const now = new Date().toISOString()

  return runInTransaction(async (tx) => {
    const updatedQueue = await tx.runAsync(
      `UPDATE sync_queue
       SET status = 'pending',
           next_retry_at = NULL,
           updated_at = ?
       WHERE survey_id = ?
         AND status = 'failed'`,
      [now, surveyId],
    )

    await tx.runAsync(
      `UPDATE local_surveys
       SET sync_state = 'pending',
           status = CASE
             WHEN status = 'error' THEN 'draft'
             ELSE status
           END,
           last_sync_error = NULL,
           last_sync_error_code = NULL,
           last_sync_error_at = NULL,
           sync_blocked = 0,
           updated_at = ?
       WHERE id = ?`,
      [now, surveyId],
    )

    await tx.runAsync(
      `UPDATE local_attachments
       SET sync_state = 'pending',
           last_sync_error = NULL,
           last_sync_error_code = NULL,
           last_sync_error_at = NULL,
           updated_at = ?
       WHERE survey_id = ?
         AND sync_state = 'failed'`,
      [now, surveyId],
    )

    return { queued: Number((updatedQueue as { changes?: number }).changes ?? 0) }
  })
}

export async function discardSurveyLocalChanges(
  surveyId: string,
): Promise<{ removed_queue: number }> {
  const now = new Date().toISOString()
  let filesToDelete: string[] = []

  return runInTransaction(async (tx) => {
    const removedQueue = await tx.runAsync(`DELETE FROM sync_queue WHERE survey_id = ?`, [surveyId])

    await tx.runAsync(
      `UPDATE local_surveys
       SET sync_state = 'synced',
           status = CASE
             WHEN status = 'error' THEN 'synced'
             ELSE status
           END,
           last_sync_error = NULL,
           last_sync_error_code = NULL,
           last_sync_error_at = NULL,
           sync_blocked = 0,
           updated_at = ?
       WHERE id = ?`,
      [now, surveyId],
    )

    const attachmentsToRemove = await tx.getAllAsync<{ local_uri: string }>(
      `SELECT local_uri
       FROM local_attachments
       WHERE survey_id = ?
         AND sync_state <> 'synced'`,
      [surveyId],
    )
    filesToDelete = attachmentsToRemove.map((attachment) => attachment.local_uri)

    await tx.runAsync(
      `DELETE FROM local_attachments
       WHERE survey_id = ?
         AND sync_state <> 'synced'`,
      [surveyId],
    )

    return { removed_queue: Number((removedQueue as { changes?: number }).changes ?? 0) }
  }).then(async (result) => {
    for (const fileUri of filesToDelete) {
      await deleteAttachmentFile(fileUri).catch(() => {})
    }
    return result
  })
}
