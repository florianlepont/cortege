/**
 * Offline maps (12.1 lots 2 and 3): on by default. `EXPO_PUBLIC_ENABLE_OFFLINE_MAPS=false` in a
 * build switches the download button and the offline style off (kill switch).
 */
export function isOfflineMapsEnabled(
  value: string | undefined = process.env.EXPO_PUBLIC_ENABLE_OFFLINE_MAPS,
): boolean {
  return value !== "false"
}

/**
 * Genus recognition timing (Phase 26, SC-7): off by default. A measurement build sets
 * `EXPO_PUBLIC_GENUS_TIMING=true` to print one numbers-only timing line per recognition. Inlined
 * at build time like every `EXPO_PUBLIC_` value.
 */
export function isGenusTimingEnabled(
  value: string | undefined = process.env.EXPO_PUBLIC_GENUS_TIMING,
): boolean {
  return value === "true"
}

/**
 * Phase 28 device spike (wipe and comparison on stacked maps): off by default. A spike build sets
 * `EXPO_PUBLIC_SWIPE_SPIKE=true`; the globe button then enters a measurement swipe mode. Inlined at
 * build time like every `EXPO_PUBLIC_` value, and kept unset in every tester build. Removed by plan
 * 28-17 together with the spike driver.
 */
export function isSwipeSpikeEnabled(
  value: string | undefined = process.env.EXPO_PUBLIC_SWIPE_SPIKE,
): boolean {
  return value === "true"
}

/**
 * Phase 28 device spike: the Android view of the Explorer's own map while the spike runs. A second
 * build sets `EXPO_PUBLIC_SWIPE_SPIKE_LEFT_VIEW=texture` to test whether the left map must be a
 * texture view for the stacked maps to clip and order correctly; anything else is the default
 * `surface`. Removed by plan 28-17.
 */
export function swipeSpikeLeftView(
  value: string | undefined = process.env.EXPO_PUBLIC_SWIPE_SPIKE_LEFT_VIEW,
): "surface" | "texture" {
  return value === "texture" ? "texture" : "surface"
}
