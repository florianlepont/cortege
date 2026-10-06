/**
 * Tests for ToolsSection (OA-107): the photo identification launched from Accueil, whose genus goes
 * into a survey in progress or starts a survey.
 */
import React from "react"
import renderer, { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"
import { openDrafts, ToolsSection } from "./ToolsSection"

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
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/AppActionSheet", () => ({ AppActionSheet: "AppActionSheet" }))
jest.mock("../../ui/AppNotice", () => ({ AppNotice: "AppNotice" }))
jest.mock("../../ui/AppSectionHeader", () => ({ AppSectionHeader: "AppSectionHeader" }))
jest.mock("../../ui/GenusRecognitionModal", () => ({
  GenusRecognitionModal: "GenusRecognitionModal",
}))

const t = fr.home.tools

let tree: ReactTestRenderer

function makeSurvey(overrides: Partial<LocalSurvey> = {}): LocalSurvey {
  return {
    id: "survey-1",
    site_name: "Parcelle A",
    status: "draft",
    visibility: "private",
    sync_version: 1,
    sync_state: "synced",
    last_sync_error: null,
    last_sync_error_code: null,
    last_sync_error_at: null,
    sync_blocked: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-10-05T10:00:00.000Z",
    completion_rate: 40,
    ...overrides,
  }
}

function mount(
  surveys: LocalSurvey[] = [makeSurvey()],
  handlers: Partial<React.ComponentProps<typeof ToolsSection>> = {},
) {
  const onAddGenusToSurvey = jest.fn(async () => true)
  const onStartSurveyWithGenus = jest.fn()
  act(() => {
    tree = renderer.create(
      <ToolsSection
        surveys={surveys}
        onAddGenusToSurvey={onAddGenusToSurvey}
        onStartSurveyWithGenus={onStartSurveyWithGenus}
        {...handlers}
      />,
    )
  })
  return { onAddGenusToSurvey, onStartSurveyWithGenus }
}

const byType = (type: string) =>
  tree.root.find((node) => (node.type as unknown) === type) as ReactTestInstance
const maybeByType = (type: string) =>
  tree.root.findAll((node) => (node.type as unknown) === type)[0] as ReactTestInstance | undefined
const modal = () => byType("GenusRecognitionModal")
const sheet = () => byType("AppActionSheet")

/** Photo tool open, a genus confirmed, the recognition sheet closed, the survey sheet delay run. */
function confirmFagus() {
  act(() => {
    byType("Pressable").props.onPress()
  })
  act(() => {
    modal().props.onConfirmGenus("Fagus")
    modal().props.onClose()
  })
  act(() => {
    jest.advanceTimersByTime(500)
  })
}

beforeEach(() => {
  tree = undefined as unknown as ReactTestRenderer
  jest.useFakeTimers()
})
afterEach(() => {
  if (tree) act(() => tree.unmount())
  jest.useRealTimers()
})

describe("openDrafts", () => {
  test("keeps the surveys still open, most recent first, at most five", () => {
    const surveys = [
      makeSurvey({ id: "old", updated_at: "2026-10-01T00:00:00.000Z" }),
      makeSurvey({ id: "sub", status: "submitted" }),
      ...["a", "b", "c", "d"].map((id, i) =>
        makeSurvey({ id: id, updated_at: `2026-10-0${i + 2}T00:00:00.000Z` }),
      ),
    ]
    expect(openDrafts(surveys).map((survey) => survey.id)).toEqual(["d", "c", "b", "a", "old"])
    expect(
      openDrafts([...surveys, makeSurvey({ id: "e", updated_at: "2026-10-06T00:00:00.000Z" })]),
    ).toHaveLength(5)
  })
})

describe("ToolsSection", () => {
  test("shows the Outils section with the photo identification card, the tool closed", () => {
    mount()
    expect(byType("AppSectionHeader").props.title).toBe(t.title)
    expect(byType("Pressable").props.accessibilityLabel).toBe(t.identify.a11y)
    expect(modal().props.visible).toBe(false)
    expect(sheet().props.visible).toBe(false)
  })

  test("the card opens the photo tool", () => {
    mount()
    act(() => {
      byType("Pressable").props.onPress()
    })
    expect(modal().props.visible).toBe(true)
  })

  test("closing the tool without a genus opens nothing else", () => {
    mount()
    act(() => {
      byType("Pressable").props.onPress()
    })
    act(() => {
      modal().props.onClose()
    })
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(modal().props.visible).toBe(false)
    expect(sheet().props.visible).toBe(false)
  })

  test("a confirmed genus opens the choice of survey once the tool has closed", () => {
    mount([
      makeSurvey({ id: "s1", site_name: "Test OB" }),
      makeSurvey({ id: "s2", site_name: " " }),
    ])
    act(() => {
      byType("Pressable").props.onPress()
    })
    act(() => {
      modal().props.onConfirmGenus("Fagus")
    })
    // The tool is still open: the survey sheet waits for it to close.
    expect(sheet().props.visible).toBe(false)
    act(() => {
      modal().props.onClose()
    })
    expect(sheet().props.visible).toBe(false)
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(sheet().props.visible).toBe(true)
    expect(sheet().props.title).toBe(t.chooseSurveyTitle({ genus: fr.genus.displayName.Fagus }))
    expect(sheet().props.cancelLabel).toBe(t.cancel)
    expect(sheet().props.options.map((option: { label: string }) => option.label)).toEqual([
      "Test OB",
      fr.common.untitledSurvey,
      t.startSurvey,
    ])
  })

  test("with no survey in progress only 'commencer un relevé' is offered", () => {
    mount([makeSurvey({ status: "submitted" })])
    confirmFagus()
    expect(sheet().props.options.map((option: { label: string }) => option.label)).toEqual([
      t.startSurvey,
    ])
  })

  test("choosing a survey adds the genus to it and confirms it", async () => {
    const { onAddGenusToSurvey } = mount([makeSurvey({ id: "s1", site_name: "Test OB" })])
    confirmFagus()
    await act(async () => {
      sheet().props.options[0].onPress()
    })
    expect(onAddGenusToSurvey).toHaveBeenCalledWith("s1", "Fagus")
    expect(byType("AppNotice").props.tone).toBe("success")
    expect(byType("AppNotice").props.message).toBe(
      t.genusAdded({ genus: fr.genus.displayName.Fagus, name: "Test OB" }),
    )
  })

  test("a survey that refuses the genus shows a warning, not a confirmation", async () => {
    mount([makeSurvey({ id: "s1", site_name: null as unknown as string })], {
      onAddGenusToSurvey: jest.fn(async () => false),
    })
    confirmFagus()
    await act(async () => {
      sheet().props.options[0].onPress()
    })
    expect(byType("AppNotice").props.tone).toBe("warning")
    expect(byType("AppNotice").props.message).toBe(t.addFailed)
  })

  test("'commencer un relevé' starts a survey with the genus", () => {
    const { onStartSurveyWithGenus } = mount()
    confirmFagus()
    act(() => {
      sheet().props.options[1].onPress()
    })
    expect(onStartSurveyWithGenus).toHaveBeenCalledWith("Fagus")
  })

  test("cancelling the choice closes the sheet and forgets the genus", () => {
    mount()
    confirmFagus()
    act(() => {
      sheet().props.onClose()
    })
    expect(sheet().props.visible).toBe(false)
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(sheet().props.visible).toBe(false)
  })

  test("the confirmation goes away by itself, or when dismissed", async () => {
    mount()
    confirmFagus()
    await act(async () => {
      sheet().props.options[0].onPress()
    })
    expect(maybeByType("AppNotice")).toBeDefined()
    act(() => {
      jest.advanceTimersByTime(5500)
    })
    expect(maybeByType("AppNotice")).toBeUndefined()

    confirmFagus()
    await act(async () => {
      sheet().props.options[0].onPress()
    })
    act(() => {
      byType("AppNotice").props.action.onPress()
    })
    expect(maybeByType("AppNotice")).toBeUndefined()
  })
})
