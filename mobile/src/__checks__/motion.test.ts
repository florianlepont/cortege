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
      return !text.includes("ReduceMotion.System")
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

// Hero motion budget (12.2-19 fifth round): a screen shows at most two animated hero layers, the
// forest card's aurora (`ForestCard`, unless `motion={false}`, or `ForestAurora` itself) and the
// drifting `ContourLines` (unless `animated={false}`). Counted over the files a route reaches
// through relative imports inside `src/screens` and `src/navigation`, so a layer behind a branch
// still counts: the bound is an upper one. The `ui` primitives themselves are not walked.
const HERO_BUDGET = 2
const HERO_TAGS: { tag: string; off: string | null }[] = [
  { tag: "ForestCard", off: "motion={false}" },
  { tag: "ForestAurora", off: null },
  { tag: "ContourLines", off: "animated={false}" },
]

/** The opening tags of `tag` in `text`, each up to its closing `>` outside braces. */
function openingTags(text: string, tag: string): string[] {
  const tags: string[] = []
  const pattern = new RegExp(`<${tag}\\b`, "g")
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    let depth = 0
    let end = match.index
    for (; end < text.length; end += 1) {
      const char = text[end]
      if (char === "{") depth += 1
      if (char === "}") depth -= 1
      if (char === ">" && depth === 0) break
    }
    tags.push(text.slice(match.index, end + 1))
  }
  return tags
}

function countHeroLayers(text: string): number {
  return HERO_TAGS.reduce(
    (sum, { tag, off }) =>
      sum + openingTags(text, tag).filter((opening) => !off || !opening.includes(off)).length,
    0,
  )
}

function resolveImport(from: string, specifier: string): string | null {
  const base = path.resolve(path.dirname(from), specifier)
  const candidates = [
    `${base}.tsx`,
    `${base}.ts`,
    path.join(base, "index.tsx"),
    path.join(base, "index.ts"),
  ]
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null
}

/** Every file `entry` reaches through relative imports inside `roots`, itself included. */
function reachable(entry: string, roots: string[]): string[] {
  const seen = new Set<string>()
  const queue = [entry]
  while (queue.length > 0) {
    const file = queue.pop() as string
    if (seen.has(file)) continue
    seen.add(file)
    for (const match of read(file).matchAll(/from\s+["'](\.{1,2}\/[^"']+)["']/g)) {
      const target = resolveImport(file, match[1])
      if (target && roots.some((root) => target.startsWith(root + path.sep))) queue.push(target)
    }
  }
  return [...seen]
}

type HeroCount = { route: string; layers: number }

function countHeroBudget(routes: string[], roots: string[]): HeroCount[] {
  return routes.map((route) => ({
    route: path.basename(route),
    layers: reachable(route, roots).reduce((sum, file) => sum + countHeroLayers(read(file)), 0),
  }))
}

function findHeroBudgetBreaches(routes: string[], roots: string[]): Finding[] {
  return countHeroBudget(routes, roots)
    .filter(({ layers }) => layers > HERO_BUDGET)
    .map(({ route }) => ({ file: route, rule: "hero-motion-budget" }))
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
  it("reports an entering prop built without ReduceMotion.System", () => {
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

describe("hero motion budget", () => {
  it("counts the animated hero layers of a tag, not the still ones", () => {
    expect(
      countHeroLayers(
        [
          "<ForestCard zone={zone === null ? null : { left: 3 }}>",
          "<ForestCard motion={false} />",
          "<ContourLines animated={false} />",
          "<ContourLines />",
          "<ForestAurora zone={z} />",
          "<ForestCardish />",
        ].join("\n"),
      ),
    ).toBe(3)
  })

  it("reports a route whose screen and components show more than two", () => {
    const card = writeFixture(
      "src/screens/area/Card.tsx",
      "export const C = () => <ForestCard />\n",
    )
    const screen = writeFixture(
      "src/screens/Busy.tsx",
      'import { C } from "./area/Card"\nimport { X } from "../ui/Missing"\n' +
        "export const S = () => <><C /><C /><ContourLines /></>\n",
    )
    const calm = writeFixture(
      "src/screens/Calm.tsx",
      'import { C } from "./area/Card"\nexport const S = () => <><C /><ContourLines animated={false} /></>\n',
    )
    const route = writeFixture(
      "src/navigation/routes/BusyRoute.tsx",
      'import { S } from "../../screens/Busy"\nimport { S as T } from "../../screens/Busy"\n',
    )
    const calmRoute = writeFixture(
      "src/navigation/routes/CalmRoute.tsx",
      'import { S } from "../../screens/Calm"\n',
    )
    const roots = [path.join(fixtureRoot, "src/screens"), path.join(fixtureRoot, "src/navigation")]
    expect([card, screen, calm].every((file) => fs.existsSync(file))).toBe(true)
    expect(countHeroBudget([route, calmRoute], roots)).toEqual([
      { route: "BusyRoute.tsx", layers: 2 },
      { route: "CalmRoute.tsx", layers: 1 },
    ])
    // The card counts once per file: the bound is on what the sources can show.
    writeFixture(
      "src/screens/area/Card.tsx",
      "export const C = () => <><ForestCard /><ForestAurora /></>\n",
    )
    expect(findHeroBudgetBreaches([route, calmRoute], roots)).toEqual([
      { file: "BusyRoute.tsx", rule: "hero-motion-budget" },
    ])
    expect(resolveImport(route, "../../screens")).toBeNull()
    writeFixture("src/screens/index.ts", "export {}\n")
    expect(resolveImport(route, "../../screens")).toBe(
      path.join(fixtureRoot, "src/screens/index.ts"),
    )
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

  it("shows at most two animated hero layers per screen, one forest card on each (12.2-19)", () => {
    const routesDir = path.join(SRC_ROOT, "navigation", "routes")
    const routes = sourceFiles(routesDir).filter((file) => file.endsWith("Route.tsx"))
    const roots = [path.join(SRC_ROOT, "screens"), path.join(SRC_ROOT, "navigation")]
    expect(routes.length).toBeGreaterThan(10)
    expect(findHeroBudgetBreaches(routes, roots)).toEqual([])
    const counts = Object.fromEntries(
      countHeroBudget(routes, roots).map(({ route, layers }) => [route, layers]),
    )
    expect(counts).toMatchObject({
      "HomeRoute.tsx": 1,
      "SurveyListRoute.tsx": 1,
      "SurveyDetailRoute.tsx": 1,
    })
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
