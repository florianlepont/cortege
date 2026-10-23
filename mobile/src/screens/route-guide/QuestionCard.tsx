import { memo, useMemo, useState } from "react"
import { StyleSheet, View } from "react-native"
import { brandInteraction, brandSpacing4, brandTypeScale } from "../../app/brand-tokens"
import { ROUTE_SURFACE_ERROR_TEXT } from "../../app/route-text"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppField } from "../../ui/AppField"
import { AppText as Text } from "../../ui/AppText"
import { AppPressable } from "../../ui/AppPressable"
import { InfoSheet } from "../../ui/InfoSheet"
import { ABBREVIATION_INFO_ICON_SIZE } from "../../ui/AbbreviationInfo"
import { Ionicons } from "@expo/vector-icons"
import { WizardHeading, WIZARD_ANSWER_GAP } from "../survey-wizard/WizardChrome"
import { RadioCard } from "../../ui/RadioCard"
import { feedback } from "../../ui/feedback"
import type { OpenQuestion } from "./route-guide-model"
import { choicesFor, questionTitle, questionWhy } from "./question-text"
import type { RouteGuideActions } from "./useRouteGuideState"

type QuestionCardProps = {
  question: OpenQuestion
  actions: RouteGuideActions
}

/**
 * The one open question (UI-SPEC section 3), drawn like the first three creation steps: its title
 * as the large heading with the (i) beside it, the one-sentence reason it is asked under it, then
 * its choices as radio cards with an example each, or the surface field. A tap on a choice only
 * selects it: the screen's pinned "Suivant" goes on, and the model decides what opens next.
 */
export const QuestionCard = memo(function QuestionCard({ question, actions }: QuestionCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const title = questionTitle(question)
  const infoParts = questionInfoParts(question)
  return (
    <View style={styles.card} testID={`route-question-${question.id}`}>
      <WizardHeading
        title={title}
        lead={questionWhy(question)}
        trailing={
          infoParts.length > 0 ? (
            <QuestionInfo parts={infoParts} title={title} id={question.id} />
          ) : undefined
        }
      />
      {question.id === "surface" ? (
        <View style={styles.answer}>
          <SurfaceBody question={question} actions={actions} />
        </View>
      ) : (
        <View
          style={[styles.choices, styles.answer]}
          accessibilityRole="radiogroup"
          accessibilityLabel={title}
        >
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

/**
 * What the information glyph of a question adds to the sentence already under its title (owner
 * check, Phase 30: the sheet repeated that sentence). Only the surface has more to say: what an
 * hectare is, the limit on hedges and tree lines, and how the estimate was made. The other
 * questions show no glyph.
 */
function questionInfoParts(question: OpenQuestion): string[] {
  if (question.id !== "surface") return []
  const texts = fr.routeGuide.questions.surface
  const parts: string[] = []
  if (!question.subStand && question.estimated) parts.push(texts.estimated)
  parts.push(texts.aid, texts.linearHelp)
  return parts
}

/** The information sheet of a question: the glyph beside the title and what it opens. */
function QuestionInfo({ parts, title, id }: { parts: string[]; title: string; id: string }) {
  const theme = useBrandTheme()
  const [open, setOpen] = useState(false)
  const slop = (brandInteraction.hitTarget.min - ABBREVIATION_INFO_ICON_SIZE) / 2

  return (
    <>
      <AppPressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={fr.routeGuide.a11y.questionInfo(title)}
        testID={`route-question-info-${id}`}
        disableScale
        hitSlop={{ top: slop, bottom: slop, left: slop, right: slop }}
      >
        <Ionicons
          name="information-circle-outline"
          size={ABBREVIATION_INFO_ICON_SIZE}
          color={theme.semanticColors.accent}
        />
      </AppPressable>
      <InfoSheet
        open={open}
        title={title}
        body={parts.join("\n\n")}
        closeLabel={fr.routeGuide.glossary.close}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

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
  // Only the absence of an estimate stays on the card (the field is empty and the observer must
  // know why); the estimate itself is explained in the question's information sheet.
  const caption = question.subStand ? null : question.unknown ? texts.unknown : null

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
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    // The heading block takes the gap of the wizard's own steps (title, helper, then the answer).
    card: {
      gap: brandSpacing4.md,
    },
    answer: {
      marginTop: WIZARD_ANSWER_GAP,
    },
    choices: {
      gap: brandSpacing4.sm,
    },
    helper: {
      ...brandTypeScale.subhead,
      color: theme.colors.textSecondary,
    },
  })
}
