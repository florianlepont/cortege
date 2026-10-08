import fs from "fs"
import os from "os"
import path from "path"
import ts from "typescript"

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

// 12.2-21 motion audit (ROADMAP criterion 3, D-08). The finders below read the code with its
// comments blanked through the TypeScript parser, so a comment that names an animation (the motion
// tokens in brand-tokens.ts mention `withSpring(`) is never reported.

type LineFinding = Finding & { line: number }

/** The file's code with every comment (JSDoc included) blanked to spaces; offsets and lines kept. */
function codeText(file: string): string {
  const text = read(file)
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const chars = text.replace(/[^\n]/g, " ").split("")
  const visit = (node: ts.Node) => {
    if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode) {
      return
    }
    const children = node.getChildren(source)
    if (children.length > 0) {
      children.forEach(visit)
      return
    }
    for (let index = node.getStart(source); index < node.getEnd(); index += 1) {
      chars[index] = text[index]
    }
  }
  visit(source)
  return chars.join("")
}

function lineAt(text: string, index: number): number {
  return text.slice(0, index).split("\n").length
}

/** The text of a call's argument list, from the `(` at `open` to its matching `)`. */
function callArguments(code: string, open: number): string {
  let depth = 0
  for (let index = open; index < code.length; index += 1) {
    if (code[index] === "(") depth += 1
    if (code[index] === ")") {
      depth -= 1
      if (depth === 0) return code.slice(open, index + 1)
    }
  }
  return code.slice(open)
}

/**
 * Reanimated timings that ignore Reduce Motion. A file that reads `useReducedMotion()` branches on
 * it (it skips or jumps the animation itself); anywhere else each `withTiming`, `withSpring` and
 * `withDelay` call must carry `ReduceMotion.System` in its own arguments.
 */
