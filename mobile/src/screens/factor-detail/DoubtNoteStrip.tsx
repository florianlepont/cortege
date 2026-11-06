import { useEffect, useMemo, useRef, useState } from "react"
import { StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import Animated, { FadeIn, LinearTransition, ReduceMotion } from "react-native-reanimated"
import { FACTOR_NOTE_MAX_LENGTH } from "@cortege/ibp-domain"
import {
  brandMotion,
  brandRadius,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import type { FactorKey } from "../../app/types"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import { feedback } from "../../ui/feedback"
import { useLatestCallback } from "../../state/useLatestCallback"
import { NoteField } from "../../ui/NoteField"

const t = fr.factorDetail.strip

// The pills are drawn 36 pt high; a 4 pt slop above and below brings each touch target to 44.
const PILL_HEIGHT = 36
const PILL_SLOP = { top: 4, bottom: 4, left: 0, right: 0 } as const
const PILL_GLYPH_SIZE = 18
const NOTE_FIELD_MIN_HEIGHT = 96
const NOTE_FIELD_MAX_HEIGHT = 144
// The note is written to the draft this long after the last keystroke (D-05).
export const NOTE_COMMIT_DELAY_MS = 400

type DoubtNoteStripProps = {
  factor: FactorKey
  title: string
  doubt: boolean
  note: string
  onChangeDoubt: (next: boolean) => void
  onChangeNote: (text: string) => void
  /** Writes the draft now: after the typing pause, on blur and when the page goes away. */
  onCommitNote: () => void
}

/**
 * Phase 27 (D-16), follow-up 32-27: two small pills in one row at the top of a factor's page, under
 * its intro or help link. "Incertitude" toggles the observer's doubt (warning-soft fill when on); "Note"
 * opens the 300-character note field in place, and shows a one-line preview of an existing note
 * ("Note : ..."). Both stay closed and quiet by default, so an observer who never touches them
 * performs exactly the same taps as before. The doubt and the note never change the score (D-13,
 * D-14). The note closes only with a tap on its pill or when the page changes, never on blur (U-06).
 */
export function DoubtNoteStrip({
  factor,
  title,
  doubt,
  note,
  onChangeDoubt,
  onChangeNote,
  onCommitNote,
}: DoubtNoteStripProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [open, setOpen] = useState(false)
  const hasNote = note.length > 0
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commit = useLatestCallback(onCommitNote)

  // The page unmounts on a page change: a write still waiting for the typing pause goes out now.
  useEffect(
    () => () => {
      if (commitTimer.current === null) return
      clearTimeout(commitTimer.current)
      commitTimer.current = null
      commit()
    },
    [commit],
  )

  const handleChangeNote = (text: string): void => {
    onChangeNote(text)
    if (commitTimer.current !== null) clearTimeout(commitTimer.current)
    commitTimer.current = setTimeout(() => {
      commitTimer.current = null
      commit()
    }, NOTE_COMMIT_DELAY_MS)
  }

  const handleBlur = (): void => {
    if (commitTimer.current !== null) {
      clearTimeout(commitTimer.current)
      commitTimer.current = null
    }
    commit()
  }

  const handleToggleDoubt = (): void => {
    feedback.selection()
    onChangeDoubt(!doubt)
  }

  const noteA11y = open
    ? t.note.closeA11y(title)
    : hasNote
      ? t.note.editA11y(title)
      : t.note.addA11y(title)
  // One line in the pill: line breaks and runs of spaces become a single space.
  const noteLabel = hasNote ? t.note.withPreview(note.replace(/\s+/g, " ").trim()) : t.note.label
  const doubtInk = doubt ? theme.onSurface.warning : theme.colors.textPrimary

  return (
    <Animated.View
      layout={LinearTransition.reduceMotion(ReduceMotion.System)}
      style={styles.container}
      testID={`factor-strip-${factor}`}
    >
      <View style={styles.row}>
        <AppPressable
          disableScale
          disableRipple
          onPress={handleToggleDoubt}
          hitSlop={PILL_SLOP}
          style={[styles.pill, doubt ? styles.pillDoubtOn : null]}
          accessibilityRole="switch"
          accessibilityState={{ checked: doubt }}
          accessibilityLabel={t.doubt.a11yLabel}
          accessibilityHint={t.doubt.hint}
          testID="factor-doubt-switch"
        >
          <Ionicons name="flag-outline" size={PILL_GLYPH_SIZE} color={doubtInk} />
          <Text style={[styles.pillText, { color: doubtInk }]}>{t.doubt.label}</Text>
        </AppPressable>

        <AppPressable
          disableScale
          disableRipple
          onPress={() => setOpen((current) => !current)}
          hitSlop={PILL_SLOP}
          style={[styles.pill, styles.notePill, open ? styles.pillNoteOpen : null]}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={noteA11y}
          testID="factor-note-link"
        >
          <Ionicons
            name={open ? "chevron-up-outline" : "create-outline"}
            size={PILL_GLYPH_SIZE}
            color={theme.colors.textPrimary}
          />
          <Text style={[styles.pillText, styles.noteText]} numberOfLines={1}>
            {noteLabel}
          </Text>
        </AppPressable>
      </View>

      {open ? (
        <Animated.View
          entering={FadeIn.duration(brandMotion.durations.base).reduceMotion(ReduceMotion.System)}
        >
          <NoteField
            testID="factor-note-field"
            label={t.note.fieldLabel(title)}
            value={note}
            maxLength={FACTOR_NOTE_MAX_LENGTH}
            placeholder={t.note.placeholder}
            helper={t.note.visibility}
            counterLabel={(count) => t.note.counter({ count, max: FACTOR_NOTE_MAX_LENGTH })}
            counterA11y={(count) => t.note.counterA11y({ count, max: FACTOR_NOTE_MAX_LENGTH })}
            onChangeText={handleChangeNote}
            onCommit={handleBlur}
            minHeight={NOTE_FIELD_MIN_HEIGHT}
            maxHeight={NOTE_FIELD_MAX_HEIGHT}
            accessibilityLabel={t.note.fieldLabel(title)}
            accessibilityHint={t.note.hint}
            autoFocus
          />
        </Animated.View>
      ) : null}
    </Animated.View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    container: {
      gap: brandSpacing4.sm,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
    },
    // A glass pill: the card fill and hairline of the redesign, no blur.
    pill: {
      minHeight: PILL_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.xs,
      paddingHorizontal: brandSpacing4.smd,
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      backgroundColor: theme.visual.glass.cardFill,
      borderColor: theme.visual.glass.cardBorder,
    },
    // The doubt, on: the warning-soft fill with the warning hairline and ink.
    pillDoubtOn: {
      backgroundColor: theme.colors.warningSoft,
      borderColor: theme.componentColors.notice.warningBorder,
    },
    // The note pill shrinks first, so a long note shows as one line ending in an ellipsis.
    notePill: {
      flexShrink: 1,
    },
    pillNoteOpen: {
      borderColor: theme.visual.accentText,
    },
    pillText: {
      ...brandTypeScale.subhead,
      fontFamily: brandTypography.input.fontFamily,
    },
    noteText: {
      flexShrink: 1,
      color: theme.colors.textPrimary,
    },
  })
}
