/**
 * What the HTTP client saw on the wire, told to whoever listens (the network status store).
 * Dependency free on purpose: the client must not import react-native or expo-network.
 *  - "ok": the server answered (any HTTP status), so the device is online
 *  - "network-failure": fetch itself threw (no route, DNS, airplane mode)
 *  - "timeout": the request was aborted by the client timeout; inconclusive
 */
export type RequestOutcome = "ok" | "network-failure" | "timeout"

type OutcomeListener = (outcome: RequestOutcome) => void

const listeners = new Set<OutcomeListener>()

export function onRequestOutcome(listener: OutcomeListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function reportRequestOutcome(outcome: RequestOutcome): void {
  for (const listener of [...listeners]) {
    listener(outcome)
  }
}
