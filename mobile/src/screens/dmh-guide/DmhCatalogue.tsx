import { useEffect, useMemo } from "react"
import { AccessibilityInfo, Keyboard, View } from "react-native"
import type { DmhGroupCode } from "@cortege/ibp-domain"
import { searchDmhGroups } from "../../app/dmh-guide/search"
import { DMH_FORM_IDS, formOf, groupsOf } from "../../app/dmh-guide/structure"
import { selectionLabel } from "../../app/factor-selections"
import { foldSearchText } from "../../app/search-text"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppGroupedList, type AppGroupedListRow } from "../../ui/AppGroupedList"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import { SearchField } from "../global-search/SearchField"
import { DmhSourcesLinkRow } from "./DmhSourcesLinkRow"
import { createDmhGuideStyles, DMH_GUIDE_ROW_MIN_HEIGHT } from "./dmh-guide.styles"

const t = fr.dmhGuide

type DmhCatalogueProps = {
  query: string
  onChangeQuery: (text: string) => void
  onOpenGroup: (code: DmhGroupCode) => void
  onOpenSources: () => void
}

const SEARCH_TEXTS = {
  placeholder: t.search.placeholder,
  a11yLabel: t.search.label,
  clear: t.search.clear,
}

/**
 * The catalogue view of the guide sheet (32-UI-SPEC S2.1 and S2.2, D-04, redesign B-I2): the lead
 * that defines the word, a search field, then either the fifteen groups under the seven official
 * form headers (empty query) as grouped lists, or one flat list of the matching groups with their
 * form as a subtitle, or the empty state (plain centred text, no card). "Sources et licence" is a
 * one-row group at the foot. The search is local, accent- and case-insensitive and not debounced
 * (fifteen items); the result count is announced politely on each change. The field is never
 * focused on its own. The shell (`DmhGuideScreen`) owns the query, so it survives a visit to a
 * group page.
 */
export function DmhCatalogue({
  query,
  onChangeQuery,
  onOpenGroup,
  onOpenSources,
}: DmhCatalogueProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createDmhGuideStyles(theme), [theme])
  const folded = foldSearchText(query).trim()
  const results = useMemo(() => searchDmhGroups(query), [query])
  const searching = folded !== ""

  // The count is announced once per folded query; the empty query announces nothing.
  useEffect(() => {
    if (folded === "") return
    AccessibilityInfo.announceForAccessibility(t.search.found({ count: results.length }))
  }, [folded, results.length])

  const row = (code: DmhGroupCode, caption: boolean): AppGroupedListRow => {
    const label = selectionLabel("F", code) ?? code
    return {
      key: code,
      label,
      subtitle: caption ? t.forms[formOf(code)] : undefined,
      labelLines: 3,
      medium: true,
      minHeight: DMH_GUIDE_ROW_MIN_HEIGHT,
      onPress: () => onOpenGroup(code),
      accessibilityHint: t.sheet.rowHint,
      testID: `dmh-catalogue-row-${code}`,
    }
  }

  return (
    <View style={styles.page} testID="dmh-catalogue">
      <Text style={styles.lead}>{t.sheet.lead}</Text>

      <View style={styles.searchRow} testID="dmh-search">
        <SearchField
          value={query}
          onChangeText={onChangeQuery}
          onSubmit={Keyboard.dismiss}
          onClear={() => onChangeQuery("")}
          busy={false}
          texts={SEARCH_TEXTS}
        />
      </View>

      {!searching ? (
        <AppGroupedList
          sections={DMH_FORM_IDS.map((form) => ({
            key: form,
            title: t.forms[form],
            rows: groupsOf(form).map((code) => row(code, false)),
          }))}
        />
      ) : results.length > 0 ? (
        <AppGroupedList
          sections={[{ key: "results", rows: results.map((code) => row(code, true)) }]}
        />
      ) : (
        <View testID="dmh-search-empty" style={styles.empty}>
          <Text style={styles.emptyTitle}>{t.search.emptyTitle}</Text>
          <Text style={styles.emptyBody}>{t.search.emptyBody}</Text>
          <AppPressable
            testID="dmh-search-empty-action"
            style={styles.link}
            onPress={() => onChangeQuery("")}
            accessibilityRole="button"
            accessibilityLabel={t.search.emptyAction}
          >
            <Text style={styles.linkText}>{t.search.emptyAction}</Text>
          </AppPressable>
        </View>
      )}

      <DmhSourcesLinkRow onPress={onOpenSources} />
    </View>
  )
}
