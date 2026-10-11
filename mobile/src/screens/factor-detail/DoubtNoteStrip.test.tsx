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
    Switch: mockComponent("Switch"),
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

describe("DoubtNoteStrip closed (D-16)", () => {
  test("shows only the switch row and the note link, no field, no preview", () => {
    const { one, byTestID, texts, root } = render()
    expect(one("factor-doubt-switch")).toBeDefined()
    expect(one("factor-note-link")).toBeDefined()
    expect(byTestID("factor-note-field")).toHaveLength(0)
    expect(byTestID("factor-note-preview")).toHaveLength(0)
    expect(texts()).toEqual([t.doubt.label, t.note.add])
    expect(root.findByType("Switch" as unknown as React.ElementType).props.value).toBe(false)
  })

  test("the row is a switch named Douteux with its hint; the Switch itself is not a target", () => {
    const { one, root } = render({ doubt: true })
    const row = one("factor-doubt-switch")
    expect(row.props.accessibilityRole).toBe("switch")
    expect(row.props.accessibilityState).toEqual({ checked: true })
    expect(row.props.accessibilityLabel).toBe(t.doubt.label)
    expect(row.props.accessibilityHint).toBe(t.doubt.hint)
    const native = root.findByType("Switch" as unknown as React.ElementType)
    expect(native.props.value).toBe(true)
    expect(native.props.pointerEvents).toBe("none")
    expect(native.props.accessible).toBe(false)
    expect(native.props.trackColor).toEqual({
      false: defaultTheme.colors.divider,
      true: defaultTheme.colors.ochre,
    })
  })

  test("pressing the row toggles the doubt once, with a selection tick", () => {
    const { one, props } = render()
    act(() => {
      one("factor-doubt-switch").props.onPress()
    })
    expect(props.onChangeDoubt).toHaveBeenCalledTimes(1)
    expect(props.onChangeDoubt).toHaveBeenCalledWith(true)
    expect(feedback.selection).toHaveBeenCalledTimes(1)
  })

  test("pressing the row of a doubt turns it off", () => {
    const { one, props } = render({ doubt: true })
    act(() => {
      one("factor-doubt-switch").props.onPress()
    })
    expect(props.onChangeDoubt).toHaveBeenCalledWith(false)
  })

  test("doubt off: no tint at all, 'Sur' is never labelled", () => {
    const { one, texts } = render()
    const style = flat(one("factor-doubt-switch").props.style)
    expect(style.backgroundColor).toBeUndefined()
    expect(style.borderColor).toBe("transparent")
    expect(texts().join(" ")).not.toMatch(/S[uû]r/)
  })
})

describe("DoubtNoteStrip warning tint (UI-SPEC Color, plan 27-03 contrast finding)", () => {
  test("light: hairline and warning label, no soft fill (the ochre track fails 3:1 on it)", () => {
    const { one, root } = render({ doubt: true })
    const style = flat(one("factor-doubt-switch").props.style)
    expect(style.backgroundColor).toBeUndefined()
    expect(style.borderColor).toBe(defaultTheme.componentColors.notice.warningBorder)
    expect(style.paddingVertical).toBe(12)
    expect(style.paddingHorizontal).toBe(16)
    const label = root.findAll(
      (n) => (n.type as unknown) === "Text" && n.props.children === t.doubt.label,
    )[0]
    expect(flat(label.props.style).color).toBe(defaultTheme.onSurface.warning)
  })

  test("dark: the soft fill stays", () => {
    mockScheme = "dark"
    const dark = buildTheme("dark")
    const { one, root } = render({ doubt: true })
    const style = flat(one("factor-doubt-switch").props.style)
    expect(style.backgroundColor).toBe(dark.colors.warningSoft)
    expect(style.borderColor).toBe(dark.componentColors.notice.warningBorder)
    const label = root.findAll(
      (n) => (n.type as unknown) === "Text" && n.props.children === t.doubt.label,
    )[0]
    expect(flat(label.props.style).color).toBe(dark.onSurface.warning)
    expect(root.findByType("Switch" as unknown as React.ElementType).props.trackColor.true).toBe(
      dark.colors.ochre,
    )
  })
})

describe("DoubtNoteStrip note", () => {
  test("the link opens the field in place with focus, the counter and the visibility helper", () => {
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

  test("open: the link reads 'Fermer la note' with a chevron, and closes the field", () => {
    const { one, byTestID, texts, root } = render()
    act(() => {
      one("factor-note-link").props.onPress()
    })
    expect(texts()).toContain(t.note.close)
    expect(root.findByType(Ionicons).props.name).toBe("chevron-up-outline")
    act(() => {
      one("factor-note-link").props.onPress()
    })
    expect(byTestID("factor-note-field")).toHaveLength(0)
    expect(texts()).toContain(t.note.add)
    expect(root.findByType(Ionicons).props.name).toBe("create-outline")
  })

  test("a note that exists: 'Modifier la note' and a two-line preview that opens the field", () => {
    const { one, byTestID, texts } = render({ note: "Un vieux chêne creux" })
    expect(texts()).toContain(t.note.edit)
    expect(one("factor-note-link").props.accessibilityLabel).toBe(t.note.editA11y(TITLE))
    const preview = byTestID("factor-note-preview").find((n) => typeof n.type === "string")!
    const previewText = preview.findByType("Text" as unknown as React.ElementType)
    expect(previewText.props.children).toBe("Un vieux chêne creux")
    expect(previewText.props.numberOfLines).toBe(2)
    expect(byTestID("factor-note-field")).toHaveLength(0)
    act(() => {
      preview.props.onPress()
    })
    expect(one("factor-note-field").props.value).toBe("Un vieux chêne creux")
    expect(byTestID("factor-note-preview")).toHaveLength(0)
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
