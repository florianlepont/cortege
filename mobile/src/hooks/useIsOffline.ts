import { useEffect, useState } from "react"
import * as Network from "expo-network"
import { isOnlineNetworkState } from "./survey-sync/utils"

/**
 * Live offline/online status (REQ-D-offline-map's indicator), backed by expo-network — the same
 * getNetworkStateAsync + addNetworkStateListener pair useSurveySyncNetwork.ts and
 * useAuth0Session.ts already use to trigger a resync, reusing their isOnlineNetworkState rule so
 * "online" means the same thing everywhere in the app.
 */
export function useIsOffline(): boolean {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    let mounted = true

    void Network.getNetworkStateAsync().then((state) => {
      if (mounted) {
        setOffline(!isOnlineNetworkState(state))
      }
    })

    const subscription = Network.addNetworkStateListener((state) => {
      if (mounted) {
        setOffline(!isOnlineNetworkState(state))
      }
    })

    return () => {
      mounted = false
      subscription.remove()
    }
  }, [])

  return offline
}
