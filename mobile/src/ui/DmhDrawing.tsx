import { StyleSheet, View } from "react-native"
import { Circle, Ellipse, Path, Svg } from "react-native-svg"
import { DMH_DRAWING_FRAME, type DmhDrawingData } from "../app/dmh-guide/drawings"
import { useBrandTheme } from "../app/theme"

type DmhDrawingProps = {
  /** The group's drawing (`drawingFor(code)`), or null for a group without data. */
  drawing: DmhDrawingData | null
  /** The group's alt sentence from the catalogue: the drawing is one image for assistive tech. */
  accessibilityLabel: string
  testID?: string
}

const VIEW_BOX = `0 0 ${DMH_DRAWING_FRAME.width} ${DMH_DRAWING_FRAME.height}`

/**
 * D-06 and D-11 (amended 2026-10-26): the association's original line drawing of a dendromicrohabitat
 * group, shown static (the owner dropped every animation of the drawings), complete at the first
 * frame. The data carries no colour: the strokes take the theme's text ink, so the drawing reads in
 * both schemes without a tile. A group without data renders nothing (no box, no gap). A plain
 * function of its props: no state, no effect, no timer.
 */
export function DmhDrawing({
  drawing,
  accessibilityLabel,
  testID = "dmh-drawing",
}: DmhDrawingProps) {
  const theme = useBrandTheme()
  if (!drawing) return null
  const ink = theme.colors.textPrimary
  const line = (width: number) => ({
    stroke: ink,
    fill: "none",
    strokeWidth: width,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  })

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={styles.frame}
    >
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
  )
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    aspectRatio: DMH_DRAWING_FRAME.width / DMH_DRAWING_FRAME.height,
    maxHeight: 240,
  },
})
