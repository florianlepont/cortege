# Phase 33: local render harness, baseline and design probe

Written by plan 33-01 (2026-10-24). Read this before any plan of phase 33 that must look at a real page.

## Purpose

Chromium (Google Chrome on this Mac) prints the HTML of the real PDF builders to a real PDF in about a second per case. It approximates neither WebKit (iOS `printToFileAsync`) nor Skia (Android): the per-platform layout scale (iOS 1.2487, Android 4/3), the `zoom` handling and the font subsetting of the phones are not reproduced, so a Chrome render is a layout and proportion check only (research section 10.2). Anything that depends on the phone engines is confirmed on the simulator and the emulator by plan 33-14. The harness is throwaway: its files live in the session scratchpad and are never committed, and no file under `mobile/`, `api/`, `packages/` or `docs/` is added or changed. Only this markdown is kept, so any later executor recreates the harness from the blocks below in a few minutes.

Rule: harness files, JPEGs, HTML, PDFs and PNGs stay in the scratchpad (`$HARNESS_DIR`, a folder outside the repository). Never `git add` them. The harness test is named `*.harness.test.ts` and is found only because `roots` of its own jest config points at the scratchpad folder; the repository jest configs do not see it.

## Tools used (all present on this Mac)

- Node and `npx jest` from the repository (`mobile/` workspace, `ts-jest` already installed at the repo root `node_modules`)
- `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"` headless print
- poppler: `pdfinfo`, `pdffonts`, `pdfimages`, `pdftoppm` (`/opt/homebrew/bin`)
- macOS `sips` (JPEG preparation of photos, basemap and logo)

## Setup (once per session)

```bash
cd <worktree root>                                  # the repository root of the session
export WORKTREE=$(pwd)
export HARNESS_DIR=<scratchpad>/pdf-harness         # any folder outside the repository
export HARNESS_OUT=$HARNESS_DIR/out
mkdir -p $HARNESS_DIR/img $HARNESS_OUT

# 24 distinct real photos (800 px long edge, JPEG 65: the PHOTO_EXPORT_SETTINGS of the app),
# one 1030 x 680 basemap stand-in (the 2x of MAP_FRAME_SIZE), the logo at 240 px (LOGO_EXPORT_WIDTH_PX).
# The herbarium images of mobile/assets are only a source of real JPEG content.
i=1; for p in $(ls mobile/assets/herbier/*.jpg | head -24); do
  sips -Z 800 -s format jpeg -s formatOptions 65 "$p" --out $HARNESS_DIR/img/photo-$i.jpg >/dev/null; i=$((i+1)); done
sips -z 680 1030 -s format jpeg -s formatOptions 70 mobile/assets/herbier/composee_frene.jpg --out $HARNESS_DIR/img/basemap.jpg >/dev/null
sips -Z 240 mobile/assets/logo-app.png --out $HARNESS_DIR/img/logo-240.png >/dev/null
```

Then create the two files below in `$HARNESS_DIR`.

### `jest.harness.config.js`

```js
// Throwaway harness config (phase 33, plan 01). Env: WORKTREE (repo root), HARNESS_DIR (this folder).
const path = require("path")
const WT = process.env.WORKTREE
const HARNESS = process.env.HARNESS_DIR
if (!WT || !HARNESS) throw new Error("set WORKTREE and HARNESS_DIR")
const MOBILE = path.join(WT, "mobile")
module.exports = {
  rootDir: MOBILE,
  roots: [HARNESS],
  testMatch: ["**/*.harness.test.ts"],
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  modulePaths: [path.join(MOBILE, "node_modules"), path.join(WT, "node_modules")],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      { tsconfig: path.join(MOBILE, "tsconfig.jest.json"), isolatedModules: true, diagnostics: false },
    ],
  },
  moduleNameMapper: {
    "^expo-asset$": MOBILE + "/test/expo-asset.mock.ts",
    "^expo-file-system/legacy$": MOBILE + "/test/expo-file-system-legacy.mock.ts",
    "^expo-image-manipulator$": MOBILE + "/test/expo-image-manipulator.mock.ts",
    "\\.(png|jpg|jpeg|gif|webp|ttf)$": MOBILE + "/test/image.mock.ts",
    "^@cortege/ibp-domain$": WT + "/packages/ibp-domain/src/index.ts",
  },
  globals: { __DEV__: true },
}
```

