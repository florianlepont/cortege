import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppCollapsibleSection } from "../../ui/AppCollapsibleSection"
import { AppText as Text } from "../../ui/AppText"
import type { GlossaryTermId } from "../../ui/GlossaryInfo"

const glossary = fr.routeGuide.glossary

export type GlossarySectionProps = {
  /** The terms of the current suggestion: listed first, in this order. */
  highlight?: readonly GlossaryTermId[]
}

/**
 * "Comprendre les mots" (UI-SPEC section 7, spec section 3): the ten words of the method as a plain
 * list, folded, the words of the current suggestion first. Static and offline; it is the print-like
 * reference for someone who wants to read everything, the glyphs beside the words opening the same
 * sentences one at a time.
 */
export function GlossarySection({ highlight = [] }: GlossarySectionProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const all = Object.keys(glossary.terms) as GlossaryTermId[]
  const first = highlight.filter((id, index) => all.includes(id) && highlight.indexOf(id) === index)
  const ordered = [...first, ...all.filter((id) => !first.includes(id))]

  return (
    <View testID="route-glossary">
      <AppCollapsibleSection title={glossary.title}>
        {ordered.map((id) => (
          <View key={id} style={styles.entry} testID={`route-glossary-${id}`}>
            <Text style={styles.term} accessibilityRole="header">
              {glossary.terms[id].term}
            </Text>
            <Text style={styles.text}>{glossary.terms[id].text}</Text>
          </View>
        ))}
      </AppCollapsibleSection>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    entry: {
      gap: brandSpacing4.xxs,
    },
    term: {
      ...brandTypeScale.headline,
      fontFamily: brandTypography.navTitle.fontFamily,
      color: theme.colors.textPrimary,
    },
    text: {
      ...brandTypeScale.subhead,
      color: theme.colors.textSecondary,
    },
  })
}
