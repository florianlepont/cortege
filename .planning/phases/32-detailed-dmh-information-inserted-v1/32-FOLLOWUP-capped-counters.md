# Follow-up: one counter per DMH group in the capped survey mode

**Status: resolved on 2026-10-28 by plan 32-23 (see 32-23-SUMMARY.md and the decisions at the end of this file).**

Raised by the owner on 2026-10-28 after trying the phase 32 build: the official sheet says "Nombre d'arbres à DMH (autochtones ou non ; plafond : compter au maximum 2 arbres/ha par groupe de DMH ci-dessous et total plafonné à 8 arbres/ha)", so a counter per DMH group (0 to 2 per hectare, total capped at 8) is expected also in the capped mode ("relevé plafonné"). Owner answer: "Oui, compteurs 0 à 2 par groupe", to be discussed before building.

Today: capped mode = one global number `trees_per_ha` typed by the observer, plus ticks for the groups seen (`dmh_groups`, never scored). Counters per group (`dmh_counts`) exist only in counted-in-full mode (phase 30, D-07), with the surface `surface_ha`, and `trees_per_ha` is then derived by `dmhDensityPerHa` (each group's count over the surface, capped at 2 per hectare, then summed).

Open questions to settle before planning (it touches the recorded data and the route rules, so it is a new decision, not a UI tweak):
1. Unit of the capped counter: trees per hectare directly (0, 1, 2) or trees counted on the described surface, converted by the app (needs the surface in capped mode too)?
2. Fractions: a group can be 0.5 tree/ha on a large surface; allow it or round?
3. Storage: write `dmh_counts` also in capped mode (the key exists, never scored) and derive `trees_per_ha` (changes what capped surveys store; parity cases and `route-choice-rules-v1.md` R-rules to revisit), or keep the global number and use the counters only as an aid?
4. Total cap of 8: already implied by the score classes (5 at 8 and above); only a display matter?
5. Existing capped surveys keep their typed number; no migration needed, but the form must read both shapes.

Next step: a short discuss/spec round (rules in the package, spec `ibp-form-spec.md` section F, `route-choice-rules-v1.md`), then a plan. Not part of phase 32.

## Resolution (owner decisions of 2026-10-28, built in plan 32-23)

1. Unit: trees per hectare directly, whole numbers 0, 1 or 2 per group. No surface in the capped mode, no division.
2. Fractions: not allowed (whole numbers only).
3. Storage: `dmh_counts` (0 to 2) is written in the capped mode with `dmh_groups`; `trees_per_ha` is derived as the sum of the counts (`cappedDmhTotalPerHa` in the package); `surface_ha` is not written. The score is unchanged: the classes still read `trees_per_ha` only (parity cases `MAT-F-CAP-01` and `MAT-F-CAP-02`).
4. Total cap of 8: display only. The classes already stop at 8, so the derived total is the plain sum and is shown as "Total : N arbres par hectare" under the list.
5. Existing capped surveys: no migration. The typed number stays editable while every counter is 0; touching a counter takes over from it (the derived total replaces the typed number); once a counter is above 0 the global field is derived and read-only.
