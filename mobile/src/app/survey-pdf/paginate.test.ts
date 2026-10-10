import { fr } from "../../i18n"
import { PDF_PAGE_BLOCK_HEIGHT } from "./export-settings"
import { escapeHtml } from "./html"
import {
  DRAFT_BANNER_HEIGHT,
  PAGE_FILL_FACTOR,
  PAGE_FOOTER_HEIGHT,
  PAGE_HEADER_HEIGHT,
  paginateBlocks,
} from "./paginate"
import type { PageChrome } from "./paginate"
import { PDF_CLASS } from "./styles"
import type { PdfBlock } from "./types"

const t = fr.surveyExport

const LOGO = "data:image/png;base64,iVBORw0KGgo="

const CHROME: PageChrome = {
  siteName: "Forêt de test",
  logoDataUri: LOGO,
  isDraft: false,
  generatedAtText: "10 octobre 2026",
}

function block(id: string, height: number, extra: Partial<PdfBlock> = {}): PdfBlock {
  return { id, html: `<div id="${id}">${id}</div>`, height, ...extra }
}

function count(html: string, needle: string): number {
  return html.split(needle).length - 1
}

function pageSections(html: string): string[] {
  return html.split('<section class="').slice(1)
}

function pageOf(html: string, id: string): number {
  return pageSections(html).findIndex((page) => page.includes(`id="${id}"`)) + 1
}

describe("constants", () => {
  test("the fill factor is a share below 1 and the chrome leaves room for content", () => {
    expect(PAGE_FILL_FACTOR).toBeGreaterThan(0.8)
    expect(PAGE_FILL_FACTOR).toBeLessThan(1)
    expect(PAGE_HEADER_HEIGHT + PAGE_FOOTER_HEIGHT).toBeLessThan(PDF_PAGE_BLOCK_HEIGHT / 2)
    expect(DRAFT_BANNER_HEIGHT).toBeGreaterThan(0)
  })
})

