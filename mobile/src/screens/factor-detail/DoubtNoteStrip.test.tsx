import React from "react"
import renderer, { act } from "react-test-renderer"
import { Ionicons } from "@expo/vector-icons"
import { fr } from "../../i18n"
import { BrandThemeProvider, defaultTheme } from "../../app/theme"
import { buildTheme } from "../../app/theme"
import { feedback } from "../../ui/feedback"
import { setReducedMotion } from "../../../test/react-native-reanimated.mock"
import { DoubtNoteStrip, NOTE_COMMIT_DELAY_MS } from "./DoubtNoteStrip"

const t = fr.factorDetail.strip
const TITLE = "Bois mort sur pied"

// The system appearance the mocked useColorScheme reports.
let mockScheme: "light" | "dark" = "light"

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
    Platform: { OS: "ios", select: (options: { default?: unknown }) => options.default },
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
    useColorScheme: () => mockScheme,
  }
})

jest.mock("../../ui/feedback", () => ({ feedback: { selection: jest.fn() } }))

jest.mock("../../ui/NoteField", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    NoteField: (props: Record<string, unknown>) => ReactRef.createElement("NoteField", props),
  }
})

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

beforeEach(() => {
  jest.useFakeTimers()
  jest.mocked(feedback.selection).mockClear()
  mockScheme = "light"
})

afterEach(() => {
  jest.useRealTimers()
  setReducedMotion(false)
})

type Overrides = Partial<React.ComponentProps<typeof DoubtNoteStrip>>

function render(overrides: Overrides = {}) {
  const props = {
    factor: "C" as const,
    title: TITLE,
    doubt: false,
    note: "",
    onChangeDoubt: jest.fn(),
    onChangeNote: jest.fn(),
    onCommitNote: jest.fn(),
    ...overrides,
  }
  const element = (p: typeof props) => (
    <BrandThemeProvider>
      <DoubtNoteStrip {...p} />
    </BrandThemeProvider>
  )
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(element(props))
  })
  const root = tree.root
  const byTestID = (id: string) => root.findAll((n) => n.props.testID === id)
  const one = (id: string) => byTestID(id).find((n) => typeof n.type === "string")!
  const texts = () =>
    root.findAll((n) => (n.type as unknown) === "Text").map((n) => String(n.props.children))
  const rerender = (next: Overrides) =>
    act(() => {
      tree.update(element({ ...props, ...next }))
    })
  return { tree, props, one, byTestID, texts, rerender, root }
}

const flat = (style: unknown): Record<string, unknown> =>
  Array.isArray(style)
    ? style.reduce<Record<string, unknown>>((acc, entry) => ({ ...acc, ...flat(entry) }), {})
    : ((style as Record<string, unknown> | null | undefined) ?? {})

const icons = (root: renderer.ReactTestInstance) =>
  root.findAllByType(Ionicons).map((node) => node.props.name)

describe("DoubtNoteStrip closed (D-16, follow-up 32-27)", () => {
  test("shows only the two pills, no field, no separate preview", () => {
    const { one, byTestID, texts, root } = render()
    expect(one("factor-doubt-switch")).toBeDefined()
    expect(one("factor-note-link")).toBeDefined()
    expect(byTestID("factor-note-field")).toHaveLength(0)
    expect(byTestID("factor-note-preview")).toHaveLength(0)
    expect(texts()).toEqual([t.doubt.label, t.note.label])
    expect(icons(root)).toEqual(["flag-outline", "create-outline"])
  })

  test("the pills are 36 pt high with a slop that brings each target to 44", () => {
    const { one } = render()
    for (const id of ["factor-doubt-switch", "factor-note-link"]) {
      const node = one(id)
      expect(flat(node.props.style).minHeight).toBe(36)
      expect(node.props.hitSlop).toEqual({ top: 4, bottom: 4, left: 0, right: 0 })
    }
  })

  test("the doubt pill is a switch named Douteux with its hint and its state", () => {
    const { one } = render({ doubt: true })
    const pill = one("factor-doubt-switch")
    expect(pill.props.accessibilityRole).toBe("switch")
    expect(pill.props.accessibilityState).toEqual({ checked: true })
    expect(pill.props.accessibilityLabel).toBe(t.doubt.label)
    expect(pill.props.accessibilityHint).toBe(t.doubt.hint)
  })

  test("pressing the pill toggles the doubt once, with a selection tick", () => {
    const { one, props } = render()
    act(() => {
      one("factor-doubt-switch").props.onPress()
    })
    expect(props.onChangeDoubt).toHaveBeenCalledTimes(1)
    expect(props.onChangeDoubt).toHaveBeenCalledWith(true)
    expect(feedback.selection).toHaveBeenCalledTimes(1)
  })

  test("pressing the pill of a doubt turns it off", () => {
    const { one, props } = render({ doubt: true })
    act(() => {
      one("factor-doubt-switch").props.onPress()
    })
    expect(props.onChangeDoubt).toHaveBeenCalledWith(false)
  })

  test("doubt off: the glass pill, no warning tint, 'Sur' is never labelled", () => {
    const { one, texts } = render()
    const style = flat(one("factor-doubt-switch").props.style)
    expect(style.backgroundColor).toBe(defaultTheme.visual.glass.cardFill)
    expect(style.borderColor).toBe(defaultTheme.visual.glass.cardBorder)
    expect(texts().join(" ")).not.toMatch(/S[uû]r/)
  })
})

