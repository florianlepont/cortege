import { useEffect } from "react"
import { StyleSheet, View } from "react-native"
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  ReduceMotion,
  type SharedValue,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { Circle, Line, Path, Polygon, Rect, Svg, Text as SvgText } from "react-native-svg"
import type { RouteMethod } from "@cortege/ibp-domain"
import {
  NEIGHBOURS,
  PARCEL,
  PLOT,
  ROAD,
  ROAD_CENTRE,
  SCHEMA_VIEWBOX,
  type Walk,
  fullWalkPoints,
  measureWalk,
  pointsAttribute,
  stripBand,
  stripWalkPoints,
  treeCrowns,
} from "../../app/route-schema-geometry"
import { brandRadius } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { useScreenVisible } from "../../ui/useScreenVisible"

const AnimatedPath = Animated.createAnimatedComponent(Path)
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

/** One pass of the drawing, then a pause on the finished picture before it starts again. */
const PASS_MS = 3200
const HOLD_MS = 1200

const FULL = measureWalk(fullWalkPoints())
const STRIP = measureWalk(stripWalkPoints())
const CROWNS = treeCrowns()
const PARCEL_POINTS = pointsAttribute(PARCEL)
const BAND_POINTS = pointsAttribute(stripBand())

const A11Y: Readonly<Record<RouteMethod, string>> = {
  full: fr.routeGuide.schema.a11y.full,
  partial_strip: fr.routeGuide.schema.a11y.partialStrip,
  partial_plot: fr.routeGuide.schema.a11y.partialPlot,
}

/**
 * The progress of the drawing, 0 to 1, looping while the sheet can be seen. Under Reduce Motion it
 * stays on the finished picture (1). Never more than one animated layer: this one.
 */
function useSchemaProgress(): SharedValue<number> {
  const reduced = useReducedMotion()
  const visible = useScreenVisible()
  const progress = useSharedValue(reduced || !visible ? 1 : 0)

  useEffect(() => {
    if (reduced || !visible) {
      cancelAnimation(progress)
      progress.value = 1
      return undefined
    }
    progress.value = 0
    progress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: PASS_MS,
          easing: Easing.inOut(Easing.ease),
          reduceMotion: ReduceMotion.System,
        }),
        withTiming(1, { duration: HOLD_MS, reduceMotion: ReduceMotion.System }),
      ),
      -1,
      false,
      undefined,
      ReduceMotion.System,
    )
    return () => cancelAnimation(progress)
  }, [reduced, visible, progress])

  return progress
}

type Palette = {
  stand: string
  standEdge: string
  band: string
  trail: string
  canopy: string
  ink: string
  label: string
}

function paletteOf(theme: BrandTheme): Palette {
  return {
    stand: theme.semanticColors.surfaceElevated,
    standEdge: theme.semanticColors.textSecondary,
    band: theme.semanticColors.accent,
    trail: theme.semanticColors.accent,
    canopy: theme.semanticColors.accent,
    ink: theme.semanticColors.textStrong,
    label: theme.semanticColors.textSecondary,
  }
}

/**
 * The map under every schema, like a cadastral sheet: the neighbouring parcels, the road, and the
 * parcel itself with a strong outline and the crowns of its trees. Static; only the walk on top of
 * it moves.
 */
function ParcelMap({ colors }: { colors: Palette }) {
  return (
    <>
      {NEIGHBOURS.map((piece, index) => (
        <Polygon
          key={index}
          points={pointsAttribute(piece)}
          fill={colors.canopy}
          fillOpacity={0.05 + 0.025 * (index % 3)}
          stroke={colors.standEdge}
          strokeOpacity={0.3}
          strokeWidth={1}
        />
      ))}
      <Polygon
        points={pointsAttribute(ROAD)}
        fill={colors.standEdge}
        fillOpacity={0.14}
        stroke={colors.standEdge}
        strokeOpacity={0.3}
        strokeWidth={1}
      />
      <Line
        x1={ROAD_CENTRE[0][0]}
        y1={ROAD_CENTRE[0][1]}
        x2={ROAD_CENTRE[1][0]}
        y2={ROAD_CENTRE[1][1]}
        stroke={colors.standEdge}
        strokeOpacity={0.5}
        strokeWidth={1.5}
        strokeDasharray={[6, 5]}
      />
      <Polygon points={PARCEL_POINTS} fill={colors.stand} />
      <Polygon points={PARCEL_POINTS} fill={colors.canopy} fillOpacity={0.1} />
      {CROWNS.map((crown, index) => (
        <Circle
          key={index}
          cx={crown.cx}
          cy={crown.cy}
          r={crown.r}
          fill={colors.canopy}
          fillOpacity={0.2 + 0.3 * crown.tone}
        />
      ))}
      <Polygon
        points={PARCEL_POINTS}
        fill="none"
        stroke={colors.ink}
        strokeOpacity={0.75}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
    </>
  )
}

