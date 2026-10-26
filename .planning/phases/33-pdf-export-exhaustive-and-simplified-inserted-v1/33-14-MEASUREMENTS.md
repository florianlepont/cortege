# Phase 33 plan 14: measurements on the real print engines

Measured 2026-10-24 on the code of commit 776802a0 (end of plan 33-13), before this plan changed any constant.

## Setup, and what the numbers are (read first)

| Engine | What | Notes |
|---|---|---|
| chrome | Google Chrome 154 headless, `--print-to-pdf`, the harness of 33-RENDER-HARNESS.md on the final builders | root zoom 1.33333, so 1 design unit = 1 pt. Layout and size check only. Print time is the Chrome process time while an Xcode build was running, so it is inflated |
| ios | WebKit `printToFileAsync` on the iPhone 18 Pro simulator (iOS 27.0, Xcode 27.1), Debug build of this worktree, JS from a Metro on port 8081 | real `exportAndShareSurveyPdf` path, `PDF_LAYOUT_SCALE.ios` 1.2487 |
| android | Chromium/Skia `printToFileAsync` on an API 36 emulator (clone AVD of `Pixel_8`, because `Pixel_8` is in use and holds a release build of another signature), debug APK of this worktree | `PDF_LAYOUT_SCALE.android` 4/3. Page counts come from `pdfinfo` only (the returned `numberOfPages` said 7 and 6 for the 5 and 4 page files, as in 25.1-07) |

The in-app harness (throwaway, never committed, removed from the tree before every commit) polled a request file and ran the real `exportAndShareSurveyPdf` with `RunExportDeps.assemble` returning a fixture whose fonts and logo come from `loadExportAssets` (real asset reader), whose photos come from `preparePhotosForExport` (the real expo-image-manipulator) at the setting of the case, and whose map is a real MapLibre snapshot (`takeBasemapJpeg`, online Plan IGN style, kind `online`) of real cadastre parcels of Fontainebleau (77186000AN0308 for one parcel; AN0308, AL0009 and AL0007 for three) fetched from the IGN apicarto. `share` was a recorder. No sign-in, no member data.

Honest limits of the inputs:

- The 24 photo sources are the 24 herbier JPEGs of `mobile/assets/herbier` (1400 px long edge, botanical illustrations on a pale ground), the same files as the Chrome baseline of 33-01, not phone photos. 25.1-07 used 24 crops of real phone photos. The paired comparison 800 / 0.65 against 640 / 0.6 on the same sources is sound; the absolute device sizes are not comparable with the 2.8 to 3.0 MB (iOS) and 1.7 to 1.8 MB (Android) of 25.1-07, whose sources were much heavier.
- The map JPEG is a real snapshot (`snapBytes` 191 to 272 KB PNG-to-JPEG on iOS, about 100 KB in the Android PDF). The Chrome rows use the 1030 x 680 stand-in JPEG of 33-01 (69 KB), so Chrome sizes with a map are lighter than device sizes.
- Time column: warm export total (assemble with photos and snapshot, print, move) from the harness. The first export of each run was `complete-v32`: 1.6 s on iOS, 2.9 s on Android (cold). This is an emulator and a simulator, not a phone.
- "fonts embedded" is the number of distinct families in `pdffonts` (six are drawn by a full document; `summary-no-history` uses five cuts; the probe uses three). Android embeds them as Type 3 subsets, iOS and Chrome as TrueType.
- "lowest last-element bottom" is, per document, the largest bottom (in pt) of any text of a page that starts above 800 (body bottom 800 = 840 minus the 40 high footer), watermark excluded. A one page summary ends on its two source lines, which are designed to sit at the body bottom (800).

## Measurement table

Cases: `-800` is photos at 800 px / JPEG 0.65, `-640` at 640 px / 0.6 (only a device can vary them; the Chrome rows repeat the same file). `-conditioned` and `-no-route` ran at 640 / 0.6, the setting of the code at the time. The probe row is the five-item page of 33-RENDER-HARNESS.md, one page, with `print-color-adjust: exact` (see the probe section: the first device probe lacked it).