### `render.harness.test.ts`

```ts
// Throwaway render harness (phase 33, plan 01). Never committed. Env: WORKTREE, HARNESS_DIR, HARNESS_OUT.
import * as fs from "fs"
import * as path from "path"

jest.mock(
  "react-native",
  () => ({
    useColorScheme: () => "light",
    Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios ?? o.default },
    StyleSheet: { create: (s: unknown) => s },
  }),
  { virtual: true },
)

const WT = process.env.WORKTREE as string
const HARNESS = process.env.HARNESS_DIR as string
const OUT = process.env.HARNESS_OUT as string
const MOBILE = path.join(WT, "mobile")

/* eslint-disable @typescript-eslint/no-require-imports */
const { buildSurveyExportHtml } = require(path.join(MOBILE, "src/app/survey-pdf/build-html"))
const fixtures = require(path.join(MOBILE, "test/survey-export-fixtures"))
/* eslint-enable @typescript-eslint/no-require-imports */

type Data = Parameters<typeof buildSurveyExportHtml>[0]

const b64 = (file: string) => fs.readFileSync(file).toString("base64")
const FONTS = ["Sora-ExtraBold", "Sora-SemiBold", "Sora-Medium", "Sora-Light", "Jost-Regular", "Jost-SemiBold"]
const assets = {
  fonts: FONTS.map((family) => ({
    family,
    base64: b64(path.join(MOBILE, "assets/fonts", `${family}.ttf`)),
  })),
  logoDataUri: `data:image/png;base64,${b64(path.join(HARNESS, "img/logo-240.png"))}`,
}

// Pixel size of a JPEG, read from its SOF marker.
function jpegSize(buf: Buffer): { width: number; height: number } {
  let i = 2
  while (i < buf.length) {
    if (buf[i] !== 0xff) throw new Error("bad jpeg")
    const marker = buf[i + 1]
    const len = buf.readUInt16BE(i + 2)
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) }
    }
    i += 2 + len
  }
  throw new Error("no SOF")
}

function realPhotos(n: number) {
  const items = Array.from({ length: n }, (_, k) => {
    const buf = fs.readFileSync(path.join(HARNESS, "img", `photo-${k + 1}.jpg`))
    return { id: `photo-${k + 1}`, dataUri: `data:image/jpeg;base64,${buf.toString("base64")}`, ...jpegSize(buf) }
  })
  return { items, total: n, unavailable: 0 }
}

const basemapUri = `data:image/jpeg;base64,${b64(path.join(HARNESS, "img/basemap.jpg"))}`

const v32: Data = { ...fixtures.exportFixtureV32Submitted, assets }
const v30: Data = { ...fixtures.exportFixtureV30Draft, assets }
const worstBase = fixtures.exportFixtureWorstCase
const worst: Data = {
  ...worstBase,
  assets,
  photos: realPhotos(24),
  map: { ...worstBase.map, basemap: { ...worstBase.map.basemap, dataUri: basemapUri } },
}
const typical: Data = {
  ...fixtures.exportFixtureV32Submitted,
  surveyId: worstBase.surveyId,
  assets,
  parcelIds: ["77186000AB0001"],
  map: {
    polygons: [worstBase.map.polygons[0]],
    basemap: { ...worstBase.map.basemap, dataUri: basemapUri },
    frameSize: worstBase.map.frameSize,
  },
  history: { ...worstBase.history, items: worstBase.history.items.slice(-3) },
  photos: realPhotos(6),
  route: null,
}
const typicalConditioned: Data = {
  ...typical,
  conditions: { note: "Sol humide près du ruisseau.", weather: null },
  route: fixtures.WORST_ROUTE,
}

// "mode" is added by plan 33-02; the spread keeps this file valid before and after.
const withMode = (d: Data): Data => ({ ...d, mode: "complete" }) as unknown as Data

const CASES: Record<string, Data> = {
  v32,
  "v30-draft": v30,
  typical,
  "typical-conditioned": typicalConditioned,
  worst,
}

describe("render harness", () => {
  it("writes one html per case", () => {
    fs.mkdirSync(OUT, { recursive: true })
    const counts: string[] = []
    for (const [name, data] of Object.entries(CASES)) {
      const { html, pageCount } = buildSurveyExportHtml(withMode(data))
      fs.writeFileSync(path.join(OUT, `${name}.html`), html)
      counts.push(`${name} ${pageCount}`)
    }
    fs.writeFileSync(path.join(OUT, "page-counts.txt"), counts.join("\n") + "\n")
  })
})
```

