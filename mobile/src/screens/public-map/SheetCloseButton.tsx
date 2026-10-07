import { memo } from "react"
import { Pressable } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandInteraction } from "../../app/brand-tokens"
import { useBrandTheme } from "../../app/theme"

export const SHEET_CLOSE_ICON_SIZE = 18

/** Touch area around the 18 pt close glyph, so its target is 44 pt without moving the header. */
export const SHEET_CLOSE_HIT_SLOP = (brandInteraction.hitTarget.min - SHEET_CLOSE_ICON_SIZE) / 2

type SheetCloseButtonProps = {
  accessibilityLabel: string
  onPress: () => void
}

/**
 * The close button at the end of every Explorer panel's header (12.2-18): one neutral glyph in the
 * secondary text colour, readable on the light and the dark sheet, with a 44 pt target.
 */
export const SheetCloseButton = memo(function SheetCloseButton({
  accessibilityLabel,
  onPress,
}: SheetCloseButtonProps) {
  const theme = useBrandTheme()
  return (
    <Pressable
      onPress={onPress}
      hitSlop={SHEET_CLOSE_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name="close" size={SHEET_CLOSE_ICON_SIZE} color={theme.colors.textSecondary} />
    </Pressable>
  )
})
