---
phase: 30-route-choice-assistant-inserted-v1
plan: 18
subsystem: mobile-ui
tags: [route-guide, forest-card, accessibility, glossary, details-card]
requires:
  - "30-05: package rules, codes, routeZoneIssues, routeAdviceFor"
  - "30-11: catalogue fr.routeGuide and app/route-text.ts maps"
  - "30-13: RadioCard tag and trailing, GlossaryInfo, InfoSheet"
  - "30-17: route guide view model and question stack"
provides:
  - "SuggestionCard, LargeStandOptions, ReasonsCard, RouteNotices, RouteAdvice, RouteDetailsCard, GlossarySection (presentational, not mounted yet)"
  - "glossary-terms.ts: METHOD_TERM, COUNTING_TERM, termsOfSelection"
  - "SuggestionEntrance: fade and 8 pt rise keyed on the suggestion"
affects: ["30-20 (route step screen)", "30-21 (chooser)"]
tech-stack:
  added: []
  patterns:
    - "forest card text measured as three blocks (parcours, mode, foot) for the aurora shield"
    - "accessible summary group with the sentences in its hint; links outside the group"
key-files:
  created:
    - mobile/src/screens/route-guide/SuggestionCard.tsx
    - mobile/src/screens/route-guide/SuggestionCard.test.tsx
    - mobile/src/screens/route-guide/SuggestionEntrance.tsx
    - mobile/src/screens/route-guide/LargeStandOptions.tsx
    - mobile/src/screens/route-guide/ReasonsCard.tsx
    - mobile/src/screens/route-guide/RouteNotices.tsx
    - mobile/src/screens/route-guide/RouteNotices.test.tsx
    - mobile/src/screens/route-guide/RouteDetailsCard.tsx
    - mobile/src/screens/route-guide/RouteDetailsCard.test.tsx
    - mobile/src/screens/route-guide/GlossarySection.tsx
    - mobile/src/screens/route-guide/glossary-terms.ts
  modified:
    - mobile/src/app/forest-aurora-tokens.test.ts
    - mobile/src/ui/GlossaryInfo.tsx
    - mobile/src/ui/GlossaryInfo.test.tsx
    - mobile/src/i18n/fr/route-guide.ts
    - mobile/src/i18n/fr/route-guide.test.ts
decisions:
  - "The suggestion reads as one element; the explanation sentences go in its accessibility hint, the glossary glyphs stay tappable"
  - "The restore link shows when chosenBy is observer and an onRestore is given; the polite announcement fires only for the guide's own suggestion"
  - "GlossaryInfo gains an optional ink so its glyph reads on the forest card"
metrics:
  completed: 2026-10-14
status: complete
---

# Phase 30 Plan 18: Result side of the route step Summary

The suggestion, why, what to watch for and how long it takes are now presentational components in the method's words: a forest card for the parcours and the mode de relevé, two options above the subdivision bound, a reasons card, warnings, an information-only advice block, the details card shared with the chooser and the folded glossary.

## What was built

- **SuggestionCard** (`route-suggestion`): eyebrow ("Parcours conseillé" or "Parcours choisi par vous"), the parcours name with its `GlossaryInfo` and explanation, what the observer does, "Mode de relevé" with the mode name, glyph and explanation, the factors counted in full as status chips (relevé déplafonné only), the surface line, `route-change`, and `route-restore` only when the observer's pick differs. One `ForestCard` (the screen's only animated hero layer); three text blocks (`route-suggestion-method`, `-mode`, `-foot`) are measured in the card's space for the shield. The summary group has the label "Parcours conseillé : {nom}. {mode}. Surface décrite {n} hectares." and the sentences in its hint; the links are outside it. A new guide suggestion is announced politely once.
- **SuggestionEntrance**: fade and 8 pt rise over `brandMotion.durations.base`, `ReduceMotion.System` plus a `useReducedMotion` branch, replayed when the suggestion changes.
- **LargeStandOptions** (`route-large-stand`): exactly two `RadioCard`s, subdivide first, tagged "Conseillé", the package's pre-selected one; subdivide shows the subdivide notice; no third option.
- **ReasonsCard** (`route-reasons`): at most four lines from `ROUTE_REASON_TEXT[code]` with `checkmark-circle-outline`, title as header.
- **RouteNotices** (`route-notice-{code}`, warning tone, polite live region) and **RouteAdvice** (`route-advice`, info tone, title "Conseil", range from `formatDurationRange`, then the note that it is an indication). No action, never fed back (O-04, T-30-39).
- **RouteDetailsCard** (`route-details`): full parcours is one read line, and the zone field (`route-zone-field`) only opens, empty, when the stand surface is unknown; partial has the prefilled zone field, helper, strip or plot advice, "several placettes are added up on one sheet" for par placette, live `routeZoneIssues` (errors under the field, warnings as notices `route-zone-issue-{code}`), the complement switch (`route-complement-switch`, default on) and the total field (`route-total-field`); relevé déplafonné adds the counted-factors line with "Modifier" (`route-edit-counting`). No group notice, no group name (O-14, O-20).
- **GlossarySection** (`route-glossary`): folded "Comprendre les mots", the ten terms of spec section 3, the highlighted ones first; `glossary-terms.ts` gives `termsOfSelection(method, counting)` for the caller.
- **Contrast**: `forest-aurora-tokens.test.ts` gains the suggestion card at 343 and 361 pt, three regions each (parcours name and sentences, mode line, surface line and links), all at 4.5:1 over the worst mist, in the forest inks that are the same in both schemes.

