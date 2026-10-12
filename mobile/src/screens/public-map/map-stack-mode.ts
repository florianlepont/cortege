// Outcome of the Phase 28 wipe and comparison device spike (plan 28-01, device check DL-01),
// recorded 2026-10-11. Every plan that builds a wipe, the comparison or a side wipe reads these
// constants and never decides again.
//
// Decision: "go texture-left", PROVISIONAL. Evidence:
//   - Android emulator (Pixel_8, API 36, Release builds): the stacked maps clip exactly at the
//     finger and at the line; a third map stays within its side; memory grows by about 9.7 MB of GL
//     layer per stacked texture map and about 15 to 35 MB of resident memory per extra map, no
//     crash; with the Explorer map as a surface view the stacked maps were cut over the top 158 px
//     in two runs and trailed the pan by up to about 60 to 140 px, with it as a texture view
//     neither happened (up to about 50 px, noisy).
//   - iPhone 18 Pro simulator: wipe, release in the middle and side wipe work; the uncovered strip
//     shows black until its first tiles arrive (a ground colour per layer is needed).
// The owner could not judge the fluidity on the iPhone because the spike has no UX; they chose to
// build the full UX and judge it on the iPhone at the end of the phase (plan 28-18, device
// checks). Surface against texture for the Explorer map on Android was not chosen by the owner:
// `LEFT_MAP_ANDROID_VIEW` is a one-line constant to revisit after that judgement.

/** The basemap change follows the finger ("wipe") or is applied at once on release ("instant"). */
export const WIPE_PRESENTATION: "wipe" | "instant" = "wipe"

/** The comparison (a release in the middle keeps both layers behind a line) is built. */
export const COMPARISON_BUILT: boolean = true

/** A swipe on one side of a comparison wipes a third map in ("wipe") or applies at once ("instant"). */
export const SIDE_WIPE: "wipe" | "instant" = "wipe"

/** The Android view of the Explorer's own map while it can be stacked with others (iOS ignores it). */
export const LEFT_MAP_ANDROID_VIEW: "surface" | "texture" = "texture"