The five cases: `v32` (`exportFixtureV32Submitted`), `v30-draft` (`exportFixtureV30Draft`), `typical` (v3.2 fixture, one parcel `77186000AB0001` with its polygon and the basemap, the last three history items of the worst case ending on the current survey, 6 photos, no route), `typical-conditioned` (typical plus a note and `WORST_ROUTE`) and `worst` (`exportFixtureWorstCase` with 24 real photos and the basemap). Each is wrapped by `withMode`, which adds `mode: "complete"` through a cast: the same file compiles and runs before plan 33-02 (the field is ignored) and after it (the field is required).

## Run

```bash
# 1. HTML of the five cases (from mobile/, 1 s)
cd $WORKTREE/mobile && npx jest -c $HARNESS_DIR/jest.harness.config.js
cat $HARNESS_OUT/page-counts.txt          # "<case> <builder pageCount>"

# 2. Print each case with Chrome headless
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
cd $HARNESS_OUT && for c in v32 v30-draft typical typical-conditioned worst; do
  "$CH" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf=$HARNESS_OUT/$c.pdf file://$HARNESS_OUT/$c.html >/dev/null 2>&1
done

# 3. Measure
for c in v32 v30-draft typical typical-conditioned worst; do
  pdfinfo $c.pdf | grep -E "Pages|Page size|File size"     # pages, A4 594.96 x 841.92, bytes
  pdffonts $c.pdf                                          # six embedded families
  pdfimages -list $c.pdf                                   # logo objects, photos, map JPEG
done

# 4. Pictures (80 dpi is enough for layout; 120 dpi for details)
pdftoppm -r 80 -png typical.pdf typical      # typical-1.png ... typical-6.png
```

Viewing a page: the Read tool opens a PNG and shows the image (`Read $HARNESS_OUT/typical-4.png`). Zero-padding of the page number follows the page count (`worst-01.png` to `worst-10.png`). The whole recipe takes under a minute (about 7 s for the five prints).

Reading the numbers: Chrome prints the logo as one shared image object (same object id on every page) with its soft mask, so a PDF always holds "1 image + 1 smask" for the logo however many pages there are; `pdfimages -list` repeats the line per page. Count photos with `grep -c jpeg`.

## Baseline (before phase 33)

Measured 2026-10-24 on the repository state at the start of phase 33 (builders of phase 30, `mode` absent). Page counts, sizes and fonts are of the Chrome print. The photos are the 24 (or 6) real JPEGs of the setup, so the sizes are a realistic order of magnitude of the device sizes (research: 1.7 to 3.0 MB for 24 distinct photos on a phone; Chrome keeps the JPEG streams as they are).

| Case (UI-SPEC B.11 scenario) | Builder pageCount | Chrome pages | PDF size (KB) | Embedded fonts | Image objects |
|---|---:|---:|---:|---:|---|
| `v32` (v3.2 submitted, no map, no history, no photo) | 4 | 4 | 145.5 | 6 | logo 1 (240 px) |
| `v30-draft` (v3.0 draft, two factors to fill) | 4 | 4 | 145.8 | 6 | logo 1 |
| `typical` (one parcel with basemap, 3-point history, 6 photos) | 6 | 6 | 532.0 | 6 | logo 1, map JPEG 1, photos 6 |
| `typical-conditioned` (typical plus note and full route) | 7 | 7 | 542.7 | 6 | logo 1, map JPEG 1, photos 6 |
| `worst` (34 genera, 3 parcels, 6 history points, 24 photos, full route) | 10 | 10 | 1410.3 | 6 | logo 1, map JPEG 1, photos 24 |

Difference with the research numbers (4, 4, 6, 7, 10 pages): none, builder and Chrome counts are identical to the research table for all five cases.

Notes for the lean-export targets (D-03):

