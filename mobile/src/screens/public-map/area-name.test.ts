import { defaultAreaName } from "./area-name"

describe("defaultAreaName", () => {
  test("is 'Zone du JJ/MM HH:MM' with zero padding", () => {
    expect(defaultAreaName(new Date(2026, 9, 11, 9, 5))).toBe("Zone du 11/10 09:05")
    expect(defaultAreaName(new Date(2026, 0, 2, 23, 59))).toBe("Zone du 02/01 23:59")
  })

  test("defaults to the current time", () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 5, 3, 14, 7))
    try {
      expect(defaultAreaName()).toBe("Zone du 03/06 14:07")
    } finally {
      jest.useRealTimers()
    }
  })
})
