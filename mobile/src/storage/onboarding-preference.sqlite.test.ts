/**
 * Real-SQL tests for the onboarding "already seen" flag (ONB-01), following the same
 * before/after-initLocalDb split as profile-cache.sqlite.test.ts: the first describe runs before
 * any initLocalDb() call, proving the flag never throws into the app's startup when local_meta
 * does not exist yet.
 */
import { createNodeSqliteDb } from "../../test/node-sqlite-db"

const mockDb = createNodeSqliteDb()

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(async () => mockDb),
}))

import { initLocalDb } from "./db"
import {
  loadOnboardingSeen,
  markOnboardingSeen,
  ONBOARDING_SEEN_KEY,
} from "./onboarding-preference"

describe("onboarding preference before initLocalDb (table missing)", () => {
  test("loadOnboardingSeen resolves false when local_meta does not exist", async () => {
    await expect(loadOnboardingSeen()).resolves.toBe(false)
  })

  test("markOnboardingSeen resolves without throwing when local_meta does not exist", async () => {
    await expect(markOnboardingSeen()).resolves.toBeUndefined()
  })
})

describe("onboarding preference after initLocalDb", () => {
  beforeAll(async () => {
    await initLocalDb()
  })

  beforeEach(async () => {
    await mockDb.execAsync(`DELETE FROM local_meta;`)
  })

  test("defaults to not seen when nothing was ever saved", async () => {
    expect(await loadOnboardingSeen()).toBe(false)
  })

  test("round-trips a saved 'seen' flag", async () => {
    await markOnboardingSeen()
    expect(await loadOnboardingSeen()).toBe(true)
  })

  test("marking seen twice is idempotent", async () => {
    await markOnboardingSeen()
    await markOnboardingSeen()
    expect(await loadOnboardingSeen()).toBe(true)
  })

  test("a corrupted stored value reads back as not seen", async () => {
    const now = new Date().toISOString()
    await mockDb.runAsync(`INSERT INTO local_meta (key, value, updated_at) VALUES (?, ?, ?)`, [
      ONBOARDING_SEEN_KEY,
      "not-a-flag",
      now,
    ])
    expect(await loadOnboardingSeen()).toBe(false)
  })
})
