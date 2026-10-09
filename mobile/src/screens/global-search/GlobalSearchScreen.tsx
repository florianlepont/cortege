import { Ref, useEffect, useRef } from "react"
import { AccessibilityInfo, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { brandSpacing4 } from "../../app/brand-tokens"
import {
  TAB_BAR_FALLBACK_HEIGHT,
  useAppBottomTabBarHeight,
} from "../../app/useAppBottomTabBarHeight"
import { fr } from "../../i18n"
import { SearchField } from "./SearchField"
import { SearchResults } from "./SearchResults"
import type { SearchResultsProps } from "./SearchResults"
import { SearchStartPage } from "./SearchStartPage"

const t = fr.search

/**
 * How long the result total must stay unchanged before it is announced, so typing does not flood a
 * screen reader (UI-SPEC, Accessibility Contract).
 */
export const ANNOUNCE_DELAY_MS = 500

type GlobalSearchScreenProps = {
  /** The text of the field. */
  query: string
  onChangeText: (value: string) => void
  onSubmit: () => void
  onClear: () => void
  /** A network group waits or loads: the field spinner shows. */
  busy: boolean
  /** The query is long enough to search: results replace the start page. */
  active: boolean
  recents: readonly string[]
  onOpenRecent: (query: string) => void
  onRemoveRecent: (query: string) => void
  onClearRecents: () => void
  results: SearchResultsProps
  /** No network group is waiting or loading any more. */
  settled: boolean
  /** Every result found, for the announcement. */
  resultCount: number
  fieldRef: Ref<TextInput>
  scrollRef: Ref<ScrollView>
}

/**
 * The search page (25-11, ROADMAP criteria 1 to 4, UI-SPEC): the glass field on top, then the start
 * page (recent searches or the intro) while the query is under two characters, otherwise the results
 * area. Once per settled query, the total is announced to a screen reader ("N résultats" or "Aucun
 * résultat"). Presentational: the route owns the query, the hooks and the navigation.
 */
export function GlobalSearchScreen({
  query,
  onChangeText,
  onSubmit,
  onClear,
  busy,
  active,
  recents,
  onOpenRecent,
  onRemoveRecent,
  onClearRecents,
  results,
  settled,
  resultCount,
  fieldRef,
  scrollRef,
}: GlobalSearchScreenProps) {
  const insets = useSafeAreaInsets()
  const tabBarHeight = useAppBottomTabBarHeight(TAB_BAR_FALLBACK_HEIGHT)
  const normalized = results.normalized

  // The query whose total was already announced: the same query is never announced twice.
  const announced = useRef<string | null>(null)
  useEffect(() => {
    if (!active) {
      announced.current = null
      return undefined
    }
    if (!settled || announced.current === normalized) return undefined
    const timer = setTimeout(() => {
      announced.current = normalized
      AccessibilityInfo.announceForAccessibility(
        resultCount > 0 ? t.announce.results({ count: resultCount }) : t.announce.none,
      )
    }, ANNOUNCE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [active, settled, normalized, resultCount])

  return (
    <View style={styles.container}>
      <View style={[styles.top, { paddingTop: insets.top + brandSpacing4.smd }]}>
        <SearchField
          value={query}
          onChangeText={onChangeText}
          onSubmit={onSubmit}
          onClear={onClear}
          busy={busy}
          inputRef={fieldRef}
        />
      </View>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: tabBarHeight + brandSpacing4.lg }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        testID="search-scroll"
      >
        {active ? (
          <SearchResults {...results} />
        ) : (
          <View style={styles.start}>
            <SearchStartPage
              recents={recents}
              onOpenRecent={onOpenRecent}
              onRemoveRecent={onRemoveRecent}
              onClearRecents={onClearRecents}
            />
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  // The route's ScreenFrame is the page (canvas and halo): no background here.
  container: {
    flex: 1,
  },
  top: {
    paddingHorizontal: brandSpacing4.md,
    paddingBottom: brandSpacing4.smd,
  },
  scroll: {
    flex: 1,
  },
  start: {
    paddingHorizontal: brandSpacing4.md,
  },
})
