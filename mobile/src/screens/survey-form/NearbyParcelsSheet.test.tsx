import React from "react"
import renderer, { act } from "react-test-renderer"
import { fr } from "../../i18n"
import {
  NearbyParcelsContext,
  type NearbyParcelsContextValue,
} from "../../state/nearby-parcels-context"
import { NearbyParcelsSheet } from "./NearbyParcelsSheet"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    ActivityIndicator: mockComponent("ActivityIndicator"),
    FlatList: ({
      data,
      renderItem,
    }: {
      data: unknown[]
      renderItem: (a: { item: unknown }) => React.ReactNode
    }) => {
      const ReactRef2 = require("react") as typeof import("react")
      return ReactRef2.createElement(
        "FlatList",
        null,
        data.map((item, index) =>
          ReactRef2.createElement(React.Fragment, { key: index }, renderItem({ item })),
        ),
      )
    },
    Modal: mockComponent("Modal"),
    Platform: { OS: "ios", select: (options: { ios?: unknown; default?: unknown }) => options.ios },
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

jest.mock("../../ui/feedback", () => ({ feedback: { selection: jest.fn() } }))

jest.mock("../../ui/AppNotice", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppNotice: ({ message }: { message: string }) =>
      ReactRef.createElement("AppNotice", null, message),
  }
})

function contextValue(
  overrides: Partial<NearbyParcelsContextValue["state"]> = {},
): NearbyParcelsContextValue {
  return {
    state: {
      parcels: [],
      sectorAvgScore: null,
      loading: false,
      locationDenied: false,
      error: false,
      ...overrides,
    },
    load: jest.fn(async () => undefined),
  }
}

function render(
  props: Partial<React.ComponentProps<typeof NearbyParcelsSheet>> = {},
  ctx: NearbyParcelsContextValue = contextValue(),
) {
  const onClose = jest.fn()
  const onToggleParcelSelection = jest.fn()
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <NearbyParcelsContext.Provider value={ctx}>
        <NearbyParcelsSheet
          visible
          onClose={onClose}
          selectedParcelIds={[]}
          onToggleParcelSelection={onToggleParcelSelection}
          {...props}
        />
      </NearbyParcelsContext.Provider>,
    )
  })
  return { tree: tree!, onClose, onToggleParcelSelection, load: ctx.load }
}

describe("NearbyParcelsSheet (FLOW-10)", () => {
  test("calls load when opened", () => {
    const { load } = render()
    expect(load).toHaveBeenCalledTimes(1)
  })

  test("does not load when not visible", () => {
    const { load } = render({ visible: false })
    expect(load).not.toHaveBeenCalled()
  })

  test("shows a location-denied notice", () => {
    const { tree } = render({}, contextValue({ locationDenied: true }))
    const notice = tree.root.findAll((n) => (n.type as unknown) === "AppNotice")[0]
    expect(notice.props.children).toBe(fr.nearbyParcelsSheet.locationDenied)
  })

  test("shows an empty message when there are no nearby parcels", () => {
    const { tree } = render({}, contextValue({ parcels: [] }))
    const notice = tree.root.findAll((n) => (n.type as unknown) === "AppNotice")[0]
    expect(notice.props.children).toBe(fr.nearbyParcelsSheet.empty)
  })

  test("renders one checkable row per nearby parcel, with distance", () => {
    const { tree } = render(
      {},
      contextValue({
        parcels: [
          { parcel_id: "P1", distanceKm: 0.42, surveyCount: 0 } as never,
          { parcel_id: "P2", distanceKm: 1.9, surveyCount: 1 } as never,
        ],
      }),
    )
    const rows = tree.root.findAll(
      (n) =>
        (n.type as unknown) === "Pressable" && n.props.testID?.startsWith?.("nearby-parcel-row-"),
    )
    expect(rows).toHaveLength(2)
  })

  test("tapping a row toggles selection and fires haptics", () => {
    const { tree, onToggleParcelSelection } = render(
      {},
      contextValue({ parcels: [{ parcel_id: "P1", distanceKm: 0.4, surveyCount: 0 } as never] }),
    )
    const row = tree.root.findAll((n) => n.props.testID === "nearby-parcel-row-P1")[0]
    act(() => {
      row.props.onPress()
    })
    expect(onToggleParcelSelection).toHaveBeenCalledWith("P1")
  })

  test("a selected parcel's row is marked checked", () => {
    const { tree } = render(
      { selectedParcelIds: ["P1"] },
      contextValue({ parcels: [{ parcel_id: "P1", distanceKm: 0.4, surveyCount: 0 } as never] }),
    )
    const row = tree.root.findAll((n) => n.props.testID === "nearby-parcel-row-P1")[0]
    expect(row.props.accessibilityState).toEqual({ checked: true })
  })

  test("tapping close calls onClose", () => {
    const { tree, onClose } = render()
    const closeButton = tree.root.findAll((n) => n.props.testID === "nearby-parcels-sheet-close")[0]
    act(() => {
      closeButton.props.onPress()
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
