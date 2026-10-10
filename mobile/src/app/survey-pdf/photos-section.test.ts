import { fr } from "../../i18n"
import { PDF_PAGE_BLOCK_HEIGHT } from "./export-settings"
import { escapeHtml } from "./html"
import { PHOTO_CELL, PHOTOS_PER_PAGE, buildPhotoBlocks, photosSectionCss } from "./photos-section"
import type { ExportPhoto, PdfPalette, SurveyExportData } from "./types"

const t = fr.surveyExport

const PALETTE_KEYS = [
  "ink",
  "inkMuted",
  "inkFaint",
  "line",
  "paper",
  "panel",
  "panelStrong",
  "accent",
  "accentInk",
  "accentSoft",
  "alert",
  "alertSoft",
  "bandLow",
  "bandMid",
  "bandHigh",
  "bandTrack",
  "watermark",
  "parcelFill",
  "parcelStroke",
  "mapCanvas",
  "chartGrid",
] as const

// Fake palette: each value is its key name, so a rule can be traced without any colour literal.
const palette = Object.fromEntries(PALETTE_KEYS.map((key) => [key, key])) as PdfPalette

function photo(index: number, width = 800, height = 600): ExportPhoto {
  return { id: `photo-${index}`, dataUri: `data:image/jpeg;base64,UEhPVE8${index}`, width, height }
}

function photos(count: number): ExportPhoto[] {
  return Array.from({ length: count }, (_unused, index) => photo(index + 1))
}

function makeData(photosField: Partial<SurveyExportData["photos"]> = {}): SurveyExportData {
  const items = photosField.items ?? []
  return {
    surveyId: "survey-1",
    siteName: "Forêt de test",
    parcelIds: [],
    observationYear: 2026,
    versionNumber: 1,
    dateIso: "2026-10-10T08:00:00Z",
    isDraft: false,
    observerName: null,
    method: {
      version: "3.2",
      ibpCas: 1,
      ibpCas3Scale: false,
      regionVersion: null,
      vegetationStage: null,
    },
    scores: null,
    factorEntries: [],
    generatedAtIso: "2026-10-10T09:00:00Z",
    coordinates: null,
    rawFactors: {},
    photos: { items, total: items.length, unavailable: 0, ...photosField },
    map: null,
    history: null,
    assets: { fonts: [], logoDataUri: null },
    layout: { platform: "ios", layoutScale: 1.2487 },
  }
}

function imagesOf(html: string): Array<{ src: string; width: number; height: number }> {
  return [...html.matchAll(/<img [^>]*>/g)].map((match) => ({
    src: match[0].match(/src="([^"]*)"/)![1],
    width: Number(match[0].match(/width="(\d+)"/)![1]),
    height: Number(match[0].match(/height="(\d+)"/)![1]),
  }))
}

describe("constants", () => {
  it("prints six photos a page in a fixed cell that two columns fit in the page", () => {
    expect(PHOTOS_PER_PAGE).toBe(6)
    expect(PHOTO_CELL).toEqual({ width: 255, height: 200 })
  })
})

describe("buildPhotoBlocks without photos", () => {
  it("gives no block when there is no photo and none unavailable", () => {
    expect(buildPhotoBlocks(makeData(), palette)).toEqual([])
  })

  it("gives one block with the note when only unavailable photos exist", () => {
    const blocks = buildPhotoBlocks(makeData({ total: 2, unavailable: 2 }), palette)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].html).toContain(escapeHtml(t.photos.heading))
    expect(blocks[0].html).toContain(escapeHtml(t.photos.unavailable({ count: 2 })))
    expect(blocks[0].html).not.toContain("<img")
    expect(blocks[0].breakBefore).toBe(true)
  })
})