| engine | case | pdfinfo pages | pdfinfo size KB | fonts embedded | image objects | lowest last-element bottom | time s |
|---|---|---|---|---|---|---|---|
| chrome | complete-v32 | 5 | 169.4 | 6 | logo 1, map 0, photos 0 | 699.5 | 10.1 |
| chrome | complete-v30-draft | 4 | 167.4 | 6 | logo 1, map 0, photos 0 | 724.3 | 6.1 |
| chrome | complete-typical-800 | 6 | 545.5 | 6 | logo 1, map 1, photos 6 | 745.7 | 8.4 |
| chrome | complete-typical-640 | 6 | 545.5 | 6 | logo 1, map 1, photos 6 | 745.7 | 8.4 |
| chrome | complete-typical-conditioned | 7 | 556.7 | 6 | logo 1, map 1, photos 6 | 745.7 | 6.4 |
| chrome | complete-worst-800 | 10 | 1439.7 | 6 | logo 1, map 1, photos 24 | 745.7 | 3.6 |
| chrome | complete-worst-640 | 10 | 1439.7 | 6 | logo 1, map 1, photos 24 | 745.7 | 3.6 |
| chrome | complete-worst-no-route | 10 | 1434.3 | 6 | logo 1, map 1, photos 24 | 745.7 | 4.7 |
| chrome | summary | 1 | 120.1 | 6 | logo 1, map 1, photos 0 | 799.5 | 7.6 |
| chrome | summary-worst | 1 | 124.0 | 6 | logo 1, map 1, photos 0 | 799.5 | 5.8 |
| chrome | summary-no-basemap | 1 | 67.8 | 6 | logo 1, map 0, photos 0 | 787.5 | 8.2 |
| chrome | summary-no-history | 1 | 114.9 | 5 | logo 1, map 1, photos 0 | 787.5 | 2.3 |
| chrome | probe | 1 | 45.3 | 3 | logo 0, map 0, photos 1 | 805.5 | 0.3 |
| ios | complete-v32 | 5 | 87.1 | 6 | logo 1, map 0, photos 0 | 700.4 | 1.6 |
| ios | complete-v30-draft | 4 | 85.6 | 6 | logo 1, map 0, photos 0 | 724.4 | 0.4 |
| ios | complete-typical-800 | 6 | 612.9 | 6 | logo 1, map 1, photos 6 | 746.5 | 1.0 |
| ios | complete-typical-640 | 6 | 495.9 | 6 | logo 1, map 1, photos 6 | 746.5 | 0.6 |
| ios | complete-typical-conditioned | 7 | 498.9 | 6 | logo 1, map 1, photos 6 | 746.5 | 0.6 |
| ios | complete-worst-800 | 10 | 1460.6 | 6 | logo 1, map 1, photos 24 | 746.5 | 1.2 |
| ios | complete-worst-640 | 10 | 1035.2 | 6 | logo 1, map 1, photos 24 | 746.5 | 1.0 |
| ios | complete-worst-no-route | 10 | 1034.2 | 6 | logo 1, map 1, photos 24 | 746.5 | 1.1 |
| ios | summary | 1 | 234.3 | 6 | logo 1, map 1, photos 0 | 800.0 | 0.4 |
| ios | summary-worst | 1 | 264.0 | 6 | logo 1, map 1, photos 0 | 800.0 | 0.4 |
| ios | summary-no-basemap | 1 | 45.8 | 6 | logo 1, map 0, photos 0 | 788.0 | 0.3 |
| ios | summary-no-history | 1 | 231.5 | 5 | logo 1, map 1, photos 0 | 788.0 | 0.4 |
| ios | probe | 1 | 37.1 | 3 | logo 0, map 0, photos 1 | 805.3 | 0.4 |
| android | complete-v32 | 5 | 307.4 | 6 | logo 1, map 0, photos 0 | 702.4 | 2.9 |
| android | complete-v30-draft | 4 | 323.8 | 6 | logo 1, map 0, photos 0 | 726.4 | 0.4 |
| android | complete-typical-800 | 6 | 626.5 | 6 | logo 1, map 1, photos 6 | 743.8 | 8.9 |
| android | complete-typical-640 | 6 | 567.6 | 6 | logo 1, map 1, photos 6 | 743.8 | 3.6 |
| android | complete-typical-conditioned | 7 | 576.1 | 6 | logo 1, map 1, photos 6 | 743.8 | 2.3 |
| android | complete-worst-800 | 10 | 1161.2 | 6 | logo 1, map 1, photos 24 | 743.8 | 4.9 |
| android | complete-worst-640 | 10 | 947.9 | 6 | logo 1, map 1, photos 24 | 743.8 | 5.1 |
| android | complete-worst-no-route | 10 | 945.5 | 6 | logo 1, map 1, photos 24 | 743.8 | 8.9 |
| android | summary | 1 | 246.6 | 6 | logo 1, map 1, photos 0 | 798.3 | 2.7 |
| android | summary-worst | 1 | 273.2 | 6 | logo 1, map 1, photos 0 | 798.3 | 4.3 |
| android | summary-no-basemap | 1 | 148.5 | 6 | logo 1, map 0, photos 0 | 786.4 | 0.2 |
| android | summary-no-history | 1 | 222.6 | 5 | logo 1, map 1, photos 0 | 786.4 | 1.7 |
| android | probe | 1 | 215.7 | 3 | logo 0, map 0, photos 1 (stored as flate, see P-4) | 804.0 | 0.3 |

Two extra device runs, not in the 13 cases (alignment, real cadastre parcels, snapshot of the composite style with the cadastre raster layer from `GET /v1/map-styles/map.json`, which is the style an offline pack writes): `align-250` (a complete document, 515 x 250 frame) iOS 5 pages 359.2 KB, Android 5 pages 486.6 KB; `align-228` (a summary, 515 x 228 frame) iOS 1 page 286.6 KB, Android 1 page 287.3 KB.

### Findings from the table

- Builder `pageCount` equals `pdfinfo` on iOS and on Android for every case (v32 5, v30 draft 4, typical 6, conditioned 7, worst 10 with and without route, every summary 1), and equals the Chrome count. No estimate was wrong for a measurable reason, so no pin and no estimate constant of `build-html.test.ts`, `page-estimate.ts`, `identity.ts`, `factor-section.ts`, `factor-chart-svg.ts` or `trend-section.ts` was changed.
- Per page, the last body text sits at the same height on the three engines within 2 pt (for example typical: 699.5 / 700.4 / 702.4 on page 1, 745.7 / 746.5 / 743.8 on the last page). The phone engines print the layout of Chrome.
- No text is cut at a page bottom: the largest bottom of a body page is 746.5 (photo and factor pages) and 726.4 (draft page 1), against a body bottom of 800. The one page summary ends on its source lines at 798.3 to 800.0, inside the designed bottom zone, and the pictures show both lines complete.
- Fonts: six families embedded on both phone engines on the first export after launch (`PDF_FONT_WARMUP` stays false). The logo is one object (240 x 240 with its mask) on every document, the map is one JPEG, photos are one JPEG each (24 of 24 present), and no raster object exists for a gradient, ring or contour path (`pdfimages -list`: only the logo, the map and the photos).
- The summary of the typical survey on iOS is 234 KB with its map JPEG (192 KB of the 234); without a basemap it is 45.8 KB. On Android 246.6 KB with the map and 148.5 KB without (the six Type 3 font subsets cost about 100 KB there).

## Page 2 of the v3.2 submitted fixture (open item carried from 33-13)

The fixture without map and history builds 5 pages (target 4). Real heights of the page that holds the identity card and the factor chart, on the three engines:

| Item | Chrome | iOS | Android |
|---|---|---|---|
| `pdfinfo` pages | 5 | 5 | 5 |
| page 2: last text (chart axis labels) bottom, body top is 60 | 544.0 | 544.0 | 543.1 |
| page 3 starts with the stand heading and factor A | yes | yes | yes |
| trend note alone on page 5, last text bottom | 100.1 | 100.2 | 99.0 |

Block heights as printed (Chrome script on the printed document, design units; iOS and Android bottoms above agree within 1 to 2): identity card 278.9 + 10 margin, factor chart 205.5 + 10, stand heading 34, factor A 143.4 + 8, B 102.9 + 8, C 99.4 + 8, D 99.4 + 8, E 99.4 + 8, F 102.9 + 8 (the sums are in the open items below). The estimates are 288, 214, 34 + 156.

- Page 2 with the heading and factor A would need 288.9 + 215.5 + 34 + 151.4 = 689.8 real units of the 740 of the body: it fits on every engine with 50 units spare. The estimate is 692, and the usable capacity is 740 x 0.92 = 680.8, so the builder moves the factors to page 3 (11.2 over by estimate, 9.0 over by real heights).
- With real heights and no fill factor the document would be 4 pages (page 2: identity, chart, heading, A = 689.8; page 3: B to G = 646.4; page 4: heading, H to J, "no map" note, trend note = 474.6). The 5 page result is a product of the 0.92 safety factor and of the estimates, not of the print engines.

