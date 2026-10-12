# Phase 27: Quick survey additions (INSERTED, V1) - Context

**Gathered:** 2026-10-11
**Status:** Ready for planning

<domain>
## Phase Boundary

A survey can carry a free note (for the survey and for each factor), pre-filled weather information and a certainty flag ("Douteux") per factor A to J, without slowing the field entry. The three cards come from the seminar of 2026-10-10 and are the first V1 features of the beta. Criteria 1 to 3 of the ROADMAP entry stand. The certainty flag never changes a score, a band or a validation result.

</domain>

<decisions>
## Implementation Decisions

### Storage and sync
- **D-01:** Dedicated API columns, nullable like migration 016: new migration `023` adds a survey note column (text) and a `weather` jsonb column. The per-factor doubt and per-factor note live in the `factors` payload (no column). Validated with `class-validator` in `SurveyUpsertDto`, documented in `data-contract-v1.md` and `api-contract-v1.md`.
- **D-02:** Mobile: the fields live in the local `payload_json`; SQLite stays at `user_version` 5 (no local migration).
- **D-03:** Everything is **read-only after submit**: survey note, weather, factor notes and doubts. No new sync operation, no new conflict case. The note was briefly planned as editable after submit and then reversed by the owner.
- **D-04:** Compatibility: optional fields, absent or `null` = no value. An absent or `null` field never counts as a change in the "same `sync_version`" comparison (existing rule). The new fields must be added to the compared read-only fields consistently with that rule (planner to check that a note or doubt change at the same version behaves as a content change, like `factors`). Prod is test data: no two-step migration.

