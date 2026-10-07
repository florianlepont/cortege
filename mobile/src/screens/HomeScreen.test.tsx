/**
 * Tests for HomeScreen (BUG-08, UX audit Phase 2 + Phase 7 dashboard).
 */
import React from "react"
import renderer, { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer"
import { Image as ExpoImage } from "expo-image"
import { HomeScreen, pickAlertSurvey, pickResumeDraft } from "./HomeScreen"
import { ResumeCard } from "./home/ResumeCard"
import { defaultTheme } from "../app/theme"
import { fr } from "../i18n"
import type { LocalSurvey } from "../storage/types"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? "")
    if (message.includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

jest.mock("@react-navigation/elements", () => ({ useHeaderHeight: () => 44 }))
jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    RefreshControl: mockComponent("RefreshControl"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
    Platform: { OS: "ios", select: <T,>(options: { ios?: T; default?: T }) => options.ios },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
  }
})
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../ui/AppButton", () => ({ AppButton: "AppButton" }))
jest.mock("../ui/AppNotice", () => ({ AppNotice: "AppNotice" }))
jest.mock("../ui/ForestCard", () => ({ ForestCard: "ForestCard" }))
jest.mock("../ui/ScreenBackdrop", () => ({ ScreenBackdrop: "ScreenBackdrop" }))
jest.mock("../ui/AppSectionHeader", () => ({ AppSectionHeader: "AppSectionHeader" }))
jest.mock("../ui/SyncStatusLine", () => ({ SyncStatusLine: "SyncStatusLine" }))
jest.mock("../ui/Skeleton", () => ({ Skeleton: "Skeleton" }))
jest.mock("./home/NearbyMapCard", () => ({ NearbyMapCard: "NearbyMapCard" }))
jest.mock("./home/ToolsSection", () => ({ ToolsSection: "ToolsSection" }))

let tree: ReactTestRenderer

function makeSurvey(overrides: Partial<LocalSurvey> = {}): LocalSurvey {
  return {
    id: "survey-1",
    site_name: "Parcelle A",
    status: "draft",
    visibility: "private",
    sync_version: 1,
    sync_state: "synced",
    last_sync_error: null,
    last_sync_error_code: null,
    last_sync_error_at: null,
    sync_blocked: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: new Date().toISOString(),
    completion_rate: 40,
    ...overrides,
  }
}

function makeProps(overrides: Partial<React.ComponentProps<typeof HomeScreen>> = {}) {
  return {
    currentUser: null,
    accessToken: "token-abc",
    apiUrl: "http://localhost:3000",
    surveys: [],
    surveyStats: { total: 0, draft: 0, submitted: 0, pending: 0, synced: 0, failed: 0, blocked: 0 },
    isOnline: true,
    isSyncing: false,
    nearbyParcels: {
      position: null,
      parcels: [],
      sectorAvgScore: null,
      loading: false,
      locationDenied: false,
      error: false,
    },
    onLoadNearbyParcels: jest.fn(),
    onCreateSurvey: jest.fn(),
    onCreateSurveyWithGenus: jest.fn(),
    onAddGenusToSurvey: jest.fn(async () => true),
    onOpenSurvey: jest.fn(),
    onRetrySurvey: jest.fn(async () => undefined),
    onOpenSyncStatus: jest.fn(),
    onNavigateToExplorer: jest.fn(),
    onNavigateToAccount: jest.fn(),
    onRefresh: jest.fn(async () => undefined),
    ...overrides,
  }
}

function mount(props: React.ComponentProps<typeof HomeScreen>) {
  act(() => {
    tree = renderer.create(<HomeScreen {...props} />)
  })
}

afterEach(() => {
  act(() => tree.unmount())
})

