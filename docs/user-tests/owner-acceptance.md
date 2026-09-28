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
| 2026-09-28 | iPhone, iOS 27.0 | Release, `main` at 8f931c1 (includes PR #188) | Light | Step 1: carousel, sign-in, account creation and profile setup |

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
