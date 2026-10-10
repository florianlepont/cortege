---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 25.1
current_phase_name: PDF Export Improvement
status: executing
stopped_at: Phase 25.1 context gathered
last_updated: "2026-10-10T09:41:01.102Z"
last_activity: 2026-10-10
last_activity_desc: Phase 25.1 execution started
progress:
  total_phases: 29
  completed_phases: 16
  total_plans: 188
  completed_plans: 209
  percent: 55
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-22)

**Core value:** An ecologist can complete a full IBP survey offline on a real parcel and have it reach the server intact on reconnection — no data loss, no duplicates.
**Current focus:** Phase 25.1 — PDF Export Improvement

## Current Position

Phase: 25.1 (PDF Export Improvement) — EXECUTING
Plan: 1 of 17
Status: Executing Phase 25.1
Last activity: 2026-10-10 — Phase 25.1 execution started

Progress: [█████████░] 25/29 phases complete

## Performance Metrics

**Velocity:**

- Total plans completed: 76
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 03 | 9 | - | - |
| 04 | 7 | - | - |
| 05 | 6 | - | - |
| 06 | 12 | - | - |
| 07 | 9 | - | - |
| 08 | 13 | - | - |
| 02 | 4 | - | - |
| 09 | 16 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 1 P01 | 25min | 3 tasks | 5 files |
| Phase 1 P02 | ~4h | 3 tasks | 2 files |
| Phase 1-species-recognition-approach-decision P03 | ~3h | 2 tasks | 18 files |
| Phase 1 P04 | 50min | 2 tasks | 8 files |
| Phase 1 P04b | ~5.5h | 1 tasks | 5 files |
| Phase 1 P04-iter3 | ~9-10h (2 sessions, corpus expansion+2 bug fixes) | 2 tasks | 1 files |
| Phase 1-species-recognition-approach-decision P05 (partial: Task A) | ~2h | - tasks | - files |
| Phase 1-species-recognition-approach-decision P05 (complete) | ~3.5h total | - tasks | - files |
| Phase 1 P06 | ~2h | 3 tasks | 6 files |
| Phase 3 P01 | 45min | 3 tasks | 13 files |
| Phase 3 P02 | 55min | 2 tasks | 9 files |
| Phase 3 P03 | 55min | 3 tasks | 9 files |
| Phase 3 P04 | 12min | 2 tasks | 8 files |
| Phase 3 P05 | 8min | 2 tasks | 4 files |
| Phase 3 P06 | 22min | 2 tasks | 8 files |
| Phase 3 P07 | 10min | 2 tasks | 8 files |
| Phase 3 P08 | 21min | 2 tasks | 6 files |
| Phase 3 P09 | 37min | 2 tasks | 1 files |
| Phase 23 P02 | 25min | 3 tasks | 6 files |
| Phase 23 P01 | gate | 2 tasks | 1 files |
| Phase 23 P03 | 25min | 3 tasks | 17 files |
| Phase 23 P04 | 25min | 3 tasks | 10 files |
| Phase 23 P05 | 20min | 2 tasks | 8 files |
| Phase 23 P06 | 20min | 3 tasks | 12 files |
| Phase 23 P07 | 30min | 3 tasks | 15 files |
| Phase 23 P08 | 25min | 2 tasks | 9 files |
| Phase 23 P09 | 30min | 3 tasks | 12 files |
| Phase 23 P10 | owner check | 1 tasks | 0 files |
| Phase 23 P11 | 30min | 3 tasks | 13 files |
| Phase 23 P12 | 35min | 3 tasks | 12 files |
| Phase 23 P13 | 30 min | 3 tasks | 20 files |
| Phase 23 P14 | owner check | 1 tasks | 0 files |
| Phase 23 P15 | 90 min | 3 tasks | 32 files |
| Phase 23 P16 | 35 min | 2 tasks | 11 files |
| Phase 23 P17 | owner check | 1 tasks | 0 files |
| Phase 23 P18 | 16min | 2 tasks | 20 files |
| Phase 23 P19 | owner check | 1 tasks | 0 files |
| Phase 23 P20 | 9min | 2 tasks | 40 files |
| Phase 23 P21 | 22min | 3 tasks | 25 files |
| Phase 23 P22 | 7min | 2 tasks | 5 files |
| Phase 23 P23 | owner check | 2 tasks | 2 files |
| Phase 24 P01 | 15min | 2 tasks | 9 files |
| Phase 24 P02 | 15min | 3 tasks | 7 files |
| Phase 24 P03 | 20min | 3 tasks | 14 files |
| Phase 24 P04 | 25min | 2 tasks | 5 files |
| Phase 24 P05 | 15min | 2 tasks | 6 files |
| Phase 24 P06 | 15min | 2 tasks | 7 files |
| Phase 24 P07 | 15min | 2 tasks | 7 files |
| Phase 24 P08 | 40min | 2 tasks | 4 files |
| Phase 24 P09 | 25min | 2 tasks | 4 files |
| Phase 24 P10 | 40min | 3 tasks | 11 files |
| Phase 24 P11 | 35min | 3 tasks | 14 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md — 14 LOCKED ADR-001 decisions plus this milestone's Key
Decisions table. Decisions affecting current work:

