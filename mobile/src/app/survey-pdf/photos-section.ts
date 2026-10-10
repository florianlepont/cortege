import { fr } from "../../i18n"
import { escapeHtml } from "./html"
import { PDF_FONT_FAMILIES } from "./types"
import type { ExportPhoto, PdfBlock, PdfPalette, SurveyExportData } from "./types"

// The photo pages of the sheet (phase 25.1, D-05): every prepared photo, in the order given
// (the loader gives shooting order), six to a page in fixed cells with a "Photo i sur N" caption.
// The app links no photo to a factor, so there is no grouping. Pure: the photos arrive as JPEG
// data URIs with their pixel size; only a well-formed `data:image/jpeg;base64,` URI is inlined, so
// nothing here can load a file or a URL.

const t = fr.surveyExport.photos

/** Photos to a page: two columns of three rows. */
export const PHOTOS_PER_PAGE = 6
/** One photo cell in design units: two cells and the gap fill the 515 wide content. */
export const PHOTO_CELL = { width: 255, height: 200 } as const

const COLUMNS = 2
const COLUMN_GAP = 5
const CAPTION_HEIGHT = 16
const ROW_GAP = 8
const ROW_HEIGHT = PHOTO_CELL.height + CAPTION_HEIGHT + ROW_GAP
const HEADING_HEIGHT = 24
const NOTE_LINE_HEIGHT = 13
const NOTE_PADDING = 6
const NOTE_CHARS_PER_LINE = 100
const CARD_MARGIN = 10

const JPEG_DATA_URI = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/

/** The size of a photo fitted inside the cell, keeping its ratio; the cell itself if unusable. */
function fitInCell(photo: ExportPhoto): { width: number; height: number } {
  if (!(photo.width > 0) || !(photo.height > 0)) {
    return { width: PHOTO_CELL.width, height: PHOTO_CELL.height }
  }
  const scale = Math.min(PHOTO_CELL.width / photo.width, PHOTO_CELL.height / photo.height)
  return {
    width: Math.min(PHOTO_CELL.width, Math.max(1, Math.round(photo.width * scale))),
    height: Math.min(PHOTO_CELL.height, Math.max(1, Math.round(photo.height * scale))),
  }
}

function cellHtml(photo: ExportPhoto, index: number, total: number): string {
  const size = fitInCell(photo)
  const left = Math.round((PHOTO_CELL.width - size.width) / 2)
  const top = Math.round((PHOTO_CELL.height - size.height) / 2)
  const caption = t.caption({ index: String(index), total })
  return `<div class="photos-cell"><div class="photos-frame"><img class="photos-image" width="${size.width}" height="${size.height}" style="left: ${left}px; top: ${top}px" src="${photo.dataUri}"></div><p class="photos-caption">${escapeHtml(caption)}</p></div>`
}

function notesOf(data: SurveyExportData, printed: number, unavailable: number): string[] {
  const left = data.photos.total - printed - unavailable
  const notes: string[] = []
  if (left > 0) notes.push(t.capped({ shown: String(printed), total: data.photos.total }))
  if (unavailable > 0) notes.push(t.unavailable({ count: unavailable }))
  return notes
}

/**
 * The photo pages: one block per six photos, each starting a page, the heading and the notes on the
 * first. No block when there is no photo and none unavailable. A photo whose data URI is not a
 * JPEG data URI is not inlined and counts as unavailable. The caption total is the number of
 * photos printed; the notes tell how many were left out by the cap or could not be read.
 */
export function buildPhotoBlocks(data: SurveyExportData, _palette: PdfPalette): PdfBlock[] {
  const usable = data.photos.items.filter((photo) => JPEG_DATA_URI.test(photo.dataUri))
  const unavailable = data.photos.unavailable + (data.photos.items.length - usable.length)
  if (usable.length === 0 && unavailable === 0) return []

  const notes = notesOf(data, usable.length, unavailable)
  const noteText = notes.join(" ")
  const noteHtml = noteText ? `<p class="photos-note">${escapeHtml(noteText)}</p>` : ""
  const noteHeight = noteText
    ? Math.max(1, Math.ceil(noteText.length / NOTE_CHARS_PER_LINE)) * NOTE_LINE_HEIGHT +
      NOTE_PADDING
    : 0
  const heading = `<h2 class="photos-heading">${escapeHtml(t.heading)}</h2>`

  const pageCount = Math.max(1, Math.ceil(usable.length / PHOTOS_PER_PAGE))
  const blocks: PdfBlock[] = []
  for (let page = 0; page < pageCount; page += 1) {
    const first = page * PHOTOS_PER_PAGE
    const cells = usable
      .slice(first, first + PHOTOS_PER_PAGE)
      .map((photo, position) => cellHtml(photo, first + position + 1, usable.length))
    const rows: string[] = []
    for (let start = 0; start < cells.length; start += COLUMNS) {
      rows.push(`<div class="photos-row">${cells.slice(start, start + COLUMNS).join("")}</div>`)
    }
    const head = page === 0 ? `${heading}\n${noteHtml}\n` : ""
    const headHeight = page === 0 ? HEADING_HEIGHT + noteHeight : 0
    blocks.push({
      id: `photos-${page + 1}`,
      html: `<section class="photos-card">\n${head}${rows.join("\n")}\n</section>`,
      height: headHeight + rows.length * ROW_HEIGHT + CARD_MARGIN,
      breakBefore: true,
    })
  }
  return blocks
}

/** CSS of the photo pages; every class is prefixed `photos-`, every colour is a palette value. */
export function photosSectionCss(palette: PdfPalette): string {
  const font = PDF_FONT_FAMILIES
  return `
.photos-card { display: block; margin: 0 0 ${CARD_MARGIN}px; }
.photos-heading { margin: 0; height: ${HEADING_HEIGHT}px; font-family: ${font.heading}; font-size: 11px; line-height: ${HEADING_HEIGHT}px; color: ${palette.ink}; }
.photos-note { margin: 0; padding: 3px 0; font-family: ${font.body}; font-size: 9px; line-height: ${NOTE_LINE_HEIGHT}px; color: ${palette.alert}; }
.photos-row { display: flex; height: ${PHOTO_CELL.height + CAPTION_HEIGHT}px; margin: 0 0 ${ROW_GAP}px; }
.photos-cell { width: ${PHOTO_CELL.width}px; margin-right: ${COLUMN_GAP}px; }
.photos-cell:last-child { margin-right: 0; }
.photos-frame { position: relative; width: ${PHOTO_CELL.width}px; height: ${PHOTO_CELL.height}px; overflow: hidden; background: ${palette.panel}; }
.photos-image { position: absolute; display: block; }
.photos-caption { margin: 0; height: ${CAPTION_HEIGHT}px; font-family: ${font.body}; font-size: 8.5px; line-height: ${CAPTION_HEIGHT}px; color: ${palette.inkMuted}; }
`
}