## Probe P-1 to P-5 (UI-SPEC B.2)

Same page and variants as 33-RENDER-HARNESS.md, root zoom set to the platform scale (iOS 1.2487, Android 4/3). Finding about the probe itself: the first device print of the probe page (iOS) dropped every CSS `background` (the forest boxes, the P-1 CSS panel, the dark P-4 panel), because the probe page lacked `-webkit-print-color-adjust: exact`, which `styles.ts` sets on `html, body` in every real document (the real cover and summary print their forest panels on both engines). The probe was fixed (the line added to its stylesheet, throwaway file) and re-run; the verdicts below are from the fixed page. Geometry compared by the bounding boxes of the drawn shapes at 288 dpi against Chrome: panels, rings and the contour box agree within 0.5 unit on both engines (iOS: 16.0 to 256.0 against 15.75 to 255.75; Android 15.75 to 255.5).

Growth is the PDF size of the variant page minus the floor page (no zone): iOS floor 5.2 KB, Android 6.3 KB, Chrome 4.2 KB.

| Item | Chrome growth KB | iOS growth KB | Android growth KB | iOS verdict | Android verdict |
|---|---:|---:|---:|---|---|
| P-1 gradients (SVG linearGradient and CSS linear-gradient, informational) | +4.0 | +3.3 | +9.3 | pass, both smooth, vector | pass, vector |
| P-2 ring, `rotate(-90)` against path arc | +6.0 | +1.1 | +10.5 (two rings, 5.2 each) | pass: both arcs start at 12 o'clock and end at the same place, vector | pass on geometry and vector; the 10.5 KB is for the two rings drawn together, 0.5 over the 10 KB line, 5.2 per ring |
| P-3 contour art, `xMaxYMax slice` in a solid box | +3.0 | +2.2 | +8.4 | pass, clipped by the box, solid strokes | pass |
| P-4 JPEG in a rounded `overflow: hidden` box | +26.7 (JPEG 22.9) | +24.2 (+1.3 over the JPEG) | +184 as probed (see below) | pass: one JPEG object, corners clipped round | probe as written fails the size rule; the built form passes (see below) |
| P-5 numeral `letter-spacing: -3px` | +6.1 (fonts) | +3.5 | +15.7 (the two Type 3 font subsets of the probe) | pass: "32" spans 15.99 to 91.26, "/ 50" starts at 94.25, the same as Chrome (16.0 to 91.3, 94.3) | pass: 15.98 to 91.15, "/ 50" at 94.14; the growth is the two extra font subsets, not the spacing |

P-4 on Android: the probe draws the image with `object-fit: cover` (a crop). Skia then stores the 480 x 409 JPEG as a flate image of 178 KB (`pdfimages`: `image` encoding, not `jpeg`), 184 KB over the floor. No builder uses `object-fit`: `photos-section.ts` and `map-figure.ts` set an explicit width, height and left/top on the `img` inside the rounded `overflow: hidden` frame. The same probe page with that built form (variant P4b: `width`, `height`, `left`, `top`, no `object-fit`) keeps the JPEG on both engines: Android 22.9 KB `jpeg` object, page 36.5 KB (+30.2 KB over the floor of which 22.9 is the JPEG, so +7.3 for the clip); iOS 29.4 KB (+24.2). The real documents confirm it: every photo and every map of the 24 device PDFs of the table above is a `jpeg` object (`pdfimages -list`), with the 12 px rounded frames on.

Decision: no probe fallback applied on either engine (no change to `ring-svg.ts`, `cover-section.ts`, `summary-section.ts`, `MAP_FRAME_RADIUS` or `PHOTO_FRAME_RADIUS`). The growth line of 10 KB is crossed only by two probe pages that draw something the builders do not (two rings on one page: 0.5 KB over; two new Type 3 font subsets: fonts the real document embeds anyway) and by the `object-fit: cover` form; this judgement is listed under the open items so the owner can overrule it. P-1 is recorded only.

## Overlay alignment (D-12)

The parcel outline of the SVG overlay against the basemap, at 200 dpi (1 unit = 2.8 px), with the cadastre layer drawn under it so that the lines can be compared:

| Frame | Engine | Result |
|---|---|---|
| 515 x 250 (complete, `align-250`, three parcels, zoom 17) | iOS | The outline edges lie on the black cadastre lines of parcels 7, 9, 8 and of the town hall block, and on the building edges, over the whole frame, no visible offset (well under 2 units) |
| 515 x 250 | Android | Same, no visible offset |
| 515 x 228 (summary, `align-228`, three parcels, zoom 16) | iOS | The outlines sit on the building footprints and cadastre lines of the town hall and its neighbours; no visible offset |
| 515 x 228 | Android | Same, no visible offset |

The ordinary `summary` (one parcel, zoom 17, plain Plan IGN style) also shows the outline on the town hall footprint on both engines. The snapshot, the projection and the overlay are the unchanged code; only the frame height changed from 340 to 250 and 228. No frame or snapshot request change was needed.

## Weight against the baseline

Sizes in KB from `pdfinfo`. Baseline = the 33-01 row of the same case (Chrome, 800 px / JPEG 65 photos, before phase 33). The pre-phase device reference of 25.1-07 (24 phone-photo crops at 800 / 0.65: 2.8 to 3.0 MB iOS, 1.7 to 1.8 MB Android) used heavier sources, so only the same-source comparison with the baseline is made here; no pre-phase build was run on the devices. Signed delta = measured minus reference.

| Engine | Case | Setting | Size | 33-01 baseline | Delta |
|---|---|---|---:|---:|---|
| chrome | typical | placeholder photos as the baseline | 545.5 | 532.0 | +13.5 KB (+2.5 %) |
| chrome | worst | same | 1439.7 | 1410.3 | +29.4 KB (+2.1 %) |
| ios | typical | 800 / 0.65 | 612.9 | 532.0 | +80.9 KB (+15.2 %) |
| ios | typical | 640 / 0.6 | 495.9 | 532.0 | -36.1 KB (-6.8 %) |
| ios | worst | 800 / 0.65 | 1460.6 | 1410.3 | +50.3 KB (+3.6 %) |
| ios | worst | 640 / 0.6 | 1035.2 | 1410.3 | -375.1 KB (-26.6 %) |
| android | typical | 800 / 0.65 | 626.5 | 532.0 | +94.5 KB (+17.8 %) |
| android | typical | 640 / 0.6 | 567.6 | 532.0 | +35.6 KB (+6.7 %) |
| android | worst | 800 / 0.65 | 1161.2 | 1410.3 | -249.1 KB (-17.7 %) |
| android | worst | 640 / 0.6 | 947.9 | 1410.3 | -462.4 KB (-32.8 %) |

