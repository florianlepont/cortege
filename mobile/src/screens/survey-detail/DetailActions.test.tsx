import React from "react"
import renderer, { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer"
import { fr } from "../../i18n"
import { LocalSurvey } from "../../storage"
import { DetailActions } from "./DetailActions"

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
    Pressable: mockComponent("Pressable"),
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
jest.mock("../../ui/AppNotice", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppNotice: ({
      message,
      action,
    }: {
      message: string
      action?: { label: string; onPress: () => void }
    }) => ReactRef.createElement("AppNotice", { message, action }),
  }
})

const t = fr.surveyDetail.actions

const survey = {
  id: "3a4b5c6d-7e8f-4a0b-9c1d-2e3f4a5b6c7d",
  site_name: "Bois",
  status: "draft",
  visibility: "private",
  sync_state: "synced",
  sync_blocked: 0,
  last_sync_error: null,
  last_sync_error_code: null,
  completion_rate: 80,
  updated_at: "2026-09-26T10:00:00.000Z",
} as unknown as LocalSurvey

const render = (
  surveyOverrides: Partial<LocalSurvey> = {},
  onRetrySurvey = jest.fn(),
  onDiscardSurvey = jest.fn(),
): ReactTestRenderer => {
  let tree: ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <DetailActions
        survey={{ ...survey, ...surveyOverrides } as LocalSurvey}
        onRetrySurvey={onRetrySurvey}
        onDiscardSurvey={onDiscardSurvey}
      />,
    )
  })
  return tree as ReactTestRenderer
}

const findNotice = (tree: ReactTestRenderer): ReactTestInstance | undefined =>
  tree.root.findAllByType("AppNotice" as never)[0]

const findDiscardLink = (tree: ReactTestRenderer): ReactTestInstance | undefined =>
  tree.root.findAll(
    (node) => (node.type as unknown) === "Text" && node.props.children === t.discardLocalChange,
  )[0]

describe("DetailActions", () => {
  test("renders nothing when there is no sync error to report", () => {
    const tree = render({ last_sync_error: null, last_sync_error_code: null })
    expect(tree.toJSON()).toBeNull()
  })

  test("shows the sync error notice without a retry action or discard link when not failed", () => {
    const tree = render({
      sync_state: "synced",
      last_sync_error: "HTTP 500 Internal Server Error",
      last_sync_error_code: null,
    })
    const notice = findNotice(tree) as ReactTestInstance
    expect(notice.props.action).toBeUndefined()
    expect(findDiscardLink(tree)).toBeUndefined()
  })

  test("shows a retry action integrated into the notice and a discard link when sync_state is failed", () => {
    const onRetrySurvey = jest.fn()
    const onDiscardSurvey = jest.fn()
    const tree = render(
      {
        sync_state: "failed",
        last_sync_error: "HTTP 500 Internal Server Error",
        last_sync_error_code: null,
      },
      onRetrySurvey,
      onDiscardSurvey,
    )

    const notice = findNotice(tree) as ReactTestInstance
    expect(notice.props.action.label).toBe(t.retryNow)
    notice.props.action.onPress()
    expect(onRetrySurvey).toHaveBeenCalledWith(survey.id)

    const discardLink = findDiscardLink(tree) as ReactTestInstance
    discardLink.props.onPress()
    expect(onDiscardSurvey).toHaveBeenCalledWith(survey.id)
  })
})