- Milestone is **internal-only**; the whole community/social dimension moves to the next milestone
- **Multi-parcel linkage wins** (`survey_parcels`); `ibp-form-spec.md` §4 is stale — the code is the arbiter
- **Shipped status enum wins** (`draft|submitted|synced|error|expired`, `submitted_at`/`deleted_at`); `ibp-form-spec.md` §10.1 is stale
- US-C9 species recognition stays in MVP but is gated behind an ML ADR (Phase 1) and a contract extension (Phase 14)
- The current VPS is ratified as the hosting target, not migrated (Phase 20)
- [Phase 1]: Benchmark devices (D-18) fallback: lowest-spec real iOS (iPhone SE 2nd/3rd gen or iPhone 11 class) and lowest-spec real Android (2022-2023 mid-range, Galaxy A-series class); no flagship. Recorded as a provisional confidence cap, not a phase failure. — Association did not confirm which phones its observers carry; RESEARCH.md Pitfall 4 rules out flagship test devices.
- [Phase 1]: Field photographs (D-16) fallback: no-field-photos. Spike reports the public-dataset accuracy figure only; field validation deferred and recorded as a stated gap in the measurement document, not silently dropped. — No field photo set was available at the Task 1 checkpoint.
- [Phase 1]: 34-class corpus assembled from GBIF occurrence media (CC0/CC-BY only); composition audit found the corpus is NOT reliably single-subject, excluding Betula and Phillyrea from the usable-class count (CLASSES-USABLE: 32, GATE-CORPUS: PASS)
- [Phase 1]: Seasonal-skew measurement found 23 of 34 classes have zero autumn-dated images in the training corpus, despite field tests starting in October -- recorded as a new confidence cap on any accuracy figure this phase reports
- [Phase 1]: GATE-HARNESS PASS (corrected from an earlier, wrong BUILD-FAILED) -- react-native-fast-tflite built, linked AND RAN on a real iPhone 15 Pro (iOS 27.0, FLAGSHIP -- not the D-18 low-spec floor), 10/10 real benchmark passes (preprocess ms median 77.9/worst 93.2, inference ms median 4.8/worst 13.7). Android build succeeded but was not run on real hardware (no device connected, by user decision this milestone) -- recorded as a gap, not a runtime failure. D-06 offline behaviour not empirically re-verified in airplane mode on real hardware -- open item for plan 05.
- [Phase 1]: react-native-vision-camera@5.2.3 ships no Expo config plugin; fixed with a project-local plugin injecting camera permissions directly
- [Phase 1]: pod install must run once after all expo install calls finish, not interleaved -- interleaving left a stale Podfile.lock path that broke the iOS build
- [Phase 1]: TensorFlowLiteC/RCTDeprecation deployment targets (12.0/4.3) fall below Xcode 27's real-device floor (15.0) -- invisible on Simulator, fixed with a Podfile post_install hook plugin
- [Phase 1]: iOS 26+ scene-lifecycle-adoption crash (EXC_BREAKPOINT/SIGTRAP) is invisible on Simulator and only appears on a real device -- fixed by porting mobile/plugins/with-scene-delegate.js into the harness; this is the clearest evidence for why D-18's real-hardware requirement exists
- [Phase 1-13]: Shipped float16 quantisation instead of int8 dynamic-range after measuring int8 caused a real 79.4% parity-agreement drop vs 100% for float16 — Export-parity check required by the plan caught real prediction degradation from int8, not noise
- [Phase 1-13]: Evaluated per-genus accuracy against the raw, composition-unfiltered test split rather than hand-filtering it — Per-image filtering at 1,183-image test-split scale is the same hand-classify-at-scale work plan 02's coordinator guidance ruled out, and results already miss the bar by wide margins except one genus
- [Phase 1-13-iter2]: User rejected iteration 1's no-go as premature (150 img/class vs 4200+ available, smallest backbone vs 36x unused latency headroom); coordinator directed a second iteration rather than accepting the first result — Iteration 1 constrained itself by assumptions its own measurements invalidated
- [Phase 1-13-iter2]: Iteration 2 (MobileNetV3-Large, ~2000 img/class, season-stratified) found a data-limited result: 32/34 genera improved by mean +19.9pp top-3, still 0/34 clearing the 95% bar — Distinguishes data-limited from approach-limited for the ADR; neither a clean go nor a clean no-go
- [Phase 1-13-iter3]: Iteration 3 (MobileNetV3-Large, iteration 2's exact hyperparameters, corpus expanded 3.05x to 194,653 images at each class's real per-class ceiling) found 1/34 genera (Tamarix, 95.04%) clearing the D-02 95% bar for the first time, with a mean +6.74pp top-3 gain for the other 33 (vs +19.9pp for 1->2) — Diminishing but explicitly confounded by a fixed, never-saturating epoch budget at both iterations (EarlyStopping never triggered in either) -- a floor on the achievable gain, not proof of a hard ceiling. Model genuinely beat iteration 2 and was promoted to the canonical path.
- [Phase 1-13-iter4]: User asked for a rebalance targeted at weak Ile-de-France temperate genera (spring specifically); reconnaissance-only per "report back before a long download" — found Section 11.5's "real property of GBIF's holdings" conclusion for Acer/Pinus/Prunus autumn scarcity is wrong: GBIF's own `month` filter (never used by the fetch) returns 40,603/23,517/34,016 autumn-dated permissive-licence records for those three genera against the 66/30/60 the corpus actually captured, traced to an unsound early-exit + non-season-aware fetch in prepare_dataset.py, not a real GBIF scarcity — every weak temperate genus checked has 2.3x-83.5x headroom against GBIF's true pool vs. what the flat 6,000/class cap captured. Four alternative sources checked: Pl@ntNet-300K rejected (CC-BY-4.0 but zero of the 34 CNPF genera in its 1,081-species list, confirmed directly); Tela Botanica blocked on SSO-gated API access (licence would clear the gate; flagged for a human decision, not routed around); iNaturalist-direct usable but redundant with GBIF's existing iNat-sourced records; Wikimedia Commons usable, licence-verifiable per-file, recommended as a supplement only if a gap remains. Recommendation: fix+rescale the existing GBIF pipeline first (no new licence risk, order-of-magnitude headroom already confirmed) before any new-source integration — full findings in measurement doc Section 13, awaiting user go-ahead before corpus expansion/retrain proceeds.
- [Phase 1-13-iter4-exec]: Coordinator approved pipeline-fix-first plan (Tela Botanica parked, not pursued). Fixed prepare_dataset.py's early-exit (widened 2->8 pages' zero-progress threshold) and added GBIF month= season-scoped fetching; raised target to 10,000/class for the 20 weak temperate genera only, routed Pinus through the same season fetch at its unchanged 6,000 target for its autumn gap specifically. Corpus grew 194,653->265,546 selected (269,341 raw on disk), 1.36x — deliberately moderate. Acer/Prunus/Pinus autumn counts: 66/30/60 -> 2,500/2,500/1,500, directly reopening Section 12.6's "cannot tell" verdict. verify_corpus_complete() PASSED. Found and fixed a genuine memory bug before training: make_dataset()'s shuffle(8192) ran post-decode (~4.9GB of float32 image tensors) rather than pre-decode on lightweight path/label pairs. Training launched (EfficientNetB0, --finetune-epochs 20 vs iteration 3's fixed 8, EarlyStopping confirmed monitor=val_top3/restore_best_weights=True unchanged) — PID 19098, 2026-09-25 13:29 CEST, expected 5-12h wall-clock. Machine-wide load/swap during the run traced to pre-existing shared-machine contention (confirmed present before this iteration's work began), not a new pipeline leak — training process RSS itself 1.04GB.
- [Phase 1-13-iter4-complete]: Training finished (23.47h wall-clock: 5.80h head + 17.66h finetune, 20/20 epochs run). EarlyStopping on val_top3 did NOT fire despite genuine overfitting onset from epoch 15 (val_loss bottomed then rose while train loss kept falling) — a coarse, ceiling-bounded monitor metric missed what val_loss would have caught; flagged for a future iteration's EarlyStopping config, not re-run (D-19). This flips iteration 3's schedule-limited finding: the backbone/corpus combination is now saturated. Exported genus_classifier_v4.tflite (8.24MB, up from 6.13MB — plan 01-05 must re-time on device), 100% export parity. Evaluated on 26,557 test images: pooled top3 85.24%->88.25%, 32/34 genera improved. Decisive split: Île-de-France temperate genera (21, targeted) +4.93pp mean top-3 (21/21 positive) vs +1.65pp for untouched Mediterranean/other (11/13) — the targeted rebalance worked ~3x better where it was aimed. All 136 genus×season cells now clear n≥30 (previously 5 thin); Acer/Pinus/Prunus autumn resolved (82.40%/81.60%/95.35%, Pinus clearing D-02 in isolation). Still only Tamarix (96.88%) clears D-02 overall — no new partial-go. Promoted to canonical path after explicitly verifying the beat is on the targeted genera, not just the mean. Session survived a subscription rate-limit interruption mid-training with zero work lost — raw numbers were committed at each stage per explicit instruction.
- [Phase 1-14]: Per-genus confidence calibration (D-04/D-12 amended) fit on validation split, reported on test split -- collapses old single-global-threshold per-genus accuracy spread (79.49%-97.23%) to 85.91%-91.92% around the 90% target, at a 0.59pp pooled coverage cost. Ulmus/Prunus/Populus/Fraxinus flagged as genera where 'strong' will rarely fire even after calibration.
- [Phase 1-14]: Real on-device latency measured for the PROMOTED iteration-4 genus classifier on a real iPhone 15 Pro (Release build): median total 90.41ms online / 90.49ms airplane mode (D-05 3s budget MET, ~33x headroom). D-06 (offline, on-device-only) confirmed as a checked proof, not a code-inspection argument. GATE-MEASURE: COMPLETE.
- [Phase 1]: ADR-002 Accepted: full go for US-C9 this milestone, all 34 CNPF genera suggested with per-genus calibrated confidence, none withheld (D-04 amended); no partial-go list, since the partial-go rule would have enabled only Tamarix.
- [Phase 1]: D-07 amended at ratification: model bundled in the app binary (8.24MB), not downloaded separately -- the original download-to-stay-light premise assumed a large model; measured size invalidated it.
- [2026-09-25] **Owner device checks are delegated to Claude for the audit phases (Phases 7 to 10).** The owner no longer tests on the phone. Each phase gate replays the owner steps against the built API (MinIO mode through the pinned `pgsty/minio` image, plus the debug test-token) with a committed simulation script, and records the results in VALIDATION.md. Only checks that genuinely need a phone UI go back to the owner, and they must be explicitly justified.
- [Phase 3]: Tracker key = SHA-256(bearer token) when present, else client IP; trust proxy defaults to loopback
- [Phase 3]: Production default raised 10/min shared to 600/min per client (60/min /sync, 240/min uploads) plus a 3000/min per-IP ceiling against token rotation
- [Phase 3]: Email linking requires email_verified===true; unverified emails refuse to link and never write auth0_sub
- [Phase 3]: First-login provisioning uses INSERT ... ON CONFLICT (auth0_sub) with a 23505 re-select fallback for race-free user creation
- [Phase 3]: Reported survey events carry only {report_id}; reporter identity and reason stay in the moderator-only reports table, with migration 013 scrubbing historic rows
- [Phase 3]: sessionOwner (Auth0 sub+email) exposed from useAuth0Session for the D-04 local-data owner check in later plans
- [Phase 3]: buildBboxAroundPoint shares map-viewport's formatBbox helper with computeRegionBbox (D-12)
- [Phase 3]: shouldShowDevTools(isDev = __DEV__) gates the Settings dev-tools section and the App.tsx stored API URL override (D-11)
- [Phase 3]: DebugModule and the HS256 test-token path load only when NODE_ENV !== "production" (isDebugSurfaceEnabled); no new env var, so CI's NODE_ENV=test setup is unchanged
- [Phase 3]: clearSurveySessionState no longer purges local data on session end (D-02); AUTH_TEMPORARILY_UNAVAILABLE keeps the session as retry-later in sync/pull/report; pre-Auth0 stubs removed from useAuth0Session and every caller
- [Phase 3]: resolveLocalDataOwnership implements the D-04 owner decision table (adopt/match/purge-and-adopt/conflict/unknown-session) as a pure function; useLocalDataOwner's syncAllowed is default-deny (true only when status is ok)
- [Phase 3]: local_meta keys session_owner_sub/session_owner_email persist the D-04 owner marker; clearLocalIbpData also forgets them
- [Phase 3]: syncAllowed gates every automatic/manual sync and pull path in useSurveySyncNetwork (runSync, maybeAutoSync, handlePullChanges); handleReportSurvey stays ungated since it carries no local survey data
- [Phase 3]: handleLogout now counts unsynced work and purges only after an explicit destructive confirmation (D-03); performDeleteAccount purges via the same performLogoutAndPurge helper without the unsynced-work alert
- [Phase 3]: LocalDataOwnerConflictScreen (French) blocks the app with exactly two choices when localDataOwnerStatus is conflict; App.tsx keeps it mutually exclusive with the profile-setup overlay
- [Phase 3]: Device verification: steps 1-5 confirmed on real hardware (offline session keep, revoked refresh token, logout with unsynced work, other-account conflict, dev tools absent in release build); steps 6-7 (nearby-parcels list, production rate limiting) carried over as they require field conditions / a live deploy
- [Phase 23-02]: Factor tone cut points (0-2 low, 3 mid, 4-5 high) are a mobile display convention; total tone delegates to bandTone(totalBand(n))
- [Phase 23]: 03: Light ring and bar high tone is #728A2D (D-16); dark forest halo core rgba(111, 154, 60, 0.55) in one token (D-14); GlassSurface uses static keyed brandGlassFills, Android flat higher-alpha fill (D-17)
- [Phase 23-04]: GlowBar track does not clip so the fill glow shows; NUMERAL_RENDER_MODE is the single fallback switch for the gradient numeral
- [Phase 23-05]: 44 pt hit area for sm and small icon-only AppButton comes from hitSlop, visible sizes unchanged
- [Phase 23-06]: A factor scored 0 draws the 4 pt low-tone stub with glow; only a null factor uses the track colour with no shadow
- [Phase 23-06]: ScoreRing, FactorBarsChart and the motion helpers take tones only through totalTone and factorTone (no 25/35 split); the ring entrance plays once per survey and score for rows 0 to 7
- [Phase 23]: [Phase 23-07]: Tab tints come from theme.visual.tab in both trees; status chip tones keep only their fill with a glass hairline border
- [Phase 23]: 23-08: Accueil entrance indices count the sections shown (no stagger gap without alert); resume glow pill uses AppButton size md
- [Phase 23-09]: Grouped list headers sit 24 above and 8 below (16 list gap plus 8 title margin); profile custom rows reuse the exported AppGroupedListIconTile
- [Phase 23]: 23-11: SurveyRow memo ignores the index prop (read at mount only) so list shifts do not re-render every row; scope switch keeps tab-role pressables styled as glass chips — render-counts autosave scenario regressed from 1 to 10 row renders when index was compared
- [Phase 23]: 23-12: summary tile values keep the width of their final digits (count-up TextInput); the submit pulse observes the status transition in a hook and leaves the submit logic untouched; header title and status styles moved into SummaryHeader
- [Phase 23]: 23-13: sub-score tones via bandTone(standBand/contextBand) in ScoreBreakdown; shared subContent rhythm 16/24/48 for the four sub-pages; History and Context glass cards as style recipes on plain Views
- [Phase 23]: 23-14: big calls to action are the native iOS 26 glass button (GlassButton over @expo/ui, D-28) in the charter forest #334E2B with a white label; rings on the trailing side of rows; halo on every screen through ScreenFrame; factors filled has one definition stored by migration 5
- [Phase 23]: 23-15: the D-26 pill floats in its own row above the A to J bar; the 46 pt round button keeps its place and only goes back (close icon) beside it
- [Phase 23]: 23-15: a finish from the pager writes the pending form edits first (flushDraft), then runs submitSurvey; success is the status turning submitted, then popTo surveyDetail
- [Phase 23]: 23-15: the summary halo and pop wait until it is seen again after a pager finish (useVisiblePulse); the haptic stays immediate and single
- [Phase 23]: 23-17: wizard uses the native transparent header with the system back button on iOS (D-29); pages whose title scrolled away get the native collapsing large title with a blur behind the collapsed bar (D-30); no border under a gradient, circular corners on layered surfaces
- [Phase 23]: 23-18: Explorer panel rows (cluster list, parcel history) reuse SurveyRowFrame with the ScoreRing trailing (D-27a) and enter through EntranceView (rows 0 to 7); full-width panel actions are GlassButton at unchanged sizes; no halo on the Explorer or its sheets; one SheetCloseButton with a 44 pt target
- [Phase 23]: 23-19: Explorer markers open the survey directly (intermediate card removed); the download panel has a 46 pt button and a progress bar, and download mode is a full-screen green pulse drawn at the navigation layer; map controls and sheets use near-opaque glass in dark mode; unscored parcels are warm grey and a scored survey keeps its marker until a scored parcel shows it; Accueil's Nouveau relevé is a glass card of its own; forest cards carry the owner-tuned mist and diagonal flowing contours with an SVG mask behind text
- [Phase 23]: 23-20: every Ionicons glyph in mobile/src is an outline variant, locked by `__checks__/icons.test.ts` (D-07); GlassButton's native SF Symbol map is keyed by outline glyphs with unfilled symbols; tab SF Symbols and Android PNG tab icons untouched; no control changed size
- [Phase 23]: 23-21: em dash gate over every string, template and JSX text under mobile/src (survey-export.ts out of scope), comments skipped through the TypeScript parser; motion gate per call (ReduceMotion.System unless the file branches on useReducedMotion()), React Native Animated confined to six allowlisted sign-in and sheet files, every endless loop gated by useScreenVisible; ExplorerSheet honours Reduce Motion; no open dark correction (no token changed); map overlays that keep theme text take theme.visual.mapPanel, map-control-like overlays the map control glass and ink
- [Phase 23]: 23-22: charter section 13 records variant I as shipped (five token files, ForestAurora forest cards, forest native glass CTA over @expo/ui, dense map glass, gates, platform fallbacks), status pending plan 23-23; direction text carries the four phone checks without the final marker; SEED-005 animals dormant (numbered SEED-004 when planted, renumbered at the merge because main took SEED-004 for nearby parcels); Phase 28 (old 13) carries the Android device pass (ForestCard motion as the knob); CLAUDE.md has a Visual layer block and its gates
- [Phase 23]: 23-23: owner "go" on build 39b4f005 (2026-10-08) for the whole phase; direction text "Statut : approuvée par le propriétaire le 2026-10-08" and charter 13.10 "approved by the owner on 2026-10-08"; light or dark follows the system only (in-app Apparence setting removed); dark Liquid Glass translucent and native with a glass ink; Explorer sheets native Liquid Glass on iOS 26 in both schemes; selected tab tint as DynamicColorIOS; dark basemap colouring not planned, owner declined a seed
- [Phase 24-01]: ibp_method_version added as optional nullable wire field on both history payloads (null = v3.0); no migration, filters unchanged — D-10 needs the method per history item
- [Phase 24]: Plan 24-02: delta-text contrast pairs enforced by test without any token change; useCommunitySurvey depends on a withPhotos boolean, not the options object
- [Phase 24]: 24-03: no error notice and no journal.loadFailed on the journal page (loadSurveyEvents swallows errors); surveyJournal only in SurveysStackParamList (D-03)
- [Phase 24]: 24-04: delta base is the survey immediately before the current one; trend title and curve use the latest 8 surveys while the summary row uses all (pinned by test) — UI-SPEC flag 4, RESEARCH Pitfall 4 and Open Question 1
- [Phase 24]: 24-05: trend title split into string-only functions; entry says 'version N'; arrow U+2192 written as escape
- [Phase 24]: 24-06 D-05: nothing moved; Journal du relevé added between Renommer and Supprimer, sheet entry on Android / Expo Go
- [Phase 24-08]: TREND_REVEAL_MODE defaults to clip: the iOS 27 simulator spike showed the animated clip rectangle repainting; Android and device unverified, owner phone check in 24-12 confirms, fallback is one line (dash)
- [Phase 24-08]: TrendCard title nested Texts spread brandTypography.screenTitle themselves because AppText places the default font first
- [Phase 24]: 24-09: delta rows are display only (accessible View per row, no press, no animation); the current history row is selected, disabled, role text, other rows open that survey read-only
- [Phase 24]: 24-10: ParcelHistoryView decides the variant itself (community never gets the delta block); the history page treats a missing access token as first load, not as first survey
- [Phase 24]: 24-11: community history row uses historyRowState with hasParcel true, shown only when history has more than one entry; communityHistory registered in survey and Explorer stacks, journal never in Explorer

