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
| 2026-09-28 | iPhone, iOS 27.0 | Release, `main` at 8f931c1 (includes PR #188) | Light | Step 1: carousel, sign-in, account creation and profile setup. Step 2: Accueil. Step 3 (survey form) up to factor A, in light and dark mode; stopped by OA-28. Step 4: survey detail of a draft. Step 5: Mes Relevés. Step 6: Explorer (after a reinstall with a renewed signing profile). Step 8: Compte and Paramètres. First pass complete |

Flows to cover (success criterion 1): sign-in, Home, a survey from creation to submission,
Mes Relevés, survey detail, Explorer, Compte, in light and dark mode.

---

## Findings

| ID | Screen | Description | Type | Triage | Status | Fix (PR) | Notes |
|----|--------|-------------|------|--------|--------|----------|-------|
| OA-01 | Onboarding carousel | The green bump under each slide's text (`BrandBump`) adds nothing. If a graphic is wanted, use the marten illustration (`mobile/assets/auth/marten.png`) instead. | Display bug | 🟡 | 🔁 Fixed, awaiting owner check | this PR | Owner confirmed: replace with the marten, but not in the bump's place: give it its own well-composed spot on the slide (show the owner options before the fix) The bump is gone; the marten (assets/animals/MARTE.png) peeks up from the bottom of each slide |
| OA-02 | Onboarding carousel, slide 1 | The body lists factors that are not the IBP factors ("essences, bois mort, vieux arbres, connectivité"; connectivity is not a factor). Name real ones, e.g. native species, standing and fallen dead wood, very large living trees, microhabitats. | Functional bug | 🔴 | ✅ Closed | 426c7e9 | Wrong content about the method, in front of ecologists Owner validated on the phone (clean install) 2026-09-29 |
| OA-03 | All screens | Do not use the dash "—" in UI texts. About 40 French catalogue strings contain one (`mobile/src/i18n/fr/`), including slide 1. | Display bug | 🟡 | ✅ Closed | 426c7e9 | Owner writing rule, applies to every new text Owner validated on the phone (clean install) 2026-09-29 |
| OA-04 | Onboarding carousel, slide 2 | "Rien n'est perdu en forêt." needs a line break before it. | Display bug | 🟡 | ✅ Closed | 426c7e9 | Owner validated on the phone (clean install) 2026-09-29 |
| OA-05 | Sign-in | The new typeface (Sora/Jost, Phase 4) feels weaker than the previous one, and the title "Indice de Biodiversité Potentielle" is too discreet compared with the rest of the screen. | UX friction | 🟡 | 🔲 Open | | Owner decision: try another typeface (compare candidates before the fix batch) |
| OA-06 | Account creation, profile setup | The screen scrolls although its content fits on the phone: the whole form bounces, the top card slides under the Dynamic Island ("NOUVEAU COMPTE" hidden), and the content sits in the top half with the bottom empty. | Display bug | 🟡 | ✅ Closed | 15bb8ee | Seen in the owner's screen recording (2026-09-28 19:08) Owner validated on the phone (clean install) 2026-09-29 |
| OA-07 | Account creation, after profile setup | Once the profile is complete, the app lands on the Compte tab instead of Accueil. | Functional bug | 🔴 | ✅ Closed | 49b927e, 855600f | Cause to investigate Owner validated on the phone (clean install) 2026-09-29 |
| OA-08 | Account creation, after profile setup | No welcome step ("Bienvenue Florian !") after the profile is saved. | Suggestion | 🟡 | 🔁 Fixed, awaiting owner check | this PR | WelcomeScreen after the profile is created: marten, four animals popping in, confetti; still when Reduce Motion is on |
| OA-09 | Survey form, factor titles | Found while checking OA-02: the factor titles have lost their accents: "Tres gros bois vivants", "Milieux ouverts floriferes", "Continuite boisee" (`mobile/src/i18n/fr/labels.ts`). | Display bug | 🔴 | ✅ Closed | 426c7e9 | Found by Claude, not by the owner Owner validated on the phone (clean install) 2026-09-29 |
| OA-10 | Account creation, profile setup | With the keyboard open on "Prénom", the keyboard covers the "Nom" field and both buttons. | Display bug | 🔴 | ✅ Closed | 15bb8ee | Seen in the owner's screen recording; check whether the view scrolls the field back into view Owner validated on the phone (clean install) 2026-09-29 |
| OA-11 | Accueil | Pull to refresh shows no iOS spinner and the screen travels far down before releasing. | Display bug | 🟡 | 🔲 Open | | Owner recording 2026-09-28 19:29. Likely cause: the spinner sits under the status bar, since the top safe area is padding inside the scroll content |
| OA-12 | Accueil | It is unclear what pull to refresh reloads. Today it only fetches changes from the server (`handlePullChanges`): other members' surveys, another device. It does not send local work. | UX friction | 🟡 | 🔲 Open | | Owner decision: keep the gesture, and show a short text under the spinner saying it fetches new surveys from the server (iOS `RefreshControl` `title`) |
| OA-13 | Accueil / tab bar | The Compte avatar in the header duplicates the Compte tab. | UX friction | 🟡 | ✅ Closed | 855600f | Owner decision: keep the avatar, remove the Compte tab (3 tabs left); Compte stays reachable from the avatar on every screen that needs it Owner validated on the phone (clean install) 2026-09-29 |
| OA-14 | Accueil | "Bonjour, …" is not aligned with the sync pill and the avatar on its right (they are centred on the title + date block). | Display bug | 🟡 | 🔲 Open | | |
| OA-15 | Accueil | The date under the greeting adds nothing; it is also capitalised the English way ("Lundi 28 Septembre", French is "lundi 28 septembre"). | UX friction | 🟡 | 🔲 Open | | Owner decision: remove the date |
| OA-16 | Accueil | Behaviour with a long first name. The greeting block cannot shrink, so a long name would push the pill and the avatar off screen. | Display bug | 🟡 | 🔲 Open | | Owner question; risk confirmed by reading the code, to check on the phone |
| OA-17 | Accueil | One single draft shows as three tiles: the blocked-sync alert, the "Reprendre" card and the recent-survey card. The title also reads "Reprendre Relevé sans titre". | UX friction | 🔴 | 🔁 Fixed, awaiting owner check | #189 | First screen, confusing |
| OA-18 | Accueil, survey detail | A draft created a moment ago (1/10 factors) is "Sync bloquée", and nothing explains why, not even the survey detail. Home calls every blocked sync a "conflit", and the pill says "À jour" at the same time. | Functional bug | 🔴 | ✅ Closed | de2e6fe | Core value: the survey never reaches the server. Root cause found (Mes Relevés, 20:18): the list shows "Le nom du site est manquant". The form saves a local draft before the site is named, the API refuses a draft without `site_name` (400, `surveys.service.ts`), the app treats that as fatal and blocks the draft. And one blocked draft blocks every other survey's submission (`getSubmitBlockReason` returns `global_blocked`) Owner validated on the phone (clean install) 2026-09-29 |
| OA-19 | Accueil | The "Aucune parcelle relevée dans un rayon de 2,5 km." card is wider than the other cards. | Display bug | 🟡 | 🔲 Open | | Visible in the recording: it runs to the screen edges |
| OA-20 | Survey form, all steps; factor screens; survey detail | The hero card is cut by the header. | Display bug | 🔴 | ✅ Closed | 5c1101a, ba0d715 | Visible on every form screenshot, and on each factor screen Owner validated on the phone (clean install) 2026-09-29 |
| OA-21 | Whole app | The header is not consistent from one screen to the next. | UX friction | 🟡 | 🔲 Open | | |
| OA-22 | Survey form, hero | The "Nom requis" and "Aucune parcelle" chips: their purpose is not understandable. | UX friction | 🟡 | 🔲 Open | | |
| OA-23 | Survey form, hero | The hero does not collapse cleanly on scroll: the chips' text is left drawn over the body text. | Display bug | 🟡 | 🔲 Open | | Screenshot 19:46 |
| OA-24 | Survey form, steps 1 and 2 | The "Total IBP en cours" bar has no place yet while the survey's identity and context are being filled in. | UX friction | 🟡 | 🔲 Open | | |
| OA-25 | Survey form, steps 1 and 2 | Owner proposal: instead of one screen with several things to fill in, ask question by question like the onboarding carousel (name, method, parcels, cas), with a short explanatory text for each step. | Suggestion | 🔴 | 🔲 Open | | Redesign: show the owner a mock-up before building. Absorbs OA-22 and OA-24 |
| OA-26 | Survey form, parcel selection | The map gets little room; it should be much larger, full screen. | UX friction | 🟡 | 🔲 Open | | Goes with OA-25 |
| OA-27 | Survey form, parcel selection | The map shows plain blue, as if it did not centre on the owner's position. | Functional bug | 🔴 | 🔁 Fixed, awaiting owner check | #189 | Screenshot 19:49; location was allowed |
| OA-28 | Survey form, factor screens | The form's buttons ("Continuer vers les facteurs", "Enregistrer", the factor pager) sit under the tab bar and cannot be reached. The owner cannot save a survey. | Functional bug | 🔴 | ✅ Closed | 40a090c | Owner decision: the tab bar stays visible on every screen; the buttons must be laid out above it, not the bar hidden. Blocks steps 4 to 7 of the test run Owner validated on the phone (clean install) 2026-09-29 |
| OA-29 | Survey form, step 3 (factors) | Scrolling behaves strangely; better to stop the page scroll and give the room to the factor tiles and the score. | Display bug | 🟡 | 🔲 Open | | Screenshot 19:53: large empty area under the tiles |
| OA-30 | Factor screens | The score and the explanatory text in the hero take far too much room; the room should go to the content to fill in. | UX friction | 🔴 | 🔲 Open | | Core field ergonomics |
| OA-31 | Factor A | Put photo identification up front (text or icon with the button at the top), not at the end of the screen. | UX friction | 🟡 | 🔲 Open | | |
| OA-32 | Factor screens | The "Facteur 1/10" navigation is broken (covered by the tab bar, see OA-28), and duplicates the hero text. | Display bug | 🔴 | ✅ Closed | 40a090c | Owner validated on the phone (clean install) 2026-09-29 |
| OA-33 | Factor A, genus recognition | After tapping "identify by photo", an intermediate "Identifier un genre" screen asks to take a photo again. Open the camera directly, with a short guidance overlay on the camera view (trunk, leaf, whatever suits the model best). | UX friction | 🟡 | 🔲 Open | | Check in ADR-002 what photo the model expects before writing the guidance |
| OA-34 | Survey form and factor screens, dark mode | Several texts are nearly invisible in dark mode: section titles ("Contexte de notation", "Observations"), unselected "Cas" chips, genus chips, "En attente". | Display bug | 🔴 | ✅ Closed | c6a42a3 | Found by Claude on the owner's screenshots Owner validated on the phone (clean install) 2026-09-29 |
| OA-35 | Survey form | Text defects: "Etape 2/3" (missing accent), "Dendromicroh abitats" broken mid-word, "Milieux ouverts florif…" truncated. | Display bug | 🟡 | 🔲 Open | | Found by Claude on the owner's screenshots; see also OA-09 |
| OA-36 | Survey form, Méthode IBP card | With v3.2 selected, the card shows the v3.0 description ("pour refaire un relevé avec la même méthode…"). | UX friction | 🟡 | 🔲 Open | | Found by Claude; check whether it is the hint of the other option |
| OA-37 | Survey detail, hero | The "Brouillon" and "Local" chips are not easy to understand. A callout in words ("Brouillon, pas encore synchronisé") would say where the survey stands. | UX friction | 🟡 | 🔲 Open | | |
| OA-38 | Survey detail, hero | "Local" shows although the phone is online. A draft is meant to reach the server too; "Local" should only show when there has been no connection. | Functional bug | 🔴 | ✅ Closed | 3e805d9 | Likely the same root cause as OA-18; check whether the blocked unnamed drafts also hold back this one's sync Owner validated on the phone (clean install) 2026-09-29 |
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
| OA-51 | Mes Relevés, header | The "À jour" pill is grouped with the "+" button. It makes no sense there and is of no use. | UX friction | 🟡 | 🔲 Open | | |
| OA-52 | Mes Relevés, search | Owner proposal: search integrated like Apple Music. The tab bar holds Accueil, Mes Relevés, Explorer, and a separate search button sits on its right. Tapping it opens a search page over my surveys or the community's, and filters are chosen there. | Suggestion | 🔴 | 🔲 Open | | Redesign, mock-up first. iOS 26 native tabs support a separate search tab; Android (JS tabs) needs its own answer |
| OA-53 | Mes Relevés | What sets this page apart from a search page is missing: one or two intro stats (total surveys, and so on). | Suggestion | 🟡 | 🔲 Open | | |
| OA-54 | Mes Relevés, filters | The filter panel is not attractive: too many filters, drawn too large, drowning the user in what can be filtered. | UX friction | 🟡 | 🔲 Open | | Moves to the search page with OA-52 |
| OA-55 | Mes Relevés | Idea to discuss: organise the page in categories, e.g. favourites, most recent. | Suggestion | 🟡 | 🔲 Open | | To discuss; favourites would be a new capability |
| OA-56 | Mes Relevés | Overall the page does not look modern or elegant; it needs to be reworked. | UX friction | 🔴 | 🔲 Open | | Redesign, mock-up first. Absorbs OA-51, OA-53 to OA-55 |
| OA-57 | Mes Relevés, swipe to delete | A small margin is missing between the "Supprimer" button and the card. | Display bug | 🟡 | ✅ Closed | c6a42a3 | Screenshot 20:18 Owner validated on the phone (clean install) 2026-09-29 |
| OA-58 | Mes Relevés | Unnamed drafts show as rows with no title at all. | Display bug | 🟡 | 🔲 Open | | Found by Claude; goes with OA-18 |
| OA-59 | Survey detail, map | Owner idea: a button to see the survey on the map, or tapping the map opens the Explorer tab on it. Parcel editing then moves to a dedicated screen. | Suggestion | 🟡 | 🔲 Open | | Claude agreed (chat 2026-09-28). Owner decision: Explorer also shows the user's own drafts (to that user only, other members still see submitted surveys only), so the button works for drafts too |
| OA-60 | Explorer | While panning and zooming, the iPhone's hang detector reports freezes of 0.5 to 3 s ("Cortege 1081 ms", "3073 ms"). | Functional bug | 🔴 | 🔲 Open | | Owner recordings 2026-09-28 23:40 and 23:44 |
| OA-61 | Explorer | Two map providers show on top of each other when zooming: the IGN raster tiles (`UrlTile`, `data.geopf.fr`) are drawn over the Apple map, load in patches, flicker and disappear. In dark mode the light IGN tiles clash with the dark Apple map. | Display bug | 🔴 | 🔲 Open | | Owner was right; seen in the 23:44 recording. See the basemap decision below the table |
| OA-62 | Explorer | The Plan / Satellite switch does not work: with Satellite selected only the Apple map shows, the IGN orthophoto never appears. | Functional bug | 🔴 | 🔲 Open | | Compare the 23:40 (Satellite) and 23:44 (Plan) recordings |
| OA-63 | Explorer | Far too many buttons; the "Explorer" chip is of no use. | UX friction | 🟡 | 🔲 Open | | |
| OA-64 | Explorer | "Aucun relevé dans cette zone" shows twice (top-left chip and bottom bar). | Display bug | 🟡 | 🔲 Open | | |
| OA-65 | Explorer | The refresh button is of no use. | UX friction | 🟡 | 🔲 Open | | |
| OA-66 | Explorer, offline areas | The offline-download panel opens too high. Owner question: doesn't Apple's map library, or another one such as OSM, already offer offline maps? | Display bug | 🟡 | 🔲 Open | | Answered in the chat of 2026-09-28; see the basemap decision below the table |
| OA-67 | Explorer | The filters are of no use on this view. | UX friction | 🟡 | 🔲 Open | | Remove, or move to the search page (OA-52) |
| OA-68 | Whole app | Overall the interface looks dated rather than modern, with little use of native Liquid Glass. | UX friction | 🔴 | 🔲 Open | | Cross-cutting design direction for the redesign mock-ups (OA-25, OA-46, OA-52, OA-56) |
| OA-69 | Compte | The header is still not consistent with the other tabs (centred title with a settings button). | UX friction | 🟡 | 🔲 Open | | Goes with OA-21 |
| OA-70 | Compte | The page could be more modern and friendlier; today it looks like a web page. | UX friction | 🟡 | 🔲 Open | | With OA-13 the Compte tab goes, so the page opens from the avatar; redesign with OA-68 |
| OA-71 | Compte | The "Contributeur" label is of no use while there is no moderation. | UX friction | 🟡 | 🔲 Open | | |
| OA-72 | Compte, profile | The "Sauvegardé" label adds little. Show a save state only when there are unsaved changes, and make saving behave the same way across the whole app. | UX friction | 🟡 | 🔲 Open | | Cross-cutting: one save pattern for profile, survey form, rename |
| OA-74 | Compte | "Crédits photographiques" sits under "Connexion", where it makes no sense; it belongs under "À propos". | UX friction | 🟡 | 🔲 Open | | |
| OA-75 | Compte | "Synchronisation et données" and "À propos" (with the version number) have nothing to do in Compte; they belong in Paramètres only. Compte keeps the profile, sign-in details and sign-out. | UX friction | 🟡 | 🔲 Open | | Owner decision on the split between Compte and Paramètres; see OA-78 for the sync section |
| OA-76 | Compte, profile picture | After picking a photo for the profile picture, nothing loads and the photo never shows. | Functional bug | 🔴 | ✅ Closed | #191 | The upload fails: Paramètres shows "Impossible d'envoyer la photo de profil, réessayez". Check `/me/profile-picture` and StorageService on the VPS in the API log 2026-09-29: the DB holds no picture and the API logged no error, so the upload never reaches the server; failures were silent on Compte (status line shown only in Paramètres). Compte now raises an alert per outcome to find the failing step. Owner on the new build (2026-09-29 16:01): the alert reads "Impossible d'envoyer la photo de profil, réessayer", so the upload step itself fails 2026-09-29: the owner confirms the photo now uploads and shows. Cause: the global fetch cannot send a React Native FormData part; the upload uses the native upload task (#191) |
| OA-77 | Paramètres | The profile-picture error ("Impossible d'envoyer la photo de profil, réessayez") shows up in Paramètres, where it has no place. Status messages must appear where the action happened. | UX friction | 🟡 | 🔲 Open | | Confirms OA-76 |
| OA-78 | Paramètres | The whole synchronisation section ("Synchroniser maintenant", "Récupérer les changements serveur", "Rafraîchir la liste locale", "Rafraîchir les pièces jointes") was for debugging and is no longer needed: remove it. | UX friction | 🟡 | 🔲 Open | | Owner decision. Sync stays automatic, with the status pill and pull to refresh (OA-12) |
| OA-79 | Paramètres | The page could be more elegant and modern. | UX friction | 🟡 | 🔲 Open | | Redesign with OA-68 and OA-70 |
| OA-80 | Whole app, dark mode | Dark mode is ugly overall: far too much green (green background, green cards, green buttons), weak contrast everywhere, many display bugs. It needs a real dark palette: neutral dark surfaces, green kept as an accent. | Display bug | 🔴 | ✅ Closed | e9c8adf | Owner recording 2026-09-29 00:00. Palette to design in the lot 3 mock-ups; the bugs below go in lot 1 Palette tried in the simulator (near-black canvas, neutral grey cards, green accents); owner to judge on the phone Owner validated on the phone (clean install) 2026-09-29 |
| OA-81 | Mes Relevés, dark mode | The survey cards stay white in dark mode while their text turns light: the title ("Test") is invisible and the "Brouillon" chip is dark on white. | Display bug | 🔴 | ✅ Closed | c6a42a3 | Found by Claude in the 00:00 recording Owner validated on the phone (clean install) 2026-09-29 |
| OA-82 | Compte and Paramètres, dark mode | The grouped-list rows are white with light text: "Mot de passe", "Crédits photographiques", "Synchronisation et données", "Version" are unreadable; so is the Apparence segmented control in Paramètres. The badge also reads "contributor", in English. | Display bug | 🔴 | ✅ Closed | c6a42a3, 43b013e | Found by Claude in the 00:00 recording; the badge goes anyway (OA-71) Owner validated on the phone (clean install) 2026-09-29 |
| OA-83 | Accueil, dark mode | Low contrast: "Bonjour, Marie", "Reprendre Test" (dark green on the green card), "Autour de vous", the "À jour" pill. | Display bug | 🔴 | ✅ Closed | c6a42a3, 43b013e | Found by Claude in the 00:00 recording; see also OA-34 for the form Owner validated on the phone (clean install) 2026-09-29 |
| OA-73 | Compte, email | Changing the email fails with a generic error ("Impossible de changer l'adresse e-mail…"), which hides the real cause. | Functional bug | 🔴 | 🔁 Fixed, awaiting owner check | #189 | The API asks Auth0 to change the email (`auth0-management.service.ts`); Auth0 refuses this for Apple or Google accounts, but the owner uses email and password, so it is a real bug. Any Auth0 refusal becomes a 500 with the detail lost: read the API log for the Auth0 message (candidates: a missing `update:users` scope on the management client, or a field Auth0 requires for database connections) Cause found 2026-09-29 (API log): `AUTH0_MGMT_CLIENT_ID` was empty on the VPS. Filled with the "IBP API (Management)" M2M app (Client Access: read/update/delete:users). Email change then worked, confirmed by the owner |
| OA-84 | Accueil, resume hero | The "Reprendre" button disappeared: in light mode the button and the hero are both forest. The hero also said "Reprendre" three times (eyebrow, title, button). | Display bug | 🔴 | 🔁 Fixed, awaiting owner check | | Owner recording 2026-09-29 16:01. Button is light on the forest hero; the title is now the survey name |
| OA-85 | Accueil and Mes Relevés, header | The profile button (Accueil) is too discreet and should take the Liquid Glass effect. It and the "+" button (Mes Relevés) are two different buttons, but they must sit at exactly the same place from one view to the other. | UX friction | 🟡 | ✅ Closed | #191 | Owner clarification 2026-09-29: not the same button, the same position. Absorbs OA-86. Belongs with the OA-68 design direction Owner confirmed the header on the phone 2026-09-29 |
| OA-86 | Mes Relevés, header | The "+" button is not aligned with the header actions of the other views. | Display bug | 🔴 | ✅ Closed | #191 | Same header pattern as OA-85 Owner confirmed the header on the phone 2026-09-29 |
| OA-87 | Compte, profile picture | Choosing "Choisir depuis la galerie": the gallery takes a long time to open. | UX friction | 🟡 | 🔲 Open | | Candidates: `allowsEditing`, HEIC transcoding by the picker |
| OA-88 | Accueil, header | The "1 à envoyer" badge next to the name is unclear and badly placed. It later turned into "À jour" once synced. | UX friction | 🟡 | ✅ Closed | #191 | Rework with OA-85: one header, a clear place for the sync state Owner confirmed the header on the phone 2026-09-29 |
| OA-89 | Accueil, pull to refresh | The iOS refresh banner should stay open a moment while the update runs, then close. It closed at once, so for a few milliseconds it overlapped "Bonjour, Marie". | Display bug | 🔴 | 🔁 Fixed, awaiting owner check | | With nothing to pull the request answered in a few ms; the banner now stays open at least 0.8 s |

Type: Display bug · UX friction · Functional bug · Suggestion


### Open decision: basemap and offline maps (OA-61, OA-62, OA-66)

Today Explorer is an Apple map (`react-native-maps`) with IGN raster tiles (Plan IGN, orthophoto)
drawn on top, and offline areas are IGN tiles downloaded by the app. Apple's MapKit gives no
offline download to third-party apps. Options to choose from before the fix batch:

1. Apple map only (standard and satellite are native and work well), cadastre overlay kept; offline
   areas dropped or limited to the cadastre.
2. MapLibre with IGN or OpenStreetMap vector tiles instead of the Apple map: one provider, a real dark
   style, native offline packs. Larger change (replaces the map library).
3. Keep the current mix and fix the overlay (not recommended: the mix is what causes OA-61).

**Owner decision (2026-09-28): option 2**, MapLibre with IGN tiles (Géoplateforme: Plan IGN vector
tiles for the map, orthophotos for satellite, the same provider as the cadastre overlay), with a dark
style and native offline packs. It replaces `react-native-maps` in Explorer, parcel selection and
the survey detail map; plan it as its own batch, after checking the IGN terms of use for offline
storage.

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
