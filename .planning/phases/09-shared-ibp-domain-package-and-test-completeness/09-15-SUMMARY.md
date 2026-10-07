---
phase: 09-shared-ibp-domain-package-and-test-completeness
plan: 15
subsystem: docs
tags: [docs, ibp, method-version, ibp-domain, claude-md]
requires: [01.8-05, 01.8-09, 01.8-11, 01.8-12, 01.8-13, 01.8-14]
provides:
  - "Citation files say 'implemented: v3.2 (v3.0 available per survey)' (criterion 6, D-14)"
  - "ibp-form-spec.md: method version choice, ibp_cas / ibp_cas3_scale, A native cover, /50 totals and bands, BUG-4 closed"
  - "technical-architecture-v1.md block 8 (shared package) and flow M (method version)"
  - "CLAUDE.md: ibp-domain workspace, commands, IBP validation delegation, key files, tests, CI"
affects: [01.8-16]
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - docs/references/README.md
    - docs/specs/ibp-form-spec.md
    - docs/technical/technical-architecture-v1.md
    - docs/README.md
    - mobile/README-native.md
    - CLAUDE.md
decisions:
  - "The /50 band text says the badge and sector card colour totals with totalBand, and the survey detail colours only the /35 and /15 sub-scores. The public map shows '/50' but no band colour, which matches the code (only IbpScoreBadge and SectorScoreCard call totalBand)"
  - "The form spec's logical payload example now uses a v3.2 survey (ibp_cas, no region/stage) and A's real field names (native_genus_count, native_cover_percent)"
  - "The dated 01.1 change-log line in ibp-form-spec.md stays as written (history); a new 01.8 line is added below it"
metrics:
  duration: "~35 min"
  completed: 2026-09-26
  tasks: 2
  files: 6
---

# Phase 01.8 Plan 15: Documentation for the shared IBP package and IBP FR v3.2 Summary

The citation files, the IBP form spec, the architecture docs, the docs index, the native README and CLAUDE.md now say what phase 01.8 built. The app implements IBP FR v3.2, with v3.0 available per survey. The rules live once in `packages/ibp-domain`, and the API and the app both delegate to it. Every claim was checked against the code and the 01..14 SUMMARYs.

## Tasks

| Task | Name | Commit | Files |
|---|---|---|---|
| 1 | Citation files and the form spec switch to v3.2 | 1a46c8f | docs/references/README.md, docs/specs/ibp-form-spec.md |
| 2 | Architecture docs, docs index, native README and CLAUDE.md | 12e1016 | docs/technical/technical-architecture-v1.md, docs/README.md, mobile/README-native.md, CLAUDE.md |

## What changed

**`docs/references/README.md`**
- The status section says "Implemented: v3.2 (v3.0 available per survey)". It links ADR-003, matrix v2, the form spec and the comparison.
- The v3.0 lines no longer say "implemented method". They now say "available per survey".
- In the citations, v3.2 is the implemented default and v3.0 is the method still available per survey. The closing paragraph links matrix v2, with v1 as the pre-01.8 baseline.

**`docs/specs/ibp-form-spec.md`**
- §2: both methods are in scope. The status block says what the code does:
  - v3.2 is implemented and is the default; v3.0 is available per survey.
  - The rules live in the shared package, and matrix v2 is linked.
  - BUG-1 and BUG-2 are fixed in the v3.0 rules.
  - Linear stands are not applicable.
- §3: the `ibp_method_version` field lists both tags; null means v3.0. BUG-4 is closed (migration 016, the DTOs, `payload_json`).
- §4:
  - allowed scores: A-F `{0,1,2,5}`, G/H/I/J `{0,2,5}`; a direct G/H of 1 gives `factor_invalid_score`;
  - totals are shown out of 50;
  - band convention: stand /35 cut-offs 7/14/21/28 and context /15 cut-offs 5/10 (CNPF), and the /50 total cut-offs 10/20/30/40 (an app convention under owner review). Every cut-off includes its lower bound, as in 01.8-14.
- §5 was rewritten into three parts:
  - **5.1, the version choice.** v3.2 is preselected. Drafts keep their version, and a draft can switch to v3.2 from the detail. The fields are fixed after submit: 409 on replays, 422 on PATCH.
  - **5.2, the v3.2 model.** `ibp_cas` 1-4 with the captions, and `ibp_cas3_scale` "Échelle du cas 3 pour A et G" with its uses. Also: cas 1 is preselected, the draft/submit behaviour without a cas, and the pre-fill mapping.
  - **5.3, the v3.0 model.** Region and stage.
- §6:
  - A: v3.2 scales per cas, the native cover input and the cap on A (BUG-1). How v3.0 reads a legacy cover under B.
  - B: strata only, with no cap, and strata heights per cas.
  - C/D/E: v3.2 diameters per cas, and the sum rule for scores 0 and 1 (CD-1, E-1).
  - G: v3.2 scales per cas, and 0/2/5 only.
  - H: 0/2/5 only.
- §8:
  - blocking checks per version;
  - the consistency warnings fire only when both factors of the pair are scored;
  - the new messages and codes: `ibp_method_version_unsupported`, `ibp_cas_required` and `factor_incomplete`.
- §9: the dispatch rule (null = v3.0; an unsupported version is blocking and nothing is scored). The API rejects unknown tags first.
- §10:
  - the types of the three fields;
  - selected_class and score_points for G/H;
  - a v3.2 payload example;
  - the versioning rules. The API does not require the version, and installed apps keep working.
