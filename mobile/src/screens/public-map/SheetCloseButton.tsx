import { memo, useMemo } from "react"
import { Pressable, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandInteraction } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { GlassSurface } from "../../ui/GlassSurface"

export const SHEET_CLOSE_ICON_SIZE = 20

/** The close circle is drawn at the 44 pt minimum target, so it needs no hit slop. */
export const SHEET_CLOSE_SIZE = brandInteraction.hitTarget.min

type SheetCloseButtonProps = {
  accessibilityLabel: string
  onPress: () => void
}

/**
 * The close button at the end of every Explorer panel's header: a 44 pt glass circle with a bright
 * glyph in the primary text colour (12.2-19 fix round: the bare grey glyph nearly vanished on the
 * dark sheet). The circle is real glass, tinted by `theme.visual.sheet.close`, with a hairline in
 * the fallback; its glyph is checked at 4.5:1 on the sheet (`visual-tokens.test.ts`).
 */
export const SheetCloseButton = memo(function SheetCloseButton({
  accessibilityLabel,
  onPress,
}: SheetCloseButtonProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <GlassSurface tone="auto" interactive surface={theme.visual.sheet.close} style={styles.circle}>
      <Pressable
        style={styles.hit}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <Ionicons name="close" size={SHEET_CLOSE_ICON_SIZE} color={theme.visual.sheet.closeIcon} />
      </Pressable>
    </GlassSurface>
  )
})

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    circle: {
      width: SHEET_CLOSE_SIZE,
      height: SHEET_CLOSE_SIZE,
      borderRadius: SHEET_CLOSE_SIZE / 2,
      borderWidth: 1,
      borderColor: theme.visual.sheet.closeHairline,
    },
    hit: {
      width: SHEET_CLOSE_SIZE,
      height: SHEET_CLOSE_SIZE,
      alignItems: "center",
      justifyContent: "center",
    },
  })
}
