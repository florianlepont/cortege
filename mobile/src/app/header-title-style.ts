import type { BrandTheme } from "./theme"

/** The small title of the Android bar: the base stack option, and the collapsed page title. */
export function androidHeaderTitleStyle(theme: BrandTheme) {
  return {
    color: theme.colors.forest,
    fontSize: 18,
    fontWeight: "800" as const,
  }
}
