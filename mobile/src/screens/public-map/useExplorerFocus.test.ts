/** useExplorerFocus (OA-59, D-05, D-06): one camera move per nonce, and what each kind draws. */

jest.mock("react-native", () => ({}))

const mockScreenFocus = { value: true }
jest.mock("../../ui/useScreenFocus", () => ({ useScreenFocus: () => mockScreenFocus.value }))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import type { PublicMapFocus } from "../../navigation/types"
import { focusRegionFor } from "./focus-region"
import { useExplorerFocus } from "./useExplorerFocus"

const survey = (nonce: number): PublicMapFocus => ({
  kind: "survey",
  surveyId: "s-1",
  lat: 46,
  lng: 2,
  parcelIds: ["P1"],
  nonce,
})
const place = (nonce: number): PublicMapFocus => ({
  kind: "place",
  lat: 45.1,
  lng: 4.2,
  placeKind: "municipality",
  nonce,
})
const parcel = (nonce: number): PublicMapFocus => ({
  kind: "parcel",
  parcelId: "P9",
  lat: 45,
  lng: 4,
  bbox: null,
  nonce,
})

async function setup(initial: PublicMapFocus | undefined) {
  const focusTo = jest.fn()
  const setHighlightedId = jest.fn()
  const hook = await renderHook(
    ({ focus }: { focus: PublicMapFocus | undefined }) =>
      useExplorerFocus({ focus, focusTo, setHighlightedId }),
    { initialProps: { focus: initial } },
  )
  return { focusTo, setHighlightedId, ...hook }
}

beforeEach(() => {
  mockScreenFocus.value = true
})
afterEach(() => cleanup())

describe("useExplorerFocus", () => {
  test("without a focus nothing moves and nothing is drawn", async () => {
    const { result, focusTo, setHighlightedId } = await setup(undefined)
    expect(focusTo).not.toHaveBeenCalled()
    expect(setHighlightedId).not.toHaveBeenCalled()
    expect(result.current).toEqual({
      initialRegion: undefined,
      highlightedParcelIds: undefined,
      placePin: null,
    })
  })

  test("a survey focus moves the camera once, selects the survey and highlights its parcels", async () => {
    const focus = survey(1)
    const { result, focusTo, setHighlightedId } = await setup(focus)
    expect(focusTo).toHaveBeenCalledTimes(1)
    expect(focusTo).toHaveBeenCalledWith(focusRegionFor(focus), 0)
    expect(setHighlightedId).toHaveBeenCalledWith("s-1")
    expect(result.current.initialRegion).toEqual(focusRegionFor(focus))
    expect(result.current.highlightedParcelIds).toEqual(["P1"])
    expect(result.current.placePin).toBeNull()
  })

  test("a place focus moves to the place, clears the survey highlight and draws the pin", async () => {
    const { result, focusTo, setHighlightedId } = await setup(place(1))
    expect(focusTo).toHaveBeenCalledWith(focusRegionFor(place(1)), 0)
    expect(setHighlightedId).toHaveBeenCalledWith(null)
    expect(result.current.placePin).toEqual({ lat: 45.1, lng: 4.2 })
    expect(result.current.highlightedParcelIds).toBeUndefined()
  })

  test("a parcel focus highlights the parcel and draws no pin", async () => {
    const { result, focusTo } = await setup(parcel(1))
    expect(focusTo).toHaveBeenCalledWith(focusRegionFor(parcel(1)), 0)
    expect(result.current.highlightedParcelIds).toEqual(["P9"])
    expect(result.current.placePin).toBeNull()
  })

  test("the same nonce in a new object does not move the camera again; a new nonce does", async () => {
    const { focusTo, rerender } = await setup(place(1))
    await rerender({ focus: place(1) })
    expect(focusTo).toHaveBeenCalledTimes(1)
    await rerender({ focus: place(2) })
    expect(focusTo).toHaveBeenCalledTimes(2)
  })

  test("a survey or parcel focus after a place clears the pin", async () => {
    const { result, rerender } = await setup(place(1))
    expect(result.current.placePin).not.toBeNull()
    await rerender({ focus: parcel(2) })
    expect(result.current.placePin).toBeNull()
    await rerender({ focus: place(3) })
    expect(result.current.placePin).not.toBeNull()
    await rerender({ focus: survey(4) })
    expect(result.current.placePin).toBeNull()
  })

  test("the pin clears when the screen loses focus", async () => {
    const { result, rerender } = await setup(place(1))
    expect(result.current.placePin).not.toBeNull()
    mockScreenFocus.value = false
    await rerender({ focus: place(1) })
    await act(async () => undefined)
    expect(result.current.placePin).toBeNull()
  })
})
