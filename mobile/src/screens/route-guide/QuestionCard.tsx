import { memo, useEffect, useMemo, useRef } from "react"
import { AccessibilityInfo, StyleSheet, View, findNodeHandle } from "react-native"
import type { Text as NativeText } from "react-native"
import { brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { ROUTE_SURFACE_ERROR_TEXT } from "../../app/route-text"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppField } from "../../ui/AppField"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import { GlossaryInfo } from "../../ui/GlossaryInfo"
import { RadioCard } from "../../ui/RadioCard"
import { feedback } from "../../ui/feedback"
import type { OpenQuestion } from "./route-guide-model"
import { choicesFor, questionTitle, questionWhy } from "./question-text"
import type { RouteGuideActions } from "./useRouteGuideState"

type QuestionCardProps = {
  question: OpenQuestion
  actions: RouteGuideActions
  /** Moves the screen reader's focus to the title when the card opens (not on the first render). */
  focusOnMount: boolean
}

/**
 * The one open question (UI-SPEC section 3): its title, the one-sentence reason it is asked, then
 * its choices as radio cards with an example each, or the surface field with its explanation and
 * "Suivant". A tap on a choice answers at once; the model decides what opens next.
 */
export const QuestionCard = memo(function QuestionCard({
  question,
  actions,
  focusOnMount,
}: QuestionCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const titleRef = useRef<NativeText>(null)

  useEffect(() => {
    if (!focusOnMount) return
    const node = findNodeHandle(titleRef.current)
    if (node !== null) AccessibilityInfo.setAccessibilityFocus(node)
    // The card is remounted for each question: the focus moves once, when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const title = questionTitle(question)
  return (
    <View style={styles.card} testID={`route-question-${question.id}`}>
      <View style={styles.titleRow}>
        <Text ref={titleRef} style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {question.id === "surface" ? <GlossaryInfo term="peuplement" /> : null}
      </View>
      <Text style={styles.why}>{questionWhy(question)}</Text>
      {question.id === "surface" ? (
        <SurfaceBody question={question} actions={actions} />
      ) : (
        <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel={title}>
          {choicesFor(question, actions).map((choice) => (
            <RadioCard
              key={choice.key}
              selected={choice.selected}
              onPress={() => {
                feedback.selection()
                choice.onSelect()
              }}
              title={choice.title}
              caption={choice.caption}
              tag={choice.tag}
              accessibilityLabel={
                choice.tag
                  ? fr.routeGuide.a11y.optionLabelTagged({
                      label: choice.title,
                      tag: choice.tag,
                      caption: choice.caption,
                    })
                  : fr.routeGuide.a11y.optionLabel({
                      label: choice.title,
                      caption: choice.caption,
                    })
              }
              testID={`route-choice-${question.id}-${choice.key}`}
            />
          ))}
        </View>
      )}
    </View>
  )
})

function SurfaceBody({
  question,
  actions,
}: {
  question: Extract<OpenQuestion, { id: "surface" }>
  actions: RouteGuideActions
}) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const texts = fr.routeGuide.questions.surface
  // The estimate and its absence describe the whole stand, not one piece of a cut stand.
  const caption = question.subStand
    ? null
    : question.estimated
      ? texts.estimated
      : question.unknown
        ? texts.unknown
        : null

  return (
    <View style={styles.choices}>
      <AppField
        label={texts.label}
        suffix={texts.suffix}
        value={question.text}
        onChangeText={actions.setSurfaceText}
        onBlur={actions.validateSurface}
        onSubmitEditing={actions.commitSurface}
        keyboardType="decimal-pad"
        returnKeyType="done"
        error={question.error === null ? null : ROUTE_SURFACE_ERROR_TEXT[question.error]}
        accessibilityLabel={fr.routeGuide.a11y.surfaceField}
        testID="route-surface-field"
      />
      {caption !== null ? <Text style={styles.helper}>{caption}</Text> : null}
      <Text style={styles.helper}>{texts.aid}</Text>
      <Text style={styles.helperSmall}>{texts.linearHelp}</Text>
      <AppPressable
        style={styles.next}
        onPress={actions.commitSurface}
        disabled={question.error !== null}
        accessibilityRole="button"
        accessibilityLabel={fr.routeGuide.screen.next}
        accessibilityState={{ disabled: question.error !== null }}
        testID="route-next-surface"
      >
        <Text style={[styles.nextLabel, question.error !== null ? styles.nextLabelOff : null]}>
          {fr.routeGuide.screen.next}
        </Text>
      </AppPressable>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    card: {
      gap: brandSpacing4.smd,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
    },
    title: {
      flex: 1,
      ...brandTypeScale.headline,
      fontFamily: brandTypography.navTitle.fontFamily,
      color: theme.colors.textPrimary,
    },
    why: {
      ...brandTypeScale.subhead,
      color: theme.colors.textSecondary,
    },
    choices: {
      gap: brandSpacing4.sm,
    },
    helper: {
      ...brandTypeScale.subhead,
      color: theme.colors.textSecondary,
    },
    helperSmall: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    next: {
      alignSelf: "flex-start",
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: brandSpacing4.xs,
    },
    nextLabel: {
      ...brandTypeScale.headline,
      fontFamily: brandTypography.navTitle.fontFamily,
      color: theme.semanticColors.accent,
    },
    nextLabelOff: {
      color: theme.colors.textSecondary,
    },
  })
}