describe("HomeScreen", () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  test("the nearby parcels load once the access token is there, not before (OA-113)", () => {
    const props = makeProps({ accessToken: null })
    mount(props)
    expect(props.onLoadNearbyParcels).not.toHaveBeenCalled()
    act(() => tree.update(<HomeScreen {...props} accessToken="token" />))
    expect(props.onLoadNearbyParcels).toHaveBeenCalledTimes(1)
  })

  test("the Outils section gets the surveys and the two ways to use a genus (OA-107)", () => {
    const surveys = [makeSurvey()]
    const props = makeProps({ surveys })
    mount(props)
    const tools = tree.root.find((node) => (node.type as unknown) === "ToolsSection")
    expect(tools.props.surveys).toBe(surveys)
    expect(tools.props.onAddGenusToSurvey).toBe(props.onAddGenusToSurvey)
    expect(tools.props.onStartSurveyWithGenus).toBe(props.onCreateSurveyWithGenus)
  })

  test("refreshing reflects the in-flight state of onRefresh, not a hardcoded false", async () => {
    let resolveRefresh: () => void = () => undefined
    const onRefresh = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve
        }),
    )
    mount(makeProps({ onRefresh }))

    // ScrollView is mocked to a bare host component: refreshControl is a prop (a React element
    // built from RefreshControl), not a mounted child, so its own props are read off that element.
    const scroll = tree.root.find(
      (node) => (node.type as unknown) === "ScrollView",
    ) as ReactTestInstance
    const control = () => scroll.props.refreshControl as ReactTestInstance
    expect(control().props.refreshing).toBe(false)

    act(() => {
      control().props.onRefresh()
    })
    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect(control().props.refreshing).toBe(true)

    await act(async () => {
      resolveRefresh()
      await Promise.resolve()
    })
    // OA-89: an instant answer does not close the banner before the minimum display time.
    expect(control().props.refreshing).toBe(true)

    await act(async () => {
      jest.advanceTimersByTime(800)
      await Promise.resolve()
    })
    expect(control().props.refreshing).toBe(false)
  })

  test("passes the sync pill its connectivity, activity and pending count (SYNC-02)", () => {
    const onOpenSyncStatus = jest.fn()
    mount(
      makeProps({
        isOnline: false,
        isSyncing: true,
        surveyStats: {
          total: 1,
          draft: 1,
          submitted: 0,
          pending: 3,
          synced: 0,
          failed: 0,
          blocked: 0,
        },
        onOpenSyncStatus,
      }),
    )
    const pill = tree.root.findByType("SyncStatusLine" as never)
    expect(pill.props.isOnline).toBe(false)
    expect(pill.props.isSyncing).toBe(true)
    expect(pill.props.pendingCount).toBe(3)

    act(() => {
      pill.props.onPress()
    })
    expect(onOpenSyncStatus).toHaveBeenCalledTimes(1)
  })

  describe("variant I look (12.2)", () => {
    const entering = () =>
      tree.root
        .findAll((node) => (node.type as unknown) === "View" && node.props.entering !== undefined)
        .map((node) => node)

    test("renders the backdrop once, before the scroll view, which has no opaque background", () => {
      mount(makeProps())
      expect(tree.root.findAllByType("ScreenBackdrop" as never)).toHaveLength(1)
      const order = tree.root
        .findAll((node) => ["ScreenBackdrop", "ScrollView"].includes(node.type as string))
        .map((node) => node.type)
      expect(order).toEqual(["ScreenBackdrop", "ScrollView"])
      const scroll = tree.root.findByType("ScrollView" as never)
      expect((scroll.props.style as { backgroundColor?: string }).backgroundColor).toBeUndefined()
    })

    test("the resume card, tools and nearby sections enter on first mount", () => {
      mount(makeProps())
      expect(entering()).toHaveLength(3)
    })

    test("the alert notice is a fourth entering section", () => {
      mount(
        makeProps({
          surveys: [makeSurvey({ sync_state: "failed", sync_blocked: 0 })],
          surveyStats: {
            total: 1,
            draft: 0,
            submitted: 0,
            pending: 0,
            synced: 0,
            failed: 1,
            blocked: 0,
          },
        }),
      )
      expect(entering()).toHaveLength(4)
    })

    test("the nearby trailing link uses the accent text colour of the scheme", () => {
      mount(makeProps())
      const header = tree.root.findByType("AppSectionHeader" as never)
      type Props<T> = React.ReactElement<T>
      const trailing = header.props.trailing as Props<{ children: Props<{ style: unknown }> }>
      const link = trailing.props.children
      const style = Object.assign({}, ...[link.props.style].flat()) as { color?: string }
      expect(style.color).toBe(defaultTheme.visual.accentText)
    })

    test("renders the resume card with the draft and its two actions", () => {
      const draft = makeSurvey()
      const props = makeProps({ surveys: [draft] })
      mount(props)
      const card = tree.root.findByType(ResumeCard)
      expect(card.props.resumeDraft).toBe(draft)
      expect(card.props.onResume).toBe(props.onOpenSurvey)
      expect(card.props.onCreateSurvey).toBe(props.onCreateSurvey)
    })
  })

  describe("HOME-02: the hero becomes a resume action", () => {
    test("no draft: the default 'new survey' hero shows, no progress card", () => {
      mount(makeProps({ surveys: [] }))
      const texts = tree.root
        .findAll((node) => (node.type as unknown) === "Text")
        .map((node) => String([node.props.children].flat().join("")))
      expect(texts).toContain(fr.home.hero.title)
    })

    test("a draft updated within 48h becomes the resume hero, and no separate progress card (OA-17)", () => {
      const draft = makeSurvey({ updated_at: new Date().toISOString() })
      mount(makeProps({ surveys: [draft] }))
      const texts = tree.root
        .findAll((node) => (node.type as unknown) === "Text")
        .map((node) => String([node.props.children].flat().join("")))
      expect(texts).toContain(fr.home.hero.resumeTitle({ name: "Parcelle A" }))

      const buttonLabels = tree.root
        .findAllByType("AppButton" as never)
        .map((node) => node.props.label)
      expect(buttonLabels).toContain(fr.home.hero.resumeButton)
      // "Nouveau relevé" is a plain link under the primary button.
      const newSurveyLink = tree.root.findAll(
        (node) =>
          (node.type as unknown) === "Pressable" &&
          node.props.accessibilityLabel === fr.home.hero.newSurveyButton,
      )
      expect(newSurveyLink).toHaveLength(1)

      expect(tree.root.findAllByType("SurveyProgressCard" as never)).toHaveLength(0)

      const onOpenSurvey = jest.fn()
      act(() => tree.unmount())
      mount(makeProps({ surveys: [draft], onOpenSurvey }))
      const resumeButton = tree.root
        .findAllByType("AppButton" as never)
        .find((node) => node.props.label === fr.home.hero.resumeButton)
      act(() => {
        resumeButton?.props.onPress()
      })
      expect(onOpenSurvey).toHaveBeenCalledWith("survey-1")
    })

    test("the resume hero draws one progress segment per filled factor, and the link starts a new survey", () => {
      const onCreateSurvey = jest.fn()
      mount(
        makeProps({
          surveys: [makeSurvey({ completion_rate: 40, updated_at: new Date().toISOString() })],
          onCreateSurvey,
        }),
      )
      const done = tree.root.findAll(
        (node) => (node.type as unknown) === "View" && node.props.testID === "hero-progress-done",
      )
      const todo = tree.root.findAll(
        (node) => (node.type as unknown) === "View" && node.props.testID === "hero-progress-todo",
      )
      expect(done).toHaveLength(4)
      expect(todo).toHaveLength(6)

      const link = tree.root.findAll(
        (node) =>
          (node.type as unknown) === "Pressable" &&
          node.props.accessibilityLabel === fr.home.hero.newSurveyButton,
      )[0]
      act(() => {
        link.props.onPress()
      })
      expect(onCreateSurvey).toHaveBeenCalledTimes(1)
    })

    test("an unnamed draft reads 'Reprendre votre relevé' (OA-17)", () => {
      mount(
        makeProps({
          surveys: [makeSurvey({ site_name: "", updated_at: new Date().toISOString() })],
        }),
      )
      const texts = tree.root
        .findAll((node) => (node.type as unknown) === "Text")
        .map((node) => String([node.props.children].flat().join("")))
      expect(texts).toContain(fr.home.hero.resumeTitleUnnamed)
    })

    test("a draft older than 48h does not trigger the resume hero", () => {
      const staleDraft = makeSurvey({
        updated_at: new Date(Date.now() - 49 * 3600000).toISOString(),
      })
      mount(makeProps({ surveys: [staleDraft] }))
      const texts = tree.root
        .findAll((node) => (node.type as unknown) === "Text")
        .map((node) => String([node.props.children].flat().join("")))
      expect(texts).toContain(fr.home.hero.title)
    })

    test("a submitted survey is never picked as the resume draft", () => {
      const submitted = makeSurvey({ status: "submitted" })
      expect(pickResumeDraft([submitted])).toBeNull()
    })
  })

  describe("SYNC-03: actionable alerts, distinct conflict vs error copy", () => {
    test("a blocked survey shows the conflict message with a 'Voir' action", () => {
      const blocked = makeSurvey({ id: "blocked-1", sync_state: "failed", sync_blocked: 1 })
      const onOpenSurvey = jest.fn()
      mount(
        makeProps({
          surveys: [blocked],
          surveyStats: {
            total: 1,
            draft: 0,
            submitted: 0,
            pending: 0,
            synced: 0,
            failed: 1,
            blocked: 1,
          },
          onOpenSurvey,
        }),
      )
      const notice = tree.root.findAllByType("AppNotice" as never)[0]
      expect(notice.props.message).toBe(fr.home.alerts.blockedMessage)
      expect(notice.props.action.label).toBe(fr.home.alerts.actionView)

      act(() => notice.props.action.onPress())
      expect(onOpenSurvey).toHaveBeenCalledWith("blocked-1")
    })

    test("a failed (not blocked) survey shows the connection message with a 'Réessayer' action", () => {
      const failed = makeSurvey({ id: "failed-1", sync_state: "failed", sync_blocked: 0 })
      const onRetrySurvey = jest.fn(async () => undefined)
      mount(
        makeProps({
          surveys: [failed],
          surveyStats: {
            total: 1,
            draft: 0,
            submitted: 0,
            pending: 0,
            synced: 0,
            failed: 1,
            blocked: 0,
          },
          onRetrySurvey,
        }),
      )
      const notice = tree.root.findAllByType("AppNotice" as never)[0]
      expect(notice.props.message).toBe(fr.home.alerts.failedMessage)
      expect(notice.props.action.label).toBe(fr.home.alerts.actionRetry)

      act(() => notice.props.action.onPress())
      expect(onRetrySurvey).toHaveBeenCalledWith("failed-1")
    })

    test("no alerts: no AppNotice carries a sync action", () => {
      mount(makeProps({ surveys: [] }))
      const actionable = tree.root
        .findAllByType("AppNotice" as never)
        .filter((node) => node.props.action)
      expect(actionable).toHaveLength(0)
    })

    // LIST-07: a specific last_sync_error_code shows the same code-specific message SurveyRow and
    // DetailActions already show, instead of Home's own generic "check your connection" text — the
    // same survey no longer shows two different error messages depending on which screen renders it.
    test("a failed survey with a specific error code shows that code's message, not the generic one", () => {
      const failed = makeSurvey({
        id: "failed-1",
        sync_state: "failed",
        sync_blocked: 0,
        last_sync_error: "409 Conflict",
        last_sync_error_code: "sync_version_conflict",
      })
      mount(
        makeProps({
          surveys: [failed],
          surveyStats: {
            total: 1,
            draft: 0,
            submitted: 0,
            pending: 0,
            synced: 0,
            failed: 1,
            blocked: 0,
          },
        }),
      )
      const notice = tree.root.findAllByType("AppNotice" as never)[0]
      expect(notice.props.message).toBe(fr.syncErrors.byCode.sync_version_conflict)
      expect(notice.props.message).not.toBe(fr.home.alerts.failedMessage)
    })
  })

  describe("avatar (HOME-06)", () => {
    test("shows the placeholder icon when there is no profile photo", () => {
      mount(makeProps())
      expect(tree.root.findAllByType(ExpoImage)).toHaveLength(0)
      const button = tree.root.findByProps({ accessibilityLabel: fr.home.avatar })
      expect(button.props.accessibilityRole).toBe("button")
    })

    test("shows the profile photo via expo-image, signed with the access token, once one exists", () => {
      mount(
        makeProps({
          currentUser: {
            id: "u1",
            email: "a@example.fr",
            display_name: "A B",
            role: "member",
            first_name: "A",
            last_name: "B",
            profile_picture_url: "/uploads/avatar.jpg",
          },
          accessToken: "token-xyz",
          apiUrl: "http://localhost:3000",
        }),
      )
      const image = tree.root.findByType(ExpoImage)
      expect(image.props.source).toEqual({
        uri: "http://localhost:3000/uploads/avatar.jpg",
        headers: { Authorization: "Bearer token-xyz" },
      })
    })

    test("tapping the avatar navigates to Compte", () => {
      const onNavigateToAccount = jest.fn()
      mount(makeProps({ onNavigateToAccount }))
      const button = tree.root.findByProps({ accessibilityLabel: fr.home.avatar })
      act(() => button.props.onPress())
      expect(onNavigateToAccount).toHaveBeenCalledTimes(1)
    })
  })
})

