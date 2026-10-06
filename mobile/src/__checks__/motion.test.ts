import fs from "fs"
import os from "os"
import path from "path"

import { setReducedMotion, useReducedMotion } from "../../test/react-native-reanimated.mock"

// The Reanimated mock re-exports host components from react-native, which Jest cannot load in
// this node environment; only the toggle is exercised here.
jest.mock("react-native", () => ({
  FlatList: "FlatList",
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
}))

// Phase 12.2 motion gates (D-08): motion is always `ReduceMotion.System` (or a `useReducedMotion()`
// guard for loops), haptics go only through `src/ui/feedback.ts`, and neither the legacy layout
// animation module nor a JS-driven animation comes back. Each finder takes file paths and returns
// the files that break its rule.

type Finding = { file: string; rule: string }

// Built from two parts so this file never contains the identifier it forbids elsewhere.
const LEGACY_LAYOUT_MODULE = ["Layout", "Animation"].join("")

function read(file: string): string {
  return fs.readFileSync(file, "utf8")
}

function findLegacyLayoutAnimation(files: string[]): Finding[] {
  const pattern = new RegExp(`\\b${LEGACY_LAYOUT_MODULE}\\b`)
  return files
    .filter((file) => pattern.test(read(file)))
    .map((file) => ({ file, rule: "legacy-layout-animation" }))
}

function findNativeDriverOff(files: string[]): Finding[] {
  return files
    .filter((file) => /useNativeDriver:\s*false/.test(read(file)))
    .map((file) => ({ file, rule: "native-driver-off" }))
}

function findUnguardedBuilders(files: string[]): Finding[] {
  return files
    .filter((file) => {
      const text = read(file)
      if (!/\b(entering|exiting|layout)=\{/.test(text)) return false
      return !text.includes("ReduceMotion.System") && !/\buseEntrance\b/.test(text)
    })
    .map((file) => ({ file, rule: "unguarded-builder" }))
}

function findUnguardedRepeat(files: string[]): Finding[] {
  return files
    .filter((file) => {
      const text = read(file)
      if (!text.includes("withRepeat(")) return false
      return !text.includes("ReduceMotion.System") && !text.includes("useReducedMotion(")
    })
    .map((file) => ({ file, rule: "unguarded-repeat" }))
}

function findHapticsOutsideFeedback(files: string[]): Finding[] {
  return files
    .filter((file) => {
      if (file.split(path.sep).join("/").endsWith("src/ui/feedback.ts")) return false
      return /from\s+["']expo-haptics["']/.test(read(file))
    })
    .map((file) => ({ file, rule: "haptics-outside-feedback" }))
}

const SRC_ROOT = path.resolve(__dirname, "..")
const CHECKS_DIR = path.join(SRC_ROOT, "__checks__")

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return full === CHECKS_DIR ? [] : sourceFiles(full)
    if (!/\.(ts|tsx)$/.test(entry.name) || /\.test\.(ts|tsx)$/.test(entry.name)) return []
    return [full]
  })
}

let fixtureRoot = ""

function writeFixture(relativePath: string, content: string): string {
  const filePath = path.join(fixtureRoot, relativePath)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
  return filePath
}

beforeEach(() => {
  fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "motion-gates-"))
})

afterEach(() => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true })
  setReducedMotion(false)
})

describe("findLegacyLayoutAnimation", () => {
  it("reports a file using the legacy layout animation module", () => {
    const file = writeFixture(
      "src/ui/Legacy.tsx",
      `import { ${LEGACY_LAYOUT_MODULE} } from "react-native"\n${LEGACY_LAYOUT_MODULE}.easeInEaseOut()\n`,
    )

    expect(findLegacyLayoutAnimation([file])).toEqual([{ file, rule: "legacy-layout-animation" }])
  })

  it("ignores a file using Reanimated layout transitions", () => {
    const file = writeFixture(
      "src/ui/Modern.tsx",
      'import { LinearTransition } from "react-native-reanimated"\nexport const t = LinearTransition\n',
    )

    expect(findLegacyLayoutAnimation([file])).toEqual([])
  })
})

