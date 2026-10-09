import { memo, useMemo } from "react"
import { ActivityIndicator, StyleProp, StyleSheet, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandInteraction } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { mapControlIconSize } from "../../app/visual-tokens"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import { GlassSurface } from "../../ui/GlassSurface"
import { MAP_CONTROL_HIT_SLOP, createMapChipStyles } from "./MapChips"

export const SHEET_CLOSE_ICON_SIZE = 20

/** The close circle is drawn at the 44 pt minimum target, so it needs no hit slop. */
export const SHEET_CLOSE_SIZE = brandInteraction.hitTarget.min

/** The locate circle of the map: 50 pt, like the buttons of the top capsule. */
const MAP_CIRCLE_SIZE = 50

type CloseProps = {
  /** The 44 pt glass circle closing an Explorer panel (sheet glass, bright glyph). */
  variant: "close"
}

type MapCircleProps = {
  /** A 50 pt glass circle over a map (map control glass), optionally busy. */
  variant: "map-circle"
  icon: keyof typeof Ionicons.glyphMap
  /** Shows a spinner instead of the glyph and disables the press. */
  busy?: boolean
  /** Where the circle sits on the map. */
  style?: StyleProp<ViewStyle>
}

type MapPillProps = {
  /** A 40 pt glass pill with a glyph and a label, with a 44 pt touch target. */
  variant: "map-pill"
  icon: keyof typeof Ionicons.glyphMap
  label: string
}

export type GlassIconButtonProps = (CloseProps | MapCircleProps | MapPillProps) & {
  accessibilityLabel: string
  onPress: () => void
}

/**
 * The one glass icon button of the map screens and their sheets. Variants:
 * - "close": the close button at the end of every Explorer panel's header: a 44 pt glass circle
 *   with a bright glyph in the primary text colour (12.2-19 fix round), tinted by
 *   `theme.visual.sheet.close`, with a hairline in the fallback; its glyph is checked at 4.5:1 on
 *   the sheet (`visual-tokens.test.ts`).
 * - "map-circle": the locate button, a 50 pt circle on the map control glass, with a spinner while busy.
 * - "map-pill": an action offered on a map (see it on the map, edit the parcels): icon and label.
 * The top capsule of `MapTopControls` keeps its own shared glass: it holds several buttons in one
 * shell.
 */
export const GlassIconButton = memo(function GlassIconButton(props: GlassIconButtonProps) {
  const { accessibilityLabel, onPress } = props
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const chipStyles = useMemo(() => createMapChipStyles(theme), [theme])

  if (props.variant === "map-pill") {
    return (
      <GlassSurface
        tone="auto"
        interactive
        surface={theme.visual.mapControl.glass}
        style={chipStyles.pill}
      >
        <AppPressable
          disableScale
          disableRipple
          style={chipStyles.actionHit}
          hitSlop={{ top: MAP_CONTROL_HIT_SLOP, bottom: MAP_CONTROL_HIT_SLOP }}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
        >
          {/* The map control glyph colour: light moss on the dark map glass (12.2-18, 12.2-19). */}
          <Ionicons name={props.icon} size={18} color={theme.visual.mapControl.icon} />
          <Text style={chipStyles.pillText}>{props.label}</Text>
        </AppPressable>
      </GlassSurface>
    )
  }

  if (props.variant === "map-circle") {
    const busy = props.busy === true
    return (
      <GlassSurface
        tone="auto"
        interactive
        surface={theme.visual.mapControl.glass}
        style={[styles.mapCircle, props.style]}
      >
        <AppPressable
          disableScale
          disableRipple
          style={styles.mapHit}
          onPress={onPress}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ disabled: busy, busy }}
        >
          {busy ? (
            <ActivityIndicator size="small" color={theme.visual.mapControl.icon} />
          ) : (
            <Ionicons
              name={props.icon}
              size={mapControlIconSize}
              color={theme.visual.mapControl.icon}
            />
          )}
        </AppPressable>
      </GlassSurface>
    )
  }

  return (
    <GlassSurface tone="auto" interactive surface={theme.visual.sheet.close} style={styles.close}>
      <AppPressable
        disableScale
        disableRipple
        style={styles.closeHit}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <Ionicons
          name="close-outline"
          size={SHEET_CLOSE_ICON_SIZE}
          color={theme.visual.sheet.closeIcon}
        />
      </AppPressable>
    </GlassSurface>
  )
})

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    close: {
      width: SHEET_CLOSE_SIZE,
      height: SHEET_CLOSE_SIZE,
      borderRadius: SHEET_CLOSE_SIZE / 2,
      borderWidth: 1,
      borderColor: theme.visual.sheet.closeHairline,
    },
    closeHit: {
      width: SHEET_CLOSE_SIZE,
      height: SHEET_CLOSE_SIZE,
      alignItems: "center",
      justifyContent: "center",
    },
    mapCircle: {
      width: MAP_CIRCLE_SIZE,
      height: MAP_CIRCLE_SIZE,
      borderRadius: MAP_CIRCLE_SIZE / 2,
      borderWidth: 1,
      borderColor: theme.visual.mapControl.hairline,
    },
    mapHit: {
      width: MAP_CIRCLE_SIZE,
      height: MAP_CIRCLE_SIZE,
      alignItems: "center",
      justifyContent: "center",
    },
  })
}
