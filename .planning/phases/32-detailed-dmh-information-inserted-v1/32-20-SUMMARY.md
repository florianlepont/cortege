---
phase: 32
plan: 20
status: complete
---

# Phase 32 Plan 20: Dendromicrohabitat guide in the global search Summary

The fifteen dendromicrohabitat groups of the guide are findable from the Rechercher tab: a fifth result group, "Guide des dendromicrohabitats", matched on the phone, whose rows open the guide sheet on that group.

## What changed

- `app/global-search.ts`: `SearchGroupKey` gains `"guide"` (last in `groupOrder`); `matchGuideGroups(query)` returns `searchDmhGroups(query)` once the trimmed query has 2 characters, else nothing (so an empty query lists no group and the recents/empty start page is unchanged). Same accent- and case-insensitive match as the guide's own field (label, common-name keywords, counted types), in IBP order.
- `hooks/useGlobalSearch.ts`: `guide` field, computed from `matchGuideGroups`, no request, available offline and without a token; counted in `resultCount` (screen reader announcement).
- `screens/global-search/SearchGuideGroup.tsx` (new): the group card, at most 3 `SearchResultRow` compact rows (the existing row, glyph `book-outline`, no new card style) and "Voir les N" when more. Row title is the group name, subtitle the official form (`fr.dmhGuide.forms`), via `guideLabels` in `result-labels.ts`.
- `SearchResults` draws the group and counts it as a match (a guide match alone is not "Aucun résultat"). `networkNotice` moved to `network-notice.tsx` to keep `SearchResults.tsx` under 400 lines (371).
- "Voir les N": `searchGroup` accepts `group: "guide"`. `SearchGroupRoute` matches the groups on the phone (no network call, status `ready`, count in the title "Guide des dendromicrohabitats · N"); `SearchGroupListScreen` draws regular-density rows. Offline and error lines are never drawn for it.
- Navigation: `surveyDmhGuide` added to `SearchStackParamList` and registered in `SearchStack` with `DmhGuideRoute` and `dmhGuideScreenOptions(theme)` (third registration, same options and component as the survey and Accueil stacks). `SearchHomeRoute` navigates through `navigate("search", { screen: "surveyDmhGuide", params: { group } })`, `SearchGroupRoute` through `navigate("surveyDmhGuide", { group })`. Opening plays the selection haptic and keeps the query as a recent search, like every other result. Closing the sheet (`goBack`) returns to the search with its query intact.
- Catalogue: `fr.search.groups.guide`, `fr.search.rows.guideA11y`; the field's accessibility hint and the start page intro now mention the guide. No em dash, no abbreviation, no literal in screens.
- CLAUDE.md Navigation paragraph: one sentence.

## Best result

Not included. `pickBestResult` is "first match wins" across parcel, member, strong place, own survey, community survey. Putting the guide last in that chain would make it the best result whenever nothing else matched yet, and since the network groups are still waiting during the typing pause, the "Meilleur résultat" card would show a guide group and then be replaced by a place or a parcel when the answers arrive. A guide match is also reference content, not "the thing the user is looking for" in the sense of the other kinds. So the guide stays a normal group, last, below the best result. `BestResult` is unchanged.

## Deviations

None from the request. Choices made where the request left room: the group title is "Guide des dendromicrohabitats" (wraps on narrow phones, the header has no line cap); the guide sits last in the group order, also when Parcelles is moved first; "Voir les N" opens a list page (consistent with the other groups) rather than the guide catalogue with a prefilled query.

## Verification

- Jest: `src/app`, `src/hooks`, `src/screens/global-search`, `src/screens/dmh-guide`, `src/navigation`, `src/__checks__`, `src/i18n` green (177 suites); `src/navigation`, `src/screens/global-search`, `useGlobalSearch` and `app/global-search` at 100 percent statements.
- `npm --workspace mobile run test:unit`: 479 suites, 7521 tests, all pass. `npm run typecheck` clean. ESLint and Prettier clean on the touched paths. `src/screens` and `src/navigation` stay under 400 lines.
- New tests: `matchGuideGroups` (accents, minimum length, no match), hook (no request, offline, no token, not best, resultCount), `SearchGuideGroup` through `SearchResults` (rows, 3 cap, "Voir les N", order with parcels first, no-result interplay), `guideLabels`, list screen and route (title, count, no network, open), home route (open, "Voir les N"), stack registration count (3, search navigator included).

## Not verified on a device

I could not run the app. The owner should check on the iPhone (and Android if possible):

1. Type "pic", "lierre", "ecorce" in Rechercher: a "Guide des dendromicrohabitats" card appears below the other groups, rows look like the place and parcel rows with a book glyph, name on top and form underneath.
2. A query matching more than 3 groups shows "Voir les N" and the list page with the native large title.
3. Tapping a row opens the guide sheet on that group's page (0.65 detent, grabber); swipe down or the close button returns to the search with the query and results as they were.
4. Offline (airplane mode): the guide group still shows while the others show their offline lines.
5. The native iOS 26 search tab specifically: the form sheet presents correctly over the search stack (not tested anywhere in Jest, only registration).
6. The query is kept in "Recherches récentes" after opening a guide row.

## Self-Check: PASSED

Commit 2683ada4 exists; `SearchGuideGroup.tsx`, `network-notice.tsx` and the edited files are in it.