/** The trail of a walk drawn as the progress goes, and the dot at its head. */
function WalkLayer({
  walk,
  progress,
  colors,
  strokeWidth,
}: {
  walk: Walk
  progress: SharedValue<number>
  colors: Palette
  strokeWidth: number
}) {
  const trailProps = useAnimatedProps(() => ({
    strokeDashoffset: walk.length * (1 - progress.value),
  }))
  const dotProps = useAnimatedProps(() => ({
    cx: interpolate(progress.value, walk.shares, walk.xs),
    cy: interpolate(progress.value, walk.shares, walk.ys),
  }))
  return (
    <>
      <AnimatedPath
        d={walk.path}
        fill="none"
        stroke={colors.stand}
        strokeOpacity={0.9}
        strokeWidth={strokeWidth + 4}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={[walk.length, walk.length]}
        animatedProps={trailProps}
      />
      <AnimatedPath
        d={walk.path}
        fill="none"
        stroke={colors.trail}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={[walk.length, walk.length]}
        animatedProps={trailProps}
      />
      <AnimatedCircle
        r={7}
        fill={colors.ink}
        stroke={colors.stand}
        strokeWidth={2}
        animatedProps={dotProps}
      />
    </>
  )
}

function FullSchema({ colors }: { colors: Palette }) {
  const progress = useSchemaProgress()
  return (
    <>
      <ParcelMap colors={colors} />
      <WalkLayer walk={FULL} progress={progress} colors={colors} strokeWidth={3} />
    </>
  )
}

/** A label of the drawing on a light pill, so it stays readable over the trees. */
function MapLabel({ x, y, text, colors }: { x: number; y: number; text: string; colors: Palette }) {
  const width = text.length * 5.6 + 12
  return (
    <>
      <Rect
        x={x - width / 2}
        y={y - 12}
        width={width}
        height={17}
        rx={8}
        fill={colors.stand}
        fillOpacity={0.9}
      />
      <SvgText x={x} y={y} fontSize={11} fill={colors.ink} textAnchor="middle">
        {text}
      </SvgText>
    </>
  )
}

function StripSchema({ colors }: { colors: Palette }) {
  const progress = useSchemaProgress()
  return (
    <>
      <ParcelMap colors={colors} />
      <Polygon points={BAND_POINTS} fill={colors.band} fillOpacity={0.3} />
      <Polygon
        points={BAND_POINTS}
        fill="none"
        stroke={colors.band}
        strokeWidth={2}
        strokeDasharray={[5, 4]}
      />
      <WalkLayer walk={STRIP} progress={progress} colors={colors} strokeWidth={3} />
      <MapLabel x={150} y={70} text={fr.routeGuide.schema.stripWidth} colors={colors} />
      <MapLabel x={150} y={144} text={fr.routeGuide.schema.restGlance} colors={colors} />
    </>
  )
}

function PlotSchema({ colors }: { colors: Palette }) {
  const progress = useSchemaProgress()
  const discProps = useAnimatedProps(() => ({
    r: PLOT.radius * interpolate(progress.value, [0, 0.7, 1], [0, 1, 1]),
  }))
  const radiusProps = useAnimatedProps(() => ({
    strokeOpacity: interpolate(progress.value, [0.6, 0.8, 1], [0, 1, 1]),
  }))
  return (
    <>
      <ParcelMap colors={colors} />
      <AnimatedCircle
        cx={PLOT.cx}
        cy={PLOT.cy}
        fill={colors.band}
        fillOpacity={0.3}
        animatedProps={discProps}
      />
      <AnimatedCircle
        cx={PLOT.cx}
        cy={PLOT.cy}
        fill="none"
        stroke={colors.band}
        strokeWidth={2}
        strokeDasharray={[5, 4]}
        animatedProps={discProps}
      />
      <AnimatedPath
        d={`M${PLOT.cx} ${PLOT.cy} L${PLOT.cx + PLOT.radius} ${PLOT.cy}`}
        stroke={colors.ink}
        strokeWidth={2.5}
        strokeLinecap="round"
        animatedProps={radiusProps}
      />
      <Circle cx={PLOT.cx} cy={PLOT.cy} r={5} fill={colors.ink} />
      <MapLabel x={150} y={122} text={fr.routeGuide.schema.plotArea} colors={colors} />
    </>
  )
}

export type RouteSchemaProps = {
  method: RouteMethod
}

/**
 * The small drawing of a parcours in its explanation sheet (owner request, Phase 30): the stand seen
 * from above and what the observer does in it. A point walks the strips of the full parcours, follows
 * the one wide strip of the partial parcours by strip, and a circle of one hectare draws itself for
 * the plot. A schematic, not to scale: the sentence under it gives the figures. It loops while the
 * screen can be seen, stays on its finished picture under Reduce Motion, and takes every colour from
 * the theme, so it follows the light and the dark appearance.
 */
export function RouteSchema({ method }: RouteSchemaProps) {
  const theme = useBrandTheme()
  const colors = paletteOf(theme)
  return (
    <View
      style={[styles.frame, { backgroundColor: theme.semanticColors.surfaceSoft }]}
      testID={`route-schema-${method}`}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${SCHEMA_VIEWBOX.width} ${SCHEMA_VIEWBOX.height}`}
        accessible
        accessibilityRole="image"
        accessibilityLabel={A11Y[method]}
      >
        {method === "full" ? <FullSchema colors={colors} /> : null}
        {method === "partial_strip" ? <StripSchema colors={colors} /> : null}
        {method === "partial_plot" ? <PlotSchema colors={colors} /> : null}
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    aspectRatio: SCHEMA_VIEWBOX.width / SCHEMA_VIEWBOX.height,
    borderRadius: brandRadius.field,
    overflow: "hidden",
  },
})
