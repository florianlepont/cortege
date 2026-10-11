import { useSyncExternalStore } from "react"
import { AppState } from "react-native"
import * as Network from "expo-network"
import { isOnlineNetworkState } from "../hooks/survey-sync/utils"
import { onRequestOutcome, type RequestOutcome } from "./request-outcome"

/**
 * The one source of "is the device online" for the whole app (useIsOffline and the sync hook read
 * it). `isOnlineNetworkState` stays the only rule applied to an expo-network state. The store
 * corrects itself from four signals:
 *  - expo-network events
 *  - the app returning to the foreground (iOS can drop events while the app is suspended)
 *  - an HTTP request that fails at network level (marks offline, then rechecks shortly after)
 *  - an HTTP request that gets any answer (marks online)
 * It only listens while something is subscribed, and falls back to its initial state (online)
 * when the last subscriber leaves.
 */

export const RECHECK_BASE_DELAY_MS = 1500
export const RECHECK_MAX_DELAY_MS = 30000

type StatusListener = (online: boolean) => void

let online = true
// Bumped by every authoritative signal, so a slower in-flight probe cannot overwrite a newer one.
let epoch = 0
let failureStreak = 0
let recheckTimer: ReturnType<typeof setTimeout> | null = null
let teardown: (() => void) | null = null
const listeners = new Set<StatusListener>()

function setOnline(next: boolean): void {
  if (next === online) return
  online = next
  for (const listener of [...listeners]) {
    listener(next)
  }
}

function clearRecheck(): void {
  if (recheckTimer !== null) {
    clearTimeout(recheckTimer)
    recheckTimer = null
  }
}

/** Reads expo-network now and applies it; resolves to the resulting online value. */
export async function refreshNetworkStatus(): Promise<boolean> {
  const startedAt = epoch
  try {
    const state = await Network.getNetworkStateAsync()
    if (epoch === startedAt) {
      setOnline(isOnlineNetworkState(state))
    }
  } catch {
    // Keep the last known value: a failed probe says nothing about connectivity.
  }
  return online
}

function scheduleRecheck(): void {
  clearRecheck()
  const delay = Math.min(RECHECK_BASE_DELAY_MS * 2 ** failureStreak, RECHECK_MAX_DELAY_MS)
  failureStreak += 1
  recheckTimer = setTimeout(() => {
    recheckTimer = null
    void refreshNetworkStatus()
  }, delay)
}

function handleOutcome(outcome: RequestOutcome): void {
  if (outcome === "ok") {
    epoch += 1
    failureStreak = 0
    clearRecheck()
    setOnline(true)
    return
  }
  if (outcome === "network-failure") {
    epoch += 1
    setOnline(false)
  }
  scheduleRecheck()
}

function start(): void {
  const networkSubscription = Network.addNetworkStateListener((state) => {
    epoch += 1
    setOnline(isOnlineNetworkState(state))
  })
  const appStateSubscription = AppState.addEventListener("change", (appState) => {
    if (appState === "active") {
      void refreshNetworkStatus()
    }
  })
  const stopOutcomes = onRequestOutcome(handleOutcome)
  teardown = () => {
    networkSubscription.remove()
    appStateSubscription.remove()
    stopOutcomes()
  }
  void refreshNetworkStatus()
}

function stop(): void {
  teardown?.()
  teardown = null
  clearRecheck()
  epoch += 1
  failureStreak = 0
  online = true
}

export function getNetworkOnline(): boolean {
  return online
}

export function subscribeNetworkStatus(listener: StatusListener): () => void {
  listeners.add(listener)
  if (listeners.size === 1) {
    start()
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      stop()
    }
  }
}

// Module level so React keeps one subscription instead of resubscribing on every render.
const subscribeForReact = (onChange: () => void): (() => void) => subscribeNetworkStatus(onChange)

/** React view of the shared status; `true` until the first probe says otherwise. */
export function useNetworkOnline(): boolean {
  return useSyncExternalStore(subscribeForReact, getNetworkOnline, getNetworkOnline)
}
