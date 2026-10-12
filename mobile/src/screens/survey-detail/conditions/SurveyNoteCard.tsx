import { normalizeNoteText, SURVEY_NOTE_MAX_LENGTH } from "@cortege/ibp-domain"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { StyleSheet } from "react-native"
import {
  brandDefaultFontFamily,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../../app/brand-tokens"
import { type BrandTheme, useBrandTheme } from "../../../app/theme"
import { fr } from "../../../i18n"
import { AppCard } from "../../../ui/AppCard"
import { AppText as Text } from "../../../ui/AppText"
import { NoteField } from "../../../ui/NoteField"

const t = fr.conditions

/** The note is written to the draft this long after typing stops (D-05); blur and leaving flush. */
const NOTE_DEBOUNCE_MS = 400

type SurveyNoteCardProps = {
  /** False once the survey is submitted (or not the observer's own): plain text, nothing to edit. */
  editable: boolean
  /** False until the local draft was read once: nothing is drawn before that. */
  loaded: boolean
  /** The note as stored in the draft. */
  stored: string | null
  onChangeNote: (text: string) => void
}

/**
 * The survey note, a card of its own on the summary under the weather card (D-33, formerly a part
 * of the Conditions section). Editable: a 1000 character field, written to the draft 400 ms after
 * typing stops, on blur and when the card goes away. After submit, or for someone else's survey: the
 * note as plain selectable text, and no card at all when it is empty.
 */
export function SurveyNoteCard({ editable, loaded, stored, onChangeNote }: SurveyNoteCardProps) {
  if (!loaded) return null
  if (!editable) return <ReadOnlyNote stored={stored} />
  return <EditableNote stored={stored} onChangeNote={onChangeNote} />
}

function ReadOnlyNote({ stored }: { stored: string | null }) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const text = stored !== null && stored.trim().length > 0 ? stored : null
  if (text === null) return null
  return (
    <AppCard variant="glass" padding={brandSpacing4.md} style={styles.card}>
      <Text style={styles.label} accessibilityRole="header">
        {t.note.label}
      </Text>
      <Text style={styles.text} selectable testID="survey-note-text">
        {text}
      </Text>
    </AppCard>
  )
}

/**
 * The editable card: the text is held here while typing and written 400 ms after the last
 * keystroke, on blur and when the card goes away. An emptied note is sent as "" (the write path
 * stores it as absent). The stored note is adopted again only while the field is not being typed in.
 */
function EditableNote({
  stored,
  onChangeNote,
}: {
  stored: string | null
  onChangeNote: (text: string) => void
}) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
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
    <AppCard variant="glass" padding={brandSpacing4.md} style={styles.card}>
      <NoteField
        testID="survey-note-field"
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

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    card: {
      gap: brandSpacing4.sm,
    },
    label: {
      ...brandTypography.sectionHeader,
      color: theme.colors.textPrimary,
    },
    text: {
      ...brandTypeScale.subhead,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textPrimary,
    },
  })
}
