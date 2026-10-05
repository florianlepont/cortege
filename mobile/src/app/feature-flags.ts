/**
 * Offline maps (12.1 lot 2): off until the owner has checked the IGN terms of use and the
 * download on a phone. A build turns it on with `EXPO_PUBLIC_ENABLE_OFFLINE_MAPS=true`.
 */
export function isOfflineMapsEnabled(
  value: string | undefined = process.env.EXPO_PUBLIC_ENABLE_OFFLINE_MAPS,
): boolean {
  return value === "true"
}
