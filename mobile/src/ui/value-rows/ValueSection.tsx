import { useMemo, type ReactNode } from "react"
import { View } from "react-native"
import { useBrandTheme } from "../../app/theme"
import { AppGroupedContainer } from "../AppGroupedList"
import { AppText as Text } from "../AppText"
import { createValueRowStyles } from "./value-rows.styles"

type ValueSectionProps = {
  testID: string
  /** The grouped-list header, with the required marker when the old control had one. */
  title: string
  /** Plain text at the right of the header (B's "3 strates comptées"). */
  countText?: string | null
  countTestID?: string
  /** The rows: `NumberRow`s, or the slider's track and value rows. One container, hairlines between. */
  children: ReactNode
  /** The messages of the rows whose value is missing or out of bounds, already gated by touch. */
  errors?: readonly string[]
  /** A quiet line under the list ("D'après le parcours", the 20 % rule). */
  note?: ReactNode
}

/**
 * Follow-up 32-31: a numeric control of the factor pages in the grouped-list look of F and of the
 * choice lists: a header over one `AppGroupedContainer` of rows, drawn on the canvas with no glass
 * card, then the error captions in the error tone (announced as an alert) and a quiet note.
 */
export function ValueSection({
  testID,
  title,
  countText,
  countTestID,
  children,
  errors = [],
  note,
}: ValueSectionProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createValueRowStyles(theme), [theme])
  return (
    <View style={styles.root} testID={testID}>
      <View style={styles.headerRow}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {countText ? (
          <Text style={styles.count} testID={countTestID}>
            {countText}
          </Text>
        ) : null}
      </View>
      <AppGroupedContainer dividerInset={16}>{children}</AppGroupedContainer>
      {errors.map((message, index) => (
        <Text
          key={`${index}-${message}`}
          style={styles.error}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={`${testID}-error`}
        >
          {message}
        </Text>
      ))}
      {note}
    </View>
  )
}

/** A quiet line under a section's list (the 20 % rule of the strata cover). */
export function ValueSectionNote({ children, testID }: { children: string; testID?: string }) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createValueRowStyles(theme), [theme])
  return (
    <Text style={styles.caption} testID={testID}>
      {children}
    </Text>
  )
}
