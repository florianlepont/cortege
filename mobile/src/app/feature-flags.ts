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