describe("buildPhotoBlocks paging", () => {
  it("gives one block for six photos or fewer", () => {
    expect(buildPhotoBlocks(makeData({ items: photos(1) }), palette)).toHaveLength(1)
    expect(buildPhotoBlocks(makeData({ items: photos(6) }), palette)).toHaveLength(1)
  })

  it("gives two blocks of 6 then 3 for nine photos, each starting a page", () => {
    const blocks = buildPhotoBlocks(makeData({ items: photos(9) }), palette)
    expect(blocks).toHaveLength(2)
    expect(imagesOf(blocks[0].html)).toHaveLength(6)
    expect(imagesOf(blocks[1].html)).toHaveLength(3)
    expect(blocks.every((block) => block.breakBefore === true)).toBe(true)
  })

  it("puts the heading on the first block only and gives distinct ids", () => {
    const blocks = buildPhotoBlocks(makeData({ items: photos(9) }), palette)
    expect(blocks[0].html).toContain(escapeHtml(t.photos.heading))
    expect(blocks[1].html).not.toContain(escapeHtml(t.photos.heading))
    expect(new Set(blocks.map((block) => block.id)).size).toBe(2)
  })

  it("fits a page, with the notes, for a full page", () => {
    const blocks = buildPhotoBlocks(
      makeData({ items: photos(24), total: 30, unavailable: 2 }),
      palette,
    )
    expect(blocks).toHaveLength(4)
    for (const block of blocks) {
      expect(block.height).toBeGreaterThan(PHOTO_CELL.height)
      expect(block.height).toBeLessThanOrEqual(PDF_PAGE_BLOCK_HEIGHT)
    }
  })
})

describe("buildPhotoBlocks images and captions", () => {
  it("keeps the input order and numbers the captions over all the printed photos", () => {
    const blocks = buildPhotoBlocks(makeData({ items: photos(9) }), palette)
    const sources = blocks.flatMap((block) => imagesOf(block.html).map((image) => image.src))
    expect(sources).toEqual(photos(9).map((item) => item.dataUri))
    const captions = blocks.flatMap((block) =>
      [...block.html.matchAll(/class="photos-caption">([^<]*)</g)].map((match) => match[1]),
    )
    expect(captions).toEqual(
      Array.from({ length: 9 }, (_unused, index) =>
        escapeHtml(t.photos.caption({ index: String(index + 1), total: 9 })),
      ),
    )
  })

  it("fits an 800 x 600 photo into the cell keeping its ratio", () => {
    const [block] = buildPhotoBlocks(makeData({ items: [photo(1, 800, 600)] }), palette)
    expect(imagesOf(block.html)).toEqual([{ src: photo(1).dataUri, width: 255, height: 191 }])
  })

  it("fits a portrait photo by its height and a square one by the smaller side", () => {
    const [block] = buildPhotoBlocks(
      makeData({ items: [photo(1, 600, 800), photo(2, 500, 500)] }),
      palette,
    )
    expect(imagesOf(block.html).map(({ width, height }) => [width, height])).toEqual([
      [150, 200],
      [200, 200],
    ])
  })

  it("never exceeds the cell and always has an explicit width and height", () => {
    const sizes: Array<[number, number]> = [
      [4000, 100],
      [100, 4000],
      [1, 1],
      [800, 600],
    ]
    const [block] = buildPhotoBlocks(
      makeData({ items: sizes.map(([width, height], index) => photo(index, width, height)) }),
      palette,
    )
    for (const image of imagesOf(block.html)) {
      expect(image.width).toBeGreaterThan(0)
      expect(image.height).toBeGreaterThan(0)
      expect(image.width).toBeLessThanOrEqual(PHOTO_CELL.width)
      expect(image.height).toBeLessThanOrEqual(PHOTO_CELL.height)
    }
  })

  it("falls back to the cell size for a photo without a usable size", () => {
    const [block] = buildPhotoBlocks(
      makeData({ items: [photo(1, 0, 0), photo(2, Number.NaN, 10)] }),
      palette,
    )
    for (const image of imagesOf(block.html)) {
      expect(image).toMatchObject({ width: 255, height: 200 })
    }
  })
})

