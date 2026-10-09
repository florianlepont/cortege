import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import type { SurveySort } from "../../app/types"
import { fr } from "../../i18n"
import { OwnSurveyChips } from "./OwnSurveyChips"

const t = fr.surveyList.search
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
  const ScrollView = ({ children, ...props }: { children?: React.ReactNode }) =>
    ReactRef.createElement("ScrollView", props, children)
  return { ScrollView, StyleSheet: { create: <T,>(styles: T): T => styles } }
})
// The chip keeps its props on a host element, so the test reads what the row asked for.
jest.mock("../../ui/AppChoiceChip", () => ({
  AppChoiceChip: (props: { label: string }) => {
    const ReactRef = require("react") as typeof import("react")
    return ReactRef.createElement("AppChoiceChip", props)
  },
}))

let tree: ReactTestRenderer

type Overrides = {
  statusFilter?: "all" | "draft" | "submitted"
  attachmentFilter?: "all" | "with" | "without"
  sortMode?: SurveySort
}

function mount(overrides: Overrides = {}) {
  const handlers = {
    onStatusFilterChange: jest.fn(),
    onAttachmentFilterChange: jest.fn(),
    onSortModeChange: jest.fn(),
  }
  act(() => {
    tree = renderer.create(
      <OwnSurveyChips
        statusFilter={overrides.statusFilter ?? "all"}
        attachmentFilter={overrides.attachmentFilter ?? "all"}
        sortMode={overrides.sortMode ?? "updated_desc"}
        {...handlers}
      />,
    )
  })
  return handlers
}

const chip = (label: string): ReactTestInstance =>
  tree.root.findAll(
    (node) => node.props.label === label && String(node.type) === "AppChoiceChip",
  )[0]

afterEach(() => {
  act(() => tree?.unmount())
})

describe("OwnSurveyChips", () => {
  test("draws the three toggles and the sort chip with the catalogue texts", () => {
    mount()
    expect(chip(t.chips.drafts).props.active).toBe(false)
    expect(chip(t.chips.finished).props.active).toBe(false)
    expect(chip(t.chips.withPhoto).props.active).toBe(false)
    expect(chip(t.sort.updated_desc).props.accessibilityLabel).toBe(t.sortA11y(t.sort.updated_desc))
  })

  test("Brouillons selects the drafts, and a second press clears the filter", () => {
    const first = mount()
    act(() => chip(t.chips.drafts).props.onPress())
    expect(first.onStatusFilterChange).toHaveBeenCalledWith("draft")
    act(() => tree.unmount())

    const second = mount({ statusFilter: "draft" })
    expect(chip(t.chips.drafts).props.active).toBe(true)
    act(() => chip(t.chips.drafts).props.onPress())
    expect(second.onStatusFilterChange).toHaveBeenCalledWith("all")
  })

  test("Terminés selects the submitted surveys, and a second press clears the filter", () => {
    const first = mount()
    act(() => chip(t.chips.finished).props.onPress())
    expect(first.onStatusFilterChange).toHaveBeenCalledWith("submitted")
    act(() => tree.unmount())

    const second = mount({ statusFilter: "submitted" })
    expect(chip(t.chips.finished).props.active).toBe(true)
    act(() => chip(t.chips.finished).props.onPress())
    expect(second.onStatusFilterChange).toHaveBeenCalledWith("all")
  })

  test("Avec photo toggles the attachment filter", () => {
    const first = mount()
    act(() => chip(t.chips.withPhoto).props.onPress())
    expect(first.onAttachmentFilterChange).toHaveBeenCalledWith("with")
    act(() => tree.unmount())

    const second = mount({ attachmentFilter: "with" })
    expect(chip(t.chips.withPhoto).props.active).toBe(true)
    act(() => chip(t.chips.withPhoto).props.onPress())
    expect(second.onAttachmentFilterChange).toHaveBeenCalledWith("all")
  })

  test("the sort chip cycles recent, oldest, name and back to recent", () => {
    const steps: Array<[SurveySort, SurveySort]> = [
      ["updated_desc", "updated_asc"],
      ["updated_asc", "site_asc"],
      ["site_asc", "updated_desc"],
    ]
    for (const [from, to] of steps) {
      const handlers = mount({ sortMode: from })
      act(() => chip(t.sort[from]).props.onPress())
      expect(handlers.onSortModeChange).toHaveBeenCalledWith(to)
      act(() => tree.unmount())
    }
  })
})