### Pending Todos

- Malformed legacy sync cursor returns 500 (from the phase 01.6 verification, 2026-09-25): `parseSyncChangesCursor` in `api/src/surveys/surveys-normalize.utils.ts` (~465-475) accepts `2024-02-30T00:00:00Z|x` or `2024-01-01 12:00:00 junk|x`, and the Postgres `::timestamptz` cast then fails with 22007/22008, which nothing maps to 400. This predates phase 01.6, and installed apps never send such cursors. Fix it in phase 01.7: validate strictly or map 22007/22008 to 400. That also makes `sync-conflict-resolution-v1.md:84` and `api-contract-v1.md:770` true.
- Switch local and VPS MinIO image (2026-09-25): upstream MinIO is archived; `quay.io/minio/minio` answers 401 and Docker Hub `minio/minio` is gone. `infra/docker-compose.yml` and `infra/docker-compose.vps.yml` still use `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z`, which works only while cached, so a fresh host or a `docker image prune` breaks storage. The owner chose the `pgsty/minio` fork, already used by CI since phase 01.6. Move both compose files to it (pinned by digest) and check that the existing `/data` volume starts on the VPS.
- Investigate iOS Release build navigation (2026-09-25): `npx expo run:ios --device --configuration Release` shows the JS tab bar instead of the native liquid-glass one, and "Mes relevés" does not work. The dev build also shows a non-glass bar; first check `mobile/.env` for a leftover `EXPO_PUBLIC_ENABLE_NATIVE_TABS=false`. Then re-run the offline cold-start device check (phase 01.5 criterion 7) on a working Release build.