describe("findNativeDriverOff", () => {
  it("reports a JS-driven animation", () => {
    const file = writeFixture(
      "src/ui/Js.tsx",
      "Animated.timing(v, { toValue: 1, useNativeDriver: false }).start()\n",
    )

    expect(findNativeDriverOff([file])).toEqual([{ file, rule: "native-driver-off" }])
  })

  it("ignores a native-driven animation", () => {
    const file = writeFixture(
      "src/ui/Native.tsx",
      "Animated.timing(v, { toValue: 1, useNativeDriver: true }).start()\n",
    )

    expect(findNativeDriverOff([file])).toEqual([])
  })
})

describe("findUnguardedBuilders", () => {
  it("reports an entering prop built without ReduceMotion.System or useEntrance", () => {
    const file = writeFixture(
      "src/ui/Bare.tsx",
      "export const A = () => <Animated.View entering={FadeIn.duration(200)} />\n",
    )

    expect(findUnguardedBuilders([file])).toEqual([{ file, rule: "unguarded-builder" }])
  })

  it("accepts an entering prop built with ReduceMotion.System", () => {
    const file = writeFixture(
      "src/ui/Guarded.tsx",
      [
        "export const A = () => (",
        "  <Animated.View entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)} />",
        ")",
      ].join("\n"),
    )

    expect(findUnguardedBuilders([file])).toEqual([])
  })

  it("accepts a file that gets its entrance from useEntrance", () => {
    const file = writeFixture(
      "src/ui/Hook.tsx",
      [
        'import { useEntrance } from "./useEntrance"',
        "export const A = () => <Animated.View entering={useEntrance(0)} />",
      ].join("\n"),
    )

    expect(findUnguardedBuilders([file])).toEqual([])
  })
})

describe("findUnguardedRepeat", () => {
  it("reports a loop with neither ReduceMotion.System nor useReducedMotion", () => {
    const file = writeFixture(
      "src/ui/Loop.tsx",
      "export const start = () => { v.value = withRepeat(withTiming(1), -1) }\n",
    )

    expect(findUnguardedRepeat([file])).toEqual([{ file, rule: "unguarded-repeat" }])
  })

  it("accepts a loop guarded by useReducedMotion, Skeleton style", () => {
    const file = writeFixture(
      "src/ui/Skeleton.tsx",
      [
        "export function Skeleton() {",
        "  const reduced = useReducedMotion()",
        "  if (!reduced) v.value = withRepeat(withTiming(1), -1)",
        "}",
      ].join("\n"),
    )

    expect(findUnguardedRepeat([file])).toEqual([])
  })
})

describe("findHapticsOutsideFeedback", () => {
  it("reports expo-haptics imported outside src/ui/feedback.ts", () => {
    const file = writeFixture(
      "src/screens/Tap.tsx",
      'import * as Haptics from "expo-haptics"\nHaptics.selectionAsync()\n',
    )

    expect(findHapticsOutsideFeedback([file])).toEqual([{ file, rule: "haptics-outside-feedback" }])
  })

  it("accepts expo-haptics imported by src/ui/feedback.ts", () => {
    const file = writeFixture("src/ui/feedback.ts", 'import * as Haptics from "expo-haptics"\n')

    expect(findHapticsOutsideFeedback([file])).toEqual([])
  })
})

describe("motion gates on mobile/src", () => {
  const files = sourceFiles(SRC_ROOT)

  it("scans a real set of source files", () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it("has no legacy layout animation", () => {
    expect(findLegacyLayoutAnimation(files)).toEqual([])
  })

  it("has no JS-driven animation", () => {
    expect(findNativeDriverOff(files)).toEqual([])
  })

  it("has no entering, exiting or layout builder without a reduced-motion guard", () => {
    expect(findUnguardedBuilders(files)).toEqual([])
  })

  it("has no withRepeat loop without a reduced-motion guard", () => {
    expect(findUnguardedRepeat(files)).toEqual([])
  })

  it("imports expo-haptics only in src/ui/feedback.ts", () => {
    expect(findHapticsOutsideFeedback(files)).toEqual([])
  })
})

describe("reduced motion mock toggle", () => {
  it("follows setReducedMotion", () => {
    expect(useReducedMotion()).toBe(false)
    setReducedMotion(true)
    expect(useReducedMotion()).toBe(true)
    setReducedMotion(false)
    expect(useReducedMotion()).toBe(false)
  })
})