describe("paginateBlocks packing", () => {
  test("three blocks of 300 give two pages with their numbers in the footers", () => {
    const result = paginateBlocks([block("a", 300), block("b", 300), block("c", 300)], CHROME)
    expect(result.pageCount).toBe(2)
    expect(count(result.html, "<section ")).toBe(2)
    expect(result.html).toContain(t.page.number({ index: "1", total: 2 }))
    expect(result.html).toContain(t.page.number({ index: "2", total: 2 }))
    expect(pageOf(result.html, "a")).toBe(1)
    expect(pageOf(result.html, "b")).toBe(1)
    expect(pageOf(result.html, "c")).toBe(2)
  })

  test("blocks keep their order inside a page", () => {
    const { html } = paginateBlocks([block("a", 100), block("b", 100)], CHROME)
    expect(html.indexOf('id="a"')).toBeLessThan(html.indexOf('id="b"'))
  })

  test("no block at all still gives one empty page", () => {
    const result = paginateBlocks([], CHROME)
    expect(result.pageCount).toBe(1)
    expect(result.html).toContain(t.page.number({ index: "1", total: 1 }))
  })

  test("a breakBefore block starts a new page", () => {
    const result = paginateBlocks([block("a", 100), block("b", 100, { breakBefore: true })], CHROME)
    expect(result.pageCount).toBe(2)
    expect(pageOf(result.html, "b")).toBe(2)
  })

  test("a breakBefore block on an empty page does not add an empty page", () => {
    const first = paginateBlocks([block("a", 100, { breakBefore: true })], CHROME)
    expect(first.pageCount).toBe(1)
    const twice = paginateBlocks(
      [
        block("a", 100),
        block("b", 100, { breakBefore: true }),
        block("c", 100, { breakBefore: true }),
      ],
      CHROME,
    )
    expect(twice.pageCount).toBe(3)
  })

  test("a keepWithNext heading moves to the next page with the block that follows", () => {
    const result = paginateBlocks(
      [block("a", 400), block("h", 30, { keepWithNext: true }), block("b", 300)],
      CHROME,
    )
    expect(result.pageCount).toBe(2)
    expect(pageOf(result.html, "a")).toBe(1)
    expect(pageOf(result.html, "h")).toBe(2)
    expect(pageOf(result.html, "b")).toBe(2)
  })

  test("a keepWithNext heading stays when it fits with the next block", () => {
    const result = paginateBlocks(
      [block("a", 100), block("h", 30, { keepWithNext: true }), block("b", 300)],
      CHROME,
    )
    expect(result.pageCount).toBe(1)
  })

  test("a chain of keepWithNext blocks moves together", () => {
    const result = paginateBlocks(
      [
        block("a", 450),
        block("h1", 20, { keepWithNext: true }),
        block("h2", 20, { keepWithNext: true }),
        block("b", 200),
      ],
      CHROME,
    )
    expect(pageOf(result.html, "h1")).toBe(2)
    expect(pageOf(result.html, "h2")).toBe(2)
    expect(pageOf(result.html, "b")).toBe(2)
  })

  test("keepWithNext does not hold a heading to a block that starts its own page", () => {
    const result = paginateBlocks(
      [block("h", 30, { keepWithNext: true }), block("b", 100, { breakBefore: true })],
      CHROME,
    )
    expect(pageOf(result.html, "h")).toBe(1)
    expect(pageOf(result.html, "b")).toBe(2)
  })

  test("a trailing keepWithNext block has nothing to wait for", () => {
    const result = paginateBlocks([block("a", 100), block("h", 30, { keepWithNext: true })], CHROME)
    expect(result.pageCount).toBe(1)
  })

  test("a block taller than the content area gets a page of its own, with no empty page before", () => {
    const tall = block("tall", PDF_PAGE_BLOCK_HEIGHT)
    const alone = paginateBlocks([tall], CHROME)
    expect(alone.pageCount).toBe(1)
    const between = paginateBlocks([block("a", 100), tall, block("b", 100)], CHROME)
    expect(between.pageCount).toBe(3)
    expect(pageOf(between.html, "tall")).toBe(2)
    expect(pageOf(between.html, "b")).toBe(3)
  })

  test("a block that fits the area but not the fill factor still gets a page when alone", () => {
    const area = PDF_PAGE_BLOCK_HEIGHT - PAGE_HEADER_HEIGHT - PAGE_FOOTER_HEIGHT
    const result = paginateBlocks([block("a", area), block("b", 10)], CHROME)
    expect(result.pageCount).toBe(2)
  })

  test("the fill factor limits what several blocks may share", () => {
    const area = PDF_PAGE_BLOCK_HEIGHT - PAGE_HEADER_HEIGHT - PAGE_FOOTER_HEIGHT
    const share = area * PAGE_FILL_FACTOR
    expect(paginateBlocks([block("a", share / 2), block("b", share / 2)], CHROME).pageCount).toBe(1)
    expect(
      paginateBlocks([block("a", share / 2), block("b", share / 2 + 1)], CHROME).pageCount,
    ).toBe(2)
  })

  test("non-finite and negative heights count as zero", () => {
    const result = paginateBlocks(
      [block("a", Number.NaN), block("b", -50), block("c", Number.POSITIVE_INFINITY)],
      CHROME,
    )
    expect(result.pageCount).toBe(1)
  })

  test("the banner takes room from a draft page", () => {
    // Two blocks of 340 fit a normal page (680 of 680.8) but not the page that carries the banner.
    const sized = [block("a", 340), block("b", 340)]
    expect(paginateBlocks(sized, CHROME).pageCount).toBe(1)
    expect(paginateBlocks(sized, { ...CHROME, isDraft: true }).pageCount).toBe(2)
  })
})

