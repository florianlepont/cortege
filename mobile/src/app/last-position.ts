// The last device position read in this session, kept so a screen can start there synchronously
// (the Explorer opens on the user without a visible jump) instead of waiting for an async read.

export type LastPosition = { latitude: number; longitude: number }

let last: LastPosition | null = null

/** Remembers a position that was just read (NaN or out of range coordinates are ignored). */
export function rememberPosition(latitude: number, longitude: number): void {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return
  last = { latitude, longitude }
}

export function lastPosition(): LastPosition | null {
  return last
}

/** For tests: forgets the position. */
export function forgetPosition(): void {
  last = null
}
