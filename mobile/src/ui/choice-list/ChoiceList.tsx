import { useMemo, type ReactNode } from "react"
import { View } from "react-native"
import { useBrandTheme } from "../../app/theme"
import { useLatestCallback } from "../../state/useLatestCallback"
import { AppGroupedContainer } from "../AppGroupedList"
import { AppText as Text } from "../AppText"
import { CHOICE_LABEL_INSET, createChoiceListStyles } from "./choice-list.styles"
import { ChoiceRow, type ChoiceMode } from "./ChoiceRow"

export type ChoiceOption = { value: string; label: string }

type ChoiceListProps = {
  /** The factor the list belongs to: the rows are `choice-row-<factor>-<value>`. */
  factor: string
  /** Test handle of the list: `choice-list-<factor>`, or `choice-list-<factor>-<companion>`. */
  testID: string
  /** The grouped-list header, with the required marker when the old control had one. */
  title: string
  mode: ChoiceMode
  options: readonly ChoiceOption[]
  selected: ReadonlySet<string>
  /** A tap on a row: the caller ticks or unticks (multi) or sets the value (single). */
  onChoose: (value: string) => void
  /** Plain text at the right of the header, e.g. "3 sélectionnés". */
  countText?: string | null
  /** A quiet line under the list (a draft saved before the detail was stored). */
  note?: string | null
  /** The message of a missing required choice, already gated by the touched state. */
  error?: string | null
  /** Between the header and the list (the genus search field). */
  above?: ReactNode
  /** Given and `options` empty: this line stands in for the list. */
  emptyText?: string | null
}

/**
 * Follow-up 32-30: the choice control of factors A, B, H, I and J in the grouped-list look of F's
 * group list. A header over one `AppGroupedContainer` of `ChoiceRow`s, drawn straight on the canvas
 * (no glass card around it, no bordered box), hairlines under the labels. A missing required choice
 * is told by a caption under the list in the error tone, announced as an alert.
 */
export function ChoiceList({
  factor,
  testID,
  title,
  mode,
  options,
  selected,
  onChoose,
  countText,
  note,
  error,
  above,
  emptyText,
}: ChoiceListProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createChoiceListStyles(theme), [theme])
  const choose = useLatestCallback((value: string): void => onChoose(value))

  return (
    <View style={styles.root} testID={testID}>
      <View style={styles.headerRow}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {countText ? <Text style={styles.count}>{countText}</Text> : null}
      </View>
      {above}
      {options.length === 0 ? (
        emptyText ? (
          <Text style={styles.caption} accessibilityLiveRegion="polite" testID={`${testID}-empty`}>
            {emptyText}
          </Text>
        ) : null
      ) : (
        <AppGroupedContainer dividerInset={CHOICE_LABEL_INSET}>
          {options.map((option) => (
            <ChoiceRow
              key={option.value}
              value={option.value}
              label={option.label}
              selected={selected.has(option.value)}
              mode={mode}
              onChoose={choose}
              styles={styles}
              testID={`choice-row-${factor}-${option.value}`}
            />
          ))}
        </AppGroupedContainer>
      )}
      {error ? (
        <Text
          style={styles.error}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={`${testID}-error`}
        >
          {error}
        </Text>
      ) : null}
      {note ? (
        <Text style={styles.caption} testID={`${testID}-note`}>
          {note}
        </Text>
      ) : null}
    </View>
  )
}
