import React from "react"
import renderer, { act } from "react-test-renderer"
import { Ionicons } from "@expo/vector-icons"
import type { FactorKey } from "../../app/types"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { FactorIntro, HELP_LINK_MIN_HEIGHT } from "./FactorIntro"

const t = fr.factorDetail
const intro = fr.factorDetail.dmhList.intro

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
    useColorScheme: () => "light",
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

const flat = (style: unknown): Record<string, unknown> =>
  Array.isArray(style)
    ? style.reduce<Record<string, unknown>>((acc, entry) => ({ ...acc, ...flat(entry) }), {})
    : ((style as Record<string, unknown> | null | undefined) ?? {})

const textOf = (node: renderer.ReactTestInstance): string =>
  node.children.map((child) => (typeof child === "string" ? child : textOf(child))).join("")

function render(factor: FactorKey, countedInFull = false) {
  const onOpenHelp = jest.fn()
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <FactorIntro factor={factor} countedInFull={countedInFull} onOpenHelp={onOpenHelp} />,
    )
  })
  const link = tree.root.findAll(
    (n) => typeof n.type === "string" && n.props.testID === "factor-help-link",
  )[0]
  return { tree, onOpenHelp, link }
}

describe("FactorIntro, the help row of factors A to E and G to J", () => {
  test.each(["A", "B", "C", "D", "E", "G", "H", "I", "J"] as FactorKey[])(
    "%s: a slim 44 pt button named 'Aide au relevé', with no paragraph",
    (factor) => {
      const { tree, link, onOpenHelp } = render(factor)
      expect(link.props.accessibilityRole).toBe("button")
      expect(link.props.accessibilityLabel).toBe("Aide au relevé")
      expect(link.props.accessibilityLabel).toBe(t.helpLink)
      expect(HELP_LINK_MIN_HEIGHT).toBe(44)
      expect(flat(link.props.style).minHeight).toBe(44)
      expect(tree.root.findAll((n) => n.props.testID === "factor-intro")).toHaveLength(0)
      act(() => {
        link.props.onPress()
      })
      expect(onOpenHelp).toHaveBeenCalledTimes(1)
    },
  )

  test("the label of the slim row is glued too, the spoken name keeps its spaces", () => {
    const { link } = render("C")
    expect(link.props.accessibilityLabel).toBe("Aide au relevé")
    const text = link.findAll((n) => (n.type as unknown) === "Text")[0]
    expect(textOf(text)).not.toMatch(/ /)
  })

  test("information-circle-outline, accent text token, no 'Que relever'", () => {
    const { tree } = render("C")
    const icons = tree.root.findAllByType(Ionicons)
    expect(icons[0].props.name).toBe("information-circle-outline")
    expect(icons[0].props.color).toBe(defaultTheme.visual.accentText)
    const text = tree.root.findAll((n) => (n.type as unknown) === "Text")[0]
    expect(textOf(text)).toBe("Aide\u00A0au\u00A0relevé")
    expect(flat(text.props.style).color).toBe(defaultTheme.visual.accentText)
    expect(JSON.stringify(t)).not.toMatch(/Que relever/)
  })
})

describe("FactorIntro, factor F", () => {
  test("the capped paragraph, the cap in semibold, and the link ends it inline", () => {
    const { tree, link, onOpenHelp } = render("F")
    const paragraph = tree.root.findAll(
      (n) => typeof n.type === "string" && n.props.testID === "factor-intro",
    )[0]
    expect(textOf(paragraph).startsWith(`${intro.capped.lead}${intro.capped.strong}`)).toBe(true)
    expect(textOf(paragraph)).toContain(
      "Comptez les arbres vivants porteurs de dendromicrohabitats : au plus 2 par groupe et par hectare. Touchez l'icône i d'un groupe pour apprendre à le reconnaître, même sans réseau.",
    )
    const strong = paragraph.findAll(
      (n) => (n.type as unknown) === "Text" && n.props.children === intro.capped.strong,
    )[0]
    expect(flat(strong.props.style).fontFamily).toBe("Jost-SemiBold")
    expect(flat(paragraph.props.style).fontFamily).toBe("Jost-Regular")
    // The link is a child of the paragraph, after the whole text.
    expect(link.props.accessibilityRole).toBe("link")
    expect(link.props.accessibilityLabel).toBe(t.helpLink)
    expect(textOf(link)).toContain("Aide\u00A0au\u00A0relevé")
    expect(textOf(paragraph).endsWith(textOf(link))).toBe(true)
    act(() => {
      link.props.onPress()
    })
    expect(onOpenHelp).toHaveBeenCalledTimes(1)
  })

  test("the link never splits: no regular space inside it, no-break spaces around the words", () => {
    const { link } = render("F")
    // Glyph, no-break space, the three words glued, no-break space, chevron.
    const text = textOf(link)
    expect(text).toBe("\u00A0Aide\u00A0au\u00A0relevé\u00A0")
    expect(text).not.toMatch(/ /)
    expect(text).toMatch(/Aide\u00A0au\u00A0relevé/)
    // The spoken name keeps normal spaces.
    expect(link.props.accessibilityLabel).toBe("Aide au relevé")
    expect(link.props.accessibilityLabel).toMatch(/Aide au relevé/)
  })

  test("counted in full the paragraph names the cap that only the score applies", () => {
    const { tree } = render("F", true)
    const paragraph = tree.root.findAll(
      (n) => typeof n.type === "string" && n.props.testID === "factor-intro",
    )[0]
    expect(textOf(paragraph)).toContain(
      "Pour le score, l'app garde au plus 2 arbres par hectare et par groupe.",
    )
    expect(textOf(paragraph)).toContain("Touchez l'icône i d'un groupe")
  })

  test("the paragraph uses 'dendromicrohabitats' in full and no em dash", () => {
    for (const parts of [intro.capped, intro.full]) {
      const text = `${parts.lead}${parts.strong}${parts.tail}`
      expect(text).toContain("dendromicrohabitats")
      expect(text).not.toMatch(/DMH|—/)
    }
  })
})
