import { useMemo, useState } from "react"
import { View } from "react-native"
import { DMH_GROUP_CODES, type DmhGroupCode, type IbpMethodVersion } from "@cortege/ibp-domain"
import { orderDmhRows } from "../../app/dmh-guide/order"
import { selectionLabel, withSelectionToggled } from "../../app/factor-selections"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { useLatestCallback } from "../../state/useLatestCallback"
import { AppCollapsibleSection } from "../../ui/AppCollapsibleSection"
import { AppGroupedContainer, AppGroupedList } from "../../ui/AppGroupedList"
import { AppText as Text } from "../../ui/AppText"
import { countFromText } from "./count-from-text"
import { createDmhListStyles, DMH_LABEL_INSET } from "./dmh-group-list.styles"
import { DmhGroupRow } from "./DmhGroupRow"

const t = fr.factorDetail.dmhList

/** The counted-in-full mode (D-10): the whole trees per group, and the two ways to change them. */
export type DmhListCounting = {
  counts: Partial<Record<DmhGroupCode, number>>
  /** Adds `delta` trees to a group, ticking it (the "+" of an unticked row sends 1). */
  onBump: (code: DmhGroupCode, delta: number) => void
  /** Sets a count; NaN (an emptied field) drops it. */
  onSetCount: (code: DmhGroupCode, count: number) => void
}

type DmhGroupListProps = {
  methodVersion: IbpMethodVersion | null
  /** The stored group selection of factor F (null when the survey has none). */
  selected: readonly string[] | null
  onChangeSelection: (next: string[]) => void
  /** Present = counted in full (D-10); absent = the capped mode, the tick alone. */
  counting?: DmhListCounting
  /** Opens the guide: on the catalogue with no argument, on that group page with one (D-04). */
  onOpenDmhGuide: (group?: DmhGroupCode) => void
  editable?: boolean
}

const KNOWN_CODES: ReadonlySet<string> = new Set(DMH_GROUP_CODES)

/**
 * The factor F group list (32-UI-SPEC S1, redesign 32-18): heading, helper and summary line, the
 * guide entry (one grouped row) and seven form sections, each a grouped-list header over one
 * `AppGroupedContainer` of rows. It is drawn straight on the screen, not inside the factor's input
 * card (A-C1): one container level, as in an iOS inset grouped list. The order and the open sections are computed once, when the list mounts (D-08 levers
 * b and c): ticking, counting or unticking never moves a row or a section, so a thumb never meets
 * a row that has jumped (research pitfall 5). The guide entry and the info glyphs stay active when
 * the list is read-only.
 */
export function DmhGroupList({
  methodVersion,
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
  const onOpenInfo = useLatestCallback((code: DmhGroupCode): void => {
    onOpenDmhGuide(code)
  })
  const onOpenCatalogue = useLatestCallback((): void => {
    onOpenDmhGuide()
  })

  const tickedSet = new Set((selected ?? []).filter((code) => KNOWN_CODES.has(code)))
  const trees = Object.values(counts ?? {}).reduce<number>((sum, count) => sum + (count ?? 0), 0)
  const summary =
    tickedSet.size === 0
      ? t.summaryNone
      : full
        ? t.summaryFull({ groups: tickedSet.size, trees })
        : t.summaryCapped({ groups: tickedSet.size })

  return (
    <View style={styles.root}>
      <View style={styles.headingBlock}>
        <Text style={styles.heading} accessibilityRole="header">
          {full
            ? fr.factorDetail.countingMode.dmhTitle
            : fr.factorDetail.companionLabels.dmh_groups}
        </Text>
        {full ? <Text style={styles.helper}>{fr.factorDetail.countingMode.dmhHelper}</Text> : null}
        <Text style={styles.summary} testID="dmh-summary">
          {summary}
        </Text>
      </View>
      <AppGroupedList
        sections={[
          {
            key: "dmh-guide",
            rows: [
              {
                key: "entry",
                label: t.entry.title,
                subtitle: t.entry.caption,
                icon: "book-outline",
                onPress: onOpenCatalogue,
                accessibilityLabel: t.entry.label,
                testID: "dmh-guide-entry",
              },
            ],
          },
        ]}
      />
      <View style={styles.sections}>
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
