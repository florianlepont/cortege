import { useMemo, useState } from "react"
import { View } from "react-native"
import { DMH_GROUP_CODES, type DmhGroupCode, type IbpMethodVersion } from "@cortege/ibp-domain"
import { orderDmhRows } from "../../app/dmh-guide/order"
import { selectionLabel, withSelectionToggled } from "../../app/factor-selections"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { useLatestCallback } from "../../state/useLatestCallback"
import { AppCollapsibleSection } from "../../ui/AppCollapsibleSection"
import { AppGroupedContainer } from "../../ui/AppGroupedList"
import { AppText as Text } from "../../ui/AppText"
import { countFromText } from "./count-from-text"
import { createDmhListStyles, DMH_LABEL_INSET } from "./dmh-group-list.styles"
import { DmhGroupRow } from "./DmhGroupRow"
import { DmhNoneRow } from "./DmhNoneRow"
import { anyDmhCount, isNoDmhGroup } from "./no-dmh-group"

const t = fr.factorDetail.dmhList

/**
 * The counting rows (D-10): the whole trees per group, and the two ways to change them. Counted in
 * full the counts are trees on the described surface; with `max` they are the capped survey mode's
 * trees per hectare (follow-up of phase 32), at most `max` per group.
 */
export type DmhListCounting = {
  counts: Partial<Record<DmhGroupCode, number>>
  /** Present = the capped survey mode: trees per hectare, the highest count of a group (2). */
  max?: number
  /** Adds `delta` trees to a group, ticking it (the "+" of an unticked row sends 1). */
  onBump: (code: DmhGroupCode, delta: number) => void
  /** Sets a count; NaN (an emptied field) drops it. */
  onSetCount: (code: DmhGroupCode, count: number) => void
  /** The "no tree carries one" row (follow-up 32-25): true records 0 with no group, false undoes it. */
  onMarkNone: (next: boolean) => void
}

type DmhGroupListProps = {
  methodVersion: IbpMethodVersion | null
  /** F's stored trees per hectare as text: the "no tree carries one" row reads it (32-25). */
  treesPerHaText: string
  /** The stored group selection of factor F (null when the survey has none). */
  selected: readonly string[] | null
  onChangeSelection: (next: string[]) => void
  /** Present = the rows count (full or per hectare); absent = the tick alone (no entry wired). */
  counting?: DmhListCounting
  /** Opens the guide on that group's page (D-04), from the row's info button. */
  onOpenDmhGuide: (group: DmhGroupCode) => void
  editable?: boolean
}

const KNOWN_CODES: ReadonlySet<string> = new Set(DMH_GROUP_CODES)

/**
 * The factor F group list (32-UI-SPEC S1, redesign 32-18): heading, one helper and the summary
 * line, then seven form sections, each a grouped-list header over one `AppGroupedContainer` of
 * rows. There is no guide entry card on top (owner decision, 32-22): the guide opens from each
 * row's info button, from Accueil and from the global search. It is drawn straight on the screen, not inside the factor's input
 * card (A-C1): one container level, as in an iOS inset grouped list. The order and the open sections are computed once, when the list mounts (D-08 levers
 * b and c): ticking, counting or unticking never moves a row or a section, so a thumb never meets
 * a row that has jumped (research pitfall 5). The info buttons stay active when the list is
 * read-only. With the counters on the page, one row sits above the first section: "no tree carries
 * a dendromicrohabitat" (follow-up 32-25), the way to record 0 without touching a counter.
 */
export function DmhGroupList({
  methodVersion,
  treesPerHaText,
  selected,
  onChangeSelection,
  counting,
  onOpenDmhGuide,
  editable = true,
}: DmhGroupListProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createDmhListStyles(theme), [theme])
  const counts = counting?.counts
  const [sections] = useState(() => orderDmhRows({ ticked: selected, counts: counts ?? {} }))
  const full = counting !== undefined
  const maxCount = counting?.max
  const perHectare = maxCount !== undefined

  const onToggle = useLatestCallback((code: DmhGroupCode, next: boolean): void => {
    onChangeSelection(withSelectionToggled("F", methodVersion, selected, code, next))
  })
  const onAdd = useLatestCallback((code: DmhGroupCode): void => {
    counting?.onBump(code, 1)
  })
  const onStep = useLatestCallback((code: DmhGroupCode, next: number): void => {
    counting?.onSetCount(code, next)
  })
  const onSubmitText = useLatestCallback((code: DmhGroupCode, text: string): void => {
    counting?.onSetCount(code, countFromText(text))
  })
  const onMarkNone = useLatestCallback((next: boolean): void => {
    counting?.onMarkNone(next)
  })
  const onOpenInfo = useLatestCallback((code: DmhGroupCode): void => {
    onOpenDmhGuide(code)
  })

  const tickedSet = new Set((selected ?? []).filter((code) => KNOWN_CODES.has(code)))
  const trees = Object.values(counts ?? {}).reduce<number>((sum, count) => sum + (count ?? 0), 0)
  const summary =
    tickedSet.size === 0
      ? t.summaryNone
      : full && !perHectare
        ? t.summaryFull({ groups: tickedSet.size, trees })
        : t.summaryCapped({ groups: tickedSet.size })

  // One helper line: the cap sentence of the counting modes, then where the guide is.
  const helper = perHectare
    ? [t.cappedHelper, t.infoHelper].join(" ")
    : full
      ? [fr.factorDetail.countingMode.dmhHelper, t.infoHelper].join(" ")
      : t.infoHelper

  return (
    <View style={styles.root}>
      <View style={styles.headingBlock}>
        <Text style={styles.heading} accessibilityRole="header">
          {full && !perHectare
            ? fr.factorDetail.countingMode.dmhTitle
            : fr.factorDetail.companionLabels.dmh_groups}
        </Text>
        <Text style={styles.helper}>{helper}</Text>
        <Text style={styles.summary} testID="dmh-summary">
          {summary}
        </Text>
      </View>
      <View style={styles.sections}>
        {full ? (
          <AppGroupedContainer dividerInset={DMH_LABEL_INSET}>
            <DmhNoneRow
              chosen={isNoDmhGroup({ treesPerHaText, selected, counts })}
              locked={anyDmhCount(counts)}
              editable={editable}
              onChange={onMarkNone}
              styles={styles}
            />
          </AppGroupedContainer>
        ) : null}
        {sections.map((section) => {
          const total = section.codes.length
          const tickedHere = section.codes.filter((code) => tickedSet.has(code)).length
          return (
            <AppCollapsibleSection
              key={section.form}
              variant="grouped"
              title={t.forms[section.form]}
              badge={t.badge({ ticked: tickedHere, total })}
              accessibilityLabel={t.sectionA11y({
                form: t.forms[section.form],
                ticked: tickedHere,
                total,
              })}
              defaultExpanded={section.defaultExpanded}
              testID={`dmh-section-${section.form}`}
            >
              <AppGroupedContainer dividerInset={DMH_LABEL_INSET}>
                {section.codes.map((code) => (
                  <DmhGroupRow
                    key={code}
                    code={code}
                    label={selectionLabel("F", code, methodVersion) ?? code}
                    ticked={tickedSet.has(code)}
                    count={counts?.[code]}
                    full={full}
                    maxCount={maxCount}
                    editable={editable}
                    onToggle={onToggle}
                    onAdd={onAdd}
                    onStep={onStep}
                    onSubmitText={onSubmitText}
                    onOpenInfo={onOpenInfo}
                    styles={styles}
                  />
                ))}
              </AppGroupedContainer>
            </AppCollapsibleSection>
          )
        })}
      </View>
    </View>
  )
}