- §11: MAT-VER-01 and MAT-VER-02 were added.
- §12: v3.2 is labelled "implemented default method", and the v3.0 links "v3.0, available per survey".
- §13: a new dated 01.8 line. The 01.1 line is unchanged.

**`docs/technical/technical-architecture-v1.md`**
- The status line was updated, and the backend's "Server-side IBP validation" now names the package.
- New **block 8** covers:
  - what the package exports;
  - hybrid resolution: `main` points to `dist`, and `types`/`react-native` point to `src`. Metro, Jest and tsc read `src`; Node at runtime reads `dist`, which the Docker builder stage and `dev:api` build. There is no `prepare` script, and the dependency is `"*"`;
  - the two adapters;
  - the parity fixture and the three places it runs.
- New **flow M** covers:
  - the choice at creation;
  - migration 016 and the phone's `payload_json` (`SCHEMA_VERSION` stays 2);
  - the dispatch rule (null = v3.0, never stamped, the explicit v3.0 tag equals null);
  - the effective version on write;
  - the switch to v3.2 and the read-only rule;
  - the fields on the public reads, and the region filter, which matches v3.0 surveys only;
  - /50 totals and the bands.

**`docs/README.md`**: the technical entry names ADR-003 and the comparison, says v3.2 is implemented with v3.0 per survey, and adds matrix v2 (v1 as the baseline) and block 8.

**`mobile/README-native.md`**
- A new "After pulling a new workspace" paragraph: run `npm install` at the repo root before `npx expo run:ios --device --configuration Release`. The package is bundled from source, so there is no build step.
- The native CI path filter text now includes `packages/**`.

**`CLAUDE.md`** (existing structure and tone kept)
- **Monorepo table:** "three workspaces", with the `ibp-domain` | `packages/ibp-domain/` row. The root package.json sentence lists the three workspaces and is still true.
- **Commands:**
  - `dev:api` and `dev:api:migrated` build the package first;
  - lint covers all workspaces;
  - typecheck and test:unit include the package;
  - new commands: `test:coverage:domain` and `build:domain`.
- **Architecture:** the IBP validation paragraph says both adapters delegate to `@cortege/ibp-domain`. It also describes the method fields, the `ibp_cas` naming rule, migration 016 and `payload_json`, read-only after submit, and package resolution with no `prepare` script.
- **IBP domain:** subscores /35 and /15, totals /50 with the band note, matrix v2, and v3.2 implemented.
- **Key files:**
  - new: `mobile/src/app/ibp-scoring.ts`, `packages/ibp-domain/src/index.ts`, `evaluate.ts` and `parity/cases.ts`;
  - updated: `ibp-rules.service.ts` (now an adapter) and migrations (016).
- **Testing:**
  - the RS256 loopback spec;
  - a new "Shared package tests" section (100 % thresholds, the run commands, the three places the parity fixture runs);
  - the E2E split suites, the method-version E2E and the helpers.
- **CI:** the package test step, image build and smoke on `packages/**`, `packages/**` in the native filter, and the publish trigger.
- **Docs index:** matrix v2 (v1 as the baseline), and ADR-003 described as implemented in phase 1.8. The comparison entry already existed.
- There are no model identifiers.

## Verification

- Task 1 gate:
  - both citation files contain "v3.0 available per survey";
  - the `target method|v3.2 target|target: v3.2|Target: IBP FR v3.2` grep is empty;
  - the `Implemented: IBP Fr v3.0|implemented method|Not implemented yet (BUG-4)` grep is empty outside dated history lines;
  - `ibp_cas3_scale` appears 11 times in the form spec.
- Task 2 gate:
  - `packages/ibp-domain` appears 8 times in CLAUDE.md;
  - `ibp-validation-matrix-v2` appears 2 times in CLAUDE.md and once in docs/README.md;
  - `ibp-domain` appears 2 times in the architecture doc;
  - `npm install` appears once in the native README;
  - `npm run build:domain` exits 0;
  - `npm run test:coverage:domain` passes 8 suites and 210 tests, at 100/100/100/100.
- `npm run lint` exits 0, `npm run typecheck` exits 0, and `npm run format:check` reports that all matched files use Prettier code style.

## Deviations from Plan

1. **[Rule 1, accuracy] The native CI path filter in `mobile/README-native.md` was out of date.** Since 01.8-01 the filter includes `packages/**`, but the README did not list it. The line was corrected in the same file. Commit 12e1016.
2. **[Rule 1, accuracy] CLAUDE.md CI and deployment lines.**
   - The image build and the image publish also trigger on `packages/**` (the `image` filter).
   - "ESLint across both workspaces" now reads "all workspaces", because `npm run lint` also lints the package.
   - These are corrections of now-false statements. The plan asked only for the package test step and the filters.
3. **Map colours.** The plan's D-03 wording could suggest band colours on every total. The docs describe what the code does: the public map shows "/50" with no band colour. Only the nearby badge and the home sector card use `totalBand`, and the detail colours only the sub-scores.

## Known Stubs

None.

## Threat Flags

None. T-01.8-40 is covered: this plan ran after plans 01-14 were merged, and every claim was checked against the package source, the migration, the catalogue, the CI file and the SUMMARYs.

## Self-Check: PASSED

- FOUND: every modified file listed.
- FOUND commits: 1a46c8f, 12e1016.
