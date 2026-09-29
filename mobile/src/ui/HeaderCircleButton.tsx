import { ReactNode } from "react"
import { Pressable, StyleSheet } from "react-native"
import { brandRadius } from "../app/brand-tokens"
import { useBrandTheme } from "../app/theme"
import { GlassSurface } from "./GlassSurface"

export const HEADER_BUTTON_SIZE = 40

type HeaderCircleButtonProps = {
  children: ReactNode
  label: string
  onPress: () => void
}

/**
 * OA-85: the round glass button of the native iOS header. The profile button (Accueil) and the
 * "+" button (Mes Relevés) both use it, so they sit at the same place from one tab to the other.
 */
export function HeaderCircleButton({ children, label, onPress }: HeaderCircleButtonProps) {
  const theme = useBrandTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={styles.pressable}
    >
      <GlassSurface style={[styles.circle, { borderColor: theme.colors.inputBorder }]}>
        {children}
      </GlassSurface>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pressable: { width: HEADER_BUTTON_SIZE, height: HEADER_BUTTON_SIZE },
  circle: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
    borderRadius: brandRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
})
