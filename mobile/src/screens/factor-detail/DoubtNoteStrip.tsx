import { useEffect, useMemo, useRef, useState } from "react"
import { StyleSheet, Switch, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import Animated, { FadeIn, LinearTransition, ReduceMotion } from "react-native-reanimated"
import { FACTOR_NOTE_MAX_LENGTH } from "@cortege/ibp-domain"
import {
  brandDefaultFontFamily,
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

// Field sizes (UI-SPEC "Spacing", fixed sizes): the strip row, its switch group and the note link
// keep their touch targets; the note field grows from 96 to 144 before it scrolls inside.
const STRIP_ROW_MIN_HEIGHT = 52
const SWITCH_ROW_MIN_HEIGHT = 48
const NOTE_LINK_MIN_HEIGHT = 44
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
 * Phase 27 (D-16): the flat strip under a factor's score line. A "Douteux" switch row and a note
 * link, closed by default so an observer who never touches it performs exactly the same taps as
 * before. The doubt and the note never change the score (D-13, D-14). The note opens in place and
 * closes only with "Fermer la note" or when the page changes, never on blur (U-06).
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

  const linkLabel = open ? t.note.close : hasNote ? t.note.edit : t.note.add
  const linkA11y = open
    ? t.note.closeA11y(title)
    : hasNote
      ? t.note.editA11y(title)
      : t.note.addA11y(title)

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
          style={[styles.switchRow, doubt ? styles.switchRowOn : null]}
          accessibilityRole="switch"
          accessibilityState={{ checked: doubt }}
          accessibilityLabel={t.doubt.label}
          accessibilityHint={t.doubt.hint}
          testID="factor-doubt-switch"
        >
          <Text style={[styles.switchLabel, doubt ? styles.switchLabelOn : null]}>
            {t.doubt.label}
          </Text>
          <Switch
            value={doubt}
            pointerEvents="none"
            accessible={false}
            trackColor={{ false: theme.colors.divider, true: theme.colors.ochre }}
          />
        </AppPressable>

        <AppPressable
          onPress={() => setOpen((current) => !current)}
          style={styles.noteLink}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={linkA11y}
          testID="factor-note-link"
        >
          <Ionicons
            name={open ? "chevron-up-outline" : "create-outline"}
            size={18}
            color={theme.visual.accentText}
          />
          <Text style={styles.noteLinkText}>{linkLabel}</Text>
        </AppPressable>
      </View>

      {hasNote && !open ? (
        <AppPressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t.note.editA11y(title)}
          testID="factor-note-preview"
        >
          <Text style={styles.preview} numberOfLines={2}>
            {note}
          </Text>
        </AppPressable>
      ) : null}

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
  // Contrast (plan 27-03): the ochre switch track reaches 2.90:1 on warningSoft in the light
  // scheme, below the 3:1 of a non-text pair. There the ON row keeps its hairline and its label
  // colour but drops the soft fill; the word, the thumb and the switch state carry the meaning.
  const softFill = theme.scheme === "dark" ? theme.colors.warningSoft : undefined
  return StyleSheet.create({
    container: {
      gap: brandSpacing4.xs,
    },
    row: {
      minHeight: STRIP_ROW_MIN_HEIGHT,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      rowGap: brandSpacing4.xs,
      paddingHorizontal: brandSpacing4.xs,
    },
    switchRow: {
      minHeight: SWITCH_ROW_MIN_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: "transparent",
    },
    switchRowOn: {
      backgroundColor: softFill,
      borderColor: theme.componentColors.notice.warningBorder,
      paddingVertical: brandSpacing4.smd,
      paddingHorizontal: brandSpacing4.md,
    },
    switchLabel: {
      ...brandTypeScale.subhead,
      fontFamily: brandTypography.input.fontFamily,
      color: theme.colors.textPrimary,
    },
    switchLabelOn: {
      color: theme.onSurface.warning,
    },
    noteLink: {
      minHeight: NOTE_LINK_MIN_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.xs,
    },
    noteLinkText: {
      ...brandTypography.sectionHeader,
      color: theme.visual.accentText,
    },
    preview: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
      paddingHorizontal: brandSpacing4.xs,
    },
  })
}
