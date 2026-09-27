// In-memory double for "expo-network". Tests drive the network state through
// __setMockNetworkState / __emitMockNetworkStateChange instead of touching real
// connectivity. __resetMockNetwork() restores the default (online) state and
// clears every registered listener, so tests never leak state into one another.

export enum NetworkStateType {
  NONE = "NONE",
  UNKNOWN = "UNKNOWN",
  CELLULAR = "CELLULAR",
  WIFI = "WIFI",
}

export type NetworkState = {
  type?: NetworkStateType
  isConnected?: boolean
  isInternetReachable?: boolean
}

const ONLINE_STATE: NetworkState = {
  type: NetworkStateType.WIFI,
  isConnected: true,
  isInternetReachable: true,
}

let currentState: NetworkState = { ...ONLINE_STATE }
let listeners: Array<(state: NetworkState) => void> = []

export function __setMockNetworkState(state: NetworkState): void {
  currentState = state
}

export function __emitMockNetworkStateChange(state: NetworkState): void {
  currentState = state
  for (const listener of listeners) {
    listener(state)
  }
}

export function __resetMockNetwork(): void {
  currentState = { ...ONLINE_STATE }
  listeners = []
}

export const getNetworkStateAsync = jest.fn(async (): Promise<NetworkState> => currentState)

export const addNetworkStateListener = jest.fn((listener: (state: NetworkState) => void) => {
  listeners.push(listener)
  return {
    remove: () => {
      listeners = listeners.filter((entry) => entry !== listener)
    },
  }
})

__resetMockNetwork()
