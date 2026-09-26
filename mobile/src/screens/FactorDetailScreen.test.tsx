import React from "react"
import renderer, { act } from "react-test-renderer"
import { IBP_METHOD_V3_0, IBP_METHOD_V3_2, type IbpMethodVersion } from "@cortege/ibp-domain"
import type { FactorField, FactorKey } from "../app/types"
import { fr } from "../i18n"
import { FactorDetailScreen } from "./FactorDetailScreen"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? "")
    if (message.includes("react-test-renderer is deprecated")) {
      return
    }
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

jest.mock("react-native", () => {
  const mockComponent = (name: string) => {
    const ReactRef = require("react") as typeof import("react")
    return ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  }
  return {
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Platform: { OS: "ios", select: (options: { default?: unknown }) => options.default },
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  }
})

jest.mock("../ui/AppCard", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppCard: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("AppCard", null, children),
  }
})

jest.mock("../ui/AppSectionHeader", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppSectionHeader: ({ title, subtitle }: { title: string; subtitle?: string }) =>
      ReactRef.createElement("AppSectionHeader", { title, subtitle }),
  }
})

jest.mock("../ui/AppStatusChip", () => ({ AppStatusChip: () => null }))

jest.mock("../ui/AppField", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppField: (props: { label: string }) => ReactRef.createElement("AppField", props),
  }
})

type Node = renderer.ReactTestInstance

const textOf = (node: Node): string =>
  node.children.map((child) => (typeof child === "string" ? child : textOf(child))).join("")

const field = (label: string): FactorField => ({
  label,
  value: "",
  onChange: jest.fn(),
  required: true,
  error: null,
})

const renderDetail = (
  factor: FactorKey,
  fields: FactorField[],
  methodVersion: IbpMethodVersion | null,
) => {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <FactorDetailScreen
        factor={factor}
        fields={fields}
        retainedScore={null}
        methodVersion={methodVersion}
      />,
    )
  })
  // Open the capture help so the input hints render.
  act(() => {
    tree.root.findByType("Pressable" as unknown as React.ElementType).props.onPress()
  })
  const texts = tree.root
    .findAllByType("Text" as unknown as React.ElementType)
    .map((node) => textOf(node))
  const inputs = tree.root.findAllByType("AppField" as unknown as React.ElementType)
  return { texts, inputs }
}

const A_FIELDS = [field("native_genus_count"), field("native_cover_percent")]

describe("FactorDetailScreen help per method version", () => {
  test("v3.2 shows the v3.2 help and hints for A (with the cover cap)", () => {
    const { texts } = renderDetail("A", A_FIELDS, IBP_METHOD_V3_2)
    expect(texts).toContain(fr.ibpMethod.factorHelp.A)
    expect(fr.ibpMethod.factorHelp.A).toContain("50 %")
    for (const hint of fr.ibpMethod.factorInputHints.A) {
      expect(texts).toContain(hint)
    }
    expect(texts).not.toContain(fr.labels.factorHelp.A)
  })

  test.each<[string, IbpMethodVersion | null]>([
    ["v3.0", IBP_METHOD_V3_0],
    ["untagged", null],
  ])("%s shows the v3.0 help and hints", (_name, version) => {
    const { texts } = renderDetail("A", A_FIELDS, version)
    expect(texts).toContain(fr.labels.factorHelp.A)
    for (const hint of fr.labels.factorInputHints.A) {
      expect(texts).toContain(hint)
    }
    expect(texts).not.toContain(fr.ibpMethod.factorHelp.A)
  })
})

describe("FactorDetailScreen fields", () => {
  test("A renders the genus count and the native cover fields it receives", () => {
    const { inputs } = renderDetail("A", A_FIELDS, IBP_METHOD_V3_2)
    expect(inputs.map((input) => input.props.label)).toEqual([
      fr.factorDetail.requiredField({ label: fr.factorDetail.fieldLabels.native_genus_count }),
      fr.factorDetail.requiredField({ label: fr.factorDetail.fieldLabels.native_cover_percent }),
    ])
  })

  test("B renders the strata count only", () => {
    const { inputs } = renderDetail("B", [field("strata_count")], IBP_METHOD_V3_2)
    expect(inputs.map((input) => input.props.label)).toEqual([
      fr.factorDetail.requiredField({ label: fr.factorDetail.fieldLabels.strata_count }),
    ])
  })
})
