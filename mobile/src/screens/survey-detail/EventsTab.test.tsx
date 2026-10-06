import React from "react"
import renderer, { act, ReactTestRenderer } from "react-test-renderer"
import { fr } from "../../i18n"
import { SurveyEventItem } from "../../app/types"
import { EventsTab } from "./EventsTab"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? "")
    if (message.includes("react-test-renderer is deprecated")) return
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
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
  }
})

jest.mock("../../ui/AppCard", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppCard: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("AppCard", null, children),
  }
})
jest.mock("../../ui/AppSectionHeader", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppSectionHeader: ({ title, trailing }: { title: string; trailing?: React.ReactNode }) =>
      ReactRef.createElement("AppSectionHeader", { title }, trailing),
  }
})
jest.mock("../../ui/AppButton", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppButton: ({ label, onPress }: { label: string; onPress: () => void }) =>
      ReactRef.createElement("AppButton", { label, onPress }),
  }
})
jest.mock("../../ui/Skeleton", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    SkeletonRow: () => ReactRef.createElement("SkeletonRow"),
  }
})

const t = fr.surveyDetail.events

function makeEvent(overrides: Partial<SurveyEventItem> = {}): SurveyEventItem {
  return {
    id: "event-1",
    event_type: "submitted",
    created_at: "2026-01-01T10:00:00.000Z",
    payload: {},
    ...overrides,
  } as SurveyEventItem
}

function mount(props: React.ComponentProps<typeof EventsTab>): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<EventsTab {...props} />)
  })
  return tree!
}

describe("EventsTab", () => {
  test("shows a loading skeleton on the first load (no events yet)", () => {
    const tree = mount({ events: [], isLoading: true })
    expect(tree.root.findAllByType("SkeletonRow" as never)).toHaveLength(3)
    expect(tree.toJSON()).not.toBeNull()
  })

  test("shows the empty message once loading finishes with no events", () => {
    const tree = mount({ events: [], isLoading: false })
    expect(tree.root.findAllByType("SkeletonRow" as never)).toHaveLength(0)
    const text = tree.root.findAllByType("Text" as never).map((node) => node.props.children)
    expect(text).toContain(t.empty)
  })

  test("renders one timeline row per event, with its French label and no skeleton", () => {
    const events = [
      makeEvent({ id: "1", event_type: "created" }),
      makeEvent({ id: "2", event_type: "submitted" }),
      makeEvent({ id: "3", event_type: "sync_failed" }),
    ]
    const tree = mount({ events, isLoading: false })

    expect(tree.root.findAllByType("SkeletonRow" as never)).toHaveLength(0)
    const labels = tree.root.findAllByType("Text" as never).map((node) => node.props.children)
    expect(labels).toContain(fr.surveyDetail.eventTypes.created)
    expect(labels).toContain(fr.surveyDetail.eventTypes.submitted)
    expect(labels).toContain(fr.surveyDetail.eventTypes.sync_failed)
  })

  test("keeps showing existing events (no skeleton) while a pull-to-refresh reload is in flight", () => {
    const events = [makeEvent()]
    const tree = mount({ events, isLoading: true })
    expect(tree.root.findAllByType("SkeletonRow" as never)).toHaveLength(0)
    const labels = tree.root.findAllByType("Text" as never).map((node) => node.props.children)
    expect(labels).toContain(fr.surveyDetail.eventTypes.submitted)
  })
})
