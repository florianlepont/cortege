import { useNetworkOnline } from "../network/network-status"

/**
 * Live offline/online status (REQ-D-offline-map's indicator). It reads the single shared network
 * status (src/network/network-status.ts), the same one the sync hook uses, so every screen and the
 * "Hors ligne" chip always agree.
 */
export function useIsOffline(): boolean {
  return !useNetworkOnline()
}