describe("DoubtNoteStrip warning tint (UI-SPEC Color)", () => {
  const labelColor = (root: renderer.ReactTestInstance, scheme: ReturnType<typeof buildTheme>) => {
    const label = root.findAll(
      (n) => (n.type as unknown) === "Text" && n.props.children === t.doubt.label,
    )[0]
    expect(flat(label.props.style).color).toBe(scheme.onSurface.warning)
  }

  test("light: warning-soft fill, warning hairline and ink, flag glyph in the same ink", () => {
    const { one, root } = render({ doubt: true })
    const style = flat(one("factor-doubt-switch").props.style)
    expect(style.backgroundColor).toBe(defaultTheme.colors.warningSoft)
    expect(style.borderColor).toBe(defaultTheme.componentColors.notice.warningBorder)
    labelColor(root, defaultTheme)
    expect(root.findAllByType(Ionicons)[0].props.color).toBe(defaultTheme.onSurface.warning)
  })

  test("dark: the same tokens of the dark scheme", () => {
    mockScheme = "dark"
    const dark = buildTheme("dark")
    const { one, root } = render({ doubt: true })
    const style = flat(one("factor-doubt-switch").props.style)
    expect(style.backgroundColor).toBe(dark.colors.warningSoft)
    expect(style.borderColor).toBe(dark.componentColors.notice.warningBorder)
    labelColor(root, dark)
  })
})