## Tests

- `SuggestionCard.test.tsx` 24 tests (card, glyph ink, observer eyebrow and restore, accessibility summary and announcement, blocks, Reduce Motion, LargeStandOptions, ReasonsCard), `RouteNotices.test.tsx`, `RouteDetailsCard.test.tsx` (each parcours, unknown stand surface, live warnings, complement switch, counting line, GlossarySection, termsOfSelection).
- Coverage of the new non-test files: statements and lines 100 %, branches 100 % except one branch of `RouteDetailsCard.tsx` (96.9 %).
- Full mobile unit suite: 428 suites, 6455 tests pass. `npm run lint`, `npm run typecheck` exit 0; `prettier --check mobile/src packages` clean (the repo-wide `format:check` flags only `.claude/settings.local.json`, not part of this plan). `git diff a6c5dd72 -- mobile/src/hooks/useSurveySync.ts` is empty. `api/test/check-env-parity.spec.ts` not run (known bash 3.2 failure on this Mac).
- TDD gates: `test(30-18)` 78816012 then `feat(30-18)` 6f0b37ff (components of task 1); `test(30-18)` 7414f868 then `feat(30-18)` f619b4f5 (task 2).

## Deviations from Plan

**1. [Rule 2 - Correctness] GlossaryInfo takes an optional `color`.** The glyph's default accent is for glass cards and is not readable on the forest card; the suggestion passes `forest.titleAccent`. Default unchanged, test added.

**2. [Rule 3 - Blocking] Catalogue additions.** `details.countedLine`, `details.editCountingA11y` and `a11y.suggestionCardNoZone` (a card whose surface cannot be told), with samples in `route-guide.test.ts`. The structure gate forbids a template literal in a component, so they are catalogue functions.

**3. Entrance not through `EntranceView`.** `EntranceView` rises 20 pt and is tied to the screen focus; the plan asks for an 8 pt rise answering to the suggestion, so `SuggestionEntrance` is a small dedicated component with the same guards.

**4. Interpretations (no rule changed).**
- The accessible summary swallows the explanation sentences, so they are in its `accessibilityHint` (the glyph buttons stay tappable); the label is the spec's string.
- Eyebrow uses `forest.body` (the pale sage measured 3.6:1 at the corner of the tallest block); the "Mode de relevé" caption keeps `forest.sage` (measured passing).
- The suggestion card is added to the token test's contrast and feather cases only, not to the aurora shape cases (angle, reach), which were tuned on shorter cards.
- `RouteDetailsCard` accepts `homogeneity` in its props (as in the plan's signature) without reading it: the helper names both shares of the stand (10 % and 20 %).
- `zone_not_positive` is hidden while the zone field is empty, so a full parcours with an unknown stand surface does not open on an error; the owner of the card still blocks use through the model (30-17).
- Links on the glass card use `visual.accentText` (the pair covered by the visual-token tests).

## Known Stubs

None. The components are not mounted anywhere yet: the screen is 30-20 and the chooser 30-21.

## Threat model

T-30-39 mitigated: `RouteAdvice` has no action and no callback, is a separate component from the card, and `routeAdviceFor` is the only source; test "never offers an action". T-30-40 mitigated: live `routeZoneIssues` with the same codes the model uses to block recording; `canonicalSurveyRoute`, the storage write and the API DTO bound the values (30-05, 30-17).

## Self-Check: PASSED

- Files present: all eleven created files and the five modified ones listed above.
- Commits present: 78816012, 6f0b37ff, 7414f868, f619b4f5.