Photo setting, paired on the same 24 sources (the D-17 rule: keep 640 / 0.6 only when the 24 photo PDF is at least 25 % lighter on both platforms and nothing blocks visibly):

| Engine | 24 photos 800 / 0.65 | 24 photos 640 / 0.6 | PDF delta | Photo data alone (sum of the 24 JPEGs) |
|---|---:|---:|---|---|
| ios | 1460.6 KB | 1035.2 KB | -425.4 KB (-29.1 %) | 1171.9 KB to 736.3 KB (-37.2 %) |
| android | 1161.2 KB | 947.9 KB | -213.3 KB (-18.4 %) | 671.5 KB to 453.1 KB (-32.5 %) |

Also per setting, six photos: iOS 612.9 to 495.9 KB (-19.1 %), Android 626.5 to 567.6 KB (-9.4 %). At 120 dpi and at 240 dpi (a shaded cone, photo 6 of the typical case) the 640 / 0.6 photos show no visible blocking next to the 800 / 0.65 ones; the sources are illustrations, so the soft shadows are the only demanding area.

Decision: Android reaches only -18.4 %, below the 25 % rule, so `PHOTO_EXPORT_SETTINGS` goes back to 800 / 0.65 (cap 24 unchanged). The 640 / 0.6 alternative is kept visible as an owner decision under the open items.

Not lighter than the reference (listed again under the open items): typical at 800 / 0.65 on both phone engines (+15.2 % iOS, +17.8 % Android) and worst at 800 / 0.65 on iOS (+3.6 %), and on Android the text-only documents (v32: 307.4 KB against 145.5 KB, v30 draft 323.8 against 145.8: Skia embeds Type 3 subsets of six fonts, which Chrome does not; this is an engine difference, not the layout: the same v32 on iOS is 87.1 KB, 40 % lighter than the baseline).

## Summary weight (UI-SPEC B.11, target under 200 KB)

| Engine | `summary` | `summary-worst` | Verdict |
|---|---:|---:|---|
| chrome | 120.1 KB | 124.0 KB | under 200 KB (stand-in map JPEG of 69 KB, so not representative of a phone) |
| ios | 234.3 KB | 264.0 KB | over 200 KB by 34.3 and 64.0 KB: open item |
| android | 246.6 KB | 273.2 KB | over 200 KB by 46.6 and 73.2 KB: open item |

What the weight is made of: the map JPEG is 192 KB (`summary`) and 220 KB (`summary-worst`) on iOS (a 1100 px wide snapshot at JPEG 0.8 of the town centre, detailed), about 98 KB on Android; without a basemap the summary is 45.8 KB on iOS and 148.5 KB on Android. The values are for a town parcel; a forest parcel (plain greens) would compress much better. Nothing was changed here: the snapshot width and quality live in `map-snapshot.ts`, outside this plan's files.

## Open items for the owner

1. **Photo setting (D-17), decided 2026-10-26: 640 / 0.6** (plan 33-16: `PHOTO_EXPORT_SETTINGS` is now `{ cap: 24, longEdgePx: 640, jpegQuality: 0.6 }`, the owner overrode the 25 % rule). Original text: by the rule of this plan the code goes back to 800 px / JPEG 0.65, because Android is only 18.4 % lighter at 640 / 0.6 (iOS 29.1 %). 640 / 0.6 shows no visible blocking, reduces the photo data by 32 to 37 %, and makes the typical iOS PDF 6.8 % lighter than the 33-01 baseline (800 / 0.65 is 15.2 % heavier). If the owner prefers the lighter file (D-03), keeping 640 / 0.6 is a one line change in `PHOTO_EXPORT_SETTINGS` and its test; the numbers above are the evidence.
2. **A complete PDF not lighter than its reference (D-03).** At 800 / 0.65: typical +15.2 % (iOS) and +17.8 % (Android), worst +3.6 % (iOS); the layout alone costs +2 to +3 % in Chrome (the cover). The reference is the Chrome baseline of 33-01 and no pre-phase build was measured on a phone, so a like-for-like device delta is not known. Android text-only documents are about 160 to 180 KB heavier than the Chrome baseline because of Type 3 font embedding (engine, not layout).
3. **Summary over 200 KB on both phone engines, decided 2026-10-26: lighter basemap for the summary only, 900 px / JPEG 0.7** (plan 33-16, see the section at the end: iOS 161.1 / 178.5 KB, 198.7 KB with the cadastre style, under 200 KB; Android 209.0 / 227.0 KB, still over, left to the owner review). Original text: **Summary over 200 KB on both phone engines**: iOS 234.3 / 264.0 KB, Android 246.6 / 273.2 KB (typical / worst). The map snapshot is most of it. Options: lower `SNAPSHOT_JPEG_QUALITY` (0.8) and `SNAPSHOT_JPEG_WIDTH_PX` (1100) in `map-snapshot.ts` (a frame of 515 units prints at 154 ppi today), or accept about 250 KB for a town parcel and rewrite the B.11 target. Not changed here.
4. **The v3.2 submitted fixture prints 5 pages, target 4, decided 2026-10-26: `PAGE_FILL_FACTOR` 0.94** (plan 33-16: the fixture now builds 4 pages, Chrome `pdfinfo` agrees, every other pinned count is unchanged; the `it.failing` test is a normal test expecting 4). Original text: the fixture prints 5 pages, target 4 (carried from 33-13). The devices confirm the estimate is not wrong about the engines: real page 2 content is 689.8 of 740 units with the heading and factor A, but the 0.92 fill factor leaves 680.8. Options with the measured numbers: accept 5 for a survey with no map and no history (the fifth page holds a 53 unit note); shrink page 2 by 11.2 estimated units (for example the chart estimate 214 to 200 together with the identity estimate 288 to 284 would give 674 and move factor A up; but the real chart block is 205.5, so a 200 estimate would under-estimate it by 5.5 units); or lift `PAGE_FILL_FACTOR` from 0.92 to 0.94 (capacity 695.6, page 2 then fits at 692). With real heights the document is 4 pages on both phone engines if the factors A are allowed on page 2. Any of these is a layout or estimate change to be pinned by tests; the `it.failing` test stays until the count really becomes 4.
5. **Probe judgement calls (P-2, P-4, P-5 on Android).** Two Android probe pages exceed the 10 KB growth line (P-2 10.5 KB for two rings, P-5 15.7 KB for two new font subsets) and the literal P-4 probe stores the image as flate because of `object-fit: cover`. All three are explained above and no fallback was applied; the owner may overrule and ask for the path arc ring or square corners, which change no layout.
6. **Not measured**: a real phone (the numbers are a simulator and an emulator on an Apple silicon Mac); the offline snapshot branch on iOS (one simulator cannot lose the network without the Mac); a phone-photo source set (herbier JPEGs were used); the owner's `Pixel_8` AVD (a clone was used, and deleted after the run).

