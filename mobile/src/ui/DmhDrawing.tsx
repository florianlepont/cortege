import { StyleSheet, View } from "react-native"
import { Circle, Ellipse, Path, Svg } from "react-native-svg"
import { DMH_DRAWING_FRAME, type DmhDrawingData } from "../app/dmh-guide/drawings"
import { brandRadius } from "../app/brand-tokens"
import { useBrandTheme } from "../app/theme"

type DmhDrawingProps = {
  /** The group's drawing (`drawingFor(code)`), or null for a group without data. */
  drawing: DmhDrawingData | null
  /** The group's alt sentence from the catalogue: the drawing is one image for assistive tech. */
  accessibilityLabel: string
  testID?: string
}

/**
 * Rendering weight (redesign brief B-C3): each stroke is drawn at its data width times this
 * constant, so the thin source lines read on the plate. The data module and its stroke range
 * (`DMH_DRAWING_STROKE_RANGE`, checked by `__checks__/dmh-drawings.test.ts`) are untouched.
 */
export const DMH_DRAWING_RENDER_SCALE = 1.5

/** The plate around the drawing: padding (pt) and the tallest drawing it holds (pt). */
export const DMH_PLATE_PADDING = 16
export const DMH_DRAWING_MAX_HEIGHT = 200

const VIEW_BOX = `0 0 ${DMH_DRAWING_FRAME.width} ${DMH_DRAWING_FRAME.height}`

/**
 * D-06 and D-11 (amended 2026-10-26): the association's original line drawing of a dendromicrohabitat
 * group, shown static (the owner dropped every animation of the drawings), complete at the first
 * frame. Redesign (B-C3, owner decision 2026-10-28): the drawing sits on a moss plate
 * (`visual.glass.iconTile`, card radius, 16 pt padding) in the brand ink `semanticColors.ctaPrimary`
 * with strokes drawn at `DMH_DRAWING_RENDER_SCALE` times their width. The data carries no colour. A
 * group without data renders nothing (no box, no gap). A plain function of its props: no state, no
 * effect, no timer. The plate is the image: the wrapper carries the role, label and test id.
 */
export function DmhDrawing({
  drawing,
  accessibilityLabel,
  testID = "dmh-drawing",
}: DmhDrawingProps) {
  const theme = useBrandTheme()
  if (!drawing) return null
  const ink = theme.semanticColors.ctaPrimary
  const line = (width: number) => ({
    stroke: ink,
    fill: "none",
    strokeWidth: width * DMH_DRAWING_RENDER_SCALE,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  })

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[styles.plate, { backgroundColor: theme.visual.glass.iconTile }]}
    >
      <View style={styles.frame}>
        <Svg
          width="100%"
          height="100%"
          viewBox={VIEW_BOX}
          preserveAspectRatio="xMidYMid meet"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {drawing.elements.map((element, index) => {
            if (element.kind === "path") {
              return <Path key={index} d={element.d} {...line(element.width)} />
            }
            if (element.kind === "circle") {
              return (
                <Circle
                  key={index}
                  cx={element.cx}
                  cy={element.cy}
                  r={element.r}
                  {...line(element.width)}
                />
              )
            }
            const transform = element.rotate
              ? `rotate(${element.rotate[0]} ${element.rotate[1]} ${element.rotate[2]})`
              : undefined
            return (
              <Ellipse
                key={index}
                cx={element.cx}
                cy={element.cy}
                rx={element.rx}
                ry={element.ry}
                transform={transform}
                {...line(element.width)}
              />
            )
          })}
        </Svg>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  plate: {
    width: "100%",
    borderRadius: brandRadius.card,
    padding: DMH_PLATE_PADDING,
  },
  frame: {
    width: "100%",
    aspectRatio: DMH_DRAWING_FRAME.width / DMH_DRAWING_FRAME.height,
    maxHeight: DMH_DRAWING_MAX_HEIGHT,
  },
})
