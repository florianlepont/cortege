import { useEffect, useMemo, useRef } from "react"
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from "react-native"
import { brandColors } from "../app/brand-tokens"

const COLORS = [
  brandColors.forest,
  brandColors.moss,
  brandColors.sage,
  brandColors.ochre,
  brandColors.terracotta,
  brandColors.mauve,
]

type Piece = {
  key: number
  color: string
  left: `${number}%`
  sway: number
  spin: number
  delayMs: number
  durationMs: number
}

/** The pieces, laid out from their index so the burst is the same every time. */
export function buildConfettiPieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, index) => ({
    key: index,
    color: COLORS[index % COLORS.length],
    left: `${(index * 37) % 100}%`,
    sway: 12 + ((index * 11) % 22),
    spin: index % 2 === 0 ? 540 : -540,
    delayMs: (index % 9) * 130,
    durationMs: 2600 + (index % 5) * 350,
  }))
}

type ConfettiBurstProps = {
  pieceCount?: number
}

/**
 * OA-08: one shower of confetti in the brand colours that falls once and ends. The caller draws
 * nothing at all when "Reduce Motion" is on. It never takes a touch.
 */
export function ConfettiBurst({ pieceCount = 30 }: ConfettiBurstProps) {
  const { height } = useWindowDimensions()
  const pieces = useMemo(() => buildConfettiPieces(pieceCount), [pieceCount])
  const progress = useRef(pieces.map(() => new Animated.Value(0))).current

  useEffect(() => {
    const animations = progress.map((value, index) =>
      Animated.timing(value, {
        toValue: 1,
        duration: pieces[index].durationMs,
        delay: pieces[index].delayMs,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    )
    const all = Animated.parallel(animations)
    all.start()
    return () => all.stop()
  }, [pieces, progress])

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessible={false}>
      {pieces.map((piece, index) => (
        <Animated.View
          key={piece.key}
          style={[
            styles.piece,
            {
              left: piece.left,
              backgroundColor: piece.color,
              transform: [
                {
                  translateY: progress[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [-30, height + 30],
                  }),
                },
                {
                  translateX: progress[index].interpolate({
                    inputRange: [0, 0.25, 0.5, 0.75, 1],
                    outputRange: [0, piece.sway, 0, -piece.sway, 0],
                  }),
                },
                {
                  rotate: progress[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", `${piece.spin}deg`],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  piece: {
    position: "absolute",
    top: 0,
    width: 9,
    height: 15,
    borderRadius: 2,
  },
})
