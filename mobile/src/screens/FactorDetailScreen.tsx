import { Fragment, useMemo } from "react"
import { View } from "react-native"
import { AppText as Text } from "../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import { allowedScoresFor, type DmhGroupCode, type IbpMethodVersion } from "@cortege/ibp-domain"
import { useBrandTheme } from "../app/theme"
import { FACTOR_TITLES, helpForMethod } from "../app/constants"
import { FactorField, FactorKey, FactorRetainedScore } from "../app/types"
import { AppCard } from "../ui/AppCard"
import { createDetailStyles } from "./factor-detail.styles"
import { FactorAGenusRecognitionEntry } from "./FactorAGenusRecognitionEntry"
import {
  CountingModeCaption,
  DerivedFromGroupsCaption,
  FromRouteCaption,
  TopClassNote,
} from "./factor-detail/CountingModeStrip"
import { DoubtNoteStrip } from "./factor-detail/DoubtNoteStrip"
import { anyDmhCount } from "./factor-detail/no-dmh-group"
import {
  fieldVariantsFor,
  hasDmhListCompanion,
  ignoreSelectionChange,
  renderDmhGroupList,
  renderFactorField,
} from "./factor-detail/renderFactorField"
import {
  hasUncappedBlock,
  UncappedFieldBlock,
  type UncappedEntryProps,
} from "./factor-detail/UncappedFieldBlock"
import { useRouteSurfacePrefill } from "./factor-detail/useRouteSurfacePrefill"
import { fr } from "../i18n"
import { AppPressable } from "../ui/AppPressable"

const t = fr.factorDetail

// Phase 30 (spec section 7): the three factors whose surface field starts from the route's zone.
const SURFACE_FACTORS: readonly FactorKey[] = ["C", "D", "E"]
const NO_FACTORS: readonly FactorKey[] = []
// F's highest class, read from the package's allowed scores so no second copy of its threshold lives
// here: the note under the trees per hectare shows once the evaluation retains that class.
const TOP_F_SCORE = Math.max(...allowedScoresFor("F"))

type FactorDetailScreenProps = {
  factor: FactorKey
  fields: FactorField[]
  retainedScore: FactorRetainedScore | null
  /** The survey's IBP method; null is an untagged legacy draft (v3.0 help, D-09). */
  methodVersion: IbpMethodVersion | null
  /** Opens the help sheet (a route of the survey stack) with the factor's texts. */
  onOpenHelp: (help: string, hints: readonly string[]) => void
  /** Phase 27 (D-12): the factor's doubt flag and note as the form holds them. */
  doubt: boolean
  note: string
  onChangeDoubt: (next: boolean) => void
  onChangeNote: (text: string) => void
  /** The note is written to the draft (typing pause, blur, page change). */
  onCommitNote: () => void
  /** Phase 30 (D-07): the factors counted in full, from the recorded route (none: nothing new). */
  uncappedFactors?: readonly FactorKey[]
  /** The surface décrite of the recorded route (ha): C, D and E start from it. Null: none. */
  zoneSurfaceHa?: number | null
  /**
   * Phase 30 (D-07, plan 30-19): the typed detail inputs of the relevé déplafonné and their setters.
   * B counted in full shows its cover per stratum, F its counts per group and its own surface.
   * Absent: the capped entry everywhere.
   */
  uncappedEntry?: UncappedEntryProps
  /** Phase 32 (D-04): opens the guide sheet; a group opens its page, none the catalogue. */
  onOpenDmhGuide?: (group: DmhGroupCode) => void
}

/**
 * One factor's entry (OA-30): the input first, then the factor's score on one line, then a link to
 * the help. The factor's name and the running total are in the pager's header, not here. Factor A
 * opens with the photo identification (OA-31). Phase 27 (D-16): the flat doubt and note strip sits
 * between the score line and the help link; it never changes the score line. Phase 30 (D-07): a
 * factor counted in full opens with its one-line caption, and the surface field of C, D and E starts
 * from the route's surface décrite (once, only when empty) with "D'après le parcours" under it.
 * B counted in full swaps its strata chips for a cover per stratum. Phase 32 (D-08): F shows the
 * group list by form (a tick per row; counted in full, a "+" then a stepper per row) with the guide
 * entry points. Redesign 32-18 (A-C1): the list is drawn after the input card, straight on the
 * canvas, so the card keeps only the trees per hectare and, counted in full, F's own surface above
 * the list (the detail values are kept, never deleted, when the factor goes back to the capped
 * entry, U-O10). Follow-up of phase 32 (owner decision 2026-10-28): in the capped mode the list
 * counts too, 0 to 2 trees per hectare per group, and their sum is the trees per hectare. Follow-up
 * 32-24: that figure is always a read-only value (both modes), with a note under it once F's
 * highest class is retained, and the factor's class is in the pager's header, not on the score line.
 */