describe("buildPhotoBlocks notes", () => {
  it("states the cap when photos were left out", () => {
    const [block] = buildPhotoBlocks(makeData({ items: photos(24), total: 30 }), palette)
    expect(block.html).toContain(escapeHtml(t.photos.capped({ shown: "24", total: 30 })))
    expect(block.html).not.toContain(escapeHtml(t.photos.unavailable({ count: 1 })))
  })

  it("states the unavailable photos, singular and plural", () => {
    const [one] = buildPhotoBlocks(
      makeData({ items: photos(3), total: 4, unavailable: 1 }),
      palette,
    )
    expect(one.html).toContain(escapeHtml(t.photos.unavailable({ count: 1 })))
    const [two] = buildPhotoBlocks(
      makeData({ items: photos(3), total: 5, unavailable: 2 }),
      palette,
    )
    expect(two.html).toContain(escapeHtml(t.photos.unavailable({ count: 2 })))
  })

  it("states both when the cap and failures happen together", () => {
    const [block] = buildPhotoBlocks(
      makeData({ items: photos(22), total: 30, unavailable: 2 }),
      palette,
    )
    expect(block.html).toContain(escapeHtml(t.photos.capped({ shown: "22", total: 30 })))
    expect(block.html).toContain(escapeHtml(t.photos.unavailable({ count: 2 })))
  })

  it("prints no note when every photo is printed", () => {
    const [block] = buildPhotoBlocks(makeData({ items: photos(5), total: 5 }), palette)
    expect(block.html).not.toContain("photos-note")
  })

  it("keeps the notes on the first block only", () => {
    const blocks = buildPhotoBlocks(
      makeData({ items: photos(9), total: 12, unavailable: 1 }),
      palette,
    )
    expect(blocks[1].html).not.toContain("photos-note")
  })
})

describe("safety", () => {
  it("inlines only JPEG data URIs and counts any other photo as unavailable", () => {
    const bad: ExportPhoto[] = [
      { id: "a", dataUri: "https://example.test/a.jpg", width: 10, height: 10 },
      { id: "b", dataUri: "file:///a.jpg", width: 10, height: 10 },
      { id: "c", dataUri: 'data:image/jpeg;base64,AB"onerror="x', width: 10, height: 10 },
    ]
    const blocks = buildPhotoBlocks(makeData({ items: [photo(1), ...bad], total: 4 }), palette)
    const html = blocks.map((block) => block.html).join("")
    expect(imagesOf(html)).toHaveLength(1)
    expect(html).not.toMatch(/file:|https?:|onerror/)
    expect(html).toContain(escapeHtml(t.photos.unavailable({ count: 3 })))
    expect(html).toContain(escapeHtml(t.photos.caption({ index: "1", total: 1 })))
  })

  it("holds no file:, http: nor https: for good photos", () => {
    const html = buildPhotoBlocks(makeData({ items: photos(9) }), palette)
      .map((block) => block.html)
      .join("")
    expect(html).not.toMatch(/file:|https?:/)
  })
})

describe("photosSectionCss", () => {
  const css = photosSectionCss(palette)

  it("prefixes every class with photos-", () => {
    const classes = [...css.matchAll(/\.([a-z][\w-]*)/g)].map((match) => match[1])
    expect(classes.length).toBeGreaterThan(0)
    for (const name of classes) expect(name.startsWith("photos-")).toBe(true)
  })

  it("fixes the cell size and uses palette values only", () => {
    expect(css).toContain(`width: ${PHOTO_CELL.width}px`)
    expect(css).toContain(`height: ${PHOTO_CELL.height}px`)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/)
  })

  it("uses no CSS columns and no 1 px filled rule", () => {
    expect(css).not.toContain("column-count")
    expect(css).not.toMatch(/height: 1px/)
  })
})
