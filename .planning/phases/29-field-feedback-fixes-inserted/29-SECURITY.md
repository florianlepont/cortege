---
phase: 29
slug: field-feedback-fixes-inserted
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-10-11
---

# Phase 29 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time (plans 29-01 to 29-10, `<threat_model>` blocks). Audit config: `asvs_level: 1`, `block_on: high`. Every `mitigate` entry was checked against the implemented code (file and line below), not against the SUMMARY files. Implementation files were not modified.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| native camera / image manipulator -> JS | File URIs handed back by expo-camera and expo-image-manipulator (`cache/Camera/`, `cache/ImageManipulator/`) | Photo file path; the photo itself (may carry EXIF location) |
| app -> device log (logcat) | The optional `[genus-timing]` line of a measurement build | Outcome word and rounded durations |
| display -> stored payload | The Latin genus sort must never reach the synced `factors.A.genera` array | Genus code order |
| API -> community page | Failure details of `fetchCommunitySurvey` | Error text (must not reach the UI) |
| SQLite `payload_json` -> map | Locally stored JSON parsed for the Explorer's own markers | Survey payload (factors, parcel ids), scores |
| local SQLite -> Explorer | The signed-in owner's rows and the cached parcels drawn on the map | Own survey positions (computed, not stored) and scores |
| map marker -> navigation | Which page a survey id opens (owner detail vs read-only community page) | Survey id |
| catalogue -> sheet / PDF | Static registry and catalogue text rendered in `Text` and in the PDF HTML | Static strings (no user input) |
| map provider licence -> attribution text | The IGN credit required by the basemap licence | Credit text |
| developer machine -> testers' phones | APKs handed out for the measurement | Release APK (debuggable APK stays internal) |
| phone logs -> Claude | Logcat output sent back | Timing lines |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-29-01 | Tampering | `deleteTempPhoto` deleting an unrelated file through a crafted URI | medium | mitigate | `isDeletableTempPhoto` (`mobile/src/recognition/temp-files.ts:21-30`): URI must start with `FileSystem.cacheDirectory`, must not end in `/`, must hold no `..` or `%2e` (case-insensitive), and must be a named file under `Camera/` or `ImageManipulator/` (stricter than the plan, after review WR-01, commit be34ebdf). `deleteTempPhoto` (`:32-35`) returns before `deleteAsync` on a refused URI. Tests in `temp-files.test.ts` cover foreign, traversal, percent-encoded, bare-directory and model-copy URIs; run green | closed |
| T-29-02 | Information disclosure | Recognition photos (EXIF location) lingering in the app cache | medium | mitigate | Capture deleted in a `finally` around `classifyGenusPhoto` (`mobile/src/ui/GenusRecognitionModal.tsx:96-100`), which still runs after a close mid-classification (the stale-run check at `:106` only skips the UI update). Resized JPEG deleted in a `finally` around its read (`mobile/src/recognition/genusClassifierModel.ts:112-120`). Tests for ok, unavailable, closed-while-classifying, decode, model-run and read failures assert an empty mock file system. Real directories confirmed in `node_modules/expo-camera` (`"Camera"`) and `node_modules/expo-image-manipulator` (`"ImageManipulator"`), Android and iOS. Device confirmation DC-D-03 is deferred (see Residual notes) | closed |
| T-29-03 | Denial of service | A cache sweep deleting the bundled model copy (PR #272) | medium | mitigate | No directory listing or prefix sweep in the recognition code: `grep readDirectoryAsync` over `mobile/src` finds only the PDF export (`app/survey-pdf/run-export.ts`, its own `cache/exports/`), nothing under `recognition/` or the two callers. The guard refuses the model copy and any cache file outside the two sub-directories (tests at `temp-files.test.ts`: "refuses the model copy and any other file of the cache directory") | closed |
| T-29-04 | Information disclosure | Timing line leaking ids, URIs or coordinates | low | mitigate | Payload built by `roundedPayload` (`mobile/src/recognition/timing.ts:26-35`): outcome word and five rounded numbers only. Flag off by default (`mobile/src/app/feature-flags.ts:16-19`, only the exact string `"true"` enables it). The always-sent detail goes to `logStatusDetail`, a no-op outside dev builds (`mobile/src/i18n/status.ts:16-19`). `timing.test.ts` asserts the exact key set and the absence of `uri`, `id`, `lat`, `lng` | closed |
| T-29-05 | Tampering | Stored genus order or classifier label mapping changed by a sort | low | mitigate | `sortGenusCodes` sorts a copy (`mobile/src/app/genus-order.ts:34-36`, `[...codes].sort`). Used only at render (`mobile/src/ui/FactorGenusListInput.tsx:25`, chips) and print (`mobile/src/app/survey-pdf/factor-fields.ts:161`). The toggle writes through `toggleGenusInListValue(value, genus)` on the stored string (`FactorGenusListInput.tsx:52`), so the click order is kept. The classifier reads manifest labels, not the sorted list. `genus-order.test.ts` pins the package constant's first (`Abies`) and last (`Pistacia`) codes; `FactorGenusListInput.test.tsx` pins the click-order value | closed |
| T-29-06 | Tampering | Genus labels in the PDF HTML | low | accept | See AR-29-01. Rationale re-checked: genus items reach the page through `escapeHtml(item)` (`mobile/src/app/survey-pdf/factor-section.ts:98`); labels come from the catalogue, no user input | closed |
| T-29-07 | Information disclosure | Raw request errors shown on the community page | low | mitigate | `CommunitySurveyState` carries no error text (`mobile/src/hooks/useCommunitySurvey.ts:17-24`); the screens render only `t.offline`, `t.error`, `t.loading` (`CommunitySurveyScreen.tsx:119,130,137`, `CommunityHistoryScreen.tsx:60,71,78`). The raw error goes to `logStatusDetail` only (`useCommunitySurvey.ts:61,90`) | closed |
| T-29-08 | Denial of service | Retry hammering the API offline | low | accept | See AR-29-02. Rationale re-checked: retry is `state.reload`, a single `setAttempt` increment on a button press (`useCommunitySurvey.ts:101`); no timer or loop | closed |
| T-29-09 | Information disclosure | Reading another account's local surveys | medium | mitigate | `listLocalSurveyMapSources` (`mobile/src/storage/surveys.ts:515-541`) reads `local_surveys` only (no other table, no API data, nothing persisted by the reader; the sqlite test pins that it writes no `local_meta` row and keeps schema 5). `local_surveys` is purged on an account change by the owner gate: `resolveLocalDataOwnership` (`mobile/src/app/local-data-owner.ts`, `purge-and-adopt` when the stored owner differs and no work is unsynced) -> `purgeAndAdopt` -> `clearLocalIbpData` (`mobile/src/hooks/useLocalDataOwner.ts:58-71,126-130`; `surveys.ts:578-591`), and by every in-app logout (`useSurveySync.ts:158-193`). See the targeted check below for the residual windows | closed |
| T-29-10 | Denial of service | Malformed `payload_json` crashing the Explorer | low | mitigate | Each row goes through `safeParseJson` (try/catch, `mobile/src/storage/utils.ts:436-442`) and `isSurveyQueuePayload` (`utils.ts:198-205`); an invalid row is skipped (`surveys.ts:530-531`). `surveys.map-sources.sqlite.test.ts` "skips a row whose payload_json is not a survey payload" (text, array, wrong shape); `useLocalSurveyMapData.ts:47-49` catches a rejected read | closed |
| T-29-11 | Information disclosure | A survey position persisted on the phone | low | accept | See AR-29-03. Rationale re-checked: `ownSurveyMapItems` (`mobile/src/map/own-surveys.ts:86-116`) computes the position at read time from cached parcels or an in-memory detail; no write path was added (schema stays 5, no new column, tested) | closed |
| T-29-12 | Tampering | Compact card hiding the selection requirement and letting the wizard continue without a parcel | low | mitigate | One shared button for both card modes: `disabled={saving \|\| (wizard && !hasSelection)}` (`mobile/src/screens/parcel-selection/ParcelSelectionCard.tsx:62`); the requirement stays visible in the compact meta line (`:90-103`, `t.compact.selectionRequired` at `:101`). `ParcelSelectionCard.test.tsx` ("in the wizard ... stays disabled without a parcel") and the screen test cover it. Review IN-03 notes the handler itself does not re-check; informational, the declared control is present | closed |
| T-29-13 | Tampering | Registry text injected into markup | low | accept | See AR-29-04. Rationale re-checked: registry text rendered only through `Text` (`mobile/src/ui/AbbreviationInfo.tsx:94,107-108`), no `dangerouslySetInnerHTML` or WebView in the files; PDF text keeps `escapeHtml` | closed |
| T-29-14 | Repudiation | A silent gap in the abbreviation gate (finding hidden in a pending list) | low | mitigate | `mobile/src/__checks__/abbreviations.test.ts`: the pending list is gone; `"has no abbreviation outside the registry"` asserts `unexplained` equals `[]` (`:476-487`), plus `"has no registered term that no catalogue string uses"` (`:472-474`) and the exact registry/allowlist equality (`:454-466`). Any new or stale entry fails. The suite runs under `roots: ["<rootDir>/src"]` of `jest.unit.config.js` and passes | closed |
| T-29-15 | Tampering | Registry text rendered as markup in the sheet | low | accept | See AR-29-05. Rationale re-checked: plain `Text` (`AbbreviationInfo.tsx:93-95,107-108`) | closed |
| T-29-16 | Denial of service | Many mounted Modals slowing screens | low | mitigate | The Modal exists only while open: `{open ? <Modal ...> : null}` (`mobile/src/ui/AbbreviationInfo.tsx:84-112`). `AbbreviationInfo.test.tsx` "mounts no Modal until pressed" asserts zero Modals before the press and after close | closed |
| T-29-17 | Information disclosure | Drawing other members' surveys offline, or another account's local data | medium | mitigate | Only `local_surveys` rows are read (`surveys.ts:515-541`) plus cached parcels (`useLocalSurveyMapData.ts:37-45`). API markers are never persisted: nothing in the phase writes `PublicMapItem` data to SQLite (the reader is read-only; the schema stays 5). Another member's marker still comes from the API items only (`PublicMapRoute.tsx:46-51,57-60`). The route sits under the auth and owner-conflict overlays (`mobile/App.tsx:74-91,106-130`). See the targeted check for the residual windows | closed |
| T-29-18 | Elevation of privilege | An arbitrary id opening the owner-only detail (journal, edit) | low | mitigate | `handleOpenSurvey` (`mobile/src/navigation/routes/PublicMapRoute.tsx:75-84`): only ids in `localIds` (built from `surveys.surveys`, `:71-74`) call `openSurvey` and navigate to `surveyDetail`; every other id navigates to `communitySurvey` (read-only). `routes.test.tsx` covers `c-9` -> `communitySurvey` (`:1862-1873`) and own ids -> `surveyDetail` without `communitySurvey` (`:1875-1977`) | closed |
| T-29-19 | Denial of service | Background reloads on every autosave while the Explorer is hidden | low | mitigate | `if (!focused) return undefined` (`mobile/src/hooks/useLocalSurveyMapData.ts:29-32`) with `useScreenFocus()`; `useLocalSurveyMapData.test.ts` "starts no load while not focused and reloads on regaining focus" | closed |
| T-29-20 | Repudiation | Losing the legally required basemap credit while rewriting | low | mitigate | Legend keeps "© Institut national de l'information géographique et forestière (IGN), Géoplateforme. Carte : MapLibre." (`mobile/src/i18n/fr/public-map.ts:27-28`, rendered at `ScoreLegend.tsx:95`). The PDF source keeps the provider, written out: "Fond de carte : Institut national de l'information géographique et forestière (IGN)" (`mobile/src/i18n/fr/survey-export.ts:145`, rendered at `app/survey-pdf/map-section.ts:195`). The PDF source never carried a "©" before the phase (it read "Fond de carte : IGN"), so nothing was lost; see observation O-3 | closed |
| T-29-21 | Tampering | A raw API value (`region_code`) shown as text | low | mitigate | `surveyPlaceLabel` maps `ACA`/`M` through `fr.labels.regions` and returns `""` for any other code (`mobile/src/screens/public-map/ClusterListSheet.tsx:22-28`). `grep region_code` over `mobile/src` finds no other display site. `ClusterListSheet.test.tsx` covers `ACA`, `M` and the unknown `XYZ` | closed |
| T-29-22 | Information disclosure | A debuggable APK (run-as access to app data) given to testers | medium | mitigate | Procedural. Protocol: "Testers get the Release APK only; never hand the debuggable APK to testers" (`docs/user-tests/device-checks.md:28`); the debuggable build is named as the way to run the DC-D-03 listing on the owner's side only (`device-checks.md:33`, `mobile/README-native.md:198-206`); plan 29-10 SUMMARY records it was not handed out (Threat Flags, Deferred Items: "debuggable build only for the owner") | closed |
| T-29-23 | Information disclosure | `mobile/.env` copied into the worktree | low | mitigate | Procedural plus verifiable. `.gitignore:3-4` ignores `.env` and `.env.*` (`git check-ignore` confirms `mobile/.env`); `git ls-files` shows only `mobile/.env.example` tracked; no commit in any ref touches `mobile/.env`; `git status` shows nothing staged | closed |
| T-29-24 | Information disclosure | Logcat output with personal data | low | mitigate | Procedural plus code. The line holds numbers and an outcome word only (T-29-04, verified). The README read command filters to the timing lines (`mobile/README-native.md:179`, `grep genus-timing`). See observation O-2 for a wording gap in the device-checks step | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `block_on: high` count toward `threats_open`*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

Totals: 24 threats (0 high or critical, 6 medium, 18 low). Dispositions: 19 mitigate, 5 accept, 0 transfer. Closed 24, open 0.

---

## Targeted check requested by the orchestrator

### (a) Can `listLocalSurveyMapSources` return another user's rows after an account switch?

The function carries no owner filter (`mobile/src/storage/surveys.ts:524-526`, `SELECT ... FROM local_surveys ORDER BY updated_at DESC`) and the table has no owner column (`mobile/src/storage/db.ts:258-272`). Isolation is entirely the purge of the single-device owner gate. That gate holds in the places that matter:

- In-app logout always ends in `clearLocalIbpData` (`useSurveySync.ts:158-193`, `performLogoutAndPurge`, with a confirmation when work is unsynced).
- A different account signing in with nothing unsynced triggers `purge-and-adopt` (`useLocalDataOwner.ts:126-130`), which clears `local_surveys`, then refreshes the lists (`useSurveySync.ts:144-149`).
- A different account signing in while the previous account has unsynced work gives `conflict`: the previous rows deliberately stay, sync is suspended, and an opaque overlay covers the always-mounted navigation tree (`mobile/App.tsx:74-75,120-130`). The unauthenticated state is covered the same way (`App.tsx:79-83,106-118`).

Residual windows found (none changes a closed verdict at ASVS L1; they are hardening items):

1. `useLocalSurveyMapData` does not read `localDataOwnerStatus` or `syncAllowed` (`mobile/src/hooks/useLocalSurveyMapData.ts:24-59`; `PublicMapRoute.tsx:56`). The plan text and the research note say the hook runs "inside the authenticated Explorer route", but the route is mounted whenever the tree is, covered by overlays rather than unmounted. In the `conflict` case it can therefore load the previous account's rows into state while the overlay hides them.
2. Between the login of the new account and the end of the owner check (`status: "checking"`, `useLocalDataOwner.ts:82-127`) no overlay is shown and the previous rows are still on disk. The existing readers (`listLocalSurveys` for Home and Mes Relevés) have the same window, so the phase adds no new class of exposure.
3. The hook never resets its state. `data` is replaced only by a successful read (`useLocalSurveyMapData.ts:46`), the effect returns early while the Explorer is not focused (`:32`), and a failed read deliberately keeps the previous data (test "keeps the previous data and logs when a read rejects"). The tab screens are not unmounted on blur or sign-out (no `unmountOnBlur` or `lazy` override in `mobile/src/navigation`). After a purge made while the Explorer tab is blurred, the previous account's `sources` and `parcels` stay in component memory and are rendered for one commit, until the first read after refocus replaces them.

Impact: same device, two accounts, previous account's own marker positions (parcel centres) and scores shown for a moment to the next account. No network exposure, no persistence. Severity assessed as low, not tied to a register entry, non-blocking.

Suggested hardening (not required for this gate): pass `session.localDataOwnerStatus === "ok"` into the hook, return `EMPTY` and skip the read when it is not `ok`, and reset `data` to `EMPTY` when the session sub changes or when the gate is lost.

### (b) T-29-22 to T-29-24 (debuggable APK, `.env`, logcat)

Marked from the documented protocol and the repository state, and flagged procedural: they depend on how the owner and the testers behave, not on code. The documents state the rule (`device-checks.md:28,33`, `README-native.md:168-206`), and the git state confirms `mobile/.env` is ignored and untracked.

---

## Unregistered observations (informational, not counted in `threats_open`)

| ID | Type | Observation |
|----|------|-------------|
| O-1 | unregistered_flag | Stale previous-account state in `useLocalSurveyMapData` and missing owner-status gate (targeted check (a), windows 1 to 3). Low severity, non-blocking |
| O-2 | documentation gap | `docs/user-tests/device-checks.md:30` (step 4) gives `adb logcat -s ReactNativeJS` without the `grep genus-timing` filter and does not tell testers to send only the timing lines, while the register (T-29-24) relies on "testers send only the filtered lines" and the README command is filtered. `mobile/README-native.md:194-195` also says to leave `EXPO_PUBLIC_GENUS_TIMING` unset for builds given to testers, while step 2 of the protocol has the testers' Release APK built with it set. The line carries numbers only, so the impact is low; align the two documents |
| O-3 | review item | Review IN-04: the PDF map source line has no "©" (it had none before the phase); the in-app legend keeps it. Not a regression. Whether the Géoplateforme terms ask for "©" in the PDF is a licence question for the owner |
| O-4 | review item | Review IN-03: `handleDone` in `SurveyParcelSelectionScreen.tsx` does not re-check the wizard selection requirement; only the button's `disabled` prop enforces it (the control declared by T-29-12). Informational |

SUMMARY `## Threat Flags` of plans 29-01 to 29-10: all read "None" or map to an existing register entry (T-29-01 to T-29-24). No flag lacks a mapping.

---

## Residual notes (deferred verification, not accepted risks)

- DC-D-03 (no photo left behind) is deferred by the owner on 2026-10-11 for lack of an Android phone (`29-10-SUMMARY.md` Deferred Items; the three rows D-01 to D-03 stay unchecked in `docs/user-tests/device-checks.md`). T-29-02 is closed on the code and on the unit tests. The guard was tightened after the device runs (commit be34ebdf), so it has not been exercised against a real device URI. The native sources confirm the two directory names and that both write under the cache directory, which is what the guard requires. The failure mode if a URI ever fell outside them is that the file would not be deleted (the photo lingers), never that another file is deleted. The listing on a debuggable build (`README-native.md:198-206`) remains the way to confirm.
- Tests re-run during this audit, with coverage off: the 15 suites covering the temp files, classifier, modal, timing, genus order, own surveys, map-data hook, SQLite reader, abbreviation info and gate, parcel card and cluster list pass (163 tests).

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-29-01 | T-29-06 | Genus labels in the PDF HTML come from the catalogue and pass through the PDF builder's single `escapeHtml`; no new input. Re-verified at `survey-pdf/factor-section.ts:98` | Plan author, `29-02-PLAN.md` `<threat_model>` | 2026-10-11 |
| AR-29-02 | T-29-08 | Retry on the community page is a manual press calling `state.reload`; offline it fails fast and shows the same state. Re-verified at `hooks/useCommunitySurvey.ts:101` | Plan author, `29-03-PLAN.md` `<threat_model>` | 2026-10-11 |
| AR-29-03 | T-29-11 | No survey position is stored: it is computed at read time from the cached parcels the user downloaded (D-09); no schema or payload change. Re-verified at `map/own-surveys.ts:86-116` and the schema-5 test | Plan author, `29-04-PLAN.md` `<threat_model>` | 2026-10-11 |
| AR-29-04 | T-29-13 | Registry text is static, rendered only through `Text`; the PDF keeps its single `escapeHtml`; no user input. Re-verified at `ui/AbbreviationInfo.tsx:94,107-108` | Plan author, `29-06-PLAN.md` `<threat_model>` | 2026-10-11 |
| AR-29-05 | T-29-15 | Plain `Text` only in the sheet; static catalogue strings, no user input. Re-verified at `ui/AbbreviationInfo.tsx:93-95,107-108` | Plan author, `29-07-PLAN.md` `<threat_model>` | 2026-10-11 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-11 | 24 | 24 | 0 | gsd-security-auditor (Claude), ASVS L1, block_on high |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-11 (ASVS L1, code-level; T-29-22 to T-29-24 are procedural; DC-D-03 device confirmation deferred by the owner)