- The logo is already lean (240 px, 18 KB image plus 2 KB mask, shared across pages); with the raw 2481 px logo the same files are about 170 KB larger per case (the first run of this harness, before the logo was resized to the app's 240 px), so the baseline must always use the resized logo.
- The text-only floor is about 145 KB for 4 pages (six subset fonts and the logo dominate).
- Photos are by far the largest part: 24 photos at 800 px and JPEG 65 weigh about 1.1 MB of the 1.41 MB of `worst` (the six photos of `typical` about 0.3 MB of its 0.53 MB); the map JPEG is about 69 KB.
- The map and the trend each sit alone on a page of `typical` (pages 4 and 5, `typical-4.png` shows the map page about half empty), the hole that the research located (section 5: fills of 412 and 331 of 740 units).

## Design probe (Chromium)

Plan 33-01, Task 2. The five risky print effects of UI-SPEC B.2 drawn on one page and printed by Chrome headless with the same shell as the builders (`@page` 595pt x 842pt, root `zoom` 1.33333 so that one design unit is one point, the CSP meta tag and the six inlined fonts of `styles.ts`). The page is a throwaway: it is never committed.

### Setup and run

One more JPEG is needed (a real photo for P-4, so that the clipped corners are visible against a dark panel):

```bash
sips -Z 480 -s format jpeg -s formatOptions 65 mobile/assets/herbier/composee_frene.jpg --out $HARNESS_DIR/img/probe.jpg >/dev/null
```

Create `probe.harness.test.ts` in `$HARNESS_DIR` (below), then:

```bash
cd $WORKTREE/mobile && npx jest -c $HARNESS_DIR/jest.harness.config.js probe
cd $HARNESS_OUT && for c in probe probe-none probe-P1 probe-P2 probe-P3 probe-P4 probe-P5; do
  "$CH" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf=$HARNESS_OUT/$c.pdf file://$HARNESS_OUT/$c.html >/dev/null 2>&1
done
pdfinfo probe.pdf; pdffonts probe.pdf; pdfimages -list probe.pdf; pdftoppm -r 100 -png probe.pdf probe
```

`probe.html` holds the five zones; `probe-none.html` holds none (the size floor); `probe-P1.html` to `probe-P5.html` hold one zone each, to measure the size growth of every zone against the floor. Layout (design units on the 4-grid, page 595 x 840): P-1 two 240 x 120 panels at y 26 (SVG `linearGradient` at x 16, CSS `linear-gradient` at x 300, both `forestStops.a` to `.b` at 55 percent to `.c`); P-2 two 112 rings at y 182 (`rotate(-90 56 56)` at x 16, path arc at x 150); P-4 the rounded JPEG at x 300, y 182 on a forest panel; P-3 the 595 x 380 contour box at y 336; P-5 the numeral at y 740.

### `probe.harness.test.ts`

```ts
// Throwaway design probe P-1 to P-5 (phase 33, plan 01, UI-SPEC B.2). Never committed.
// Env: WORKTREE, HARNESS_DIR, HARNESS_OUT. Writes probe.html (all zones) and probe-none.html and
// probe-P1.html ... probe-P5.html (one zone each) to measure the size growth of every zone.
import * as fs from "fs"
import * as path from "path"

jest.mock(
  "react-native",
  () => ({
    useColorScheme: () => "light",
    Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios ?? o.default },
    StyleSheet: { create: (s: unknown) => s },
  }),
  { virtual: true },
)

const WT = process.env.WORKTREE as string
const HARNESS = process.env.HARNESS_DIR as string
const OUT = process.env.HARNESS_OUT as string
const MOBILE = path.join(WT, "mobile")

/* eslint-disable @typescript-eslint/no-require-imports */
const { cspMetaTag, fontFaceCss } = require(path.join(MOBILE, "src/app/survey-pdf/styles"))
const { buildContourPaths, CONTOUR_VIEWBOX } = require(path.join(MOBILE, "src/app/contour-paths"))
const { forestStops } = require(path.join(MOBILE, "src/app/visual-tokens"))
/* eslint-enable @typescript-eslint/no-require-imports */

const b64 = (file: string) => fs.readFileSync(file).toString("base64")
const FONTS = ["Sora-ExtraBold", "Sora-SemiBold", "Sora-Medium", "Sora-Light", "Jost-Regular", "Jost-SemiBold"]
const fonts = FONTS.map((family) => ({
  family,
  base64: b64(path.join(MOBILE, "assets/fonts", `${family}.ttf`)),
}))
const jpegUri = `data:image/jpeg;base64,${b64(path.join(HARNESS, "img/probe.jpg"))}`

// Brand tones written as plain values: the probe is not app code.
const SAGE = "#B0C78E"
const MOSS = "#89A33A"
const LABEL = 'style="position:absolute;font-family:Jost-SemiBold;font-size:9px;color:#33433A"'
const label = (x: number, y: number, text: string) =>
  `<div ${LABEL.replace("position:absolute;", `position:absolute;left:${x}px;top:${y}px;`)}>${text}</div>`

// P-1: gradient fill, SVG linearGradient and CSS linear-gradient, 240 x 120 each.
function p1(): string {
  const stops = `<stop offset="0" stop-color="${forestStops.a}"/><stop offset="0.55" stop-color="${forestStops.b}"/><stop offset="1" stop-color="${forestStops.c}"/>`
  return [
    label(16, 12, "P-1 svg linearGradient"),
    `<svg style="position:absolute;left:16px;top:26px" width="240" height="120" viewBox="0 0 240 120"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient></defs><rect width="240" height="120" rx="12" fill="url(#g1)"/></svg>`,
    label(300, 12, "P-1 css linear-gradient"),
    `<div style="position:absolute;left:300px;top:26px;width:240px;height:120px;border-radius:12px;background:linear-gradient(135deg,${forestStops.a} 0%,${forestStops.b} 55%,${forestStops.c} 100%)"></div>`,
  ].join("")
}

// P-2: ring of 112, stroke 8, ratio 0.64; first with rotate(-90), second as a path from 12 o'clock.
function p2(): string {
  const size = 112
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const ratio = 0.64
  const mid = size / 2
  const angle = ratio * 2 * Math.PI
  const ex = mid + r * Math.sin(angle)
  const ey = mid - r * Math.cos(angle)
  const track = `<circle cx="${mid}" cy="${mid}" r="${r}" fill="none" stroke="${forestStops.a}" stroke-width="${stroke}"/>`
  const rotated = `<circle cx="${mid}" cy="${mid}" r="${r}" fill="none" stroke="${MOSS}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${(c * ratio).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 ${mid} ${mid})"/>`
  const arc = `<path d="M${mid} ${mid - r} A${r} ${r} 0 ${ratio > 0.5 ? 1 : 0} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}" fill="none" stroke="${MOSS}" stroke-width="${stroke}" stroke-linecap="round"/>`
  return [
    label(16, 168, "P-2 rotate(-90)"),
    `<svg style="position:absolute;left:16px;top:182px" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${track}${rotated}</svg>`,
    label(150, 168, "P-2 path arc"),
    `<svg style="position:absolute;left:150px;top:182px" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${track}${arc}</svg>`,
  ].join("")
}

// P-3: contour art with preserveAspectRatio slice in a 595 x 380 solid forest box, solid strokes.
function p3(): string {
  const { sage, moss } = buildContourPaths(7)
  return [
    label(16, 322, "P-3 contour art, xMaxYMax slice"),
    `<div style="position:absolute;left:0;top:336px;width:595px;height:380px;background:${forestStops.b};overflow:hidden"><svg width="595" height="380" viewBox="${CONTOUR_VIEWBOX}" preserveAspectRatio="xMaxYMax slice"><path d="${sage}" fill="none" stroke="${SAGE}" stroke-width="1"/><path d="${moss}" fill="none" stroke="${MOSS}" stroke-width="1.4"/></svg></div>`,
  ].join("")
}

// P-4: JPEG inside a 240 x 160 box with a 12 radius and overflow hidden.
function p4(): string {
  return [
    label(300, 168, "P-4 rounded jpeg clip"),
    `<div style="position:absolute;left:296px;top:178px;width:248px;height:168px;background:${forestStops.a}"></div><div style="position:absolute;left:300px;top:182px;width:240px;height:160px;border-radius:12px;overflow:hidden;background:#EEF1E6"><img src="${jpegUri}" style="width:240px;height:160px;object-fit:cover;display:block"/></div>`,
  ].join("")
}

// P-5: Sora-Light 64 / 72 with letter-spacing -3, next to "/ 50" in Jost-Regular 20.
function p5(): string {
  return [
    label(16, 724, "P-5 numeral letter-spacing -3"),
    `<div style="position:absolute;left:16px;top:740px;height:72px;white-space:nowrap"><span style="font-family:Sora-Light;font-size:64px;line-height:72px;letter-spacing:-3px;color:${forestStops.a}">32</span><span style="font-family:Jost-Regular;font-size:20px;line-height:72px;margin-left:6px;color:#5B6B5E">/ 50</span></div>`,
  ].join("")
}

const ZONES: Record<string, () => string> = { P1: p1, P2: p2, P3: p3, P4: p4, P5: p5 }

function page(zones: string[]): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${cspMetaTag()}<style>${fontFaceCss(fonts)}
@page { size: 595pt 842pt; margin: 0 }
html, body { margin: 0; padding: 0 }
.root { zoom: 1.33333 }
.page { position: relative; width: 595px; height: 840px; overflow: hidden; background: #fff; font-family: Jost-Regular }
</style></head><body><div class="root"><div class="page">${zones.map((z) => ZONES[z]()).join("")}${label(16, 6, "probe " + (zones.join(" ") || "none"))}</div></div></body></html>`
}

