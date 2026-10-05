/**
 * Offline maps (12.1 lots 2 and 3): on by default. `EXPO_PUBLIC_ENABLE_OFFLINE_MAPS=false` in a
 * build switches the download button and the offline style off (kill switch).
 */
export function isOfflineMapsEnabled(
  value: string | undefined = process.env.EXPO_PUBLIC_ENABLE_OFFLINE_MAPS,
): boolean {
  return value !== "false"
}
