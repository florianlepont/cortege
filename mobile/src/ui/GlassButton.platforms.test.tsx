import fs from "fs"
import path from "path"
import type { ReactTestInstance, ReactTestRenderer } from "react-test-renderer"

// D-28: the native SwiftUI glass button only where it can exist (iOS 26 and later, in a binary that
// carries `@expo/ui`); the flat fallback everywhere else; and Android never loads the SwiftUI side.

type Setup = {
  os: "ios" | "android"
  liquidGlass: boolean
  expoUiModule: boolean
  iosFile: boolean
}

/** Renders a `GlassButton` in a fresh module registry with the given platform facts. */
function renderIn({ os, liquidGlass, expoUiModule, iosFile }: Setup): ReactTestInstance {
  let root: ReactTestInstance | undefined
  jest.isolateModules(() => {
    jest.doMock("react-native", () => {
      const ReactRef = require("react") as typeof import("react")
      const mockComponent =
        (name: string) =>
        ({ children, ...props }: { children?: React.ReactNode }) =>
          ReactRef.createElement(name, props, children)
      return {
        View: mockComponent("View"),
        Text: mockComponent("Text"),
        ActivityIndicator: mockComponent("ActivityIndicator"),
        Pressable: ({
          children,
          ...props
        }: {
          children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode)
        }) =>
          ReactRef.createElement(
            "Pressable",
            props,
            typeof children === "function" ? children({ pressed: false }) : children,
          ),
        Platform: { OS: os },
        StyleSheet: {
          create: <T,>(styles: T) => styles,
          absoluteFill: {},
          flatten: (style: unknown) => style ?? {},
        },
      }
    })
    jest.doMock("expo-glass-effect", () => ({
      isLiquidGlassAvailable: () => liquidGlass,
      GlassView: () => null,
    }))
    jest.doMock("expo", () => ({
      requireOptionalNativeModule: () => (expoUiModule ? {} : null),
    }))
    if (iosFile) {
      // What Metro resolves on iOS; Jest resolves the default (Android) file otherwise.
      jest.doMock("./NativeGlassButton", () => jest.requireActual("./NativeGlassButton.ios"))
    }
    const React = require("react") as typeof import("react")
    const renderer = require("react-test-renderer") as typeof import("react-test-renderer")
    const { GlassButton } = require("./GlassButton") as typeof import("./GlassButton")
    let tree: ReactTestRenderer | undefined
    renderer.act(() => {
      tree = renderer.create(React.createElement(GlassButton, { label: "OK", onPress: () => {} }))
    })
    root = tree!.root
  })
  return root!
}

function count(root: ReactTestInstance, name: string): number {
  return root.findAll((n) => (n.type as unknown) === name).length
}

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const originalConsoleError = console.error
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

describe("GlassButton picks the native glass button only where it exists", () => {
  test("iOS 26 with @expo/ui in the binary: the native button", () => {
    const root = renderIn({ os: "ios", liquidGlass: true, expoUiModule: true, iosFile: true })
    expect(count(root, "Host")).toBe(1)
    expect(count(root, "Pressable")).toBe(0)
  })

  test("iOS 26 in a binary built before @expo/ui: the flat fallback, no crash", () => {
    const root = renderIn({ os: "ios", liquidGlass: true, expoUiModule: false, iosFile: true })
    expect(count(root, "Host")).toBe(0)
    expect(count(root, "Pressable")).toBe(1)
  })

  test("iOS before 26: the flat fallback (glassProminent would fall back to the plain style)", () => {
    const root = renderIn({ os: "ios", liquidGlass: false, expoUiModule: true, iosFile: true })
    expect(count(root, "Host")).toBe(0)
    expect(count(root, "Pressable")).toBe(1)
  })

  test("Android: the flat fallback from the default half of the split", () => {
    const root = renderIn({
      os: "android",
      liquidGlass: false,
      expoUiModule: false,
      iosFile: false,
    })
    expect(count(root, "Host")).toBe(0)
    expect(count(root, "Pressable")).toBe(1)
  })

  test("the default half renders nothing and says the native button is unavailable", () => {
    const { NativeGlassButton, NATIVE_GLASS_BUTTON_AVAILABLE } =
      jest.requireActual<typeof import("./NativeGlassButton")>("./NativeGlassButton")
    expect(NATIVE_GLASS_BUTTON_AVAILABLE).toBe(false)
    expect(
      NativeGlassButton({
        label: "OK",
        accessibilityLabel: "OK",
        controlSize: "large",
        minHeight: 50,
        tint: "#000000",
        ink: "#FFFFFF",
        fontFamily: "Sora-Bold",
        fontSize: 16,
        colorScheme: "light",
        disabled: false,
        loading: false,
        onPress: () => {},
      }),
    ).toBeNull()
  })
})