describe("DoubtNoteStrip note", () => {
  test("the pill opens the field in place with focus, the counter and the visibility helper", () => {
    const { one, byTestID } = render()
    const link = one("factor-note-link")
    expect(link.props.accessibilityState).toEqual({ expanded: false })
    expect(link.props.accessibilityLabel).toBe(t.note.addA11y(TITLE))
    act(() => {
      link.props.onPress()
    })
    const field = one("factor-note-field")
    expect(byTestID("factor-note-field").length).toBeGreaterThan(0)
    expect(field.props.maxLength).toBe(300)
    expect(field.props.autoFocus).toBe(true)
    expect(field.props.label).toBe(t.note.fieldLabel(TITLE))
    expect(field.props.helper).toBe(t.note.visibility)
    expect(field.props.accessibilityHint).toBe(t.note.hint)
    expect(field.props.placeholder).toBe(t.note.placeholder)
    expect(field.props.minHeight).toBe(96)
    expect(field.props.maxHeight).toBe(144)
    expect(field.props.counterLabel(12)).toBe("12 / 300")
    expect(field.props.counterA11y(12)).toBe("12 caractères sur 300")
    expect(one("factor-note-link").props.accessibilityState).toEqual({ expanded: true })
    expect(one("factor-note-link").props.accessibilityLabel).toBe(t.note.closeA11y(TITLE))
  })

  test("open: the pill shows a chevron up and a tap closes the field", () => {
    const { one, byTestID, root } = render()
    act(() => {
      one("factor-note-link").props.onPress()
    })
    expect(icons(root)).toEqual(["flag-outline", "chevron-up-outline"])
    expect(flat(one("factor-note-link").props.style).borderColor).toBe(
      defaultTheme.visual.accentText,
    )
    act(() => {
      one("factor-note-link").props.onPress()
    })
    expect(byTestID("factor-note-field")).toHaveLength(0)
    expect(icons(root)).toEqual(["flag-outline", "create-outline"])
  })

  test("a note that exists: 'Note : ' and its text on one line in the pill, which opens the field", () => {
    const { one, byTestID, root } = render({ note: "Un vieux chêne creux" })
    const link = one("factor-note-link")
    expect(link.props.accessibilityLabel).toBe(t.note.editA11y(TITLE))
    const text = link.findByType("Text" as unknown as React.ElementType)
    expect(text.props.children).toBe("Note : Un vieux chêne creux")
    expect(text.props.numberOfLines).toBe(1)
    expect(flat(link.props.style).flexShrink).toBe(1)
    expect(byTestID("factor-note-field")).toHaveLength(0)
    expect(byTestID("factor-note-preview")).toHaveLength(0)
    act(() => {
      link.props.onPress()
    })
    expect(one("factor-note-field").props.value).toBe("Un vieux chêne creux")
    expect(icons(root)).toContain("chevron-up-outline")
  })

  test("the preview is one line: breaks and runs of spaces collapse", () => {
    const { one } = render({ note: "Sol\n\n  très   humide " })
    expect(
      one("factor-note-link").findByType("Text" as unknown as React.ElementType).props.children,
    ).toBe("Note : Sol très humide")
  })

  test("typing reports the text and writes once, 400 ms after the last keystroke", () => {
    const { one, props } = render()
    act(() => {
      one("factor-note-link").props.onPress()
    })
    act(() => {
      one("factor-note-field").props.onChangeText("a")
    })
    act(() => {
      jest.advanceTimersByTime(NOTE_COMMIT_DELAY_MS - 100)
      one("factor-note-field").props.onChangeText("ab")
    })
    expect(props.onChangeNote).toHaveBeenNthCalledWith(1, "a")
    expect(props.onChangeNote).toHaveBeenNthCalledWith(2, "ab")
    act(() => {
      jest.advanceTimersByTime(NOTE_COMMIT_DELAY_MS - 1)
    })
    expect(props.onCommitNote).not.toHaveBeenCalled()
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(props.onCommitNote).toHaveBeenCalledTimes(1)
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    expect(props.onCommitNote).toHaveBeenCalledTimes(1)
  })

  test("blur writes at once, cancels the pause and does not close the field", () => {
    const { one, props, byTestID } = render({ note: "x" })
    act(() => {
      one("factor-note-link").props.onPress()
    })
    act(() => {
      one("factor-note-field").props.onChangeText("xy")
    })
    act(() => {
      one("factor-note-field").props.onCommit("xy")
    })
    expect(props.onCommitNote).toHaveBeenCalledTimes(1)
    expect(byTestID("factor-note-field").length).toBeGreaterThan(0)
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    expect(props.onCommitNote).toHaveBeenCalledTimes(1)
  })

  test("blur with nothing pending still writes", () => {
    const { one, props } = render()
    act(() => {
      one("factor-note-link").props.onPress()
    })
    act(() => {
      one("factor-note-field").props.onCommit("")
    })
    expect(props.onCommitNote).toHaveBeenCalledTimes(1)
  })

  test("unmounting with a write pending writes at once", () => {
    const { one, props, tree } = render()
    act(() => {
      one("factor-note-link").props.onPress()
    })
    act(() => {
      one("factor-note-field").props.onChangeText("abc")
    })
    expect(props.onCommitNote).not.toHaveBeenCalled()
    act(() => {
      tree.unmount()
    })
    expect(props.onCommitNote).toHaveBeenCalledTimes(1)
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    expect(props.onCommitNote).toHaveBeenCalledTimes(1)
  })

  test("unmounting with nothing pending writes nothing", () => {
    const { props, tree } = render()
    act(() => {
      tree.unmount()
    })
    expect(props.onCommitNote).not.toHaveBeenCalled()
  })

  test("toggling the doubt with the note open leaves the field mounted", () => {
    const { one, byTestID, rerender } = render()
    act(() => {
      one("factor-note-link").props.onPress()
    })
    rerender({ doubt: true })
    expect(byTestID("factor-note-field").length).toBeGreaterThan(0)
  })

  test("under Reduce Motion the field still opens (the builders carry ReduceMotion.System)", () => {
    setReducedMotion(true)
    const { one, byTestID } = render()
    act(() => {
      one("factor-note-link").props.onPress()
    })
    expect(byTestID("factor-note-field").length).toBeGreaterThan(0)
  })
})
