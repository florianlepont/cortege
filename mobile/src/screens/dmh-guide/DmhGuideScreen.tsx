import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AccessibilityInfo, BackHandler, findNodeHandle, ScrollView, View } from "react-native"
import Animated, { FadeIn, FadeOut, ReduceMotion } from "react-native-reanimated"
import { Ionicons } from "@expo/vector-icons"
import type { DmhGroupCode, IbpMethodVersion } from "@cortege/ibp-domain"
import { brandMotion } from "../../app/brand-tokens"
import { selectionLabel } from "../../app/factor-selections"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import { DmhCatalogue } from "./DmhCatalogue"
import { DmhGroupPage } from "./DmhGroupPage"
import { DmhSourcesPage } from "./DmhSourcesPage"
import { createDmhGuideStyles } from "./dmh-guide.styles"

const t = fr.dmhGuide

type CatalogueView = { kind: "catalogue" }
/** `direct`: the sheet opened on this group (an info glyph), so the sheet itself is the way back. */
type GroupView = { kind: "group"; code: DmhGroupCode; direct: boolean }
type SourcesView = { kind: "sources"; previous: CatalogueView | GroupView }
type GuideView = CatalogueView | GroupView | SourcesView

const CLOSE_GLYPH_SIZE = 20
const BACK_GLYPH_SIZE = 20

type DmhGuideScreenProps = {
  /** The group the sheet opens on (an info glyph of the F list), `null` for the catalogue. */
  initialGroup: DmhGroupCode | null
  /** The method of the survey (`null` = version 3.0): groups 6, 12 and 15 word their rule by it. */
  methodVersion: IbpMethodVersion | null
  onClose: () => void
}

function viewKey(view: GuideView): string {
  return view.kind === "group" ? `group:${view.code}` : view.kind
}

/**
 * The guide sheet (32-UI-SPEC S2, D-04, D-05): ONE sheet with three internal views, the catalogue,
 * a group page and the sources page, so a second sheet is never stacked on the first (research
 * pitfall 9). The header row is the first item of the one scroll view (the help sheet finding): the
 * title on the catalogue, the back control elsewhere, the close button always. A view change
 * cross-fades (instant under Reduce Motion), scrolls back to the top, moves the screen reader focus
 * to the new title and announces it once. The query typed in the catalogue is kept in this state
 * while a group page is open. The in-sheet back goes to the catalogue, or from the sources page to
 * the view it was opened from; the Android hardware back follows it only where the sheet itself did
 * the navigating, otherwise the sheet closes (a group page opened directly, the catalogue).
 */
export function DmhGuideScreen({ initialGroup, methodVersion, onClose }: DmhGuideScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createDmhGuideStyles(theme), [theme])
  const [view, setView] = useState<GuideView>(
    initialGroup ? { kind: "group", code: initialGroup, direct: true } : { kind: "catalogue" },
  )
  const [query, setQuery] = useState("")
  const scrollRef = useRef<ScrollView>(null)
  const titleRef = useRef<View>(null)

  const openGroup = useCallback((code: DmhGroupCode) => {
    setView({ kind: "group", code, direct: false })
  }, [])
  const openSources = useCallback(() => {
    setView((current) =>
      current.kind === "sources" ? current : { kind: "sources", previous: current },
    )
  }, [])
  const goBack = useCallback(() => {
    setView((current) => (current.kind === "sources" ? current.previous : { kind: "catalogue" }))
  }, [])

  // The hardware back goes one view back only where the sheet did the navigating.
  const handlesBack = view.kind === "sources" || (view.kind === "group" && !view.direct)
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!handlesBack) return false
      goBack()
      return true
    })
    return () => subscription.remove()
  }, [handlesBack, goBack])

  // A new view starts at the top, takes the screen reader focus on its title and is announced. The
  // view that opens with the sheet is the sheet's own opening: nothing to announce.
  const key = viewKey(view)
  const shownKey = useRef(key)
  useEffect(() => {
    if (shownKey.current === key) return
    shownKey.current = key
    scrollRef.current?.scrollTo({ y: 0, animated: false })
    const node = findNodeHandle(titleRef.current)
    if (node) AccessibilityInfo.setAccessibilityFocus(node)
    AccessibilityInfo.announceForAccessibility(
      view.kind === "group"
        ? t.sheet.groupAnnounce({
            label: selectionLabel("F", view.code, methodVersion) ?? view.code,
          })
        : view.kind === "sources"
          ? t.sources.title
          : t.sheet.catalogueAnnounce,
    )
  }, [key, view, methodVersion])

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.sheet}
      contentContainerStyle={styles.sheetContent}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      testID="dmh-guide-screen"
    >
      <View style={styles.headerRow}>
        {view.kind === "catalogue" ? (
          <View ref={titleRef} accessible accessibilityRole="header" style={styles.sheetTitleBox}>
            <Text style={styles.sheetTitle}>{t.sheet.title}</Text>
          </View>
        ) : (
          <AppPressable
            testID="dmh-back"
            style={styles.backButton}
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel={t.sheet.backA11y}
          >
            <Ionicons
              name="chevron-back-outline"
              size={BACK_GLYPH_SIZE}
              color={theme.visual.accentText}
            />
            <Text style={styles.backText}>{t.sheet.back}</Text>
          </AppPressable>
        )}
        <AppPressable
          testID="dmh-close"
          style={styles.closeButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t.sheet.close}
        >
          <Ionicons
            name="close-outline"
            size={CLOSE_GLYPH_SIZE}
            color={theme.semanticColors.textStrong}
          />
        </AppPressable>
      </View>

      <Animated.View
        key={key}
        entering={FadeIn.duration(brandMotion.durations.fast).reduceMotion(ReduceMotion.System)}
        exiting={FadeOut.duration(brandMotion.durations.fast).reduceMotion(ReduceMotion.System)}
      >
        {view.kind === "catalogue" ? (
          <DmhCatalogue
            query={query}
            onChangeQuery={setQuery}
            onOpenGroup={openGroup}
            onOpenSources={openSources}
          />
        ) : view.kind === "group" ? (
          <DmhGroupPage
            code={view.code}
            methodVersion={methodVersion}
            onOpenSources={openSources}
            titleRef={titleRef}
          />
        ) : (
          <DmhSourcesPage titleRef={titleRef} />
        )}
      </Animated.View>
    </ScrollView>
  )
}
