# Owner Acceptance — Phase 12.1

The owner uses the app on their own phone before field tests open to the association
(Phase 13). Every display bug and UX friction found is logged here, triaged, fixed in batches
and re-tested on the phone. See `.planning/ROADMAP.md`, Phase 12.1.

Triage: 🔴 Blocker before field tests · 🟡 Fix later · ⚪ Rejected (reason in Notes)

Status: 🔲 Open · 🔧 Fix in progress · 🔁 Fixed, awaiting owner check · ✅ Closed (confirmed on
the phone) · ⚪ Rejected

An entry is closed only when the owner confirms the fix on the phone.

---

## Test runs

| Date | Phone / OS | Build | Theme | Flows covered |
|------|------------|-------|-------|---------------|
| 2026-09-28 | iPhone, iOS 27.0 | Release, `main` at 8f931c1 (includes PR #188) | Light | Step 1: carousel, sign-in, account creation and profile setup. Step 2: Accueil. Step 3 (survey form) up to factor A, in light and dark mode; stopped by OA-28. Step 4: survey detail of a draft |

Flows to cover (success criterion 1): sign-in, Home, a survey from creation to submission,
Mes Relevés, survey detail, Explorer, Compte, in light and dark mode.

---

## Findings

| ID | Screen | Description | Type | Triage | Status | Fix (PR) | Notes |
|----|--------|-------------|------|--------|--------|----------|-------|
| OA-01 | Onboarding carousel | The green bump under each slide's text (`BrandBump`) adds nothing. If a graphic is wanted, use the marten illustration (`mobile/assets/auth/marten.png`) instead. | Display bug | 🟡 | 🔲 Open | | Owner confirmed: replace with the marten, but not in the bump's place: give it its own well-composed spot on the slide (show the owner options before the fix) |
| OA-02 | Onboarding carousel, slide 1 | The body lists factors that are not the IBP factors ("essences, bois mort, vieux arbres, connectivité"; connectivity is not a factor). Name real ones, e.g. native species, standing and fallen dead wood, very large living trees, microhabitats. | Functional bug | 🔴 | 🔲 Open | | Wrong content about the method, in front of ecologists |
| OA-03 | All screens | Do not use the dash "—" in UI texts. About 40 French catalogue strings contain one (`mobile/src/i18n/fr/`), including slide 1. | Display bug | 🟡 | 🔲 Open | | Owner writing rule, applies to every new text |
| OA-04 | Onboarding carousel, slide 2 | "Rien n'est perdu en forêt." needs a line break before it. | Display bug | 🟡 | 🔲 Open | | |
| OA-05 | Sign-in | The new typeface (Sora/Jost, Phase 4) feels weaker than the previous one, and the title "Indice de Biodiversité Potentielle" is too discreet compared with the rest of the screen. | UX friction | 🟡 | 🔲 Open | | Owner decision: try another typeface (compare candidates before the fix batch) |
| OA-06 | Account creation, profile setup | The screen scrolls although its content fits on the phone: the whole form bounces, the top card slides under the Dynamic Island ("NOUVEAU COMPTE" hidden), and the content sits in the top half with the bottom empty. | Display bug | 🟡 | 🔲 Open | | Seen in the owner's screen recording (2026-09-28 19:08) |
| OA-07 | Account creation, after profile setup | Once the profile is complete, the app lands on the Compte tab instead of Accueil. | Functional bug | 🔴 | 🔲 Open | | Cause to investigate |
| OA-08 | Account creation, after profile setup | No welcome step ("Bienvenue Florian !") after the profile is saved. | Suggestion | 🟡 | 🔲 Open | | |
| OA-09 | Survey form, factor titles | Found while checking OA-02: the factor titles have lost their accents: "Tres gros bois vivants", "Milieux ouverts floriferes", "Continuite boisee" (`mobile/src/i18n/fr/labels.ts`). | Display bug | 🔴 | 🔲 Open | | Found by Claude, not by the owner |
| OA-10 | Account creation, profile setup | With the keyboard open on "Prénom", the keyboard covers the "Nom" field and both buttons. | Display bug | 🔴 | 🔲 Open | | Seen in the owner's screen recording; check whether the view scrolls the field back into view |
| OA-11 | Accueil | Pull to refresh shows no iOS spinner and the screen travels far down before releasing. | Display bug | 🟡 | 🔲 Open | | Owner recording 2026-09-28 19:29. Likely cause: the spinner sits under the status bar, since the top safe area is padding inside the scroll content |
| OA-12 | Accueil | It is unclear what pull to refresh reloads. Today it only fetches changes from the server (`handlePullChanges`): other members' surveys, another device. It does not send local work. | UX friction | 🟡 | 🔲 Open | | Owner decision: keep the gesture, and show a short text under the spinner saying it fetches new surveys from the server (iOS `RefreshControl` `title`) |
| OA-13 | Accueil / tab bar | The Compte avatar in the header duplicates the Compte tab. | UX friction | 🟡 | 🔲 Open | | Owner decision: keep the avatar, remove the Compte tab (3 tabs left); Compte stays reachable from the avatar on every screen that needs it |
| OA-14 | Accueil | "Bonjour, …" is not aligned with the sync pill and the avatar on its right (they are centred on the title + date block). | Display bug | 🟡 | 🔲 Open | | |
| OA-15 | Accueil | The date under the greeting adds nothing; it is also capitalised the English way ("Lundi 28 Septembre", French is "lundi 28 septembre"). | UX friction | 🟡 | 🔲 Open | | Owner decision: remove the date |
| OA-16 | Accueil | Behaviour with a long first name. The greeting block cannot shrink, so a long name would push the pill and the avatar off screen. | Display bug | 🟡 | 🔲 Open | | Owner question; risk confirmed by reading the code, to check on the phone |
| OA-17 | Accueil | One single draft shows as three tiles: the blocked-sync alert, the "Reprendre" card and the recent-survey card. The title also reads "Reprendre Relevé sans titre". | UX friction | 🔴 | 🔲 Open | | First screen, confusing |
| OA-18 | Accueil, survey detail | A draft created a moment ago (1/10 factors) is "Sync bloquée", and nothing explains why, not even the survey detail. Home calls every blocked sync a "conflit", and the pill says "À jour" at the same time. | Functional bug | 🔴 | 🔲 Open | | Core value: the survey never reaches the server. Root cause to find first |
| OA-19 | Accueil | The "Aucune parcelle relevée dans un rayon de 2,5 km." card is wider than the other cards. | Display bug | 🟡 | 🔲 Open | | Visible in the recording: it runs to the screen edges |
| OA-20 | Survey form, all steps; factor screens; survey detail | The hero card is cut by the header. | Display bug | 🔴 | 🔲 Open | | Visible on every form screenshot, and on each factor screen |
| OA-21 | Whole app | The header is not consistent from one screen to the next. | UX friction | 🟡 | 🔲 Open | | |
| OA-22 | Survey form, hero | The "Nom requis" and "Aucune parcelle" chips: their purpose is not understandable. | UX friction | 🟡 | 🔲 Open | | |
| OA-23 | Survey form, hero | The hero does not collapse cleanly on scroll: the chips' text is left drawn over the body text. | Display bug | 🟡 | 🔲 Open | | Screenshot 19:46 |
| OA-24 | Survey form, steps 1 and 2 | The "Total IBP en cours" bar has no place yet while the survey's identity and context are being filled in. | UX friction | 🟡 | 🔲 Open | | |
| OA-25 | Survey form, steps 1 and 2 | Owner proposal: instead of one screen with several things to fill in, ask question by question like the onboarding carousel (name, method, parcels, cas), with a short explanatory text for each step. | Suggestion | 🔴 | 🔲 Open | | Redesign: show the owner a mock-up before building. Absorbs OA-22 and OA-24 |
| OA-26 | Survey form, parcel selection | The map gets little room; it should be much larger, full screen. | UX friction | 🟡 | 🔲 Open | | Goes with OA-25 |
| OA-27 | Survey form, parcel selection | The map shows plain blue, as if it did not centre on the owner's position. | Functional bug | 🔴 | 🔲 Open | | Screenshot 19:49; location was allowed |
| OA-28 | Survey form, factor screens | The form's buttons ("Continuer vers les facteurs", "Enregistrer", the factor pager) sit under the tab bar and cannot be reached. The owner cannot save a survey. | Functional bug | 🔴 | 🔲 Open | | Owner decision: the tab bar stays visible on every screen; the buttons must be laid out above it, not the bar hidden. Blocks steps 4 to 7 of the test run |
| OA-29 | Survey form, step 3 (factors) | Scrolling behaves strangely; better to stop the page scroll and give the room to the factor tiles and the score. | Display bug | 🟡 | 🔲 Open | | Screenshot 19:53: large empty area under the tiles |
| OA-30 | Factor screens | The score and the explanatory text in the hero take far too much room; the room should go to the content to fill in. | UX friction | 🔴 | 🔲 Open | | Core field ergonomics |
| OA-31 | Factor A | Put photo identification up front (text or icon with the button at the top), not at the end of the screen. | UX friction | 🟡 | 🔲 Open | | |
| OA-32 | Factor screens | The "Facteur 1/10" navigation is broken (covered by the tab bar, see OA-28), and duplicates the hero text. | Display bug | 🔴 | 🔲 Open | | |
| OA-33 | Factor A, genus recognition | After tapping "identify by photo", an intermediate "Identifier un genre" screen asks to take a photo again. Open the camera directly, with a short guidance overlay on the camera view (trunk, leaf, whatever suits the model best). | UX friction | 🟡 | 🔲 Open | | Check in ADR-002 what photo the model expects before writing the guidance |
| OA-34 | Survey form and factor screens, dark mode | Several texts are nearly invisible in dark mode: section titles ("Contexte de notation", "Observations"), unselected "Cas" chips, genus chips, "En attente". | Display bug | 🔴 | 🔲 Open | | Found by Claude on the owner's screenshots |
| OA-35 | Survey form | Text defects: "Etape 2/3" (missing accent), "Dendromicroh abitats" broken mid-word, "Milieux ouverts florif…" truncated. | Display bug | 🟡 | 🔲 Open | | Found by Claude on the owner's screenshots; see also OA-09 |
| OA-36 | Survey form, Méthode IBP card | With v3.2 selected, the card shows the v3.0 description ("pour refaire un relevé avec la même méthode…"). | UX friction | 🟡 | 🔲 Open | | Found by Claude; check whether it is the hint of the other option |
| OA-37 | Survey detail, hero | The "Brouillon" and "Local" chips are not easy to understand. A callout in words ("Brouillon, pas encore synchronisé") would say where the survey stands. | UX friction | 🟡 | 🔲 Open | | |
| OA-38 | Survey detail, hero | "Local" shows although the phone is online. A draft is meant to reach the server too; "Local" should only show when there has been no connection. | Functional bug | 🔴 | 🔲 Open | | Likely the same root cause as OA-18: drafts do not reach the server |
| OA-39 | Survey detail, hero | The "P/G 5 / 35 · faible" and "C 0 / 15 · faible" labels under the score add little. Show the score detail when the score is tapped instead. | UX friction | 🟡 | 🔲 Open | | |
| OA-40 | Survey detail | The "Soumission verrouillée / Verrouillé" card makes no sense now that there is no moderation. There is no lock: a survey simply leaves draft once the 10 factors and all its information are complete, and can then be saved as finished. | UX friction | 🔴 | 🔲 Open | | Owner decision on the concept; the wording "terminé" vs "soumis" to settle in the mock-up |
| OA-41 | Survey detail | The submission deadline ("6j 23h restant", "Délai de soumission", "Échéance 05/10/2026") must go: without moderation it has no purpose. Out of MVP scope for now. | Functional bug | 🔴 | 🔲 Open | | Owner scope decision. Touches the API too (`expires_at`, the `expired` status): record it in the roadmap before building |
| OA-42 | Survey detail | Scroll bug: when the hero collapses the page jumps, the map slides under the hero and the page snaps back towards the top. | Display bug | 🟡 | 🔲 Open | | Owner recording 2026-09-28 20:07 |
| OA-43 | Survey detail, layout | Information is not at the right level: the map is squeezed at the bottom on opening, and photos and photo management are hidden behind a small camera button on the map. | UX friction | 🔴 | 🔲 Open | | Photos are part of the survey and must be visible |
| OA-44 | Survey detail, map | The "Modifier les parcelles" button sits after the map; editing the parcels from the map itself would be more logical. | UX friction | 🟡 | 🔲 Open | | |
| OA-45 | Survey detail, score | The IBP score appears twice, as a list and as tiles. Choose one. | UX friction | 🟡 | 🔲 Open | | |
| OA-46 | Survey detail, layout | Owner proposal: one summary page (key information, a few photos, the map), then buttons that open sub-pages: "Contexte et parcelles", "Score IBP". Less to scroll. | Suggestion | 🔴 | 🔲 Open | | Redesign: mock-up first. Absorbs OA-42 to OA-45 |
| OA-47 | Survey detail, map | The map shows half of France instead of zooming on the survey's parcels. | Display bug | 🟡 | 🔲 Open | | Found by Claude on the owner's screenshot and recording |
| OA-48 | Survey detail | Sharing (PDF export) should be much more prominent than an entry in the "…" menu. | UX friction | 🟡 | 🔲 Open | | Goes with the OA-46 redesign |
| OA-49 | Survey detail, "…" menu | The "…" menu opens a custom sheet (`AppActionSheet`) instead of the native iOS menu. | UX friction | 🟡 | 🔲 Open | | Confirmed in `SurveyDetailScreen.tsx` |
| OA-50 | Survey detail, rename | Renaming should be integrated elsewhere, e.g. a small pencil next to the survey's name, not an entry in the "…" menu. | UX friction | 🟡 | 🔲 Open | | Goes with the OA-46 redesign |

Type: Display bug · UX friction · Functional bug · Suggestion

---

## Fix batches

| Batch | PR | Entries | Re-tested on |
|-------|----|---------|--------------|
| | | | |

Pending before the first run: PR #188 (theme-aware card and danger-button colors, auth overlay
under onboarding, JS tab bar sizing). These fixes came from reading the code, not from the owner's
testing, so they get no finding IDs. Check them during the first run instead.

---

## Readiness sign-off

- [ ] No open 🔴 entry
- [ ] The owner confirms the app is ready to open field tests to the association (date, name)
