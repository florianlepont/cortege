---
phase: 32
status: complete
updated: 2026-10-29
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

## Reviewed by the owner on the iPhone (2026-10-29)

Items 1 to 6 and 8 of the former pending list (build 8c04fecc, plans 32-20 to 32-35) were tried by the owner, who answered "c'est revu !" with no issue reported. The answer covers the whole list, not each item, so no per-item wording is recorded.

## Checked by the assistant on simulators (2026-10-29, Release builds of the phase 32 code, PDF not exercised, account "Marie", nothing edited)

- iOS Simulator (iPhone 17 Pro, iOS 26.5, Release): dark mode on the guide catalogue and a group page with its drawing, factor A, factor F in the capped mode (counter at the cap of 2, total of 6 per hectare, header capsule) and factor G with its zones. All readable; the A-J pager bar sits above the tab bar and does not overlap it.
- Android Emulator (Pixel_8, API 36, Release APK): light and dark on the guide, the survey summary and factors D, F and G. One defect found and fixed: the guide sheet drew its title bar and close cross under the status bar (the Android modal is edge to edge); `DmhGuideScreen` now adds the top inset on Android, as the export sheet does. Seen after the fix in light and dark.
- Seen and not changed: on Android the back arrow of the survey pages is a dark green that is dim on the dark background; the tab bar stays visible under the guide modal.
- VoiceOver and TalkBack were not run: a simulator cannot be listened to. Still pending on the iPhone.

## Pending

None. PDF with the capped counts and the G zones: seen on the device, OK (owner, 2026-10-29). VoiceOver on the iPhone: OK, reported by the owner (2026-10-29). Android back arrow contrast in dark mode: fixed (the bar tint and title take `semanticColors.textStrong`), not re-seen on the emulator.

## Not done

- Expert reading of the 15 drawings and the IBP thresholds: DONE, reported by the owner on 2026-10-30 ("L'expert a relu", conclusion "Tout est bon", no correction); the expert's name and the reading date were not given and are to be added to the spec section 12.
- PDF export for the capped counts ("par hectare") and the G zones: DONE in PR 319 (merged 2026-10-29); seen on the owner's device (2026-10-29).
- Pager bar A-J over the bottom tab bar: the owner has never seen it and it is not visible on the simulator; dropped.
