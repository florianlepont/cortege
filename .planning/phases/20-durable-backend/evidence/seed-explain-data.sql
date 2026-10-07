-- Synthetic bulk data for EXPLAIN evidence (Phase 11, REQ-QA-indexes). Not part of the repo.
INSERT INTO users (id, auth0_sub, email, role, display_name)
SELECT gen_random_uuid(), 'auth0|user' || i, 'user' || i || '@example.com', 'observer', 'User ' || i
FROM generate_series(1, 5000) AS i;

INSERT INTO surveys (id, user_id, site_name, status, visibility, parcel_id, observation_year, version_number, created_at, updated_at, expires_at, sync_version)
SELECT
  'survey-' || i,
  u.id,
  'Site ' || i,
  (ARRAY['draft','synced'])[1 + (i % 2)],
  (ARRAY['private','public'])[1 + (i % 2)],
  'PARCEL-' || (i % 8000),
  2020 + (i % 6),
  1,
  now() - (i || ' minutes')::interval,
  now() - (i || ' minutes')::interval,
  now() + interval '30 days',
  1
FROM generate_series(1, 40000) AS i
JOIN LATERAL (SELECT id FROM users OFFSET (i % 5000) LIMIT 1) u ON true;

INSERT INTO survey_events (id, survey_id, actor_id, event_type, payload, created_at)
SELECT
  gen_random_uuid(),
  s.id,
  CASE WHEN i % 4 = 0 THEN NULL ELSE u.id END,
  (ARRAY['created','updated','submitted'])[1 + (i % 3)],
  '{}'::jsonb,
  now() - (i || ' minutes')::interval
FROM generate_series(1, 40000) AS i
JOIN LATERAL (SELECT id FROM surveys OFFSET (i % 40000) LIMIT 1) s ON true
JOIN LATERAL (SELECT id FROM users OFFSET (i % 5000) LIMIT 1) u ON true;

INSERT INTO survey_parcels (survey_id, parcel_id)
SELECT id, parcel_id FROM surveys
ON CONFLICT DO NOTHING;

-- Pin one specific user with many surveys/events for a realistic "delete this account" target.
INSERT INTO users (id, auth0_sub, email, role, display_name)
VALUES ('99999999-9999-9999-9999-999999999999', 'auth0|explaintarget', 'explain-target@example.com', 'observer', 'Explain Target');

INSERT INTO surveys (id, user_id, site_name, status, visibility, parcel_id, observation_year, version_number, created_at, updated_at, expires_at, sync_version)
SELECT
  'explain-survey-' || i,
  '99999999-9999-9999-9999-999999999999',
  'Explain Site ' || i,
  CASE WHEN i <= 5 THEN 'submitted' ELSE 'draft' END,
  'private',
  'PARCEL-EXPLAIN-' || i,
  2026,
  1,
  now() - (i || ' minutes')::interval,
  now() - (i || ' minutes')::interval,
  now() + interval '30 days',
  1
FROM generate_series(1, 20) AS i;

INSERT INTO survey_events (id, survey_id, actor_id, event_type, payload, created_at)
SELECT gen_random_uuid(), 'explain-survey-' || i, '99999999-9999-9999-9999-999999999999', 'created', '{}'::jsonb, now()
FROM generate_series(1, 20) AS i;

INSERT INTO survey_parcels (survey_id, parcel_id)
SELECT id, parcel_id FROM surveys WHERE user_id = '99999999-9999-9999-9999-999999999999'
ON CONFLICT DO NOTHING;

ANALYZE users;
ANALYZE surveys;
ANALYZE survey_events;
ANALYZE survey_parcels;

SELECT (SELECT count(*) FROM users) AS users_count,
       (SELECT count(*) FROM surveys) AS surveys_count,
       (SELECT count(*) FROM survey_events) AS survey_events_count,
       (SELECT count(*) FROM survey_parcels) AS survey_parcels_count;
