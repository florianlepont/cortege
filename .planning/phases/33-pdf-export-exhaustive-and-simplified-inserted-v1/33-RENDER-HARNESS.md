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

<!-- gsd:write-continue -->
