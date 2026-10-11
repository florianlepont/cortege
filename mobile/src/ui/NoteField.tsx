import { useMemo, type Ref } from "react"
import { StyleSheet, TextInput, View } from "react-native"
import { AppField } from "./AppField"
import { AppText as Text } from "./AppText"
import {
  brandDefaultFontFamily,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"

// The counter becomes a warning and a polite live region from this share of the limit, so a
// screen reader is told once the limit is close, not on every keystroke (UI-SPEC 1.4).
const COUNTER_WARNING_SHARE = 0.9

type NoteFieldProps = {
  label: string
  value: string
  maxLength: number
  placeholder: string
  // The visibility line (D-06): who can read the note.
  helper: string
  counterLabel: (count: number) => string
  counterA11y: (count: number) => string
  onChangeText: (text: string) => void
  // Called on blur with the raw text. The canonical form (CRLF to LF, trim, empty to absent) is
  // applied by the write paths through the @cortege/ibp-domain helpers, never here.
  onCommit: (text: string) => void
  minHeight: number
  maxHeight: number
  accessibilityLabel: string
  accessibilityHint: string
  inputRef?: Ref<TextInput>
  testID?: string
  autoFocus?: boolean
}

// A multiline field with a hard length cap and a "n / max" counter, used for the survey note
// (1000) and the factor note (300). It grows from `minHeight` to `maxHeight`, then scrolls.
export function NoteField({
  label,
  value,
  maxLength,
  placeholder,
  helper,
  counterLabel,
  counterA11y,
  onChangeText,
  onCommit,
  minHeight,
  maxHeight,
  accessibilityLabel,
  accessibilityHint,
  inputRef,
  testID,
  autoFocus,
}: NoteFieldProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const count = value.length
  const nearLimit = count >= maxLength * COUNTER_WARNING_SHARE

  return (
    <View style={styles.container}>
      <AppField
        label={label}
        labelStyle={styles.label}
        inputStyle={[styles.input, { minHeight, maxHeight }]}
        inputRef={inputRef}
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        onBlur={() => onCommit(value)}
        multiline
        textAlignVertical="top"
        maxLength={maxLength}
        placeholder={placeholder}
        autoCapitalize="sentences"
        autoCorrect
        spellCheck
        autoFocus={autoFocus}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      />
      <View style={styles.helperRow}>
        <Text style={styles.helper}>{helper}</Text>
        <Text
          style={[styles.counter, nearLimit ? styles.counterWarning : null]}
          accessibilityLabel={counterA11y(count)}
          accessibilityLiveRegion={nearLimit ? "polite" : undefined}
        >
          {counterLabel(count)}
        </Text>
      </View>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    container: {
      gap: brandSpacing4.xs,
    },
    // AppField's own label role is ExtraBold: the section header role keeps the phase on two
    // weights (UI-SPEC U-15).
    label: {
      ...brandTypography.sectionHeader,
      letterSpacing: 0,
      color: theme.colors.textPrimary,
    },
    input: {
      lineHeight: 20,
    },
    helperRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-start",
      justifyContent: "space-between",
      columnGap: brandSpacing4.sm,
      rowGap: brandSpacing4.xs,
    },
    // The helper may wrap on its own line; the counter drops under it at large text sizes and
    // stays on the right.
    helper: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 160,
    },
    counter: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
      marginLeft: "auto",
    },
    counterWarning: {
      color: theme.onSurface.warning,
    },
  })
}