describe("design probe", () => {
  it("writes the probe pages", () => {
    fs.mkdirSync(OUT, { recursive: true })
    fs.writeFileSync(path.join(OUT, "probe.html"), page(Object.keys(ZONES)))
    fs.writeFileSync(path.join(OUT, "probe-none.html"), page([]))
    for (const z of Object.keys(ZONES)) fs.writeFileSync(path.join(OUT, `probe-${z}.html`), page([z]))
  })
})
```

### Results (Chromium, 2026-10-24)

Page: 1 page, A4 594.96 x 841.92 pt (the scale is right: 1 unit = 1 pt, label at x 16 prints at 15.996 pt). `pdffonts probe.pdf`: three subset families embedded (Jost-SemiBold, Sora-Light, Jost-Regular: only the cuts the probe uses). `pdfimages -list probe.pdf`: exactly one raster object, the P-4 JPEG (480 x 409, `jpeg` encoding kept, 22.9 KB); the gradients, rings, contour art and numeral are all vector. Floor (`probe-none.pdf`): 4333 bytes.

| Item | What was drawn | Chromium result | Size growth over the floor (KB) | Fallback named by the contract (UI-SPEC B.2) |
|---|---|---|---:|---|
| P-1 | 240 x 120 rounded panel filled by an SVG `linearGradient` (three stops) and a second by a CSS `linear-gradient(135deg, ...)` | Pass. Both are drawn as smooth three-stop diagonal gradients with correct rounded corners, no raster object, identical look | +3.9 for the two panels | Solid `forest` panel and solid band tones (the contract; the gradient is not part of it) |
| P-2 | Ring 112, stroke 8, ratio 0.64, track `forestStops.a`, arc moss with round caps: (a) circle with `stroke-dasharray` and `transform="rotate(-90 56 56)"`, (b) SVG path arc from 12 o'clock with no transform | Pass. Both arcs start at 12 o'clock and run clockwise to the same end (about 8 o'clock), round caps drawn, vector. On a 4x raster crop 6939 of 602112 channel values differ by more than 40 between (a) and (b): anti-aliasing at the arc edges and caps, the two rings look the same | +5.9 for the two rings | Path arc starting at the top, no transform (variant b, which is also the safer shape) |
| P-3 | 595 x 380 box on solid `forestStops.b` with `buildContourPaths(7)` in an SVG of viewBox `0 0 320 180`, `preserveAspectRatio="xMaxYMax slice"`, solid sage strokes (1) and moss strokes (1.4) | Pass. The art is scaled to cover the box and anchored bottom right, clipped by the box, strokes solid and vector, no `opacity` used | +3.0 | An exact viewBox that matches the box, no `slice` |
| P-4 | Real JPEG in a 240 x 160 box with `border-radius: 12px; overflow: hidden`, on a dark forest panel | Pass. The four corners are clipped round, the JPEG stays one `jpeg` object (no re-encoding, no extra raster), geometry exact | +26.7, of which 22.9 is the JPEG itself, so +3.8 for the clip and structure | Square corners |
| P-5 | "32" in Sora-Light 64 / 72 with `letter-spacing: -3px` next to "/ 50" in Jost-Regular 20 | Pass. `pdftotext -bbox`: with -3 the "32" spans x 16.0 to 91.3 and "/ 50" starts at 94.3; with letter-spacing 0 it spans 16.0 to 94.3 and "/ 50" starts at 100.3, so the spacing is applied (3 units per glyph) and the glyphs do not collide | +6.1, all of it the two font subsets (Sora-Light and Jost-Regular); the letter-spacing itself costs 4 bytes (10439 against 10435) | Letter-spacing 0 and sizes 62 and 38 |

Conclusion for Chromium: all five effects pass and stay vector, so on Chrome nothing forces a fallback. This says nothing yet about WebKit and Skia (the 25.1 finding that iOS print ignores `column-count` and 1-px filled `div`s shows that engines differ); plan 33-14 repeats the probe there. None of the fallbacks changes a layout, and the gradient-only enhancements (the UI-SPEC probe-gated keys `forestEnd` and `bandLowTop`, `bandMidTop`, `bandHighTop`) are NOT built in this phase whatever the device result is: the solid contract is the deliverable (UI-SPEC: "Not needed by the contract").

## Device probe brief for plan 33-14

Goal: confirm P-1 to P-5 on WebKit (iOS simulator) and Skia (Android emulator), so that 33-14 keeps or drops the three engine-dependent choices (rounded JPEG clip on map and photos, the `rotate(-90)` ring, the `slice` contour art, the negative letter-spacing) without any new design work. The page is the same `probe.html` as above.

1. Take `probe.html` from `$HARNESS_OUT` (regenerate it with the test above if the scratchpad is gone). It already carries the CSP and the six inlined fonts; nothing in it loads a file or a URL.
2. In the throwaway in-app harness of 25.1-07 (a polling request file that runs the real print path; never committed, removed before the plan ends: see `.planning/phases/25.1-pdf-export-improvement/25.1-07-SUMMARY.md` and the project memory notes for the iOS simulator and the Android `Pixel_8` emulator, including the dead-simulator `simctl erase` fix and the clone AVD when the emulator holds a release app with another signature), feed the HTML to the real `printToFileAsync` of `expo-print`, one print per platform. Set the root `zoom` of the device copy to the platform's `PDF_LAYOUT_SCALE` (iOS 1.2487, Android 4/3): with the 25.1 per-platform page scale, one design unit then again lands on one point of the PDF, so the numbers below compare with the Chrome ones directly.
3. Copy the PDFs to the Mac and measure with the same poppler commands as above: `pdfinfo` (pages, size), `pdffonts` (the three used families embedded), `pdfimages -list` (raster objects), `pdftotext -bbox` (positions of the P-5 numeral and the labels), `pdftoppm -r 100 -png` (look at the page with the Read tool). For the size growth print the six variant pages (`probe-none` and `probe-P1` to `probe-P5`) the same way, or print `probe.html` only and compare its size with the Chrome total of 47161 bytes (the JPEG is 22.9 KB of it).
4. Pass criterion of UI-SPEC B.2, per item: same geometry as Chrome within 1 unit (compare rings, panels, box edges and the P-5 text boxes with the Chrome figures above: P-5 numeral x 16.0 to 91.3, "/ 50" at 94.3), vector (no raster block in `pdfimages -list` except the one P-4 JPEG and, in the real document, the logo and the photos), and file growth under 10 KB per item (P-4 counts only what exceeds the JPEG itself).
5. Decision table to fill in 33-14: an item that fails keeps the fallback of the table above on that platform (and the same choice is then made for both platforms, so the document looks the same everywhere). Every fallback leaves the layout unchanged, so a failed item costs no re-flow and no new test of fit. P-1 is informational only: the gradient is not in the contract, so a pass changes nothing in this phase and a fail changes nothing either.
6. Record the result (one row per item and platform) in the 33-14 summary; do not commit the HTML, the PDFs or the in-app harness.
