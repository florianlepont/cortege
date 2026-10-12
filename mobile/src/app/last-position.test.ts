import { forgetPosition, lastPosition, rememberPosition } from "./last-position"

afterEach(forgetPosition)

describe("last position", () => {
  test("is empty at first and remembers the latest valid position", () => {
    expect(lastPosition()).toBeNull()
    rememberPosition(48.1, 2.3)
    expect(lastPosition()).toEqual({ latitude: 48.1, longitude: 2.3 })
    rememberPosition(45, 5)
    expect(lastPosition()).toEqual({ latitude: 45, longitude: 5 })
  })

  test("ignores a position that is not a place on earth", () => {
    rememberPosition(48.1, 2.3)
    rememberPosition(Number.NaN, 2)
    rememberPosition(10, Number.POSITIVE_INFINITY)
    rememberPosition(91, 0)
    rememberPosition(0, 181)
    expect(lastPosition()).toEqual({ latitude: 48.1, longitude: 2.3 })
  })
})