describe("pickAlertSurvey", () => {
  describe("Autour de vous (mini-map)", () => {
    const position = { lat: 45.1, lng: 5.7 }

    test("loading, or no position yet, shows a placeholder the size of the map", () => {
      mount(makeProps({ nearbyParcels: { ...makeProps().nearbyParcels, loading: true } }))
      expect(tree.root.findAllByType("Skeleton" as never)).toHaveLength(1)
      expect(tree.root.findAllByType("NearbyMapCard" as never)).toHaveLength(0)
      act(() => tree.unmount())
      mount(makeProps())
      expect(tree.root.findAllByType("Skeleton" as never)).toHaveLength(1)
    })

    test("a known position shows the map card, and tapping it opens the Explorer", () => {
      const onNavigateToExplorer = jest.fn()
      mount(
        makeProps({
          nearbyParcels: { ...makeProps().nearbyParcels, position },
          onNavigateToExplorer,
        }),
      )
      const card = tree.root.findByType("NearbyMapCard" as never)
      expect(card.props.nearby.position).toEqual(position)
      expect(card.props.height).toBeGreaterThanOrEqual(240)
      act(() => {
        card.props.onPress()
      })
      expect(onNavigateToExplorer).toHaveBeenCalledTimes(1)
    })

    test("a denied location or a load error shows a notice instead of the map", () => {
      mount(makeProps({ nearbyParcels: { ...makeProps().nearbyParcels, locationDenied: true } }))
      expect(tree.root.findAllByType("NearbyMapCard" as never)).toHaveLength(0)
      expect(tree.root.findAllByType("AppNotice" as never)).toHaveLength(1)
      act(() => tree.unmount())
      mount(makeProps({ nearbyParcels: { ...makeProps().nearbyParcels, error: true } }))
      expect(tree.root.findAllByType("NearbyMapCard" as never)).toHaveLength(0)
      expect(tree.root.findAllByType("AppNotice" as never)).toHaveLength(1)
    })
  })

  test("a blocked survey outranks a plain sync error", () => {
    const error = makeSurvey({ id: "err", sync_state: "failed", sync_blocked: 0 })
    const blocked = makeSurvey({ id: "blocked", sync_state: "failed", sync_blocked: 1 })
    expect(pickAlertSurvey([error, blocked])?.id).toBe("blocked")
  })

  test("no problem surveys returns null", () => {
    expect(pickAlertSurvey([makeSurvey()])).toBeNull()
  })
})
