import { nextStepAfterFinish } from "./finish-outcome"

describe("nextStepAfterFinish", () => {
  test.each([
    ["submitted", false, "close"],
    ["submitted", true, "close"],
    ["not_submitted", true, "close"],
    ["not_submitted", false, "notFinished"],
    ["busy", false, "idle"],
    ["busy", true, "idle"],
  ] as const)("%s with offline %s is %s", (outcome, offline, expected) => {
    expect(nextStepAfterFinish(outcome, offline)).toBe(expected)
  })
})
