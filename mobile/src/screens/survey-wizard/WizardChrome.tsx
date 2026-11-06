import { useMemo, type ReactNode } from "react"
import { View } from "react-native"
import { brandFontScaleCaps, brandSpacing4 } from "../../app/brand-tokens"
import { useBrandTheme } from "../../app/theme"
import { AppText as Text } from "../../ui/AppText"
import { createWizardStyles } from "./wizard.styles"

/** The line height of the question (30 on 35): the glyph beside it is centred on the first line. */
const TITLE_LINE_HEIGHT = 35

type WizardTopBarProps = {
  /** Space above the bar: under the native header, or under the status bar on Android. */
  paddingTop: number
  /** How many steps the creation has. */
  total: number
  /** The step shown (0-based): its segment and the ones before it are filled. */
  index: number
  /** Above the progress: the wizard's own top row, on the platforms without a native header. */
  children?: ReactNode
}

/**
 * The top of a creation step: the optional top row, then the progress as one segment per step.
 * Shared by the three wizard questions and the route step (the fifth), so the five steps read as
 * one flow.
 */
export function WizardTopBar({ paddingTop, total, index, children }: WizardTopBarProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createWizardStyles(theme), [theme])
  return (
    <View style={[styles.topBar, { paddingTop }]} testID="wizard-top-bar">
      {children}
      <View style={styles.progress} testID="wizard-progress">
        {Array.from({ length: total }, (_, segment) => (
          <View
            key={`segment-${segment}`}
            style={[
              styles.progressSegment,
              segment <= index ? styles.progressDone : styles.progressTodo,
            ]}
          />
        ))}
      </View>
    </View>
  )
}

type WizardHeadingProps = {
  /** The question, as the large heading. */
  title: string
  /** The one-sentence helper under it, in the lighter body style. */
  lead?: string
  /** A control beside the heading (the (i) glyph of the route step's questions). */
  trailing?: ReactNode
}

/**
 * The question of a creation step as a large heading with its helper sentence under it. A fragment:
 * the two lines take the gap of the scroll content that holds them, like the wizard's own.
 */
export function WizardHeading({ title, lead, trailing }: WizardHeadingProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createWizardStyles(theme), [theme])
  const heading = (
    <Text
      style={styles.title}
      accessibilityRole="header"
      maxFontSizeMultiplier={brandFontScaleCaps.title}
    >
      {title}
    </Text>
  )
  return (
    <>
      {trailing === undefined ? (
        heading
      ) : (
        <View style={styles.titleRow}>
          {heading}
          <View style={{ minHeight: TITLE_LINE_HEIGHT, justifyContent: "center" }}>{trailing}</View>
        </View>
      )}
      {lead === undefined ? null : <Text style={styles.lead}>{lead}</Text>}
    </>
  )
}

/** The gap between the heading block and the answer under it (the wizard's `answer` margin). */
export const WIZARD_ANSWER_GAP = brandSpacing4.smd
