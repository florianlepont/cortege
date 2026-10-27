import { useEffect, useMemo } from "react"
import { AccessibilityInfo, Keyboard, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { DmhGroupCode } from "@cortege/ibp-domain"
import { searchDmhGroups } from "../../app/dmh-guide/search"
import { DMH_FORM_IDS, formOf, groupsOf } from "../../app/dmh-guide/structure"
import { selectionLabel } from "../../app/factor-selections"
import { foldSearchText } from "../../app/search-text"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppCard } from "../../ui/AppCard"
import { AppPressable } from "../../ui/AppPressable"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { AppText as Text } from "../../ui/AppText"
import { SearchField } from "../global-search/SearchField"
import { createDmhGuideStyles } from "./dmh-guide.styles"

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
 * The catalogue view of the guide sheet (32-UI-SPEC S2.1 and S2.2, D-04): the lead that defines the
 * word, a search field, then either the fifteen groups under the seven official form headers (empty
 * query) or one flat list of the matching groups with their form as a caption, or the empty card.
 * The search is local, accent- and case-insensitive and not debounced (fifteen items); the result
 * count is announced politely on each change. The field is never focused on its own. The shell
 * (`DmhGuideScreen`) owns the query, so it survives a visit to a group page.
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

  const renderRow = (code: DmhGroupCode, caption: boolean, last: boolean) => {
    const label = selectionLabel("F", code) ?? code
    return (
      <View key={code}>
        <AppPressable
          testID={`dmh-catalogue-row-${code}`}
          style={styles.row}
          onPress={() => onOpenGroup(code)}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={t.sheet.rowHint}
        >
          <View style={styles.rowCopy}>
            <Text style={styles.rowLabel} numberOfLines={3}>
              {label}
            </Text>
            {caption ? <Text style={styles.meta}>{t.forms[formOf(code)]}</Text> : null}
          </View>
          <Ionicons name="chevron-forward-outline" size={16} color={theme.colors.textSecondary} />
        </AppPressable>
        {last ? null : <View style={styles.rowDivider} />}
      </View>
    )
  }

  const card = (codes: readonly DmhGroupCode[], caption: boolean) => (
    <AppCard variant="glass" padding={0} style={styles.rowsCard}>
      {codes.map((code, index) => renderRow(code, caption, index === codes.length - 1))}
    </AppCard>
  )

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
        DMH_FORM_IDS.map((form) => (
          <View key={form} style={styles.formSection}>
            <AppSectionHeader
              title={t.forms[form]}
              titleAccessibilityRole="header"
              titleStyle={styles.formHeader}
            />
            {card(groupsOf(form), false)}
          </View>
        ))
      ) : results.length > 0 ? (
        card(results, true)
      ) : (
        <AppCard variant="glass" style={styles.block}>
          <View testID="dmh-search-empty" style={styles.block}>
            <Text style={styles.blockTitle}>{t.search.emptyTitle}</Text>
            <Text style={styles.bodyText}>{t.search.emptyBody}</Text>
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
        </AppCard>
      )}

      <View style={styles.catalogueFoot}>
        <AppPressable
          testID="dmh-sources-link"
          style={styles.link}
          onPress={onOpenSources}
          accessibilityRole="button"
          accessibilityLabel={t.sheet.sourcesLink}
        >
          <Text style={styles.linkText}>{t.sheet.sourcesLink}</Text>
        </AppPressable>
      </View>
    </View>
  )
}
