\pset format aligned
\echo '=== 1. Auth guard lookup: SELECT ... FROM users WHERE auth0_sub = $1 (relies on the UNIQUE constraint index, not the dropped idx_users_auth0_sub) ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, auth0_sub, email, role, first_name, last_name, display_name, profile_picture_url
FROM users WHERE auth0_sub = 'auth0|explaintarget';

\echo '=== 2a. Account deletion: UPDATE survey_events SET actor_id = NULL WHERE actor_id = $1 AND survey_id IN (retained subquery) (relies on idx_survey_events_actor_id) ==='
EXPLAIN (ANALYZE, BUFFERS)
UPDATE survey_events
SET actor_id = NULL
WHERE actor_id = '99999999-9999-9999-9999-999999999999'
  AND survey_id IN (
    SELECT id FROM surveys
    WHERE user_id = '99999999-9999-9999-9999-999999999999'
      AND deleted_at IS NULL
      AND (status IN ('submitted', 'synced') OR submitted_at IS NOT NULL)
  );

\echo '=== 2b. Account deletion: collect attachment storage keys for draft surveys ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT a.storage_key
FROM attachments a
WHERE a.survey_id IN (SELECT id FROM surveys WHERE user_id = '99999999-9999-9999-9999-999999999999');

\echo '=== 2c-i. Account deletion: DELETE FROM attachments WHERE survey_id IN (draft subquery) ==='
EXPLAIN (ANALYZE, BUFFERS)
DELETE FROM attachments
WHERE survey_id IN (SELECT id FROM surveys WHERE user_id = '99999999-9999-9999-9999-999999999999');

\echo '=== 2c-ii. Account deletion: DELETE FROM survey_events WHERE survey_id IN (draft subquery) ==='
EXPLAIN (ANALYZE, BUFFERS)
DELETE FROM survey_events
WHERE survey_id IN (SELECT id FROM surveys WHERE user_id = '99999999-9999-9999-9999-999999999999');

\echo '=== 2c-iii. Account deletion: DELETE FROM surveys WHERE user_id = $1 (relies on idx_surveys_user_updated / idx_surveys_user_status prefix, not a dropped index) ==='
EXPLAIN (ANALYZE, BUFFERS)
DELETE FROM surveys WHERE user_id = '99999999-9999-9999-9999-999999999999';

\echo '=== 2d. Account deletion: DELETE FROM users WHERE id = $1 (relies on the primary key) ==='
EXPLAIN (ANALYZE, BUFFERS)
DELETE FROM users WHERE id = '99999999-9999-9999-9999-999999999999';

\echo '=== 3. Survey list (GET /v1/surveys): SELECT ... FROM surveys WHERE user_id = $1 AND deleted_at IS NULL ORDER BY updated_at DESC, id DESC LIMIT (relies on idx_surveys_user_updated) ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, site_name, status, visibility, parcel_id, observation_year, version_number, updated_at::text, sync_version
FROM surveys
WHERE user_id = (SELECT id FROM users OFFSET 10 LIMIT 1) AND deleted_at IS NULL
ORDER BY surveys.updated_at DESC, surveys.id DESC
LIMIT 21;

\echo '=== 4. Parcel-based survey lookup: WHERE parcel_id = ANY($1) (relies on idx_surveys_parcel_year_version prefix; idx_surveys_parcel_id was a pure duplicate prefix of it) ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, parcel_id, observation_year, version_number
FROM surveys
WHERE parcel_id = ANY(ARRAY['PARCEL-1','PARCEL-2','PARCEL-3']::text[]);

\echo '=== 5. survey_parcels lookup by survey_id: the dropped idx_survey_parcels_survey_id was a pure duplicate of the PK (survey_id, parcel_id) prefix ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT parcel_id FROM survey_parcels WHERE survey_id = 'survey-1';
