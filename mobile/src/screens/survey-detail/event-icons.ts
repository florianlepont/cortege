import type { Ionicons } from "@expo/vector-icons"
import type { BrandTheme } from "../../app/theme"
import { KNOWN_EVENT_TYPES, type KnownEventType } from "./event-labels"

export type EventTone = "neutral" | "success" | "warning" | "danger"

type EventVisual = { icon: keyof typeof Ionicons.glyphMap; tone: EventTone }

// DET-05 (UX audit, Phase 12): one icon and tone per event type, for the survey-detail history
// timeline. Tone drives the timeline dot/icon color (via `theme.fieldState`/`theme.onSurface`),
// never the icon alone, so the state doesn't rely on color perception by itself (the label next to
// it already names the event).
const EVENT_VISUALS: Record<KnownEventType, EventVisual> = {
  created: { icon: "add-circle-outline", tone: "neutral" },
  updated: { icon: "create-outline", tone: "neutral" },
  submitted: { icon: "checkmark-circle-outline", tone: "success" },
  synced: { icon: "cloud-done-outline", tone: "success" },
  sync_failed: { icon: "cloud-offline-outline", tone: "danger" },
  expired: { icon: "time-outline", tone: "warning" },
  visibility_changed: { icon: "eye-outline", tone: "neutral" },
  deleted: { icon: "trash-outline", tone: "danger" },
  reported: { icon: "flag-outline", tone: "warning" },
  attachment_created: { icon: "image-outline", tone: "neutral" },
  attachment_uploaded: { icon: "cloud-upload-outline", tone: "success" },
  attachment_deleted: { icon: "image-outline", tone: "danger" },
  backfilled: { icon: "construct-outline", tone: "neutral" },
}

const UNKNOWN_EVENT_VISUAL: EventVisual = { icon: "ellipse-outline", tone: "neutral" }

function isKnownEventType(type: string): type is KnownEventType {
  return (KNOWN_EVENT_TYPES as string[]).includes(type)
}

/** The timeline icon and tone of a survey event type — the generic pair for an unknown type,
 * never a raw lookup that could throw or read off the prototype (matches `eventTypeLabel`). */
export function eventVisual(type: string): EventVisual {
  return isKnownEventType(type) ? EVENT_VISUALS[type] : UNKNOWN_EVENT_VISUAL
}

/**
 * The tile and icon colours of a timeline tone (owner check on the iPhone, dark mode: the green
 * check of "Relevé soumis" was dim green on a dark green tile). Every icon comes from the text-on-
 * surface tokens made for its soft tile (`onSurface`: darkened in light, lightened in dark), or
 * from `textSecondary` on the muted neutral tile, so each pair clears 3:1 for a graphic (in fact
 * 4.5:1) in both schemes. The brand `forest` is no longer used here: it is invisible on the dark
 * success tile.
 */
export function eventToneColors(
  theme: BrandTheme,
  tone: EventTone,
): { background: string; icon: string } {
  switch (tone) {
    case "success":
      return { background: theme.colors.successSoft, icon: theme.onSurface.success }
    case "warning":
      return { background: theme.colors.warningSoft, icon: theme.onSurface.warning }
    case "danger":
      return { background: theme.colors.errorSoft, icon: theme.onSurface.danger }
    case "neutral":
    default:
      return { background: theme.colors.panelMuted, icon: theme.colors.textSecondary }
  }
}
