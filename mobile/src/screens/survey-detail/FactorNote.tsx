import { useMemo, useState } from "react"
import { StyleSheet, TextLayoutEventData, NativeSyntheticEvent } from "react-native"
import Animated, { LinearTransition, ReduceMotion } from "react-native-reanimated"
import {
  brandDefaultFontFamily,
  brandInteraction,
  brandMotion,
  brandTypeScale,
} from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"

const f = fr.surveyDetail.factors

// The lines a note shows before it folds: a row that opens the factor keeps it short (the full
// note is on the factor page), a read-only row shows more and expands in place (UI-SPEC 3.2, U-12).
const EDITABLE_LINES = 2
const READ_ONLY_LINES = 3

type FactorNoteProps = {
  code: string
  note: string
  /** A submitted or another member's survey: the row opens nothing, so the note can expand. */
  readOnly: boolean
}

/**
 * The note of one factor under its row title (phase 27, D-17). Clamped to two lines on a row that
 * opens the factor; on a read-only row to three lines, then a "Lire la suite" / "Réduire" link that
 * expands the note in place, shown only when the text is really cut. Plain text, never markup.
 */
export function FactorNote({ code, note, readOnly }: FactorNoteProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [expanded, setExpanded] = useState(false)
  // Once the text has been seen cut, the link stays: expanded, the lines are no longer cut.
  const [truncated, setTruncated] = useState(false)

  const onTextLayout = (event: NativeSyntheticEvent<TextLayoutEventData>) => {
    if (!readOnly || expanded) return
    if (event.nativeEvent.lines.length > READ_ONLY_LINES) setTruncated(true)
  }

  const showLink = readOnly && (truncated || expanded)

  return (
    <Animated.View
      layout={LinearTransition.duration(brandMotion.durations.base).reduceMotion(
        ReduceMotion.System,
      )}
    >
      <Text
        testID={`factor-note-${code}`}
        numberOfLines={expanded ? undefined : readOnly ? READ_ONLY_LINES : EDITABLE_LINES}
        onTextLayout={onTextLayout}
        style={styles.note}
      >
        {note}
      </Text>
      {showLink ? (
        <AppPressable
          testID={`factor-note-toggle-${code}`}
          onPress={() => setExpanded((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel={expanded ? f.noteLessA11y : f.noteMoreA11y}
          accessibilityState={{ expanded }}
          style={styles.link}
        >
          <Text style={styles.linkText}>{expanded ? f.noteLess : f.noteMore}</Text>
        </AppPressable>
      ) : null}
    </Animated.View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    note: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
    },
    link: {
      minHeight: brandInteraction.hitTarget.min,
      alignSelf: "flex-start",
      justifyContent: "center",
    },
    linkText: {
      ...brandTypeScale.footnote,
      fontFamily: "Jost-SemiBold",
      color: theme.visual.accentText,
    },
  })
}
