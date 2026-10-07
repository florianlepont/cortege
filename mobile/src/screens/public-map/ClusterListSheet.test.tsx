import fs from "fs"
import path from "path"
import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import type { PublicMapItem } from "../../app/types"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: {
      create: <T,>(styles: T): T => styles,
      flatten: (style: unknown) => style,
      absoluteFill: {},
    },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/ScoreRing", () => ({ ScoreRing: "ScoreRing" }))
// The entrance itself is covered by useFocusEntrance.test.tsx; here, which rows get one.
jest.mock("../../ui/EntranceView", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    EntranceView: ({ index, children }: { index: number; children?: React.ReactNode }) =>
      ReactRef.createElement("EntranceView", { index }, children),
  }
})

import { brandInteraction, brandMotion } from "../../app/brand-tokens"
import { fr } from "../../i18n"
import { SURVEY_ROW_RING_COLUMN } from "../survey-list/row-styles"
import { ClusterListSheet } from "./ClusterListSheet"
import { SHEET_CLOSE_ICON_SIZE } from "./SheetCloseButton"

const t = fr.publicMap

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

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(3).filter(Boolean))

function makeItem(index: number, overrides: Partial<PublicMapItem> = {}): PublicMapItem {
  return {
    survey_id: `s-${index}`,
    display_location: { lat: 45.76, lng: 4.84 },
    survey_date: "2026-05-01",
    region_code: "ARA",
    ibp_total: 10 + index,
    ...overrides,
  }
}

function render(items: PublicMapItem[], onSelect = jest.fn(), onClose = jest.fn()) {
  let tree!: ReactTestRenderer
  act(() => {
    tree = renderer.create(<ClusterListSheet items={items} onSelect={onSelect} onClose={onClose} />)
  })
  return tree
}

const rowsOf = (tree: ReactTestRenderer): ReactTestInstance[] =>
  tree.root.findAll(
    (node) =>
      (node.type as unknown) === "Pressable" &&
      String(node.props.accessibilityLabel).startsWith("Relevé, IBP"),
  )

describe("ClusterListSheet (Explorer, 12.2-18)", () => {
  test("each row is a button with its catalogue label that selects its survey", () => {
    const onSelect = jest.fn()
    const tree = render([makeItem(0), makeItem(1)], onSelect)
    const rows = rowsOf(tree)
    expect(rows).toHaveLength(2)
    expect(rows[1].props.accessibilityRole).toBe("button")
    expect(rows[1].props.accessibilityLabel).toBe(
      t.a11y.clusterListItem({ ibp: 11, date: "2026-05-01", region: "ARA" }),
    )
    act(() => rows[1].props.onPress())
    expect(onSelect).toHaveBeenCalledWith("s-1")
  })

  test("rows show the score and date as the title and the place under it", () => {
    const tree = render([makeItem(0)])
    const shown = tree.root
      .findAll((node) => (node.type as unknown) === "Text")
      .map((node) => [node.props.children].flat().join(""))
    expect(shown).toContain(t.clusterList.row({ ibp: 10, date: "2026-05-01" }))
    expect(shown).toContain("ARA")
    expect(shown).toContain(t.clusterList.title(1))
  })

  test("each row renders a score ring with its total, index and a stable key", () => {
    const tree = render([makeItem(0), makeItem(1), makeItem(2)])
    const rings = tree.root.findAllByType("ScoreRing" as never)
    expect(rings.map((ring) => ring.props.score)).toEqual([10, 11, 12])
    expect(rings.map((ring) => ring.props.index)).toEqual([0, 1, 2])
    expect(rings.map((ring) => ring.props.animationKey)).toEqual(["s-0:10", "s-1:11", "s-2:12"])
  })

  test("the ring sits in the trailing ring column, centred, after the texts (D-27a)", () => {
    const row = rowsOf(render([makeItem(0)]))[0]
    const ring = row.findByType("ScoreRing" as never)
    const column = ring.parent as ReactTestInstance
    const style = flat(column.props.style)
    expect(style.width).toBe(SURVEY_ROW_RING_COLUMN)
    expect(style.alignSelf).toBe("center")
    const children = row.children as ReactTestInstance[]
    const ringPosition = children.findIndex(
      (child) => child.findAllByType("ScoreRing" as never).length,
    )
    const textPosition = children.findIndex((child) => child.findAllByType("Text" as never).length)
    expect(textPosition).toBeLessThan(ringPosition)
  })

  test("rows are glass survey rows with at least a 44 pt height and the green wave", () => {
    const row = rowsOf(render([makeItem(0)]))[0]
    const style = flat(row.props.style)
    expect(style.minHeight).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
    expect(style.flexDirection).toBe("row")
    expect(style.borderCurve).toBeUndefined()
    // The wave layer of RipplePressable is hidden from accessibility.
    expect(
      row.findAll(
        (node) =>
          (node.type as unknown) === "View" &&
          node.props.importantForAccessibility === "no-hide-descendants",
      ),
    ).toHaveLength(1)
  })

  test("rows 0 to 7 enter with the stagger, later rows render as they are", () => {
    const items = Array.from({ length: 10 }, (_, index) => makeItem(index))
    const tree = render(items)
    const entrances = tree.root.findAllByType("EntranceView" as never)
    expect(entrances).toHaveLength(brandMotion.staggerMax)
    expect(entrances.map((node) => node.props.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(rowsOf(tree)).toHaveLength(10)
    for (const entrance of entrances) {
      expect(entrance.findAllByType("ScoreRing" as never)).toHaveLength(1)
    }
  })

  test("the close button has a 44 pt target and closes", () => {
    const onClose = jest.fn()
    const tree = render([makeItem(0)], jest.fn(), onClose)
    const close = tree.root.find(
      (node) =>
        (node.type as unknown) === "Pressable" &&
        node.props.accessibilityLabel === t.a11y.closeClusterList,
    )
    expect(close.props.accessibilityRole).toBe("button")
    expect(SHEET_CLOSE_ICON_SIZE + 2 * close.props.hitSlop).toBe(brandInteraction.hitTarget.min)
    act(() => close.props.onPress())
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test("no photo in the rows (owner) and no animation outside Reanimated", () => {
    const source = fs.readFileSync(path.join(__dirname, "ClusterListSheet.tsx"), "utf8")
    expect(source).not.toMatch(/expo-image|ActivityIndicator|image-outline/)
    expect(source).not.toMatch(/LayoutAnimation/)
  })
})
