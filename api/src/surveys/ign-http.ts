export type IgnFetchOptions = {
  /** Budget for the whole exchange, headers and body (CADASTRE_PROVIDER_TIMEOUT_MS). */
  timeoutMs: number
  /** Short name of the caller, used as the prefix of the error message and never a user text. */
  label: string
}

/**
 * The single IGN HTTP rule (D-08): a GET asking for JSON. `AbortSignal.timeout` covers the whole
 * exchange: the body is awaited before returning, so a server that sends headers and then stalls
 * is aborted too. A non-2xx answer throws with the label and the status, never the URL (the URL
 * carries the user's typed text).
 */
export async function fetchIgnJson(url: URL, options: IgnFetchOptions): Promise<unknown> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(options.timeoutMs),
  })

  if (!response.ok) {
    throw new Error(`${options.label} returned HTTP ${response.status}`)
  }

  return await response.json()
}
