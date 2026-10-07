import { StyleSheet } from "react-native"
import { useBrandTheme } from "../app/theme"
import { AppText as Text } from "./AppText"

/**
 * OA-85: the left-aligned title of the native iOS header, on the same row as the round button on
 * the right: Accueil's greeting ("Bonjour, Marie"). Mes Relevés uses the native large title since
 * 12.2-17; Accueil keeps this row so its first screen keeps the peek of the map (D-20).
 */
export function HeaderLeftTitle({ title }: { title: string }) {
  const theme = useBrandTheme()
  return (
    <Text
      style={[styles.title, { color: theme.semanticColors.textStrong }]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
    >
      {title}
    </Text>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "800" },
})
