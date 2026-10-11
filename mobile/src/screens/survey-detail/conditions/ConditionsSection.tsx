import { normalizeNoteText, SURVEY_NOTE_MAX_LENGTH, type SurveyWeather } from "@cortege/ibp-domain"
import { useCallback, useEffect, useRef, useState } from "react"
import { LayoutChangeEvent, StyleSheet, View } from "react-native"
import { type WeatherViewState } from "../../../app/weather"
import { brandSpacing4 } from "../../../app/brand-tokens"
import { fr } from "../../../i18n"
import { AppCard } from "../../../ui/AppCard"
import { AppSectionHeader } from "../../../ui/AppSectionHeader"
import { NoteField } from "../../../ui/NoteField"
import { ConditionsReadOnly } from "./ConditionsReadOnly"
import type { SurveyConditions } from "./useSurveyConditions"
import { WeatherBlock } from "./WeatherBlock"

const t = fr.conditions

/** The note is written to the draft this long after typing stops (D-05); blur and leaving flush. */
const NOTE_DEBOUNCE_MS = 400

type ConditionsSectionProps = {
  /** False once the survey is submitted (or not the observer's own): plain text, nothing to edit. */
  editable: boolean
  conditions: SurveyConditions
  viewState: WeatherViewState
  onEditWeather: (update: (current: SurveyWeather | null) => SurveyWeather | null) => void
  onChangeNote: (text: string) => void
  onRetry: () => void
  onRefill: () => void
  /** Called when a field takes focus, with its top inside this section (header included). */
  onFieldFocus?: (y: number) => void
}

/**
 * The "Conditions" section of "Contexte et parcelles" (D-15): the weather card, then the survey
 * note card; the same two cards as plain text once the survey cannot be edited (D-03, U-04).
 * Optional from end to end: nothing here blocks finishing or submitting.
 */
export function ConditionsSection({
  editable,
  conditions,
  viewState,
  onEditWeather,
  onChangeNote,
  onRetry,
  onRefill,
  onFieldFocus,
}: ConditionsSectionProps) {
  const weatherTop = useRef(0)
  const noteTop = useRef(0)

  return (
    <View style={styles.section} testID="conditions-section">
      <AppSectionHeader title={t.title} subtitle={t.subtitle} titleAccessibilityRole="header" />
      {!conditions.loaded ? null : !editable ? (
        <ConditionsReadOnly note={conditions.note} weather={conditions.weather} emptyMode="line" />
      ) : (
        <>
          <View
            onLayout={(event: LayoutChangeEvent) => {
              weatherTop.current = event.nativeEvent.layout.y
            }}
          >
            <WeatherBlock
              weather={conditions.weather}
              viewState={viewState}
              onEditWeather={onEditWeather}
              onRetry={onRetry}
              onRefill={onRefill}
              onFieldFocus={onFieldFocus ? (y) => onFieldFocus(weatherTop.current + y) : undefined}
            />
          </View>
          <View
            onLayout={(event: LayoutChangeEvent) => {
              noteTop.current = event.nativeEvent.layout.y
            }}
          >
            <NoteCard
              stored={conditions.note}
              onChangeNote={onChangeNote}
              onFocus={onFieldFocus ? () => onFieldFocus(noteTop.current) : undefined}
            />
          </View>
        </>
      )}
    </View>
  )
}

type NoteCardProps = {
  stored: string | null
  onChangeNote: (text: string) => void
  onFocus?: () => void
}

/**
 * The note card: the text is held here while typing and written 400 ms after the last keystroke,
 * on blur and when the card goes away. An emptied note is sent as "" (the write path stores it as
 * absent). The stored note is adopted again only while the field is not being typed in.
 */
function NoteCard({ stored, onChangeNote, onFocus }: NoteCardProps) {
  const [text, setText] = useState(stored ?? "")
  const latest = useRef(stored ?? "")
  const sent = useRef(stored ?? "")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const focused = useRef(false)
  const onChangeRef = useRef(onChangeNote)
  onChangeRef.current = onChangeNote

  const flush = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (latest.current === sent.current) return
    sent.current = latest.current
    onChangeRef.current(latest.current)
  }, [])

  // Leaving the page writes what is still waiting.
  useEffect(() => flush, [flush])

  useEffect(() => {
    if (focused.current || timer.current !== null) return
    const incoming = stored ?? ""
    if ((normalizeNoteText(latest.current, SURVEY_NOTE_MAX_LENGTH) ?? "") === incoming) return
    latest.current = incoming
    sent.current = incoming
    setText(incoming)
  }, [stored])

  const change = (next: string) => {
    latest.current = next
    setText(next)
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = setTimeout(flush, NOTE_DEBOUNCE_MS)
  }

  return (
    <AppCard variant="glass" padding={brandSpacing4.md} style={styles.noteCard}>
      <NoteField
        testID="conditions-note-field"
        label={t.note.label}
        value={text}
        maxLength={SURVEY_NOTE_MAX_LENGTH}
        placeholder={t.note.placeholder}
        helper={t.note.visibility}
        counterLabel={(count) => t.note.counter({ count, max: SURVEY_NOTE_MAX_LENGTH })}
        counterA11y={(count) => t.note.counterA11y({ count, max: SURVEY_NOTE_MAX_LENGTH })}
        onChangeText={change}
        onFocus={() => {
          focused.current = true
          onFocus?.()
        }}
        onCommit={() => {
          focused.current = false
          flush()
        }}
        minHeight={112}
        maxHeight={240}
        accessibilityLabel={t.note.label}
        accessibilityHint={t.note.a11yHint}
      />
    </AppCard>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: brandSpacing4.smd,
  },
  noteCard: {
    gap: brandSpacing4.sm,
  },
})