### Free notes
- **D-05:** Two notes: one per survey (max 1000 characters) and one per factor (max 300 characters, stored in the factor payload, `evidence.notes` of the form spec is the model; planner confirms the exact key against the current factor payload).
- **D-06:** Visible to the members who can read the survey (follows the survey's visibility), in the survey summary, the parcel history and the PDF.
- **D-07:** The survey note is searchable in the global search for **the user's own surveys only** (the local on-phone match in `mobile/src/app/global-search.ts`); the API community search is unchanged.

### Weather
- **D-08:** Source: **Météo-France official API**, always called through a new Cortege API endpoint (key kept server-side, cache, de-duplication, clean `503` when the provider is down, own throttle, as for the IGN geocoder in phase 25). The app never calls the provider directly. Research must check access, key, quotas and licence, and whether the API gives the observed weather for the survey time (see Risks).
- **D-09:** Stored values: sky condition (code rendered in French by the catalogue), temperature in degrees C, wind in km/h, rain over the last 24 h in mm, and the observation time. Each value is editable.
- **D-10:** Trigger: automatically once the parcel is chosen and the network is there, using the **centre of the parcel** and the current time. Never overwrites a value the observer edited by hand.
- **D-11:** Offline: the section stays empty with **no error**. When the network returns, the draft fills in as long as the observer entered nothing; the weather is that of the survey time, not of the reconnection time.

### Certainty
- **D-12:** One doubt flag per factor A to J (not per genus, not per survey). Scale: **Sûr / Douteux**, default Sûr; only "Douteux" is a state the observer sets.
- **D-13:** Shown wherever the factor is shown: survey detail (score page), the PDF, and to other members reading the survey. No effect on score, band, total or validation.
- **D-14:** Guard rail: the score code ignores the doubt. The type may be declared with the wire types of `@cortege/ibp-domain`, but `evaluateIbp` never reads it, and a parity case in `IBP_PARITY_CASES` proves the same survey with and without a doubt gives the same result in the package, the API adapter and the mobile adapter. No rule is reimplemented in `api` or `mobile`.

### Entry ergonomics
- **D-15:** The survey note and the weather live in a **"Conditions" section of the survey context screen**, before the factors.
- **D-16:** Per factor, a **collapsed strip under the factor**: a "Douteux" switch and an "Ajouter une note" link, closed by default, so the ~40-interaction budget of phase 12 is kept.
- **D-17:** Display: survey summary shows one weather line and the folded survey note; the score page shows the "Douteux" badge and the factor note; the PDF has a "Conditions du relevé" block, with the badge and note under each factor, on the fixed A4 page blocks (`mobile/src/app/survey-pdf/`).
- **D-18:** All text through the typed `fr` catalogue, no em dash, abbreviations as in the phase 26 gates (units allowed).

### Planning-time decisions (owner, 2026-10-11, after research)
- **D-19:** Weather comes from the **nearest Météo-France observation station**, chosen server-side, within a **distance cap** (value fixed by the Wave 0 spike). Beyond the cap the weather stays empty, with no error. The AROME model fallback is **not** retained in this phase (heavier product, modelled rather than observed values); the owner may overrule.
- **D-20:** Offline catch-up (D-11) works for a survey **at most 24 h old** (the observation API keeps 24 h). Older: the section stays empty and editable by hand. No climatology archive.
- **D-21:** Sky and rain over 24 h are pre-filled **only if the spike confirms** a product that gives them (SYNOP, or the sum of 24 hourly readings); otherwise those two fields stay manual. Temperature and wind first. Never blocking.
- **D-22:** The owner creates the portal account, subscribes to "Données d'observation" and places the key in `api/.env` then `/home/ubuntu/cortege.env`. Claude never handles the key. A Wave 0 spike with the owner's key confirms field names, units (Kelvin, m/s suspected), parameters and the nearest-station lookup; the plan carries it as a human checkpoint and the weather endpoint is built behind it. `WEATHER_PROVIDER` = `meteofrance | synthetic | off`, default `off`, `synthetic` refused in production.
- **D-23 (research, refines D-01/D-05):** the per-factor doubt and note live in **`factors.annotations`**, keyed by factor code, `{ doubt?: true, note?: string }`, **not** inside a factor entry (a meta-only entry would make `evaluateIbp` raise `factor_invalid_raw`). No column; the `factors` deep-compare and the submitted read-only check apply for free; no scorer reads it.

- **D-24 (owner, 2026-10-11, O7):** On account deletion the **submitted surveys keep their notes** (survey note and factor notes); nothing new is nulled. The author already shows as "un ancien membre" (`community-survey.ts`, `survey-list.ts` `unknownAuthor`; `users.service.ts` nulls `user_id`). Risk accepted by the owner: a free note could name a person; no erasure of note text in this phase.
- **D-25 (owner, 2026-10-11):** Raise the API JSON body limit (default 100 kB, a sync batch of about 22 maximal surveys would return 413 and be retried forever by the phone). The planner picks the new value and checks the sync batch size cap against it.
- **D-26:** Weather values shown in the app and printed in the PDF carry the attribution "Source : Météo-France" (Etalab Open Licence 2.0 asks for the source mention). The owner reads the portal terms before the beta (O6, see the research note); until then the plan treats the attribution line as mandatory.

- **D-27 (owner, 2026-10-12, after the first real capture):** the credential the owner generated on the portal is a **1 hour bearer JWT** (iat 06:01Z, exp 07:01Z; the `apikey` header is refused with "Invalid Credentials", `Authorization: Bearer` works). It is enough for captures and local trials but not for production: the server must use the portal's **application id** (OAuth2 client credentials, token endpoint `https://portail-api.meteofrance.fr/token`, token cached in memory and renewed) so the VPS renews its own tokens. The owner retrieves the application id from the portal ("Mes applications") and places it in `/home/ubuntu/cortege.env`; until then plan 27-12 builds the application-id mode against a mocked token endpoint and the real end-to-end check waits for it (27-21).
- **D-27 correction (owner, 2026-10-12, later the same day):** the portal credential of type "API Key" (valid 3 years, expires 2029-10-12) works in the **`apikey` header** (capture script: `auth mode: apikey`, HTTP 200). It is the **production mode**: one secret in config, no token renewal. The application-id flow stays as plan B (mocked token endpoint) and the one hour bearer token as a trial mode. Mode chosen by the optional `METEOFRANCE_AUTH_MODE`, else by the shape of the secret.
- **D-28 (owner, 2026-10-12):** the catch-up window stays **24 h** (D-20 confirmed) although the API was observed to serve about 96 h of history (documented: 24 h); we do not rely on undocumented behaviour. The observed 96 h is recorded in the spike README for a later decision.
- **D-29 (owner, 2026-10-12, refines D-21 and D-19):** two station lookups. Temperature, wind and rain over 1 h come from the nearest **hourly station** (2151 stations, cap from D-19, default 25 km). Sky and rain over 24 h come from the nearest **SYNOP station** (about 190 stations: `n` cloud cover, `ww` present weather, `rr24`) within its **own cap (default 50 km)**; beyond it those two fields stay manual. Every value keeps the source "Météo-France". Units on the wire: temperature in Kelvin, wind `ff` in m/s, rain in mm, so the provider converts to degrees C and km/h. Hourly stations often return null wind and sky: nulls stay null, never invented.
- **D-30:** the real captures (`api/test/fixtures/meteofrance/`, including the official `dpobs-v2.swagger.json`) are the fixtures of plan 27-12; `liste-stations` is CSV only, `/station/horaire` takes `id_station`, `date` and `format`, `/synop` takes `format`, `id_station`, `date_debut`, `date_fin`.

- **D-31 (owner, 2026-10-12, closes O6):** the owner read the Météo-France observation API licence and the Licence Ouverte Etalab 2.0 and accepted them. Free reuse, commercial included, in the app and in PDFs shared with partners, on four conditions: (1) no alteration of the data and no distortion of its meaning; (2) the source "Météo-France" on every support; (3) the **date of the last update** of the reused data next to it; (4) the data kept up to date. Consequences: the source line carries the date and time of the measurement ("Source : Météo-France, mesure du 12/10/2026 à 04:00", from `observed_at`, local clock) in the summary card, the Conditions section (status line and source line), the read-only view and the PDF, and stays "Source : Météo-France" alone when `observed_at` is missing; a weather the observer edited is never presented as Météo-France data without saying so ("Préremplie d'après Météo-France, mesure du ..., modifiée par ..."); **strict rule (owner, 2026-10-12)**: when the source is Météo-France, at least one value is edited and at least one is still the provider's, the source line reads "Source : Météo-France, mesure du 12/10/2026 à 04:00, certaines valeurs modifiées par l'observateur" (without the date: "Source : Météo-France, certaines valeurs modifiées par l'observateur") on the summary card, the Conditions section, the read-only view and the PDF source cell; when every provider value is edited there is no attribution line and the existing "modifiée par l'observateur" wording applies; manual values carry no Météo-France mention; the 24 h documented retention stays (D-28); the key never leaves the server. Quota reported by the owner: 100 requests per minute. Météo-France guarantees no availability and may change data or quotas without notice. Details in `27-LICENCE-NOTE.md`.

- **D-32 (owner, 2026-10-12, simulator check; amends D-15 and OA-46):** "Contexte et parcelles" is two pages. **Contexte** (route `surveyContext`, `section: "conditions"` kept): the IBP method and cas (`ScoringContextEditor`) and the weather block with its status line and the full dated source sentence (this is where the licence mention of D-31 lives in full). **Parcelles** (new route `surveyParcelsPage`, registered in the survey stack only; the community view keeps its single page): the parcel map with the pencil, the list of parcels and the offline map row (moved there from the summary). The summary rows are Contexte, Parcelles, Facteurs IBP and the parcel history; the summary map card and the Parcelles row open Parcelles (the map card no longer opens the parcel editor directly, the pencil on the Parcelles map does), the weather card opens Contexte at the weather.
- **D-33 (owner, 2026-10-12, amends D-15):** the survey note leaves the Conditions section and is a card of its own on the summary, right under the weather card (`SurveyNoteCard`: `NoteField`, 1000 characters, written 400 ms after typing stops, on blur and when the card goes away; plain selectable text after submit, no card when empty). The weather card no longer shows or folds a note. The Contexte section is the weather only and is titled "Météo" (`fr.conditions.section`). The community view shows the weather block, then the other member's note as a read-only card, no "Conditions" heading.
- **D-34 (owner, 2026-10-12):** the summary row and its page "Score IBP" are renamed "Facteurs IBP" (row, page header, community section title). The score card keeps "Score IBP" and "Score IBP du brouillon"; the PDF is unchanged.
- **D-35 (owner, 2026-10-12, amends D-26 and D-31 for the summary card only):** the summary weather card shows the weather line and, in small secondary text, a very short mention built by `weatherCardMention`: "Météo-France" while the provider's values are untouched, "Météo-France, en partie modifiée" when some were edited, nothing when every provider value was edited or the weather is manual. No date, no sentence on the card. The full dated sentence (`weatherSourceLine`) stays in the Contexte weather block, the community read-only view and the PDF. The owner accepted the short mention on the card as compliant enough, the source and the date being one tap away; recorded in `27-LICENCE-NOTE.md`.
- **D-36 (bug fix, found in the owner's simulator check):** the summary map and the Parcelles map must be framed on the survey's parcels. Cause: `ParcelMapCard` centred on the server's `display_location`, which a not-yet-synced draft does not have, so it fell back to a France-wide region next to the chip "2 parcelles". Fix: without `display_location` the card uses the point stored under `weather_point:<surveyId>` (plan 27-13) or the centre of the cached parcel geometry; when geometry is available (downloaded areas, or the parcels returned by the parcel-status request around that centre) the map is fitted to the parcels' bounding box with a 1.4 margin factor and a 0.003 degree minimum span; the 0.01 degree window stays as the fallback. A survey that has parcels but no known position draws no live map (contours only), never France; a survey without any parcel keeps the whole-country map. Pure rules in `mobile/src/app/parcel-frame.ts`.

- **D-37 (owner, 2026-10-12, second simulator check; amends D-09, D-10 and D-35):** only the **sky** can be edited by the observer. Temperature, wind, rain over 24 h and the observation time are Météo-France data, read-only (the licence forbids altering them anyway). The Contexte weather block keeps the eight sky chips (the selected chip again clears the sky) and shows the measurements as label and value rows; the four fields, the "Remplir à nouveau" link and alert, the field-focus scrolling and everything that existed only to edit numbers are gone. With no provider data (offline, no station within the cap, no parcel yet) only the chips and the calm status line remain. Data model unchanged on the wire, but `edited` can only hold `sky` (`editWeatherSky`, `orderedEdited`); the merge keeps protecting an edited (set or cleared) sky, provider values are written only where still empty. Provenance: a sky the observer sets or clears is theirs, never labelled Météo-France. The summary card says "Météo-France" whenever provider values are shown (the "en partie modifiée" variant is removed); the dated sentence (Contexte, read-only twin, PDF) reads "Source : Météo-France, mesure du ..." and adds ", ciel saisi par l'observateur" when the sky shown is the observer's; a weather with only the observer's sky has no Météo-France mention and no observation time. Server validation unchanged.
- **D-38 (owner, 2026-10-12):** the survey note card moves to the very bottom of the summary, after the rows and the survey actions and just above the dev-only debug area. The empty band under the card's Météo-France mention came from the old card's layout transition wrapper and its 52 point minimum height; both are removed and the mention sits inside the single press target.
- **D-39 (owner, 2026-10-12, bug fix):** the missing prefill of "Parcelle de la source". Root cause, read from the simulator database: it is a **seeded demo draft from July (id `demo-...`, three parcels, synced)**, not a survey created that afternoon. It already had its parcels before the weather existed, so no write ever took its parcels "from none to some", the only event that stamped `weather.requested_at`; it has no stored point either because it never went through the parcel selection route. The owner then set its sky (`{sky, edited:[sky], source:manual}`), which made it look like a prefill failure. The same hole applies to any draft made before phase 27, pulled from the server or saved by a path that does not stamp. Fix: (1) `stampWeatherRequest` also stamps a draft that has parcels and no survey time when its set of parcels changes (the Parcelles pencil, a wizard edit), never on another write; (2) safety net in `useWeatherPrefill`: `listWeatherCandidates` also returns drafts with parcels, no provider answer and no `requested_at` created within two days; the hook derives the survey time from `created_at` only inside the 24 h window (`weatherRequestTime`, never invented; both the phone's ISO and the server's Postgres format are read), takes the point from the stored one or the centre of the cached parcel geometry (kept with `saveWeatherPoint`), and writes the survey time together with the answer. The owner's seeded July draft is outside the window by design: it gets weather when its parcels are changed, not for July.
- **D-40 (owner, 2026-10-12):** the weather moves to the **start** of the survey summary, right under the title and status line and before the score card, and becomes a proper glass card (`WeatherCard`, replacing `ConditionsCard`): a big outline sky glyph in a tile beside the temperature numeral and its unit (the sky label under it), wind, rain over 24 h and the time of the measurement as compact columns that wrap at large text sizes and 320 pt, the short "Météo-France" mention, the chevron to Contexte (the whole card is one button). Empty draft: friendly invitation ("Météo du relevé", "Se remplit toute seule avec la parcelle. Vous pouvez choisir le ciel."); offline: calm sentence and quiet glyph, no error tone; submitted without weather: nothing drawn; only the observer's sky: glyph and label, no figure, no mention. One `EntranceView` entrance, no loop, no `ForestCard`. Text through `fr.conditions.summary`.

### Claude's Discretion
Visual design of the strip and of the weather section (within the charter), the French labels of the sky conditions, cache durations and throttle of the weather endpoint, the exact payload key names.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and contracts
- `.planning/ROADMAP.md` Phase 27 — goal and 3 success criteria
- `docs/specs/epic-c-ibp-survey-data-entry.md` — data entry stories (US-C1 form, US-C2 draft)
- `docs/specs/ibp-form-spec.md` §10 (factor structure, `evidence.notes`, logical submission payload, versioning rules)
- `docs/technical/sync-conflict-resolution-v1.md` — Case B comparison of read-only fields, the new fields must fit it
- `docs/technical/api-contract-v1.md` — survey upsert, sync and a new weather endpoint
- `docs/technical/data-contract-v1.md` — survey columns and payload
- `docs/design/charte-graphique-etats-sauvages-spec.md` §13 — visual layer rules

### Code
- `api/src/surveys/dtos/survey-upsert.dto.ts` — survey payload validation
- `api/src/surveys/surveys-sync.service.ts`, `api/src/surveys/surveys.service.ts` — upsert and sync
- `api/src/surveys/geocoder.service.ts`, `api/src/surveys/ign-http.ts` — pattern for a proxied provider with cache and 503
- `api/migrations/016_ibp_method_version.sql`, `api/migrations/README.md` — nullable columns pattern, migration rules
- `packages/ibp-domain/src/contract/survey.ts`, `packages/ibp-domain/src/evaluate.ts`, `packages/ibp-domain/src/parity/cases.ts` — wire types, scoring that must ignore the doubt, parity fixture
- `mobile/src/app/ibp-scoring.ts`, `mobile/src/app/types.ts`, `mobile/src/storage/surveys.ts` — mobile adapter, payload, writes
- `mobile/src/screens/SurveyContextScreen.tsx`, `FactorDetailScreen.tsx`, `SurveyScoreScreen.tsx`, `SurveyDetailScreen.tsx` — screens touched
- `mobile/src/app/survey-pdf/` and `mobile/src/app/global-search.ts` — PDF and own-survey search
- `mobile/src/i18n/fr/` — catalogue; `mobile/src/__checks__/` — source gates

No external spec: the seminar cards are summarised in the ROADMAP entry.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Geocoder service and `ign-http.ts`: model for the Météo-France proxy (cache, de-duplication, 503, own throttle).
- `IBP_PARITY_CASES` and the three adapters: ready-made proof that the doubt does not move the score.
- `useParcelStatuses`/parcel selection and the cached parcel geometry (phase 26 D-09): give the parcel centre for the weather.
- `useSurveyDraftPatcher`: accumulates incremental patches, the place for the new draft fields.

### Established Patterns
- Read-only-after-submit fields (`ibp_method_version`, `ibp_cas`, `ibp_cas3_scale`); nullable columns plus CHECK/DTO validation.
- All text from the typed `fr` catalogue; colours via `useBrandTheme()`; Ionicons outline only; 400-line cap on `src/screens` and `src/navigation`.
- PDF is pure builders with fixed A4 page blocks; the `fr` text and `html.ts` escape are the only text and escape paths.

### Integration Points
- Survey context screen (Conditions), factor pager (strip), score page and survey summary (display), PDF `build-html.ts`, sync payload builder, `SurveyUpsertDto`, a new weather controller/service in `api/src/surveys/`.

</code_context>

<specifics>
## Specific Ideas

- The doubt is a "Douteux" pill, set only when needed; the strip stays closed otherwise.
- Weather is a convenience: it must never block saving or submitting a survey, and an empty weather is valid.

### Risks for the researcher
- Météo-France API: key and quotas, licence for display, and whether it returns past observations by time and point; the offline catch-up (D-11) needs weather at the survey time, possibly some hours after.
- Same-version comparison (D-04): adding the new fields must not create false `409 sync_version_conflict` for installed apps.
- The PDF page budget with a 1000-character note and ten 300-character factor notes.

</specifics>

<deferred>
## Deferred Ideas

- Doubt per genus of factor A, three-level certainty scale (not chosen).
- Editing the note after submit (reversed by the owner).
- Searching community surveys' notes through the API search (not chosen).
- A "reason" text on the doubt (the factor note covers it).

</deferred>

---

*Phase: 27-quick-survey-additions-inserted-v1*
*Context gathered: 2026-10-11*