function findUnguardedTimings(files: string[]): LineFinding[] {
  return files.flatMap((file) => {
    const code = codeText(file)
    if (code.includes("useReducedMotion(")) return []
    return [...code.matchAll(/\b(withTiming|withSpring|withDelay)\(/g)]
      .filter((match) => {
        const open = (match.index ?? 0) + match[0].length - 1
        return !callArguments(code, open).includes("ReduceMotion.System")
      })
      .map((match) => ({ file, line: lineAt(code, match.index ?? 0), rule: "unguarded-timing" }))
  })
}

// The older screens still on React Native's own Animated API (RESEARCH: left as they are). Each one
// guards Reduce Motion itself, except ConfettiBurst, which WelcomeScreen only renders when its own
// reduced-motion check is false.
const LEGACY_ANIMATED_ALLOWLIST: { file: string; reason: string; guarded: boolean }[] = [
  {
    file: "src/screens/AuthGateScreen.tsx",
    reason: "sign-in entrance sequence, skipped when AccessibilityInfo reports Reduce Motion",
    guarded: true,
  },
  {
    file: "src/screens/WelcomeScreen.tsx",
    reason: "welcome entrance springs, skipped under Reduce Motion (AccessibilityInfo)",
    guarded: true,
  },
  {
    file: "src/screens/auth-gate/HeroSection.tsx",
    reason: "sign-in hero ripples, off under the screen's reducedMotion prop and in the background",
    guarded: true,
  },
  {
    file: "src/components/TypewriterSplash.tsx",
    reason: "splash typing and cursor blink, whole name and no cursor under Reduce Motion",
    guarded: true,
  },
  {
    file: "src/ui/ConfettiBurst.tsx",
    reason: "one-shot burst, only rendered by WelcomeScreen when its reduced-motion check is false",
    guarded: false,
  },
  {
    file: "src/screens/public-map/ExplorerSheet.tsx",
    reason:
      "Explorer panel slide and snap-back under a PanResponder drag; placed at once under useReducedMotion() (12.2-21)",
    guarded: true,
  },
]

function posix(file: string): string {
  return file.split(path.sep).join("/")
}

function allowlistEntry<T extends { file: string }>(list: T[], file: string): T | undefined {
  return list.find((entry) => posix(file).endsWith(`/${entry.file}`))
}

/**
 * React Native `Animated` motion outside the allowlist, and an allowlisted file that lost its
 * reduced-motion guard (`AccessibilityInfo`, `useReducedMotion(` or a `reducedMotion` identifier).
 */
function findLegacyAnimatedOutsideAllowlist(files: string[]): Finding[] {
  return files.flatMap((file) => {
    const code = codeText(file)
    if (!/\bAnimated\.(timing|spring|loop)\(/.test(code)) return []
    const entry = allowlistEntry(LEGACY_ANIMATED_ALLOWLIST, file)
    if (!entry) return [{ file, rule: "legacy-animated-outside-allowlist" }]
    if (!entry.guarded) return []
    const guarded =
      code.includes("AccessibilityInfo") ||
      code.includes("useReducedMotion(") ||
      /\breducedMotion\b/.test(code)
    return guarded ? [] : [{ file, rule: "legacy-animated-unguarded" }]
  })
}

// Endless loops run only while their screen can be seen (12.2-19 and 12.2-21): `useScreenVisible()`
// is focused in its navigator and not under an app overlay. The two loops of the sign-in overlay
// live outside the navigator, as the topmost layer, so the screen's own visibility is theirs.
const OVERLAY_LOOPS: { file: string; reason: string }[] = [
  {
    file: "src/screens/auth-gate/HeroSection.tsx",
    reason: "sign-in overlay, topmost while shown; the ripples also pause in the background",
  },
  {
    file: "src/components/TypewriterSplash.tsx",
    reason: "sign-in overlay's splash while the session restores, topmost and short-lived",
  },
]

function findUngatedLoops(files: string[]): Finding[] {
  return files
    .filter((file) => {
      const code = codeText(file)
      if (!/\bwithRepeat\(|\bAnimated\.loop\(/.test(code)) return false
      if (allowlistEntry(OVERLAY_LOOPS, file)) return false
      return !code.includes("useScreenVisible(")
    })
    .map((file) => ({ file, rule: "ungated-loop" }))
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

describe("findUnguardedTimings", () => {
  it("reports a withTiming with neither ReduceMotion.System nor useReducedMotion, by line", () => {
    const file = writeFixture(
      "src/ui/Bare.tsx",
      [
        "export function toggle() {",
        "  a.value = withTiming(1, { duration: 200, reduceMotion: ReduceMotion.System })",
        "  b.value = withTiming(1, { duration: 200 })",
        "  c.value = withDelay(80, withSpring(1, springs.press))",
        "  d.value = withDelay(80, withTiming(1, { reduceMotion: ReduceMotion.System }))",
        "}",
      ].join("\n"),
    )

    expect(findUnguardedTimings([file])).toEqual([
      { file, line: 3, rule: "unguarded-timing" },
      { file, line: 4, rule: "unguarded-timing" },
      { file, line: 4, rule: "unguarded-timing" },
    ])
  })

  it("accepts a component that branches on useReducedMotion()", () => {
    const file = writeFixture(
      "src/ui/Press.tsx",
      [
        "export function Press() {",
        "  const reduced = useReducedMotion()",
        "  const onIn = () => { if (!reduced) scale.value = withSpring(0.97, springs.press) }",
        "}",
      ].join("\n"),
    )

    expect(findUnguardedTimings([file])).toEqual([])
  })

  it("ignores timings named in comments, as brand-tokens.ts does", () => {
    const file = writeFixture(
      "src/app/tokens.ts",
      [
        "// Config objects for `withSpring(value, brandMotion.springs.press)`.",
        "/* consumers pass these into withTiming(x) */",
        "/** Same shape as `withDelay(ms, anim)`. */",
        "export const springs = { press: { damping: 18 } }",
      ].join("\n"),
    )

    expect(findUnguardedTimings([file])).toEqual([])
  })
})

describe("findLegacyAnimatedOutsideAllowlist", () => {
  it("reports React Native Animated motion outside the allowlist", () => {
    const file = writeFixture(
      "src/screens/NewScreen.tsx",
      "Animated.timing(v, { toValue: 1, useNativeDriver: true }).start()\n",
    )

    expect(findLegacyAnimatedOutsideAllowlist([file])).toEqual([
      { file, rule: "legacy-animated-outside-allowlist" },
    ])
  })

  it("reports an allowlisted file without its reduced-motion guard", () => {
    const file = writeFixture(
      "src/screens/WelcomeScreen.tsx",
      "Animated.spring(v, { toValue: 1, useNativeDriver: true }).start()\n",
    )

    expect(findLegacyAnimatedOutsideAllowlist([file])).toEqual([
      { file, rule: "legacy-animated-unguarded" },
    ])
  })

  it("accepts guarded allowlisted files, ConfettiBurst unguarded, and comments or Reanimated", () => {
    const welcome = writeFixture(
      "src/screens/WelcomeScreen.tsx",
      [
        "void AccessibilityInfo.isReduceMotionEnabled().then(setReduced)",
        "Animated.spring(v, { toValue: 1, useNativeDriver: true }).start()",
      ].join("\n"),
    )
    const hero = writeFixture(
      "src/screens/auth-gate/HeroSection.tsx",
      "if (!reducedMotion) Animated.loop(Animated.timing(v, cfg)).start()\n",
    )
    const sheet = writeFixture(
      "src/screens/public-map/ExplorerSheet.tsx",
      "const reduced = useReducedMotion()\nAnimated.timing(v, cfg).start()\n",
    )
    const confetti = writeFixture(
      "src/ui/ConfettiBurst.tsx",
      "Animated.parallel([Animated.timing(v, cfg)]).start()\n",
    )
    const other = writeFixture(
      "src/ui/Modern.tsx",
      "// Animated.timing( was the old way\nexport const A = () => <Animated.View />\n",
    )

    expect(findLegacyAnimatedOutsideAllowlist([welcome, hero, sheet, confetti, other])).toEqual([])
  })
})

describe("findUngatedLoops", () => {
  it("reports an endless loop that runs whether or not its screen is seen", () => {
    const reanimatedLoop = writeFixture(
      "src/ui/Pulse.tsx",
      "const r = useReducedMotion()\nv.value = withRepeat(withTiming(1), -1)\n",
    )
    const legacyLoop = writeFixture(
      "src/screens/Blink.tsx",
      "Animated.loop(Animated.timing(v, cfg)).start()\n",
    )

    expect(findUngatedLoops([reanimatedLoop, legacyLoop])).toEqual([
      { file: reanimatedLoop, rule: "ungated-loop" },
      { file: legacyLoop, rule: "ungated-loop" },
    ])
  })

  it("accepts a loop gated by useScreenVisible, the overlay loops and loops in comments", () => {
    const gated = writeFixture(
      "src/ui/Glow.tsx",
      "const visible = useScreenVisible()\nif (visible) v.value = withRepeat(t, -1)\n",
    )
    const overlay = writeFixture(
      "src/components/TypewriterSplash.tsx",
      "Animated.loop(Animated.timing(v, cfg)).start()\n",
    )
    const commented = writeFixture("src/ui/Note.tsx", "// withRepeat( is gated elsewhere\n")

    expect(findUngatedLoops([gated, overlay, commented])).toEqual([])
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

  it("has no Reanimated timing that ignores Reduce Motion (12.2-21)", () => {
    expect(findUnguardedTimings(files)).toEqual([])
  })

  it("keeps React Native Animated to the guarded allowlist (12.2-21)", () => {
    expect(findLegacyAnimatedOutsideAllowlist(files)).toEqual([])
    for (const { file, reason } of LEGACY_ANIMATED_ALLOWLIST) {
      expect(reason.length).toBeGreaterThan(20)
      expect(fs.existsSync(path.join(SRC_ROOT, "..", file))).toBe(true)
    }
    // ConfettiBurst's exemption holds only while WelcomeScreen is its one user, behind the check.
    const confettiUsers = files.filter((file) => codeText(file).includes("<ConfettiBurst"))
    expect(confettiUsers.map((file) => path.basename(file))).toEqual(["WelcomeScreen.tsx"])
    expect(codeText(confettiUsers[0])).toMatch(/reducedMotion \? null : <ConfettiBurst/)
  })

  it("runs every endless loop only while its screen can be seen (12.2-21)", () => {
    expect(findUngatedLoops(files)).toEqual([])
    for (const { file } of OVERLAY_LOOPS) {
      expect(fs.existsSync(path.join(SRC_ROOT, "..", file))).toBe(true)
    }
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