## Re-measurement of plan 33-16 (2026-10-26, owner decisions of the same day)

Changes under test: photos 640 px / 0.6 (open item 1), `PAGE_FILL_FACTOR` 0.94 (item 4), summary basemap profile (item 3). Code of the branch after commit b732aa1b plus the `profile` option of `takeBasemapJpeg`.

### Chrome: page counts (the harness of 33-RENDER-HARNESS.md on the final builders, root zoom 4/3 so 1 unit = 1 pt)

11 cases, the 13 of plan 33-14 without its two duplicate photo-setting rows (Chrome repeats the same file) and with the v3.2 fixture also run with the fullest route. Photos are the 24 herbier JPEGs prepared at 640 px / 0.6 (`sips`), the map is the 1030 x 680 stand-in JPEG, so Chrome sizes are not phone sizes.

| engine | case | builder pages | pdfinfo pages | pdfinfo size KB | lowest body text bottom, pt (largest page; body bottom 800) |
|---|---|---:|---:|---:|---:|
| chrome | complete-v32 (v3.2 submitted, no map, no history) | 4 | 4 | 166.9 | 732.6 |
| chrome | complete-v32-route (same with the fullest route) | 5 | 5 | 174.1 | 707.5 |
| chrome | complete-v30-draft | 4 | 4 | 166.4 | 724.3 |
| chrome | complete-typical | 6 | 6 | 445.2 | 745.7 |
| chrome | complete-typical-conditioned | 7 | 7 | 455.7 | 745.7 |
| chrome | complete-worst | 10 | 10 | 1025.4 | 745.7 |
| chrome | complete-worst-no-route | 10 | 10 | 1020.0 | 745.7 |
| chrome | summary | 1 | 1 | 137.8 | 799.5 |
| chrome | summary-worst | 1 | 1 | 141.7 | 799.5 |
| chrome | summary-no-basemap | 1 | 1 | 67.7 | 787.5 |
| chrome | summary-no-history | 1 | 1 | 132.6 | 787.5 |

- Every builder count equals `pdfinfo`. The only count that moved against 33-14 is the v3.2 fixture, 5 to 4. v3.0 draft 4, typical 6, conditioned 7, worst 10 (with and without the route), summaries 1, v3.2 with the fullest route 5 are unchanged.
- The lowest text of a complete page is 745.7 pt at most (the 33-14 value), 54 pt above the body bottom, so the 790 pt line (footer at 804) is not approached and no block is within 10 pt of the footer. A summary ends on its two source lines at 799.5 pt (787.5 without basemap or history), designed to sit at the body bottom, as in 33-14.
- The page that now holds factor A under the factor chart (page 2 of complete-v32, looked at on a 80 dpi picture): the merged identity card with its "Critères de diagnostic" sub-block, the "Score par facteur" chart with its two subtotals, the heading "Facteurs liés au peuplement et à la gestion forestière" and the whole card of factor A (genera chips, class boxes, barème), ending at 732.6 pt with about 67 pt of empty body below. Nothing is split or clipped. Page 3 holds factors B to G and page 4 holds the context heading, H to J and the two "no map" / "no history" notes.
- The 4 page v3.2 file was not re-printed on the iOS simulator or the Android emulator (no device run was needed for the page counts: the builder, the layout and the engines are the same as in 33-14, where page 2 content measured 689.8 of 740 units on both engines).

### iOS simulator and Android emulator: summary weight by basemap profile

Same fixtures and method as 33-14 (real `exportAndShareSurveyPdf`, real print through `printToFileAsync`, real MapLibre snapshots fetched on the device, real parcels of Fontainebleau from the IGN apicarto; recorder instead of share; `pdfinfo` for sizes; the in-app harness was throwaway and is not committed). iPhone 18 Pro simulator (iOS 27.0, the 33-14 Debug build, JS from Metro on 8081; no rebuild was needed, so the Xcode 27.1 ExpoModulesJSI workaround was not applied this time) and an API 36 emulator (`Pixel_8_c16`, a config-only AVD, because `Pixel_8` holds a release build of another signature; the 33-14 debug APK of this worktree, `debug_http_host` set to `localhost:8081`). Each profile resizes and compresses the same snapshot PNG; "real" is the real `takeBasemapJpeg({ profile: "summary" })` and gives byte-identical output to the 900 / 0.7 row on both engines. Cases: `typical` = one parcel (77186000AN0308), plain Plan IGN style, zoom 17; `fullest` = three parcels, the fullest summary fixture, plain style; `fullest + cadastre` = same three parcels, the composite style of `GET /v1/map-styles/map.json` (the style an offline pack writes, with the cadastre layer). The first row of each engine reproduces the 33-14 numbers (iOS 234.3 / 264.0, Android 246.6 / 273.2), so the two runs are comparable. Tagged 33-16.

| engine | profile (width / quality) | typical PDF KB (JPEG KB) | fullest PDF KB (JPEG KB) | fullest + cadastre PDF KB (JPEG KB) |
|---|---|---:|---:|---:|
| ios | 1100 / 0.8 (complete profile, the baseline) | 234.1 (187.1) | 264.0 (215.1) | 287.7 (238.8) |
| ios | **900 / 0.7 (chosen, summary profile)** | **161.1 (114.1)** | **178.5 (129.5)** | **198.7 (149.8)** |
| ios | 800 / 0.7 | 144.2 (97.1) | 157.3 (108.4) | 174.5 (125.6) |
| ios | 900 / 0.65 | 148.8 (101.8) | 164.5 (115.6) | 183.5 (134.6) |
| android | 1100 / 0.8 (complete profile, the baseline) | 246.7 (94.7) | 273.3 (115.3) | 292.4 (134.4) |
| android | **900 / 0.7 (chosen, summary profile)** | **209.0 (57.1)** | **227.0 (69.1)** | **241.6 (83.7)** |
| android | 800 / 0.7 | 200.5 (48.5) | 216.7 (58.7) | 229.3 (71.4) |
| android | 900 / 0.65 | 203.7 (51.8) | 220.9 (62.9) | 235.1 (77.2) |

