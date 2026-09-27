/**
 * Tests for useSurveySyncNetwork.
 *
 * Strategy: render the real hook with renderHook from
 * @testing-library/react-native/pure (see render-hook-smoke.test.ts). The
 * network probe stays pending by default so the connectivity-driven effects
 * never auto-sync: lastOnlineStateRef keeps its initial null, as the cases
 * below expect.
 */

const mockSyncPending = jest.fn()
const mockHasPendingSyncWork = jest.fn()
const mockPullRemoteChanges = jest.fn()
const mockGetNetworkStateAsync = jest.fn()

jest.mock("../../storage", () => ({
  syncPending: mockSyncPending,
  hasPendingSyncWork: mockHasPendingSyncWork,
  pullRemoteChanges: mockPullRemoteChanges,
}))

// auth-errors.ts imports react-native-auth0 for CredentialsManagerError; mock it
// minimally so the module resolves under the node test environment (no native code).
jest.mock("react-native-auth0", () => ({
  CredentialsManagerError: class MockCredentialsManagerError extends Error {},
  CredentialsManagerErrorCodes: {},
}))

jest.mock("react-native", () => ({}))

jest.mock("expo-network", () => ({
  getNetworkStateAsync: (...args: unknown[]) => mockGetNetworkStateAsync(...args),
  addNetworkStateListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  NetworkStateType: { WIFI: "WIFI", NONE: "NONE", CELLULAR: "CELLULAR" },
}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import { fr } from "../../i18n"
import { useSurveySyncNetwork } from "./useSurveySyncNetwork"

const text = fr.status.sync
const ownerText = fr.status.owner
import { createSyncActivity } from "./sync-activity"

async function buildHook(overrides: Record<string, unknown> = {}) {
  const params = {
    apiUrl: "http://localhost:3000",
    accessToken: "access-token",
    surveys: [],
    clearSession: jest.fn().mockResolvedValue(undefined),
    withAuthRetry: jest.fn((fn: (token: string, tokenSub: string | null) => unknown) =>
      fn("token", "auth0|owner"),
    ),
    refreshLocalSurveys: jest.fn().mockResolvedValue(undefined),
    refreshLocalAttachments: jest.fn().mockResolvedValue(undefined),
    setStatus: jest.fn(),
    syncAllowed: true,
    ensureSyncOwner: jest.fn().mockResolvedValue(true),
    ownerStatus: "ok",
    recheckOwner: jest.fn().mockResolvedValue(undefined),
    syncActivity: createSyncActivity(),
    ...overrides,
  }
  const { result } = await renderHook(() => useSurveySyncNetwork(params as never))
  return { ...result.current, ...params }
}

describe("useSurveySyncNetwork", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Pending network probe: the hook never learns it is online.
    mockGetNetworkStateAsync.mockReturnValue(new Promise(() => undefined))
  })

  afterEach(async () => {
    await cleanup()
  })

  // logStatusDetail writes raw error detail to console.debug in dev builds.
  let consoleDebug: jest.SpyInstance
  beforeEach(() => {
    consoleDebug = jest.spyOn(console, "debug").mockImplementation(() => undefined)
  })
  afterEach(() => {
    consoleDebug.mockRestore()
  })

  describe("handleSync", () => {
    test("calls syncPending and refreshes data on success", async () => {
      mockSyncPending.mockResolvedValue({
        synced: 2,
        failed: 0,
        pulled_surveys: 1,
        pulled_attachments: 0,
      })
      const { handleSync, setStatus, refreshLocalSurveys, refreshLocalAttachments } =
        await buildHook()

      await handleSync()

      expect(setStatus).toHaveBeenCalledWith(text.done({ synced: 2, failed: 0, receivedCount: 1 }))
      expect(refreshLocalSurveys).toHaveBeenCalled()
      expect(refreshLocalAttachments).toHaveBeenCalled()
    })

    test("calls clearSession on AUTH_REQUIRED error", async () => {
      const { handleSync, clearSession, setStatus } = await buildHook({
        withAuthRetry: jest.fn().mockRejectedValue(new Error("AUTH_REQUIRED")),
      })

      await handleSync()

      expect(clearSession).toHaveBeenCalled()
      expect(setStatus).toHaveBeenCalledWith(text.loginRequired())
    })

    test("AUTH_TEMPORARILY_UNAVAILABLE keeps the session and reports retry-later", async () => {
      const { handleSync, clearSession, setStatus } = await buildHook({
        withAuthRetry: jest.fn().mockRejectedValue(new Error("AUTH_TEMPORARILY_UNAVAILABLE")),
      })

      await handleSync()

      expect(clearSession).not.toHaveBeenCalled()
      expect(setStatus).toHaveBeenCalledWith(text.retryLater())
    })

    test("sets error status on generic error", async () => {
      const { handleSync, setStatus } = await buildHook({
        withAuthRetry: jest.fn().mockRejectedValue(new Error("Network timeout")),
      })

      await handleSync()

      expect(setStatus).toHaveBeenCalledWith(text.failed())
    })

    test("a generic error never reaches the status text", async () => {
      const { handleSync, setStatus } = await buildHook({
        withAuthRetry: jest.fn().mockRejectedValue(new Error("HTTP 500 survey 1f2e3d4c")),
      })

      await handleSync()

      for (const [message] of setStatus.mock.calls) {
        expect(message).not.toContain("1f2e3d4c")
        expect(message).not.toContain("HTTP 500")
      }
    })
  })

  describe("handlePullChanges", () => {
    test("pulls changes and sets status on success", async () => {
      mockPullRemoteChanges.mockResolvedValue({ surveys: 3, attachments: 1, pages: 2 })
      const { handlePullChanges, setStatus, refreshLocalSurveys, refreshLocalAttachments } =
        await buildHook()

      await handlePullChanges()

      expect(setStatus).toHaveBeenCalledWith(text.pulled({ surveyCount: 3, attachmentCount: 1 }))
      expect(refreshLocalSurveys).toHaveBeenCalled()
      expect(refreshLocalAttachments).toHaveBeenCalled()
    })

    test("calls clearSession on AUTH_REQUIRED", async () => {
      const { handlePullChanges, clearSession } = await buildHook({
        withAuthRetry: jest.fn().mockRejectedValue(new Error("AUTH_REQUIRED")),
      })

      await handlePullChanges()

      expect(clearSession).toHaveBeenCalled()
    })

    test("AUTH_TEMPORARILY_UNAVAILABLE keeps the session and reports retry-later", async () => {
      const { handlePullChanges, clearSession, setStatus } = await buildHook({
        withAuthRetry: jest.fn().mockRejectedValue(new Error("AUTH_TEMPORARILY_UNAVAILABLE")),
      })

      await handlePullChanges()

      expect(clearSession).not.toHaveBeenCalled()
      expect(setStatus).toHaveBeenCalledWith(text.retryLater())
    })

    test("sets error status on generic error", async () => {
      const { handlePullChanges, setStatus } = await buildHook({
        withAuthRetry: jest.fn().mockRejectedValue(new Error("Connection refused")),
      })

      await handlePullChanges()

      expect(setStatus).toHaveBeenCalledWith(text.pullFailed())
    })
  })

  describe("maybeAutoSync", () => {
    test("does nothing when lastOnlineState is not true", async () => {
      const { maybeAutoSync, withAuthRetry } = await buildHook()
      // lastOnlineStateRef stays null (the network probe never resolves)
      await maybeAutoSync("startup")
      expect(withAuthRetry).not.toHaveBeenCalled()
    })

    test("pulls server changes on startup when online with no pending local work", async () => {
      mockGetNetworkStateAsync.mockResolvedValue({ isConnected: true, isInternetReachable: true })
      mockHasPendingSyncWork.mockResolvedValue(false)
      mockPullRemoteChanges.mockResolvedValue({ surveys: 2, attachments: 1, pages: 1 })
      const setStatus = jest.fn()
      const refreshLocalSurveys = jest.fn().mockResolvedValue(undefined)
      const refreshLocalAttachments = jest.fn().mockResolvedValue(undefined)

      await renderHook(() =>
        useSurveySyncNetwork({
          apiUrl: "http://localhost:3000",
          accessToken: "access-token",
          surveys: [],
          clearSession: jest.fn(),
          withAuthRetry: jest.fn((fn: (token: string, tokenSub: string | null) => unknown) =>
            fn("token", "auth0|owner"),
          ),
          refreshLocalSurveys,
          refreshLocalAttachments,
          setStatus,
          syncAllowed: true,
          ensureSyncOwner: jest.fn().mockResolvedValue(true),
          ownerStatus: "ok",
          recheckOwner: jest.fn(),
          syncActivity: createSyncActivity(),
        } as never),
      )

      for (let i = 0; i < 10; i += 1) {
        await act(async () => {
          await Promise.resolve()
        })
      }

      expect(setStatus).toHaveBeenCalledWith(text.pulled({ surveyCount: 2, attachmentCount: 1 }))
      expect(refreshLocalSurveys).toHaveBeenCalled()
      expect(refreshLocalAttachments).toHaveBeenCalled()
    })
  })

  // ─── SYNC-02: the reactive booleans SyncStatusPill reads ──────────────────

  describe("isOnline", () => {
    test("defaults to true before the network probe resolves", async () => {
      const { result } = await renderHook(() =>
        useSurveySyncNetwork({
          apiUrl: "http://localhost:3000",
          accessToken: "access-token",
          surveys: [],
          clearSession: jest.fn(),
          withAuthRetry: jest.fn(),
          refreshLocalSurveys: jest.fn(),
          refreshLocalAttachments: jest.fn(),
          setStatus: jest.fn(),
          syncAllowed: true,
          ensureSyncOwner: jest.fn(),
          ownerStatus: "ok",
          recheckOwner: jest.fn(),
          syncActivity: createSyncActivity(),
        } as never),
      )
      expect(result.current.isOnline).toBe(true)
    })

    test("turns false once the network probe reports offline", async () => {
      mockGetNetworkStateAsync.mockResolvedValue({ isConnected: false, isInternetReachable: true })
      const { result } = await renderHook(() =>
        useSurveySyncNetwork({
          apiUrl: "http://localhost:3000",
          accessToken: "access-token",
          surveys: [],
          clearSession: jest.fn(),
          withAuthRetry: jest.fn(),
          refreshLocalSurveys: jest.fn(),
          refreshLocalAttachments: jest.fn(),
          setStatus: jest.fn(),
          syncAllowed: true,
          ensureSyncOwner: jest.fn(),
          ownerStatus: "ok",
          recheckOwner: jest.fn(),
          syncActivity: createSyncActivity(),
        } as never),
      )
      await act(async () => {
        await Promise.resolve()
      })
      expect(result.current.isOnline).toBe(false)
    })
  })

  describe("isSyncing", () => {
    test("is true while handleSync runs and false again once it settles", async () => {
      let resolveSyncPending!: (value: unknown) => void
      mockSyncPending.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSyncPending = resolve
          }),
      )
      const { result } = await renderHook(() =>
        useSurveySyncNetwork({
          apiUrl: "http://localhost:3000",
          accessToken: "access-token",
          surveys: [],
          clearSession: jest.fn(),
          withAuthRetry: jest.fn((fn: (token: string, tokenSub: string | null) => unknown) =>
            fn("token", "auth0|owner"),
          ),
          refreshLocalSurveys: jest.fn().mockResolvedValue(undefined),
          refreshLocalAttachments: jest.fn().mockResolvedValue(undefined),
          setStatus: jest.fn(),
          syncAllowed: true,
          ensureSyncOwner: jest.fn().mockResolvedValue(true),
          ownerStatus: "ok",
          recheckOwner: jest.fn(),
          syncActivity: createSyncActivity(),
        } as never),
      )

      expect(result.current.isSyncing).toBe(false)

      let syncPromise!: Promise<void>
      await act(async () => {
        syncPromise = result.current.handleSync()
        await Promise.resolve()
      })
      expect(result.current.isSyncing).toBe(true)

      await act(async () => {
        resolveSyncPending({ synced: 1, failed: 0, pulled_surveys: 0, pulled_attachments: 0 })
        await syncPromise
      })
      expect(result.current.isSyncing).toBe(false)
    })

    test("is true while handlePullChanges runs and false again once it settles", async () => {
      let resolvePull!: (value: unknown) => void
      mockPullRemoteChanges.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePull = resolve
          }),
      )
      const { result } = await renderHook(() =>
        useSurveySyncNetwork({
          apiUrl: "http://localhost:3000",
          accessToken: "access-token",
          surveys: [],
          clearSession: jest.fn(),
          withAuthRetry: jest.fn((fn: (token: string, tokenSub: string | null) => unknown) =>
            fn("token", "auth0|owner"),
          ),
          refreshLocalSurveys: jest.fn().mockResolvedValue(undefined),
          refreshLocalAttachments: jest.fn().mockResolvedValue(undefined),
          setStatus: jest.fn(),
          syncAllowed: true,
          ensureSyncOwner: jest.fn().mockResolvedValue(true),
          ownerStatus: "ok",
          recheckOwner: jest.fn(),
          syncActivity: createSyncActivity(),
        } as never),
      )

      expect(result.current.isSyncing).toBe(false)

      let pullPromise!: Promise<void>
      await act(async () => {
        pullPromise = result.current.handlePullChanges()
        await Promise.resolve()
      })
      expect(result.current.isSyncing).toBe(true)

      await act(async () => {
        resolvePull({ surveys: 1, attachments: 0, pages: 1 })
        await pullPromise
      })
      expect(result.current.isSyncing).toBe(false)
    })
  })

  // ─── D-04 owner gate (syncAllowed) ────────────────────────────────────────

  describe("syncAllowed gate (D-04)", () => {
    test("handleSync does not call withAuthRetry and sets the suspension status when syncAllowed is false", async () => {
      const { handleSync, setStatus, withAuthRetry } = await buildHook({
        syncAllowed: false,
        ownerStatus: "conflict",
      })

      await handleSync()

      expect(withAuthRetry).not.toHaveBeenCalled()
      expect(setStatus).toHaveBeenCalledWith(ownerText.syncSuspended())
    })

    test("maybeAutoSync does not call syncPending or pullRemoteChanges when syncAllowed is false, even online with pending work", async () => {
      // Let the network probe report "online" so lastOnlineStateRef is true and
      // the syncAllowed gate — not the online gate — is what's under test.
      mockGetNetworkStateAsync.mockResolvedValue({ isConnected: true, isInternetReachable: true })
      mockHasPendingSyncWork.mockResolvedValue(true)

      const { maybeAutoSync } = await buildHook({ syncAllowed: false, ownerStatus: "conflict" })
      await act(async () => {
        await maybeAutoSync("auth-ready")
      })

      expect(mockHasPendingSyncWork).not.toHaveBeenCalled()
      expect(mockSyncPending).not.toHaveBeenCalled()
      expect(mockPullRemoteChanges).not.toHaveBeenCalled()
    })

    test("handlePullChanges does not call pullRemoteChanges when syncAllowed is false", async () => {
      const { handlePullChanges, setStatus, withAuthRetry } = await buildHook({
        syncAllowed: false,
        ownerStatus: "conflict",
      })

      await handlePullChanges()

      expect(withAuthRetry).not.toHaveBeenCalled()
      expect(mockPullRemoteChanges).not.toHaveBeenCalled()
      expect(setStatus).toHaveBeenCalledWith(ownerText.syncSuspended())
    })

    test("WR-07: a failed owner check retries it on manual sync and does not blame another account", async () => {
      const { handleSync, setStatus, withAuthRetry, recheckOwner } = await buildHook({
        syncAllowed: false,
        ownerStatus: "error",
      })

      await handleSync()

      expect(withAuthRetry).not.toHaveBeenCalled()
      expect(recheckOwner).toHaveBeenCalled()
      expect(setStatus).not.toHaveBeenCalledWith(ownerText.syncSuspended())
      expect(setStatus).toHaveBeenCalledWith(ownerText.checkPending())
    })

    test("WR-07: a manual pull during the owner check reports the check, not a conflict", async () => {
      const { handlePullChanges, setStatus, recheckOwner } = await buildHook({
        syncAllowed: false,
        ownerStatus: "checking",
      })

      await handlePullChanges()

      expect(recheckOwner).not.toHaveBeenCalled()
      expect(setStatus).toHaveBeenCalledWith(ownerText.checkPending())
    })

    test("handleSync re-checks the owner with the token's sub right before syncPending (CR-01)", async () => {
      const ensureSyncOwner = jest.fn().mockResolvedValue(false)
      const { handleSync, setStatus } = await buildHook({ ensureSyncOwner })

      await handleSync()

      expect(ensureSyncOwner).toHaveBeenCalledWith("auth0|owner")
      expect(mockSyncPending).not.toHaveBeenCalled()
      expect(setStatus).toHaveBeenCalledWith(ownerText.recheckPending())
    })

    test("handlePullChanges re-checks the owner right before pullRemoteChanges (CR-01)", async () => {
      const ensureSyncOwner = jest.fn().mockResolvedValue(false)
      const { handlePullChanges } = await buildHook({ ensureSyncOwner })

      await handlePullChanges()

      expect(ensureSyncOwner).toHaveBeenCalledWith("auth0|owner")
      expect(mockPullRemoteChanges).not.toHaveBeenCalled()
    })

    test("a token without a sub never reaches syncPending (CR-01)", async () => {
      const ensureSyncOwner = jest.fn(async (tokenSub: string | null) => tokenSub !== null)
      const { handleSync } = await buildHook({
        ensureSyncOwner,
        withAuthRetry: jest.fn((fn: (token: string, tokenSub: string | null) => unknown) =>
          fn("token", null),
        ),
      })

      await handleSync()

      expect(ensureSyncOwner).toHaveBeenCalledWith(null)
      expect(mockSyncPending).not.toHaveBeenCalled()
    })

    test("syncAllowed true preserves existing handleSync behavior", async () => {
      mockSyncPending.mockResolvedValue({
        synced: 1,
        failed: 0,
        pulled_surveys: 0,
        pulled_attachments: 0,
      })
      const { handleSync, setStatus } = await buildHook({ syncAllowed: true })

      await handleSync()

      expect(setStatus).toHaveBeenCalledWith(text.done({ synced: 1, failed: 0 }))
    })
  })
})
