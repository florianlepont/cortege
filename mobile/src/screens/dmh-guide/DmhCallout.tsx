import { ReactNode, useMemo } from "react"
import { View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useBrandTheme } from "../../app/theme"
import { AppText as Text } from "../../ui/AppText"
import { createDmhGuideStyles } from "./dmh-guide.styles"

type DmhCalloutProps = {
  /** The heading line (a leaf and the title), or none for a callout that is only a sentence. */
  title?: string
  children: ReactNode
}

/**
 * Phase 32 (redesign B-C2 item 4): the tinted block of the guide, the only one on a page. Radius 18,
 * padding 16, the success-soft fill with no border; the heading in the success ink. A group page
 * puts the IBP rule in it, the sources page the sentence on which source prevails.
 */
export function DmhCallout({ title, children }: DmhCalloutProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createDmhGuideStyles(theme), [theme])

  return (
    <View style={styles.callout}>
      {title ? (
        <View style={styles.calloutHeader}>
          <Ionicons
            name="leaf-outline"
            size={18}
            color={theme.onSurface.success}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={styles.calloutTitle} accessibilityRole="header">
            {title}
          </Text>
        </View>
      ) : null}
      {children}
    </View>
  )
}
