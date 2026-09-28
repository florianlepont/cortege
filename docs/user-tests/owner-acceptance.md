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
| 2026-09-28 | iPhone, iOS 27.0 | Release, `main` at 8f931c1 (includes PR #188) | Light | Step 1: carousel, sign-in, account creation and profile setup. Step 2: Accueil |

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
| OA-12 | Accueil | It is unclear what pull to refresh reloads. Today it only fetches changes from the server (`handlePullChanges`): other members' surveys, another device. It does not send local work. | UX friction | 🟡 | 🔲 Open | | Needs an owner decision: remove it, or make it a full sync |
| OA-13 | Accueil / tab bar | The Compte avatar in the header duplicates the Compte tab. | UX friction | 🟡 | 🔲 Open | | Needs an owner decision: remove the tab or the avatar |
| OA-14 | Accueil | "Bonjour, …" is not aligned with the sync pill and the avatar on its right (they are centred on the title + date block). | Display bug | 🟡 | 🔲 Open | | |
| OA-15 | Accueil | The date under the greeting adds nothing; it is also capitalised the English way ("Lundi 28 Septembre", French is "lundi 28 septembre"). | UX friction | 🟡 | 🔲 Open | | Needs an owner decision: remove or keep. Capitalisation noted by Claude |
| OA-16 | Accueil | Behaviour with a long first name. The greeting block cannot shrink, so a long name would push the pill and the avatar off screen. | Display bug | 🟡 | 🔲 Open | | Owner question; risk confirmed by reading the code, to check on the phone |
| OA-17 | Accueil | One single draft shows as three tiles: the blocked-sync alert, the "Reprendre" card and the recent-survey card. The title also reads "Reprendre Relevé sans titre". | UX friction | 🔴 | 🔲 Open | | First screen, confusing |
| OA-18 | Accueil, survey detail | A draft created a moment ago (1/10 factors) is "Sync bloquée", and nothing explains why, not even the survey detail. Home calls every blocked sync a "conflit", and the pill says "À jour" at the same time. | Functional bug | 🔴 | 🔲 Open | | Core value: the survey never reaches the server. Root cause to find first |
| OA-19 | Accueil | The "Aucune parcelle relevée dans un rayon de 2,5 km." card is wider than the other cards. | Display bug | 🟡 | 🔲 Open | | Visible in the recording: it runs to the screen edges |

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