- Verify nearby-parcels list on device near known parcels (carried over from Phase 3-18 step 6; automated coverage exists in `useNearbyParcels.test.ts` / `map-viewport.test.ts`)
- After the Phase 23 (old 12.2) branch is merged and the API deployed (fix e7537b5, migration 020): check on the owner's phone that his Vincennes survey's parcel is drawn in its score colour at parcel zoom (owner: test once all lots are developed, no separate PR)
- After API deploy: check Caddy/API logs for 429 bursts under concurrent sync; set `TRUST_PROXY=loopback,uniquelocal` in `/home/ubuntu/cortege.env` if unauthenticated requests share one bucket (carried over from Phase 3-18 step 7)

### Blockers/Concerns

- **Phase 1 is a real go/no-go.** On-device species recognition has no stack, architecture or contract coverage anywhere in the document set. If the spike returns a no-go, Phases 11 and 12 fall away and REQ-C-species-recognition moves to the next milestone.
- **Schedule.** The published plan put MVP finalization at September 2026 (today) with field tests October–December. Phases 1–12 are unstarted unknowns, and the audit remediation (Phases 3–10) adds roughly 60 developer-days; the December field-test window is at risk. Only 1.2, 1.4, 1.5 and 1.6 gate Phase 16.
- **Codebase concerns carried in** (`.planning/codebase/CONCERNS.md`): 9 of 12 screens untested (Phase 16). The "string-interpolated SQL" and "missing indexes" concerns were re-checked on 2026-09-23 against the code and are re-scoped in Phase 15 — no injection exists and the three indexes already exist.
- **Critical data-loss defect in the shipped app** (audit M-C1): a token-refresh failure offline wipes every unsynced survey. Phase 3 fixes it; a corrective mobile release should follow before any further field use.
- **Next-milestone prerequisite:** Epics E and G need a back-office / CMS surface that no spec or architecture doc defines.
- **Still open for plan 06's ADR:** no lower-spec real iOS device (iPhone SE/11-class, not a flagship) and no real Android device have ever been used in this phase -- every latency figure (plan 03's stock model, plan 05's promoted genus classifier) is from the same flagship iPhone 15 Pro, a ceiling not the D-18 representative floor. D-06 (offline, on-device-only) IS now confirmed on real hardware (plan 05: online/airplane medians differ by 0.08ms) -- this part is resolved.