describe("paginateBlocks page chrome", () => {
  const blocks = [block("a", 300), block("b", 300), block("c", 300)]

  test("a draft has the banner and the watermark on every page", () => {
    const result = paginateBlocks(blocks, { ...CHROME, isDraft: true })
    expect(result.pageCount).toBe(2)
    expect(count(result.html, `class="${PDF_CLASS.banner}"`)).toBe(result.pageCount)
    expect(count(result.html, `class="${PDF_CLASS.watermark}"`)).toBe(result.pageCount)
    expect(count(result.html, t.draft.banner)).toBe(result.pageCount)
    expect(count(result.html, `>${t.draft.watermark}<`)).toBe(result.pageCount)
    expect(count(result.html, `${PDF_CLASS.page} ${PDF_CLASS.draft}`)).toBe(result.pageCount)
  })

  test("a submitted survey has neither the banner nor the watermark", () => {
    const { html } = paginateBlocks(blocks, CHROME)
    expect(html).not.toContain(t.draft.banner)
    expect(html).not.toContain(t.draft.watermark)
    expect(html).not.toContain(PDF_CLASS.banner)
    expect(html).not.toContain(PDF_CLASS.watermark)
    expect(html).not.toContain(PDF_CLASS.draft)
  })

  test("the watermark comes after the content so that cards cannot hide it", () => {
    const { html } = paginateBlocks([block("a", 100)], { ...CHROME, isDraft: true })
    expect(html.indexOf('id="a"')).toBeLessThan(html.indexOf(PDF_CLASS.watermark))
  })

  test("the header holds the logo, the sheet title and the site name", () => {
    const { html } = paginateBlocks([block("a", 100)], CHROME)
    expect(html).toContain(`<img class="${PDF_CLASS.logo}" src="${LOGO}"`)
    expect(html).toContain(`>${t.sheetTitle}<`)
    expect(html).toContain(`>${CHROME.siteName}<`)
  })

  test("the logo appears on every page, once per page", () => {
    const { html, pageCount } = paginateBlocks(blocks, CHROME)
    expect(count(html, `class="${PDF_CLASS.logo}"`)).toBe(pageCount)
  })

  test("with no logo there is no image element", () => {
    const { html } = paginateBlocks([block("a", 100)], { ...CHROME, logoDataUri: null })
    expect(html).not.toContain("<img")
    expect(html).toContain(`>${t.sheetTitle}<`)
  })

  test("a logo that is not a base64 PNG or JPEG data URI is dropped", () => {
    for (const logoDataUri of [
      "https://example.invalid/logo.png",
      'data:image/png;base64,AAAA" onerror="x',
      "data:text/html;base64,AAAA",
      "",
    ]) {
      const { html } = paginateBlocks([block("a", 100)], { ...CHROME, logoDataUri })
      expect(html).not.toContain("<img")
    }
  })

  test("the site name is escaped in every page header", () => {
    const hostile = '<script>alert("x")</script> & <img src=x onerror=y>'
    const { html, pageCount } = paginateBlocks(blocks, { ...CHROME, siteName: hostile })
    expect(html).not.toContain("<script")
    expect(html).not.toContain("<img src=x")
    expect(count(html, escapeHtml(hostile))).toBe(pageCount)
  })

  test("the generated text and the app name are escaped", () => {
    const { html } = paginateBlocks([block("a", 100)], {
      ...CHROME,
      generatedAtText: "<b>hier</b>",
    })
    expect(html).not.toContain("<b>hier")
    expect(html).toContain(t.page.generatedAt({ date: escapeHtml("<b>hier</b>") }))
  })

  test("the footer shows the generation date, the app name and the page number", () => {
    const { html } = paginateBlocks([block("a", 100)], CHROME)
    expect(html).toContain(t.page.generatedAt({ date: CHROME.generatedAtText }))
    expect(html).toContain(`>${t.appName}<`)
    expect(html).toContain(t.page.number({ index: "1", total: 1 }))
  })

  test("the output carries no remote address and no script", () => {
    const { html } = paginateBlocks(blocks, { ...CHROME, isDraft: true })
    expect(html).not.toMatch(/https?:|<script/)
  })

  test("is deterministic", () => {
    expect(paginateBlocks(blocks, CHROME)).toEqual(paginateBlocks(blocks, CHROME))
  })
})
