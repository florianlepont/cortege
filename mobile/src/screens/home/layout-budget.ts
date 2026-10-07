import {
  brandComponentTokens,
  brandInteraction,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"

// The vertical budget of Accueil (12.2-14, owner check on the iPhone: "on ne voit pas même un bout
// de la carte quand on démarre"). The styles of the Accueil blocks read their heights and gaps from
// here, and `homeMapVisible` sums the same numbers, so the budget the test asserts is the budget the
// screen draws. Everything is on the 4-grid; nothing here shrinks a 44 pt hit area (D-05).

const HIT = brandInteraction.hitTarget.min
const HAIRLINE = 1

/** Gaps between the blocks of Accueil. */
export const HOME_GAPS = {
  /** Under the native header, above the resume card. */
  contentTop: brandSpacing4.smd,
  /** Between two plain sections (Outils, Autour de vous). */
  section: brandSpacing4.md,
  /**
   * Above "Mes relevés récents": its header is a 44 pt target around an 18 pt title, so 13 pt of
   * the 44 are already empty above the text; 12 on top makes the same 25 pt a plain section shows.
   */
  recent: brandSpacing4.smd,
  /** Under the plain section headers. */
  sectionHeader: brandSpacing4.sm,
} as const

/**
 * The resume card: the numbers its styles use. The card has no border (12.2-17: its hairline is an
 * inset ring drawn inside the box, `ForestCard`), so it adds nothing to the height.
 */
export const RESUME_LAYOUT = {
  padding: brandSpacing4.md,
  /** The glow button (`AppButton` size md). */
  buttonHeight: brandComponentTokens.button.minHeight,
  textGap: brandSpacing4.xs,
  /** Owner check: the button and the ten segments read as two blocks 24 pt apart. */
  progressGap: brandSpacing4.lg,
  progressHeight: 6,
  /** The footer band is the 44 pt link itself: the rule and the band are what separate it (D-20a). */
  footerPaddingY: 0,
  footerRule: HAIRLINE,
} as const

/** The recent surveys: slim rows of one glass card, divided by hairlines (12.2-14). */
export const RECENT_LAYOUT = {
  /** A row: 6 pt, two 20 pt lines (title, chip and date), 6 pt. Never below the hit area. */
  rowHeight: 52,
  rowPaddingY: brandSpacing4.xs + brandSpacing4.xxs,
  /** The status chip of a row: 1 pt above and below its label instead of 5 (20 pt, one line). */
  chipPaddingY: 1,
  /** The score ring of a row (the lists use 38). */
  ringSize: 32,
  /** The header is the 44 pt "Tout voir" target. */
  headerHeight: HIT,
  headerGap: 0,
  cardBorder: HAIRLINE,
  separator: HAIRLINE,
} as const

/** The "Outils" row: the 40 pt icon tile and 8 pt above and below it. */
export const TOOL_ROW_MIN_HEIGHT = 56

/** A plain section header: one line of `brandTypography.sectionHeader`. */
export const SECTION_HEADER_HEIGHT = brandTypography.sectionHeader.lineHeight

/** The nearby map card: a share of the window, never less than room for its two overlays. */
export const MAP_MIN_HEIGHT = 200
export const MAP_HEIGHT_RATIO = 0.34

export function nearbyMapHeight(windowHeight: number): number {
  return Math.max(MAP_MIN_HEIGHT, Math.round(windowHeight * MAP_HEIGHT_RATIO))
}

/** What the budget assumes of the device (iOS 26, native tabs). */
export const BUDGET_ASSUMPTIONS = {
  /** The native navigation bar under the status bar (greeting and profile button). */
  headerBar: 44,
  /** The floating tab bar, with its margin above the home indicator. */
  tabBar: 90,
} as const

export type BudgetDevice = { name: string; width: number; height: number; safeTop: number }

export const BUDGET_DEVICES: readonly BudgetDevice[] = [
  { name: "iPhone 393 x 852", width: 393, height: 852, safeTop: 59 },
  { name: "iPhone 375 x 812", width: 375, height: 812, safeTop: 50 },
]

/** The least of the "Autour de vous" section (header and top of the map) shown at launch. */
export const MIN_VISIBLE_NEARBY = 96

export type HomeBudgetInput = {
  windowHeight: number
  safeTop: number
  /** A draft in progress: the resume card has its ten segments and its footer. */
  hasDraft?: boolean
  /** Lines the title of the resume card takes next to the button (a long site name wraps to 2). */
  resumeTitleLines?: 1 | 2
  /** Lines the body of the resume card takes. */
  resumeBodyLines?: 1 | 2
  /** Surveys in the recent section (0 hides it). */
  recentCount?: number
  /** The alert notice above the resume card, with its height (0 when there is none). */
  alertHeight?: number
}

export function resumeCardHeight(hasDraft: boolean, titleLines: number, bodyLines: number): number {
  const r = RESUME_LAYOUT
  const copy =
    titleLines * brandTypography.screenTitle.lineHeight +
    r.textGap +
    bodyLines * brandTypeScale.subhead.lineHeight
  const row = Math.max(r.buttonHeight, copy)
  const main = 2 * r.padding + row + (hasDraft ? r.progressGap + r.progressHeight : 0)
  const footer = hasDraft ? r.footerRule + 2 * r.footerPaddingY + HIT : 0
  return main + footer
}

export function recentSectionHeight(count: number): number {
  if (count <= 0) return 0
  const l = RECENT_LAYOUT
  const card = 2 * l.cardBorder + count * l.rowHeight + (count - 1) * l.separator
  return HOME_GAPS.recent + l.headerHeight + l.headerGap + card
}

export function toolsSectionHeight(): number {
  return HOME_GAPS.section + SECTION_HEADER_HEIGHT + HOME_GAPS.sectionHeader + TOOL_ROW_MIN_HEIGHT
}

/**
 * How many points of the "Autour de vous" section are above the tab bar when Accueil opens, in the
 * scroll's rest position. `section` counts its header row, `map` only the card under it.
 */
export function homeMapVisible(input: HomeBudgetInput): {
  sectionTop: number
  section: number
  map: number
  mapHeight: number
} {
  const {
    windowHeight,
    safeTop,
    hasDraft = true,
    resumeTitleLines = 1,
    resumeBodyLines = 1,
    recentCount = 3,
    alertHeight = 0,
  } = input
  const mapHeight = nearbyMapHeight(windowHeight)
  const sectionTop =
    HOME_GAPS.contentTop +
    alertHeight +
    resumeCardHeight(hasDraft, resumeTitleLines, resumeBodyLines) +
    recentSectionHeight(recentCount) +
    toolsSectionHeight() +
    HOME_GAPS.section
  const header = SECTION_HEADER_HEIGHT + HOME_GAPS.sectionHeader
  const room = windowHeight - BUDGET_ASSUMPTIONS.tabBar - (safeTop + BUDGET_ASSUMPTIONS.headerBar)
  const section = Math.min(header + mapHeight, Math.max(0, room - sectionTop))
  return { sectionTop, section, map: Math.max(0, section - header), mapHeight }
}
