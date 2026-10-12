import { fr } from "../../i18n"

const pad = (value: number): string => String(value).padStart(2, "0")

/**
 * The automatic name of a downloaded area, "Zone du JJ/MM HH:MM" (UI-SPEC U-16: no name field).
 * Shared by the parcel picker's sheet and the Explorer's download card.
 */
export function defaultAreaName(now: Date = new Date()): string {
  const formatted = `${pad(now.getDate())}/${pad(now.getMonth() + 1)} ${pad(now.getHours())}:${pad(now.getMinutes())}`
  return fr.offlineMap.areas.defaultName(formatted)
}
