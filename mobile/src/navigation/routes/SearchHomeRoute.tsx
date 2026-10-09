import { memo, useEffect, useRef, useState } from "react"
import { Keyboard, ScrollView, TextInput } from "react-native"
import { useNavigation } from "@react-navigation/native"
import type { SearchParcelItem, SearchPlaceItem } from "@cortege/ibp-domain"
import type { SearchGroupKey } from "../../app/global-search"
import { useGlobalSearch } from "../../hooks/useGlobalSearch"
import { useSearchRecents } from "../../hooks/useSearchRecents"
import { GlobalSearchScreen } from "../../screens/global-search/GlobalSearchScreen"
import { parcelFocus, placeFocus } from "../../screens/public-map/focus-region"
import { useAccessToken, useSession } from "../../state/session-context"
import { useSurveys } from "../../state/surveys-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import { feedback } from "../../ui/feedback"
import { ScreenFrame } from "../../ui/ScreenFrame"

/**
 * The home page of the search tab (25-11, D-01, D-02, D-02b): the field, the start page with the
 * recent searches, and the four result groups. The query lives in this route's own state, never in
 * a shared context, so a keystroke re-renders this page only (T-25-31). Every result opens its own
 * target (a survey, a member's list, Explorer centred on a place or a parcel); each open, each
 * "Voir les N" and each tapped recent first keeps the query as a recent search and plays the
 * selection haptic.
 *
 * Mounted in the `searchHome` screen by the cutover plan (25-14), next to the full-list page.
 */
export const SearchHomeRoute = memo(function SearchHomeRoute() {
  const navigation = useNavigation()
  const { state: session } = useSession()
  const accessToken = useAccessToken()
  const { state, actions } = useSurveys()
  const [query, setQuery] = useState("")
  // True only right after a tapped recent: that text is searched at once, without the typing pause.
  const [immediate, setImmediate] = useState(false)
  const fieldRef = useRef<TextInput>(null)
  const scrollRef = useRef<ScrollView>(null)

  const search = useGlobalSearch({
    query,
    surveys: state.surveys,
    apiUrl: session.apiUrl,
    accessToken,
    immediate,
  })
  const recents = useSearchRecents()

  /** Keeps the query as a recent search once it leads somewhere (U-14). */
  const remember = useLatestCallback(() => {
    if (search.active) void recents.save(query.trim())
  })
  const choose = useLatestCallback(() => {
    feedback.selection()
    remember()
  })

  const onChangeText = useLatestCallback((value: string) => {
    setImmediate(false)
    setQuery(value)
  })
  const onSubmit = useLatestCallback(() => {
    remember()
    Keyboard.dismiss()
  })
  const onClear = useLatestCallback(() => {
    setImmediate(false)
    setQuery("")
  })
  const onOpenRecent = useLatestCallback((text: string) => {
    feedback.selection()
    setImmediate(true)
    setQuery(text)
    Keyboard.dismiss()
    void recents.save(text)
  })

  const onRemoveRecent = useLatestCallback((text: string) => void recents.remove(text))
  const onClearRecents = useLatestCallback(() => void recents.clear())

  const onOpenOwn = useLatestCallback((surveyId: string) => {
    choose()
    actions.openSurvey(surveyId)
    navigation.navigate("surveys", { screen: "surveyDetail", initial: false })
  })
  const onOpenCommunity = useLatestCallback((surveyId: string) => {
    choose()
    navigation.navigate("surveys", {
      screen: "communitySurvey",
      params: { surveyId },
      initial: false,
    })
  })
  const onOpenMember = useLatestCallback((name: string) => {
    choose()
    navigation.navigate("search", {
      screen: "searchGroup",
      params: { group: "community", query: name, memberName: name },
    })
  })
  const onOpenPlace = useLatestCallback((item: SearchPlaceItem) => {
    choose()
    navigation.navigate("publicMap", {
      screen: "publicMapHome",
      params: { focus: placeFocus(item, Date.now()) },
    })
  })
  const onOpenParcel = useLatestCallback((item: SearchParcelItem) => {
    choose()
    navigation.navigate("publicMap", {
      screen: "publicMapHome",
      params: { focus: parcelFocus(item, Date.now()) },
    })
  })
  const onSeeAll = useLatestCallback((group: SearchGroupKey) => {
    choose()
    navigation.navigate("search", {
      screen: "searchGroup",
      params: { group, query: query.trim() },
    })
  })

  // The tab becomes visible: an empty page takes focus, the recents are read again. Pressing the
  // active tab again goes back to the top and into the field.
  const onFocus = useLatestCallback(() => {
    if (query.length === 0) fieldRef.current?.focus()
    void recents.reload()
  })
  const onTabPress = useLatestCallback(() => {
    if (!navigation.isFocused()) return
    scrollRef.current?.scrollTo({ y: 0, animated: true })
    fieldRef.current?.focus()
  })
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener("focus", onFocus)
    const unsubscribeTabPress = navigation
      .getParent()
      ?.addListener("tabPress" as never, onTabPress as never)
    return () => {
      unsubscribeFocus()
      unsubscribeTabPress?.()
    }
  }, [navigation, onFocus, onTabPress])

  return (
    <ScreenFrame>
      <GlobalSearchScreen
        query={query}
        onChangeText={onChangeText}
        onSubmit={onSubmit}
        onClear={onClear}
        busy={search.busy}
        active={search.active}
        recents={recents.recents}
        onOpenRecent={onOpenRecent}
        onRemoveRecent={onRemoveRecent}
        onClearRecents={onClearRecents}
        results={{
          normalized: search.normalized,
          offline: search.offline,
          mine: search.mine,
          community: search.community,
          places: search.places,
          parcels: search.parcels,
          parcelsShown: search.parcelsShown,
          best: search.best,
          order: search.order,
          surveyDetails: state.surveyDetails,
          onOpenOwn,
          onOpenCommunity,
          onOpenMember,
          onOpenPlace,
          onOpenParcel,
          onSeeAll,
        }}
        settled={search.settled}
        resultCount={search.resultCount}
        fieldRef={fieldRef}
        scrollRef={scrollRef}
      />
    </ScreenFrame>
  )
})
