/**
 * Tests for HomeScreen (BUG-08, UX audit Phase 2 + Phase 7 dashboard).
 */
import React from "react"
import renderer, { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer"
import { Image as ExpoImage } from "expo-image"
import { HomeScreen, pickAlertSurvey, pickResumeDraft } from "./HomeScreen"
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
  }
})
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../ui/AppButton", () => ({ AppButton: "AppButton" }))
jest.mock("../ui/AppNotice", () => ({ AppNotice: "AppNotice" }))
jest.mock("../ui/AppSectionHeader", () => ({ AppSectionHeader: "AppSectionHeader" }))
jest.mock("../ui/SyncStatusPill", () => ({ SyncStatusPill: "SyncStatusPill" }))
jest.mock("../components/cards/ParcelNearbyCard", () => ({ ParcelNearbyCard: "ParcelNearbyCard" }))
jest.mock("./home/SectorScoreCard", () => ({ SectorScoreCard: "SectorScoreCard" }))
jest.mock("../hooks/useNearbyParcels", () => ({ hasMixedMethodVersions: () => false }))

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
      parcels: [],
      sectorAvgScore: null,
      loading: false,
      locationDenied: false,
      error: false,
    },
    onLoadNearbyParcels: jest.fn(),
    onCreateSurvey: jest.fn(),
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
    const pill = tree.root.findByType("SyncStatusPill" as never)
    expect(pill.props.isOnline).toBe(false)
    expect(pill.props.isSyncing).toBe(true)
    expect(pill.props.pendingCount).toBe(3)

    act(() => {
      pill.props.onPress()
    })
    expect(onOpenSyncStatus).toHaveBeenCalledTimes(1)
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
      expect(buttonLabels).toContain(fr.home.hero.newSurveyButton)

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
  test("a blocked survey outranks a plain sync error", () => {
    const error = makeSurvey({ id: "err", sync_state: "failed", sync_blocked: 0 })
    const blocked = makeSurvey({ id: "blocked", sync_state: "failed", sync_blocked: 1 })
    expect(pickAlertSurvey([error, blocked])?.id).toBe("blocked")
  })

  test("no problem surveys returns null", () => {
    expect(pickAlertSurvey([makeSurvey()])).toBeNull()
  })
})
