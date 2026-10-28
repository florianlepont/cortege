---
phase: 32
status: partial
updated: 2026-10-30
source: owner replies in the session, iPhone 15 Pro, Release builds installed from the main checkout
---

# Phase 32 UAT (owner acceptance on the iPhone)

Only what the owner actually confirmed or reported in the conversation is recorded as a result. Everything else is `pending`: it was built and unit-tested but not yet seen working by the owner. The assistant never saw any of these screens.

## Confirmed by the owner

| # | Check | Build | Result | Owner words (2026-10-27 to 2026-10-28) |
|---|-------|-------|--------|-----------------------------------------|
| 1 | The new F list and the guide are simpler than before (criterion 3) | 89b453b0 line | pass | "Plus simple : la nouvelle liste du facteur F et le guide me conviennent." |
| 2 | Redesigned F list and guide sheet (native look) | e15fb772 | pass | "Ça me va, on peut clôturer la phase 32." |
| 3 | Global search finds the DMH groups; F page title "DMH"; info button; entry card removed | 89b453b0 | not contradicted | no feedback sent on these items except the requests below |
| 4 | Capped counters per group, total in the F header area | f92f977b | issue then fixed | "le total apparaît déjà en haut, pourquoi l'afficher en bas ?" (removed in 32-24) |
| 5 | Header with factor score and total (variant B), toast at max score, none row at the end, +/- sensitivity | 36226df6 | issues then fixed | follow-up rounds 32-26 and 32-27 |
| 6 | Factor page top (help link, hero card, pills) | cba5a130 | pass except one fix | "aide au relevé est coupé. Sinon tout est parfait !" (link wrap fixed in 32-28) |

## Reported by the owner on 35b11399 and fixed in later builds (not yet re-seen by the owner)

- A: capture hint sentence useless (removed); genus list filtered by cas (it was not: fixed); cover % with -/+ impractical (slider and typed value).
- B and C, D, E: surface should not be asked (read from the route); BMm and GB only when needed.
- G: slider scrolled the page (fixed in the gesture); several zones with computed percent (built).
- Global: "Douteux" renamed "Incertitude"; start button "Définir le parcours" when a draft has no route.

## Pending (installed on build 8c04fecc, no owner feedback yet)

1. C, D, E: surface caption only; lower-size counter hidden when the upper density is at least 1 per hectare (capped mode).
2. A: cover as typed value with slider; genus list per cas (29 or 34 genera).
3. B (counted in full) strata rows with slider and typed value.
4. G: open-area zones (add, remove, "aucune zone", total line, warning above 100 percent), slider no longer moves the page.
5. "Incertitude" pill and badge on all factors, summary and PDF.
6. "Définir le parcours" on a draft with no route and no factor filled.
7. Dark mode on all redesigned screens; VoiceOver; Android (the whole phase is untested on Android).
8. Hold-repeat feel of the +/- steppers; haptics.

## Not done

- No expert reading of the 15 drawings and the IBP thresholds.
- PDF export not updated for the capped counts (printed without "par hectare") and not for the G zones.
- Pager bar A-J overlaps the bottom tab bar on factor pages (pre-existing).
