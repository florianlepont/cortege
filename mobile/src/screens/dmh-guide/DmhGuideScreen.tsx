import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AccessibilityInfo,
  BackHandler,
  findNodeHandle,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  View,
} from "react-native"
import Animated, { Keyframe, ReduceMotion } from "react-native-reanimated"
import type { DmhGroupCode, IbpMethodVersion } from "@cortege/ibp-domain"
import { brandMotion } from "../../app/brand-tokens"
import { selectionLabel } from "../../app/factor-selections"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { SheetNavBar } from "../../ui/SheetNavBar"
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

/** A view change slides in 24 pt from the trailing edge going forward, from the leading edge back. */
type Direction = "none" | "forward" | "back"

const PUSH_TRAVEL = 24

function pushIn(from: number) {
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateX: from }] },
    100: { opacity: 1, transform: [{ translateX: 0 }] },
  })
    .duration(brandMotion.durations.base)
    .reduceMotion(ReduceMotion.System)
}

const PUSH_FORWARD = pushIn(PUSH_TRAVEL)
const PUSH_BACK = pushIn(-PUSH_TRAVEL)

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
 * pitfall 9). The bar (`SheetNavBar`, redesign B-C1 option B) is the first item of the one scroll
 * view (the help sheet finding: a header outside it was drawn under scrolled text in the iOS form
 * sheet) and a sticky one (`stickyHeaderIndices={[0]}` with an opaque canvas background), so the
 * close button stays at the top while the content scrolls (owner review): the centred title on the
 * catalogue, the back control elsewhere, the close button always, a bottom hairline once the content
 * has scrolled. A view change pushes: the new view slides in 24 pt from the trailing edge (from the
 * leading edge going back) while it fades in; instant under Reduce Motion. It also scrolls back to
 * the top, moves the screen reader focus to the new title and announces it once. The query typed in
 * the catalogue is kept in this state while a group page is open. The in-sheet back goes to the
 * catalogue, or from the sources page to the view it was opened from; the Android hardware back
 * follows it only where the sheet itself did the navigating, otherwise the sheet closes (a group
 * page opened directly, the catalogue).
 */
export function DmhGuideScreen({ initialGroup, methodVersion, onClose }: DmhGuideScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createDmhGuideStyles(theme), [theme])
  const [view, setView] = useState<GuideView>(
    initialGroup ? { kind: "group", code: initialGroup, direct: true } : { kind: "catalogue" },
  )
  const [query, setQuery] = useState("")
  const [direction, setDirection] = useState<Direction>("none")
  const [scrolled, setScrolled] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const titleRef = useRef<View>(null)

  const openGroup = useCallback((code: DmhGroupCode) => {
    setDirection("forward")
    setView({ kind: "group", code, direct: false })
  }, [])
  const openSources = useCallback(() => {
    setDirection("forward")
    setView((current) =>
      current.kind === "sources" ? current : { kind: "sources", previous: current },
    )
  }, [])
  const goBack = useCallback(() => {
    setDirection("back")
    setView((current) => (current.kind === "sources" ? current.previous : { kind: "catalogue" }))
  }, [])
  // The bar's hairline shows only while the content is scrolled (a bounce above the top is not).
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrolled(event.nativeEvent.contentOffset.y > 0)
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
      stickyHeaderIndices={[0]}
      onScroll={onScroll}
      scrollEventThrottle={16}
      testID="dmh-guide-screen"
    >
      <SheetNavBar
        testID="dmh-guide-header"
        title={t.sheet.title}
        titleRef={titleRef}
        back={
          view.kind === "catalogue"
            ? undefined
            : {
                label: t.sheet.back,
                accessibilityLabel: t.sheet.backA11y,
                onPress: goBack,
                testID: "dmh-back",
              }
        }
        closeLabel={t.sheet.close}
        onClose={onClose}
        closeTestID="dmh-close"
        scrolled={scrolled}
      />

      <Animated.View
        key={key}
        style={styles.body}
        entering={
          direction === "none" ? undefined : direction === "forward" ? PUSH_FORWARD : PUSH_BACK
        }
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
