import { Ref, useMemo } from "react"
import { ActivityIndicator, StyleSheet, TextInput, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  brandComponentTokens,
  brandInteraction,
  brandRadius,
  brandSpacing4,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"

const defaultTexts: SearchFieldTexts & { a11yHint: string } = fr.search.field

const GLYPH_SIZE = 20
const CLEAR_GLYPH_SIZE = 18
const SPINNER_SIZE = 16

/** The three strings a host can replace (the dendromicrohabitat guide searches groups, not places). */
export type SearchFieldTexts = {
  placeholder: string
  a11yLabel: string
  clear: string
}

type SearchFieldProps = {
  value: string
  onChangeText: (value: string) => void
  /** The return key. */
  onSubmit: () => void
  /** The cross: back to the start page. */
  onClear: () => void
  /** A network group waits for the pause or loads: a small spinner shows. */
  busy: boolean
  inputRef?: Ref<TextInput>
  /**
   * Phase 32: the guide's own placeholder, field label and clear label (default `fr.search.field`).
   * Given, the global search hint is dropped: it names places the host does not search.
   */
  texts?: SearchFieldTexts
}

/**
 * The glass field of the search page (25-11, UI-SPEC section 1): a leading magnifier, the text, a
 * small spinner while a network group waits or loads (the debounce feedback; hidden from
 * accessibility, the live announcement of the page carries the meaning) and the clear cross when
 * the field is not empty. There is no "Annuler": the page is a tab, not a modal. The field keeps
 * the text; the page decides when to focus it and what the return key does.
 */
export function SearchField({
  value,
  onChangeText,
  onSubmit,
  onClear,
  busy,
  inputRef,
  texts,
}: SearchFieldProps) {
  const t = texts ?? defaultTexts
  // The default hint names the places the global search reads: a host with its own texts has none.
  const hint = texts ? undefined : defaultTexts.a11yHint
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.field}>
      <Ionicons name="search-outline" size={GLYPH_SIZE} color={theme.colors.textSecondary} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={t.placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        style={styles.input}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        // 100 characters: the API limit of the search endpoints (T-25-32).
        maxLength={100}
        accessibilityRole="search"
        accessibilityLabel={t.a11yLabel}
        accessibilityHint={hint}
        testID="search-field"
      />
      {busy ? (
        <View
          style={styles.spinner}
          testID="search-field-busy"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <ActivityIndicator size="small" color={theme.colors.textSecondary} />
        </View>
      ) : null}
      {value.length > 0 ? (
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={t.clear}
          onPress={onClear}
          style={styles.clearButton}
          testID="search-clear"
        >
          <Ionicons
            name="close-circle-outline"
            size={CLEAR_GLYPH_SIZE}
            color={theme.colors.textSecondary}
          />
        </AppPressable>
      ) : null}
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    // Glass field: same fill, hairline and radius as the cards below it.
    field: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
      minHeight: brandComponentTokens.field.minHeight,
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: theme.visual.glass.cardBorder,
      backgroundColor: theme.visual.glass.cardFill,
      boxShadow: theme.visual.glass.cardShadow,
      paddingLeft: brandSpacing4.md,
      paddingRight: brandSpacing4.xs,
    },
    input: {
      flex: 1,
      ...brandTypography.input,
      color: theme.semanticColors.textStrong,
      paddingVertical: 0,
    },
    spinner: {
      width: SPINNER_SIZE,
      height: SPINNER_SIZE,
      alignItems: "center",
      justifyContent: "center",
    },
    // The target is 44 x 44 inside the 48 pt field.
    clearButton: {
      width: brandInteraction.hitTarget.min,
      height: brandInteraction.hitTarget.min,
      alignItems: "center",
      justifyContent: "center",
    },
  })
}
