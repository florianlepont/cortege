import type { BrandTheme } from "../../app/theme"

export type PermissionIconColors = {
  /** The round tile behind the location or camera icon. */
  tile: string
  /** The location or camera icon, drawn on `tile`. */
  icon: string
  /** The card the status line sits on (`AppCard` `panelElevated`). */
  card: string
  /** The check of the granted line, drawn on `card`. */
  grantedIcon: string
  /** The cross of the denied line, drawn on `card`. */
  deniedIcon: string
}

/**
 * The icon colours of a permission card (owner check, dark mode: the location and camera icons were
 * the brand forest on the dark green success tile, barely visible). Same recipe as the history
 * timeline (`eventToneColors`): the icon uses the text-on-surface token made for its soft tile
 * (`onSurface.success`, darkened in light and lightened in dark), never the brand `forest`, which
 * disappears on the dark tile. The status icons use the same tokens against the card, where the
 * brand moss (granted) was only 2.6:1 on the light card. Each pair clears 3:1 for a graphic in both
 * schemes (see the test).
 */
export function permissionIconColors(theme: BrandTheme): PermissionIconColors {
  return {
    tile: theme.colors.successSoft,
    icon: theme.onSurface.success,
    card: theme.colors.panel,
    grantedIcon: theme.onSurface.success,
    deniedIcon: theme.onSurface.danger,
  }
}
