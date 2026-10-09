import { StyleSheet } from "react-native"
import { brandRadius, brandSpacing4, brandTypography } from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

/**
 * The photo block of a survey page (12.2-14, D-27b, second round). No framing card: the photos are
 * a section of the page. One photo is the full content width at 16:10; several are a snapping strip
 * of tiles 78 percent of the content width at 4:3, so the next tile peeks out and the strip reads as
 * a carousel; none (a draft) is a dashed glass tile to add one. The summary and the community page
 * both read this.
 */
export const PHOTO_LAYOUT = {
  /** The page content padding on both sides (summary `content` and sub-page `subContent`). */
  inset: brandSpacing4.md,
  radius: 20,
  gap: brandSpacing4.smd,
  /** One photo: the full content width, 16:10. */
  singleRatio: 16 / 10,
  /** Several photos: this share of the content width per tile, 4:3. */
  stripShare: 0.78,
  stripRatio: 4 / 3,
  /** The dashed tile of a draft without photo. */
  emptyHeight: 96,
  hitTarget: 44,
  pillHeight: 36,
} as const

export type PhotoSize = { mode: "single" | "strip"; width: number; height: number }

/** The size of every tile for `count` photos on a window `windowWidth` points wide. */
export function resolvePhotoSize(count: number, windowWidth: number): PhotoSize {
  const contentWidth = Math.max(0, windowWidth - 2 * PHOTO_LAYOUT.inset)
  if (count <= 1) {
    return { mode: "single", width: contentWidth, height: contentWidth / PHOTO_LAYOUT.singleRatio }
  }
  const width = contentWidth * PHOTO_LAYOUT.stripShare
  return { mode: "strip", width, height: width / PHOTO_LAYOUT.stripRatio }
}

export function createPhotoStyles(theme: BrandTheme) {
  return StyleSheet.create({
    // The block: a header row, then the photos. 8 pt under the header, whose 44 pt row already
    // holds some air under the pill.
    block: {
      gap: brandSpacing4.sm,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: PHOTO_LAYOUT.hitTarget,
    },
    // The 44 pt press target around the glass pill; the pill itself is 36 pt.
    addHit: {
      minHeight: PHOTO_LAYOUT.hitTarget,
      minWidth: PHOTO_LAYOUT.hitTarget,
      justifyContent: "center",
    },
    addPill: {
      height: PHOTO_LAYOUT.pillHeight,
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.xs,
    },
    addPillText: {
      ...brandTypography.meta,
      color: theme.semanticColors.textStrong,
    },
    // The strip bleeds to the screen edges: the page padding is taken back and given to the content,
    // so the first tile starts on the page margin and the last one ends on it.
    strip: {
      marginHorizontal: -PHOTO_LAYOUT.inset,
      flexGrow: 0,
    },
    stripContent: {
      flexDirection: "row",
      gap: PHOTO_LAYOUT.gap,
      paddingHorizontal: PHOTO_LAYOUT.inset,
    },
    // The tile: a hairline from the glass tokens, so nothing moves when the image arrives and a
    // missing photo is as big as a loaded one. Width and height come from `resolvePhotoSize`.
    photo: {
      borderRadius: PHOTO_LAYOUT.radius,
      borderWidth: 1,
      borderColor: theme.visual.glass.cardBorder,
      backgroundColor: theme.colors.panelMuted,
      overflow: "hidden",
    },
    // The press target around a tile: the same box as the tile.
    photoPress: {
      borderRadius: PHOTO_LAYOUT.radius,
    },
    photoImage: {
      ...StyleSheet.absoluteFill,
    },
    // The neutral tile of a photo that is missing or cannot be shown: an outline icon and one
    // short word on the muted surface.
    photoFallback: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
      gap: brandSpacing4.xs,
      paddingHorizontal: brandSpacing4.sm,
    },
    photoFallbackText: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    // A draft without photo: a dashed glass tile as wide as the page content, pressable like
    // "Ajouter".
    emptyTile: {
      minHeight: PHOTO_LAYOUT.emptyHeight,
      borderRadius: PHOTO_LAYOUT.radius,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: theme.colors.inputBorder,
      backgroundColor: theme.visual.glass.cardFill,
      alignItems: "center",
      justifyContent: "center",
      gap: brandSpacing4.sm,
    },
    emptyText: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
  })
}