export function FactorDetailScreen({
  factor,
  fields,
  retainedScore,
  methodVersion,
  onOpenHelp,
  doubt,
  note,
  onChangeDoubt,
  onChangeNote,
  onCommitNote,
  uncappedFactors = NO_FACTORS,
  zoneSurfaceHa = null,
  uncappedEntry,
  onOpenDmhGuide,
}: FactorDetailScreenProps) {
  const theme = useBrandTheme()
  const detailStyles = useMemo(() => createDetailStyles(theme), [theme])
  const helpTexts = helpForMethod(methodVersion)
  // Phase 6 (ADR-002 D-11): the genus-list field is always A's first field (the first variant of A),
  // so a confirmed suggestion can be merged straight into whatever the surveyor already picked.
  const genusListField = factor === "A" ? fields[0] : null
  const variants = useMemo(() => fieldVariantsFor(factor, methodVersion), [factor, methodVersion])
  const countedInFull = uncappedFactors.includes(factor)
  const detailEntry = countedInFull && hasUncappedBlock(factor) ? uncappedEntry : undefined
  // Follow-up of phase 32: F in the capped mode has one counter per group (trees per hectare, at
  // most 2). Follow-up 32-24: with the group counters on the page (either mode) the trees per
  // hectare is only ever their derived figure, a value and not an input.
  const cappedEntry = factor === "F" && !countedInFull ? uncappedEntry : undefined
  const groupEntry = detailEntry ?? cappedEntry
  const anyGroupCounted = anyDmhCount(groupEntry?.state.dmhCounts)
  const topClassReached = factor === "F" && retainedScore?.score === TOP_F_SCORE
  // Found by its place (the numeric variant), not by its label: the form hands the French label
  // ("Surface (ha)"), not the field key, so a label match never found it (iOS simulator, 2026-10-14).
  const surfaceIndex = SURFACE_FACTORS.includes(factor)
    ? variants.findIndex((variant) => variant.kind === "numeric")
    : -1
  const surfaceField = surfaceIndex >= 0 ? fields[surfaceIndex] : undefined
  // F's group list follows the card, drawn by the screen (A-C1).
  const dmhListIndex = variants.findIndex(hasDmhListCompanion)
  const dmhListField = dmhListIndex >= 0 ? fields[dmhListIndex] : undefined
  const { fromRoute } = useRouteSurfacePrefill({
    zoneSurfaceHa,
    surfaceText: surfaceField?.value ?? "",
    onChangeSurface: surfaceField?.onChange ?? ignoreSelectionChange,
    enabled: surfaceField !== undefined,
  })

  return (
    <View style={detailStyles.screen}>
      <AppCard variant="glass" padding={16} style={detailStyles.panel}>
        {countedInFull ? <CountingModeCaption factor={factor} /> : null}
        {genusListField ? <FactorAGenusRecognitionEntry genusField={genusListField} /> : null}
        <View style={detailStyles.fieldsList}>
          {fields.map((field, index) => {
            const block = detailEntry ? (
              <UncappedFieldBlock
                key={`${factor}-${field.label}-uncapped`}
                factor={factor}
                field={field}
                methodVersion={methodVersion}
                entry={detailEntry}
                zoneSurfaceHa={zoneSurfaceHa}
              />
            ) : null
            // B: the cover per stratum replaces the strata chips.
            if (block !== null && factor === "B") return block
            const derivedTrees = groupEntry !== undefined && hasDmhListCompanion(variants[index])
            const input = renderFactorField(
              factor,
              variants[index],
              field,
              methodVersion,
              detailStyles,
              {
                readOnly: derivedTrees,
                readOnlyEmpty: anyGroupCounted ? t.dmhList.treesPerHaPending : "0",
              },
            )
            if (derivedTrees) {
              return (
                <Fragment key={`${factor}-${field.label}-derived`}>
                  {input}
                  <DerivedFromGroupsCaption />
                  {topClassReached ? <TopClassNote /> : null}
                  {block}
                </Fragment>
              )
            }
            if (block !== null) {
              return (
                <Fragment key={`${factor}-${field.label}-detail`}>
                  {input}
                  {block}
                </Fragment>
              )
            }
            return fromRoute && field === surfaceField ? (
              <Fragment key={`${factor}-${field.label}-from-route`}>
                {input}
                <FromRouteCaption />
              </Fragment>
            ) : (
              input
            )
          })}
        </View>
      </AppCard>

      {dmhListField
        ? renderDmhGroupList(dmhListField, methodVersion, {
            uncappedEntry: detailEntry,
            cappedEntry,
            onOpenDmhGuide,
          })
        : null}

      <View
        testID="factor-score-line"
        style={[
          detailStyles.scoreLine,
          retainedScore ? detailStyles.scoreLineFilled : detailStyles.scoreLinePending,
        ]}
      >
        <Text style={detailStyles.scoreLineText}>{retainedScore ? t.scoreLabel : t.scoreHint}</Text>
        <Text style={detailStyles.scoreLinePoints}>
          {retainedScore ? t.scorePoints({ scoreCount: retainedScore.score }) : t.pending}
        </Text>
      </View>

      <DoubtNoteStrip
        factor={factor}
        title={FACTOR_TITLES[factor]}
        doubt={doubt}
        note={note}
        onChangeDoubt={onChangeDoubt}
        onChangeNote={onChangeNote}
        onCommitNote={onCommitNote}
      />

      <AppPressable
        style={detailStyles.helpLink}
        onPress={() => onOpenHelp(helpTexts.help[factor], helpTexts.hints[factor])}
        accessibilityRole="button"
        accessibilityLabel={t.helpLink}
      >
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={theme.semanticColors.textStrong}
        />
        <Text style={detailStyles.helpLinkText}>{t.helpLink}</Text>
      </AppPressable>
    </View>
  )
}
