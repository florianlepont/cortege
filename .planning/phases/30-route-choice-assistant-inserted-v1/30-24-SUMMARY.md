---
phase: 30-route-choice-assistant-inserted-v1
plan: 24
subsystem: device-checks
tags: [owner-review, wording, device-checks, ios, android]
requires: [30-23]
provides:
  - "The wording of the phase approved on 2026-10-22 (owner-acceptance.md): sheet of 274 sentences reviewed by Claude at the owner's request, one key changed"
  - "Owner checks of the route step on the iPhone, iterated until 2026-10-23, and the corrections they led to"
  - "Android Release build checked by Claude on the emulator: the route chooser, the saved route, the PDF export"
affects: [30-25]
status: done
---

# 30-24 summary: owner wording review and device checks

## What was done

- **Wording.** `30-WORDING-REVIEW.md` was regenerated from the catalogue (274 sentences, 21 sections). The owner asked Claude to run the review; one sentence changed ("une large allée de 20 à 50 mètres de large"). Approval is dated 2026-10-22 in `docs/user-tests/owner-acceptance.md`.
- **iPhone checks by the owner (2026-10-22 and 2026-10-23, Release builds on an iPhone 15 Pro).** The owner went through the creation and the "Parcelles" page several times. Changes that came out of it, all merged (PRs 299, 307, 308, 309):
  - one question per screen, the creation header and "Continuer" shared with steps 1 to 3, no glossary on the screen;
  - the parcel step keeps the download button and a card of one size, the route step and the result screen lightened (reasons and figures behind one glyph, the surface and the estimated duration in two tiles, no "Pour affiner");
  - "Modifier le parcours" and "Choisir le parcours" open the assistant on the recorded route;
  - the uncapped counting presented as an exception (M chapter 8), the "mature" preset merged into "always_max", every preset explained on its card;
  - the large stand advice: "partial" for a homogeneous stand, "subdivide" for a varied one (O-03 refined);
  - an animated schema of each parcours on a cadastral-style map, in the explanation sheet;
  - the keyboard button reads "Terminé" (React Native wrote "Done").
- **Simulator and emulator checks by Claude.** iOS simulator in dark mode at the largest text size: one defect (a word of the question heading broke in two) fixed by capping the heading font scale. Android Release build on the emulator: creation steps, chooser, saved route on the "Parcelles" page, PDF export (the first export after install failed once and could not be reproduced).

## Device checks (docs/user-tests/device-checks.md)

RC-01 (layout) and RC-02 (keyboard) are confirmed on the iPhone by the owner. RC-03 (dark mode, large text) was checked on the iOS simulator; the Android crash at font scale 2.0 found on 2026-10-14 is a separate task. RC-04 (Reduce Motion), RC-06 (offline creation) and RC-08 on a phone were not run.

## Left open

- Android: dark mode and the largest text on the latest screens, and the PDF page count (the Release build gives no access to the file).
- The "modify" mode of the chooser (`surveyRouteChoose`, `mode: "edit"`) is no longer reached from the "Parcelles" page; it is kept, the owner decides whether to remove it.
- For a draft without a route, the assistant opened from "Choisir le parcours" does not prefill the surface the way the creation does.