All 30 PDFs are 1 page; the map is one `jpeg` object in each (`pdfimages -list`), the logo and its mask the only other raster.

- Legibility and alignment (200 dpi crops of the map zone of the fullest + cadastre PDF, 1100 / 0.8 against 900 / 0.7 against 800 / 0.7 on iOS and 1100 / 0.8 against 900 / 0.7 on Android): at 900 / 0.7 the parcel outline lies on the building footprints and cadastre lines exactly as at 1100 / 0.8, the cadastre lines, building hatches, street names and the parcel numbers stay legible, and the outline strokes stay sharp (they are a vector overlay). 800 / 0.7 is slightly softer on the small parcel numbers and on the building hatches, still legible; it was not chosen because it does not bring Android under 200 KB either. No ringing or blocking is visible at 900 / 0.7.
- Verdict: iOS is under 200 KB in all three cases at 900 / 0.7 (161.1, 178.5 and 198.7 KB, the last by 1.3 KB). Android is not: 209.0, 227.0 and 241.6 KB. About 152 KB of an Android summary is not the basemap (fonts embedded as Type 3 subsets, 148.5 KB with no basemap at all in 33-14), so even the lightest candidate leaves the typical survey at 200.5 KB (800 / 0.7). By the rule of plan 33-16 the sharpest acceptable candidate, 900 / 0.7, is kept and the Android sizes are an open item for the owner review (33-15).
- Photos: the 640 px / 0.6 setting is the one measured in 33-14 (worst case iOS 1035.2 KB, Android 947.9 KB, 24 of 24 photos present, no visible blocking), the photo code path is unchanged by this plan, so the photo weights were not re-run on the devices; the Chrome worst case with the 640 / 0.6 files is 1025.4 KB (against 1439.7 KB at 800 / 0.65 in the 33-14 Chrome row).
- Not measured: a real phone; the offline snapshot branch on iOS; the complete-profile basemap is unchanged (1100 / 0.8) and was not re-measured as a PDF; phone-photo sources.


## Re-measurement of plans 33-17 and 33-18 (2026-10-26)

Changes under test: plan 33-17 (grouped factor charts, whole parcel list, year rule, export sheet) and plan 33-18 (D-24: the parcel map moves from the body to the cover, `COVER_PANEL_HEIGHT` 356, `COVER_MAP_FRAME_SIZE` 515 x 228, the body map entry and `map-section.ts` removed, `COMPLETE_BASE_PAGES` 4). Code of the branch after the Task 2 commit of plan 33-18.

### Chrome: page counts (the harness of 33-RENDER-HARNESS.md on the final builders, root zoom 4/3 so 1 unit = 1 pt)

14 cases of the plan plus two extra covers (a 64 character site name, a draft with a map). Photos are the 24 herbier JPEGs prepared at 640 px / JPEG 0.6 (`sips`), the cover map is a 1030 x 456 stand-in JPEG (the 2x of the cover frame; 60 KB). `complete-many-parcels` is the 30 ids `77186000AB0001` to `0030`, `complete-many-parcels-wide` the 30 ids `2A004000WM0001` to `0030`; both fixtures have no map, so their cover prints the quiet panel. `complete-typical-outline` is the typical survey with its basemap removed. "Cover legend bottom" is the bottom of the legend line under the cover map (page 1; the budget is 768 pt on a submitted cover and 792 pt on a draft); "none" means the cover holds a quiet panel and no legend line. "Lowest body text bottom" is the largest bottom of any text of pages 2 and later (body bottom 800, the 790 pt line is the rule); for a summary it is the one page.

| engine | case | builder pages | pdfinfo pages | pdfinfo size KB | lowest body text bottom, pt | cover legend bottom, pt |
|---|---|---:|---:|---:|---:|---:|
| chrome | complete-v32 | 4 | 4 | 165.9 | 713.8 | none (quiet panel, no map in the fixture) |
| chrome | complete-v32-route | 4 | 4 | 170.7 | 687.5 | none (quiet panel) |
| chrome | complete-v30-draft | 4 | 4 | 167.6 | 724.3 | none (quiet panel, no parcel) |
| chrome | complete-typical | 5 | 5 | 437.4 | 745.7 | 767.2 |
| chrome | complete-typical-conditioned | 6 | 6 | 448.2 | 745.7 | 767.2 |
| chrome | complete-worst | 9 | 9 | 1031.6 | 745.7 | 767.2 |
| chrome | complete-worst-no-route | 9 | 9 | 1026.0 | 745.7 | 767.2 |
| chrome | complete-many-parcels | 4 | 4 | 172.7 | 662.6 | none (quiet panel) |
| chrome | complete-many-parcels-wide | 4 | 4 | 172.7 | 662.6 | none (quiet panel) |
| chrome | complete-typical-outline | 5 | 5 | 377.0 | 745.7 | 767.2 |
| chrome | summary | 1 | 1 | 133.1 | 799.5 | not applicable |
| chrome | summary-worst | 1 | 1 | 137.0 | 799.5 | not applicable |
| chrome | summary-no-basemap | 1 | 1 | 71.6 | 787.5 | not applicable |
| chrome | summary-no-history | 1 | 1 | 127.9 | 787.5 | not applicable |
| chrome | (extra) complete-long-name | 5 | 5 | 439.9 | 745.7 | 767.2 |
| chrome | (extra) complete-draft-typical (typical, isDraft) | 6 | 6 | 445.6 | 769.7 | 791.2 |

