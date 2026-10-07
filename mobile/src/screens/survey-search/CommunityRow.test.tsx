import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import type { CommunitySurveyItem } from "@cortege/ibp-domain"
import { brandInteraction } from "../../app/brand-tokens"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"
import { ROW_STATUS_MIN_HEIGHT } from "../survey-list/row-styles"
import { SurveyRow } from "../survey-list/SurveyRow"
import { CommunityRow } from "./CommunityRow"

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
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles, flatten: (style: unknown) => style },
  }
})
jest.mock("react-native-gesture-handler/Swipeable", () => {
  const ReactRef = require("react") as typeof import("react")
  const Swipeable = ReactRef.forwardRef(({ children }: { children?: React.ReactNode }, _ref) =>
    ReactRef.createElement("Swipeable", null, children),
  )
  Swipeable.displayName = "Swipeable"
  return { __esModule: true, default: Swipeable }
})
jest.mock("../../ui/ScoreRing", () => ({ ScoreRing: "ScoreRing" }))

function survey(overrides: Partial<LocalSurvey> = {}): LocalSurvey {
  return {
    id: "s1",
    site_name: "Parcelle A",
    status: "submitted",
    visibility: "private",
    sync_version: 1,
    sync_state: "synced",
    last_sync_error: null,
    last_sync_error_code: null,
    last_sync_error_at: null,
    sync_blocked: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-10-05T10:00:00.000Z",
    completion_rate: 100,
    ...overrides,
  }
}

const item: CommunitySurveyItem = {
  survey_id: "c1",
  site_name: "Forêt de Camille",
  author_name: "Camille",
  ibp_total: 34,
  submitted_at: "2026-10-04T10:00:00.000Z",
} as CommunitySurveyItem

let trees: ReactTestRenderer[] = []

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer
  act(() => {
    tree = renderer.create(element)
  })
  trees.push(tree)
  return tree
}

afterEach(() => {
  trees.forEach((tree) => act(() => tree.unmount()))
  trees = []
})

// The styles that define the size of a row, read from the host nodes of its shared frame: the card
// (padding, border, minimum height), the accent bar, the ring column, the text column, the title
// line, the title text and the status line.
function boxStyles(tree: ReactTestRenderer) {
  const card = tree.root.findAll(
    (node: ReactTestInstance) =>
      (node.type as unknown) === "Pressable" && node.props.accessibilityRole === "button",
  )[0]
  const views = tree.root.findAll((node) => (node.type as unknown) === "View")
  const [accent, indicator, content, header, statusRow] = views.map((view) => view.props.style)
  const title = tree.root.findAll(
    (node) => (node.type as unknown) === "Text" && node.props.numberOfLines === 2,
  )[0]
  return {
    card: card.props.style({ pressed: false })[0],
    accent: accent[0],
    indicator,
    content,
    header,
    title: title.props.style,
    statusRow,
  }
}

describe("CommunityRow size (D-23)", () => {
  const own = () =>
    render(
      <SurveyRow
        survey={survey()}
        preview={null}
        score={34}
        selected={false}
        onOpen={jest.fn()}
        onDelete={jest.fn()}
      />,
    )
  const others = () => render(<CommunityRow item={item} onOpen={jest.fn()} />)

  test("resolves the same height-defining styles as a Mes relevés row", () => {
    expect(boxStyles(others())).toEqual(boxStyles(own()))
  })

  test("the shared box keeps the 44 pt minimum, the ring column and a chip-high status line", () => {
    const styles = boxStyles(others())
    expect(styles.card.minHeight).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
    expect(styles.indicator.width).toBe(40)
    expect(styles.statusRow.minHeight).toBe(ROW_STATUS_MIN_HEIGHT)
    expect(ROW_STATUS_MIN_HEIGHT).toBe(28)
  })

  test("keeps its own content: name, author and date, the ring and the open action", () => {
    const onOpen = jest.fn()
    const tree = render(<CommunityRow item={item} onOpen={onOpen} />)
    const texts = tree.root
      .findAll((node) => (node.type as unknown) === "Text")
      .map((node) => String(node.props.children))
    expect(texts).toContain("Forêt de Camille")
    expect(texts.join(" ")).toContain("Camille")
    expect(tree.root.findByType("ScoreRing" as never).props.score).toBe(34)
    const row = tree.root.findAll((node) => node.props.testID === "community-row-c1")[0]
    act(() => row.props.onPress())
    expect(onOpen).toHaveBeenCalledWith("c1")
  })

  test("an unnamed survey and an unknown author get the catalogue fallbacks", () => {
    const tree = render(
      <CommunityRow item={{ ...item, site_name: "  ", author_name: null }} onOpen={jest.fn()} />,
    )
    const texts = tree.root
      .findAll((node) => (node.type as unknown) === "Text")
      .map((node) => String(node.props.children))
    expect(texts).toContain(fr.common.untitledSurvey)
    expect(texts.join(" ")).toContain(fr.surveyList.community.unknownAuthor)
  })
})
