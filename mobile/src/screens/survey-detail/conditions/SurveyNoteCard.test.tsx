import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { fr } from "../../../i18n"
import { SurveyNoteCard } from "./SurveyNoteCard"

jest.mock("react-native", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    TextInput: mockComponent("TextInput"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
    Platform: { OS: "ios", select: <T,>(options: Record<string, T>): T | undefined => options.ios },
  }
})

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const originalError = console.error
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

afterEach(() => {
  jest.useRealTimers()
})

const t = fr.conditions

type NoteProps = React.ComponentProps<typeof SurveyNoteCard>

function noteProps(over: Partial<NoteProps> = {}): NoteProps {
  return { editable: true, loaded: true, stored: null, onChangeNote: jest.fn(), ...over }
}

function mount(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer
  act(() => {
    tree = renderer.create(element)
  })
  return tree
}

const byTestId = (tree: ReactTestRenderer, testID: string): ReactTestInstance =>
  tree.root.find((node) => node.props.testID === testID && typeof node.type === "string")

/** Every text string drawn by a Text of the tree. */
function texts(tree: ReactTestRenderer): string[] {
  return tree.root
    .findAll((node) => (node.type as unknown) === "Text")
    .map((node) => [node.props.children].flat(Infinity).join(""))
}

describe("SurveyNoteCard editable (D-05, D-06, D-33)", () => {
  const note = (tree: ReactTestRenderer) => byTestId(tree, "survey-note-field")

  test("shows the stored note with a 1000 character field, the helper and the counter", () => {
    const tree = mount(<SurveyNoteCard {...noteProps({ stored: "Sol frais" })} />)

    expect(note(tree).props.value).toBe("Sol frais")
    expect(note(tree).props.maxLength).toBe(1000)
    expect(note(tree).props.accessibilityHint).toBe(t.note.a11yHint)
    expect(texts(tree)).toContain(t.note.visibility)
    expect(texts(tree)).toContain("9 / 1000")
    expect(texts(tree)).toContain(t.note.label)
  })

  test("writes the note 400 ms after typing stops, once", () => {
    jest.useFakeTimers()
    const onChangeNote = jest.fn()
    const tree = mount(<SurveyNoteCard {...noteProps({ onChangeNote })} />)

    act(() => {
      note(tree).props.onChangeText("So")
    })
    act(() => {
      jest.advanceTimersByTime(300)
    })
    act(() => {
      note(tree).props.onChangeText("Sol")
    })
    act(() => {
      jest.advanceTimersByTime(300)
    })
    expect(onChangeNote).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(100)
    })
    expect(onChangeNote).toHaveBeenCalledTimes(1)
    expect(onChangeNote).toHaveBeenCalledWith("Sol")
    expect(note(tree).props.value).toBe("Sol")
  })

  test("blur writes at once and the debounce does not write it twice", () => {
    jest.useFakeTimers()
    const onChangeNote = jest.fn()
    const tree = mount(<SurveyNoteCard {...noteProps({ onChangeNote })} />)

    act(() => {
      note(tree).props.onFocus({})
      note(tree).props.onChangeText("Sol frais")
    })
    act(() => {
      note(tree).props.onBlur({})
    })
    expect(onChangeNote).toHaveBeenCalledWith("Sol frais")

    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(onChangeNote).toHaveBeenCalledTimes(1)
  })

  test("leaving the page writes what is still waiting", () => {
    jest.useFakeTimers()
    const onChangeNote = jest.fn()
    const tree = mount(<SurveyNoteCard {...noteProps({ onChangeNote })} />)

    act(() => {
      note(tree).props.onChangeText("À finir")
    })
    act(() => {
      tree.unmount()
    })

    expect(onChangeNote).toHaveBeenCalledWith("À finir")
  })

  test("leaving the page with nothing new writes nothing", () => {
    const onChangeNote = jest.fn()
    const tree = mount(<SurveyNoteCard {...noteProps({ onChangeNote, stored: "Déjà là" })} />)

    act(() => {
      tree.unmount()
    })

    expect(onChangeNote).not.toHaveBeenCalled()
  })

  test("an emptied note is sent as an empty text", () => {
    jest.useFakeTimers()
    const onChangeNote = jest.fn()
    const tree = mount(<SurveyNoteCard {...noteProps({ onChangeNote, stored: "Sol frais" })} />)

    act(() => {
      note(tree).props.onChangeText("")
    })
    act(() => {
      jest.advanceTimersByTime(400)
    })

    expect(onChangeNote).toHaveBeenCalledWith("")
  })

  test("the stored note is adopted when the field is not being typed in", () => {
    const element = (stored: string | null) => <SurveyNoteCard {...noteProps({ stored: stored })} />
    const tree = mount(element("avant"))

    act(() => {
      tree.update(element("après"))
    })

    expect(note(tree).props.value).toBe("après")
  })

  test("the stored note never replaces the text being typed, nor a note already written", () => {
    jest.useFakeTimers()
    const element = (stored: string | null) => <SurveyNoteCard {...noteProps({ stored: stored })} />
    const tree = mount(element(null))

    act(() => {
      note(tree).props.onFocus({})
      note(tree).props.onChangeText("en cours ")
    })
    act(() => {
      tree.update(element("ancien"))
    })
    expect(note(tree).props.value).toBe("en cours ")

    act(() => {
      note(tree).props.onBlur({})
    })
    // The write path trims: the stored copy equal to the trimmed text changes nothing.
    act(() => {
      tree.update(element("en cours"))
    })
    expect(note(tree).props.value).toBe("en cours ")
  })

  test("a text waiting for its debounce is not replaced either", () => {
    jest.useFakeTimers()
    const element = (stored: string | null) => <SurveyNoteCard {...noteProps({ stored: stored })} />
    const tree = mount(element(null))

    act(() => {
      note(tree).props.onChangeText("attente")
    })
    act(() => {
      tree.update(element("autre"))
    })

    expect(note(tree).props.value).toBe("attente")
  })
})

describe("SurveyNoteCard read only (D-03, D-33)", () => {
  test("after submit the note is plain selectable text, no field and no counter", () => {
    const tree = mount(
      <SurveyNoteCard {...noteProps({ editable: false, stored: "Sol frais\nPas de vent" })} />,
    )

    expect(texts(tree)).toEqual([t.note.label, "Sol frais\nPas de vent"])
    expect(byTestId(tree, "survey-note-text").props.selectable).toBe(true)
    expect(tree.root.findAll((n) => (n.type as unknown) === "TextInput")).toHaveLength(0)
  })

  test("an empty or blank note draws no card", () => {
    for (const stored of [null, "", "   "]) {
      const tree = mount(<SurveyNoteCard {...noteProps({ editable: false, stored })} />)
      expect(tree.toJSON()).toBeNull()
    }
  })

  test("nothing is drawn until the draft was read, editable or not", () => {
    for (const editable of [true, false]) {
      const tree = mount(
        <SurveyNoteCard {...noteProps({ editable, loaded: false, stored: "x" })} />,
      )
      expect(tree.toJSON()).toBeNull()
    }
  })
})