- Every builder count equals `pdfinfo`. Against the pins after plan 33-16 (v3.2 4, v3.2 with route 5, v3.0 draft 4, typical 6, conditioned 7, worst 10 with and without route, summaries 1) the counts are v3.2 4 (same), v3.2 with route 4 (-1), draft 4 (same), typical 5 (-1), conditioned 6 (-1), worst 9 (-1, with and without the route), summaries 1 (same): none went up. The two extra cases were not pinned before (a submitted typical draft prints 6 pages: the draft banner costs 24 units on every body page).
- The cover legend bottom is 767.2 pt on a submitted cover (budget 768) and 791.2 pt on a draft (budget 792). The lowest text of a body page is 745.7 pt at most (724.3 on the draft fixture, 769.7 on the extra typical draft whose photo page starts 24 units lower), 20 to 54 pt above the 790 pt line.
- The cover map JPEG is one `jpeg` object on page 1 (1030 x 456, 144 ppi; `pdfimages -list`), the logo once, the six photos on page 5; no other page holds a map.
- Covers looked at (120 dpi PNGs of page 1):
  - Typical, submitted: forest panel with the logo tile, "Relevé IBP", the site name on one line, the date, the 32 / 50 numeral and the "Niveau : assez forte" pill; below the panel the two tiles (20 / 35 orange ring, 12 / 15 green ring), the heading "Localisation", the map frame with the basemap, the parcel outline, the north arrow and the scale bar, and the source line under it; about 36 units of paper under the legend and the footer rule. No parcel id, no year. No contour ring touches the date, the eyebrow or the subtitle (the rings start at x 285 pt, the date ends at x 142 pt, the subtitle at x 268 pt and at y 80); the nearest ring edge sits about 5 pt right of the pill.
  - v3.0 draft, no parcel: the provisional line "Score provisoire : 2 facteurs non renseignés" under the numeral, the draft banner strip at y 368, the tiles at 400, and the quiet panel "Aucune parcelle liée à ce relevé." in place of the map, with the pale "Brouillon" watermark crossing the tiles and the panel (readable under it), no legend line.
  - Worst case (64 character site name, three parcels): the name takes three lines of 20 / 24 and the third line ends above the date; the second line of the title ("parcelles de la grande colline du") is crossed by a contour ring: this long name takes the 20 / 24 size, below the 24 bold of the contour rule of B.4, and the old cover (title at 156) had the same crossing for a name of this length; the date, the eyebrow and the subtitle are clear. Open item for the owner (cosmetic, only names of 49 characters or more on three lines). The map shows three outlines over the basemap and its source line.
  - Typical outline (no basemap): the pale canvas with the one outline, the scale bar, the north arrow and the legend "Fond de carte non disponible sur cet appareil : contour des parcelles seul.".
  - Typical draft with a map: the banner, the tiles at 400, the map zone from 528 to 792, the legend line ending at 791.2 pt (under the 804 footer rule), the pale watermark over the heading and the map.
  - Many parcels (30 ids, no map in the fixture): a quiet panel "Contour des parcelles non disponible sur cet appareil.", no ids on the cover, no ellipsis anywhere in the document; the 30 ids are on page 2.

### iOS simulator and Android emulator: cover map, page counts and sizes (plan 33-18, 2026-10-26)

Method as in 33-14: a throwaway in-app harness (a polling file of two modules under `mobile/src`, one import in `mobile/index.js`, all removed before every commit) ran the real `exportAndShareSurveyPdf` with the real `assembleSurveyExportData` (so the loader frames the complete snapshot at `COVER_MAP_FRAME_SIZE` itself), the real asset reader, the real photo preparation at 640 px / 0.6 on the herbier JPEGs, and real MapLibre snapshots of real cadastre parcels of Fontainebleau (apicarto, `77186000AN0308` for one parcel, `AN0308`, `AL0009`, `AL0007` for three); `share` was a recorder. The Plan IGN style served the typical and the summary cases; the worst case used the composite style with the cadastre raster layer (`GET /v1/map-styles/map.json`, the style an offline pack writes). Engines: iPhone 18 Pro simulator (iOS 27.0, the Debug build of 33-14, JS from a Metro of this worktree on port 8081) and an API 36 emulator (a config-only clone AVD of `Pixel_8`, the debug APK of 33-14, `debug_http_host` written through `run-as`). Printed with `printToFileAsync`, measured with `pdfinfo`, `pdfimages -list`, `pdftotext -bbox`, `pdftoppm`. The 640 / 0.6 photos and the herbier sources are those of 33-14 (not phone photos). Cases: `complete-v32` is the v3.2 fixture (its parcel has no geometry on the phone, so the cover prints the "no outline" quiet panel), `complete-v30-draft` the v3.0 draft (no parcel, quiet panel), `complete-many-parcels` and `-wide` the 30 ids `77186000AB0001` to `0030` and `2A004000WM0001` to `0030` (no geometry, quiet panel), `complete-typical` one parcel with 6 photos and a 3-point history, `complete-worst` three parcels with 24 photos and the fullest route, `summary` the typical summary. Columns as in the Chrome table above.

| engine | case | builder pages | pdfinfo pages | pdfinfo size KB | lowest body text bottom, pt | cover legend bottom, pt |
|---|---|---:|---:|---:|---:|---:|
| ios | complete-v30-draft | 4 | 4 | 87.6 | 724.2 | none (quiet panel) |
| ios | complete-v32 | 4 | 4 | 87.5 | 694.1 | none (quiet panel) |
| ios | complete-many-parcels | 4 | 4 | 88.0 | 662.3 | none (quiet panel) |
| ios | complete-many-parcels-wide | 4 | 4 | 88.0 | 662.3 | none (quiet panel) |
| ios | complete-typical | 5 | 5 | 486.3 | 746.5 | 767.9 |
| ios | complete-worst | 9 | 9 | 1111.5 | 746.5 | 767.9 |
| ios | summary | 1 | 1 | 165.9 | 800.0 | not applicable |
| android | complete-v30-draft | 4 | 4 | 325.7 | 721.9 | none (quiet panel) |
| android | complete-v32 | 4 | 4 | 299.4 | 692.7 | none (quiet panel) |
| android | complete-many-parcels | 4 | 4 | 299.5 | 660.1 | none (quiet panel) |
| android | complete-many-parcels-wide | 4 | 4 | 299.7 | 660.1 | none (quiet panel) |
| android | complete-typical | 5 | 5 | 555.6 | 743.8 | 766.1 |
| android | complete-worst | 9 | 9 | 999.9 | 743.8 | 766.1 |
| android | summary | 1 | 1 | 220.5 | 798.3 | not applicable |