### Roadmap Evolution

- Phase 2 inserted after Phase 1: Reconcile the IBP method version — repo implements Fr v3.0, CNPF publishes FR v3.2 (URGENT)
- Phases 3–6 inserted after Phase 1 from the 2026-09 code audit (URGENT): stop field data loss and account exposure; CI and test safety net; API sync integrity; mobile sync engine reliability. Phase 16 now depends on Phases 3, 5 and 6.
- Phases 7–10 inserted after Phase 1 to close the rest of the 2026-09 code audit (lots L10, L13–L20 and the remainders of L7, L16, L20): sync feed and object storage; API configuration, service split and database tuning; shared IBP domain package and test completeness; mobile state architecture, i18n, accessibility and hygiene
- After Phase 10 the roadmap moved to flat numbering (Phases 11–28). Phase 11 (association-only sharing) and the UX/UI audit lots (Phases 12, 13, 16, 18, 21) were inserted by owner decision on 2026-09-27; Phase 28 (Field Validation) now depends on all of them
- Phase 22 inserted after Phase 21: Owner acceptance testing: the owner still finds many display bugs and UX friction on their own phone and judged Phase 28 field tests with the association premature (owner decision 2026-09-28) (URGENT)
- Phases 23 (Visual Modernisation, `REQ-QA-visual-modernisation`) and 27 (In-depth Quality Audit, `REQ-QA-deep-audit`) inserted after Phase 22 by owner decision 2026-10-06; on 2026-10-07 Phase 26 (UX/UI Audit & Design System Update, `REQ-QA-ux-audit`), Phase 24 (survey history split, SEED-002) and Phase 25 (global search, SEED-003) were added; SEED-004 (nearby parcels on Home) is done within Phase 23. Same day the roadmap was renumbered flat (1 to 28, no more `1.x` or `12.x`); the old-to-new table is in `ROADMAP.md`.
- Seeds are kept in `.planning/seeds/` (SEED-001 map layers, SEED-002 scheduled in Phase 24, SEED-003 global search in Phase 25, SEED-004 done in Phase 23, SEED-005 animals dormant)
- Phase 25.1 inserted after Phase 25: Improve the PDF survey export, before the UX/UI audit (Phase 26)

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Community/social | REQ-F-france-map, REQ-B-parcel-status-map, REQ-B-explore-analysis, REQ-C-privacy-choice | Deferred to next milestone | 2026-09-22 |
| Epics | E (data quality), F (gamification), G (association/donation), I (workshops) | Deferred to next milestone | 2026-09-22 |
| Analytics | Epic H (regional overviews, parcel trends, factor distributions) | Deferred to V2 | 2026-09-22 |
| Infrastructure | Back-office / CMS surface | Prerequisite for next milestone | 2026-09-22 |

## Session Continuity

Last session: 2026-10-10T08:29:33.372Z
Stopped at: Phase 25.1 context gathered
Resume file: .planning/phases/25.1-pdf-export-improvement/25.1-CONTEXT.md