const SRC = path.resolve(__dirname, "..")
const MOBILE = path.resolve(SRC, "..")

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [full] : []
  })
}

/**
 * The modules a source file loads at run time from `@expo/ui`: every `import ... from` statement
 * (each one ends at its own `from "..."`), side-effect `import "..."`, and `require("...")`, minus
 * `import type`, which the compiler erases.
 */
function runtimeExpoUiImports(text: string): string[] {
  const found: string[] = []
  for (const match of text.matchAll(/^import\s+(type\s+)?[\s\S]*?\sfrom\s+["']([^"']+)["']/gm)) {
    if (!match[1] && match[2].startsWith("@expo/ui")) found.push(match[2])
  }
  for (const match of text.matchAll(/^import\s+["'](@expo\/ui[^"']*)["']/gm)) found.push(match[1])
  for (const match of text.matchAll(/require\(\s*["'](@expo\/ui[^"']*)["']/g)) found.push(match[1])
  return found
}

describe("Android never loads the SwiftUI side (D-28)", () => {
  test("the import scan sees value imports and requires, and skips type imports", () => {
    expect(
      runtimeExpoUiImports(
        [
          'import { View } from "react-native"',
          'import type { ImageProps } from "@expo/ui/swift-ui"',
          "import {",
          "  Host,",
          '} from "@expo/ui/swift-ui"',
          'import "@expo/ui/side-effect"',
          'const m = require("@expo/ui/swift-ui/modifiers")',
        ].join("\n"),
      ),
    ).toEqual(["@expo/ui/swift-ui", "@expo/ui/side-effect", "@expo/ui/swift-ui/modifiers"])
    expect(
      runtimeExpoUiImports(
        'import { View } from "react-native"\nimport type { X } from "@expo/ui/swift-ui"',
      ),
    ).toEqual([])
  })

  test("only *.ios.tsx files import @expo/ui at run time", () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => !/\.ios\.tsx?$/.test(file))
      .filter((file) => runtimeExpoUiImports(fs.readFileSync(file, "utf8")).length > 0)
      .map((file) => path.relative(SRC, file))
    expect(offenders).toEqual([])
    // And the iOS half is the one that does.
    expect(
      runtimeExpoUiImports(
        fs.readFileSync(path.join(__dirname, "NativeGlassButton.ios.tsx"), "utf8"),
      ),
    ).toEqual(["@expo/ui/swift-ui", "@expo/ui/swift-ui/modifiers"])
  })

  test("there is no Android half that Metro would prefer over the default file", () => {
    expect(fs.existsSync(path.join(__dirname, "NativeGlassButton.android.tsx"))).toBe(false)
    expect(fs.existsSync(path.join(__dirname, "NativeGlassButton.native.tsx"))).toBe(false)
  })

  test("package.json pins @expo/ui to SDK 57 and keeps it out of Android autolinking", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(MOBILE, "package.json"), "utf8")) as {
      dependencies: Record<string, string>
      expo: { autolinking?: { android?: { exclude?: string[] } } }
    }
    expect(pkg.dependencies["@expo/ui"]).toMatch(/^~57\.0\.\d+$/)
    expect(pkg.expo.autolinking?.android?.exclude).toContain("@expo/ui")
  })
})