- Page counts: the builder equals `pdfinfo` on both engines for all 14 rows (v3.0 draft 4, v3.2 4, typical 5, worst 9, summary 1; the 30-parcel documents 4). Against the same cases of 33-14 and 33-16 the counts are v3.2 5 (33-14) to 4, typical 6 to 5, worst 10 to 9, draft 4 and summary 1 unchanged (the fullest-route v3.2 and the conditioned typical were not re-run on the devices, only in Chrome).
- Cover legend bottom: 767.9 pt (iOS) and 766.1 pt (Android) against 768 for a submitted cover; the draft cover was run only with no parcel (quiet panel, no legend), so the 792 pt budget of a draft with a map is measured in Chrome only (791.2 pt). Lowest body text: 746.5 pt (iOS) and 743.8 pt (Android) at most for complete pages, 800.0 and 798.3 for the summary source lines (designed), so no body text passes 790 pt except the summary's designed last lines.
- Images on page 1 (`pdfimages -list`): the logo and its mask once, one cover map JPEG of 1100 x 487 px (iOS, 187 KB typical and 239 KB worst case with the cadastre style) or 1100 x 486 (Android, 89 and 134 KB); no other raster on the page; the summary map is the 900 px profile of 33-16 (iOS 114 KB, Android 53 KB). Six font families embedded on both engines.
- The 30-parcel identity card (Score heading top minus Identification heading top, page 2): iOS 341.9 (narrow ids) and 368.1 (wide ids), Android 342.3 and 367.8, Chrome 361.5 and 387.7, against the estimate 388: at or under it everywhere. The phones fit about one more id per line than Chrome.
- The two chart group labels sit inside their charts on both engines: page 2 of the typical complete PDF, "Peuplement et gestion : 20 / 35" from x 158.6 to 275.7 (iOS) and 158.9 to 275.8 (Android), "Contexte : 12 / 15" from 439.4 to 506.1 and 439.2 to 505.8, chart right edge 544; summary, 296.1 to 413.2 and 479.9 to 546.6 (iOS), 295.7 to 412.5 and 479.1 to 545.7 (Android), chart right edge 555.
- Weight, as measured (not like for like with 33-14): complete-typical iOS 486.3 KB (495.9 in 33-14), Android 555.6 KB (567.6); complete-worst iOS 1111.5 KB (1035.2) and Android 999.9 KB (947.9), the worst case being larger because its cover map is now the cadastre-style snapshot at the complete profile (239 KB on iOS) where 33-14 measured a plain-style snapshot, and it prints one page less; summary iOS 165.9 KB (161.1 in 33-16), Android 220.5 KB (209.0), both of the plain typical case with the same 900 / 0.7 profile (the +5 to +11 KB is the grouped chart panels and the 33-17 text). Android stays over the 200 KB summary target, as in 33-16 (open item, unchanged).
- Cover map alignment, 200 dpi crops of the map zone of `complete-worst` (three parcels, cadastre composite style, frame 515 x 228): iOS and Android both draw the outlines on the cadastre lines and the building footprints of the town hall block ("Mairie") and of its two neighbours, with no visible offset (under 2 units), the north arrow and the scale bar ("200 m") in their corners, the legend line under the frame, the rounded frame clipped as designed. The typical cover (plain Plan IGN style, one parcel) shows the outline on the town hall footprint on iOS. Verdict: aligned on both engines; `COVER_MAP_FRAME_SIZE` 515 x 228 stays.

### The export sheet on the engines (plan 33-18, 2026-10-26)

A throwaway root (a native stack with a blank screen and a screen that renders the real `ExportChoiceSheet` with the real `exportChoiceScreenOptions(theme)`, both variants) was driven from the same server; screenshots by `xcrun simctl io booted screenshot` and `adb exec-out screencap -p`, positions read from the pixels (iOS: pixels / 3 = pt).

- iOS (iPhone 18 Pro, 402 x 874 pt, insets top 62, bottom 34), default text size. Submitted: the sheet top is at y 435.0 pt, the bottom of "Exporter le PDF" at 776.5 pt, the visible sheet bottom at 861.7 pt, so the sheet is 427 pt tall (the A.7 arithmetic says about 430). Draft: top at 389.7 pt, 46 pt taller (472 pt, arithmetic 478), bottom unchanged. Nothing is cut, the title and the close cross have their room (the title row sits about 24 pt under the sheet top, the cross is a 44 x 44 circle at the right, 24 pt side padding), no "Annuler", the draft sentence sits between the second card and the button, no blank or jumping sheet in the screenshots taken seconds after the navigation. The area under the button is 85 pt: 24 of padding, 34 of safe area inset (`insets.bottom` is in the content padding) and about 27 pt more that the native sheet adds. Test only, not kept: with `insets.bottom` taken out of the padding the sheet was 34 pt shorter and the area 51 pt, so the 27 pt are native and constant (the iOS 26 form sheet floats about 12 pt above the screen bottom). The plan's rule says no empty band over 16 pt beyond the bottom padding, which 27 pt exceeds; the A.7 fallback (a fixed `[f, 1]` pair) was not applied because it would leave a larger empty area on the submitted sheet (f is the draft height) and the fallback is written for a blank, cut or jumping sheet, which did not occur. Open item for the owner: keep `fitToContents` as it is, or drop `insets.bottom` from the bottom padding on iOS (51 pt under the button on this phone; older phones and iOS before 26, whose sheet is not floating, then need the inset).
- iOS at the largest accessibility text size (`accessibility-extra-extra-extra-large`, reset to `large` afterwards), draft: the sheet takes the whole height below the status bar (top at 62 pt), the title wraps on three lines beside the cross, the two cards grow to five lines each, the draft sentence is cut by the screen bottom and the button is below the fold, so the content scrolls inside the bounded scroll view (the `maxHeight` works: the sheet does not run past the screen). Scrolling by gesture was not exercised (no input tool for the simulator in this session); the stack options and the scroll view style are unit tested.
- Android (Pixel 8 clone, API 36, 411 x 914 dp, inset top 50.3, bottom 24): the modal is full screen. The title row sits under the status bar (the bar ends at 50 dp, the title row starts at about 75 dp), nothing overlaps; the cross closes the modal (tap on its centre: back to the blank screen) and the hardware back key closes it too (draft variant reopened and closed). The draft sentence and the button follow the cards as designed. The empty lower half of the screen is the modal's own background (Android has no fitted sheet).

### Cleanup and open items of plan 33-18

- Cleaned: the in-app harness files and the `mobile/index.js` import removed (`git status` clean), Metro and the two servers killed, the simulator shut down (content size back to `large`), the emulator killed and its clone AVD deleted, `adb reverse` removed. No `node_modules` script was changed.
- Open items for the owner's re-check (33-15): (1) the empty area under the button of the iOS sheet (85 pt, 27 pt of it native), see above; (2) a long site name (49 characters or more, three lines of 20 / 24) can be crossed by a contour ring on the cover (cosmetic, same as before the cover change); (3) a draft with a map was measured in Chrome only (legend bottom 791.2 pt, budget 792); the device draft run had no parcel; (4) Android summary still over 200 KB (220.5 KB), unchanged since 33-16; (5) not measured: a real phone, scrolling of the sheet at the largest text size, the offline snapshot branch, phone-photo sources, the fullest-route v3.2 and the conditioned typical on the devices (Chrome only).
