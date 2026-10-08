import { useMemo } from "react"
import { LayoutChangeEvent, View } from "react-native"
import { useTabBarClearance } from "../../app/useAppBottomTabBarHeight"
import { useBrandTheme } from "../../app/theme"
import type { FactorKey } from "../../app/types"
import { GlassButton } from "../../ui/GlassButton"
import { finishBarBottomPadding } from "./finish-bar-layout"
import { type FinishCta } from "./summary-state"
import { createSummaryScreenStyles } from "./summary-screen.styles"

type FinishBarProps = {
  cta: FinishCta
  accessibilityLabel: string
  onFinish: () => void
  onOpenFactor: (factor: FactorKey) => void
  /** Reports the bar's height so the scroll content can end above it. */
  onLayout?: (event: LayoutChangeEvent) => void
}

/**
 * The summary's single bottom button (OA-40): "Commencer / Continuer la notation" while factors
 * remain, greyed with what is still missing otherwise, then "Terminer le relevé". There is no lock and no deadline, and nothing once the survey is finished.
 *
 * D-27c: the bar has no background and floats over the bottom of the page, so the content shows
 * behind it; the button is green glass, the only filled element. The reason a disabled button is
 * disabled is its own label, so no separate line of text needs a scrim behind it. The bar's padding
 * lets touches in the empty areas fall through to the page behind (`box-none`).
 */
export function FinishBar({
  cta,
  accessibilityLabel,
  onFinish,
  onOpenFactor,
  onLayout,
}: FinishBarProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  // The tab bar floats over the page: the button sits above it, not behind it (OA-94).
  const clearance = useTabBarClearance()
  if (cta.kind === "hidden") return null
  return (
    <View
      pointerEvents="box-none"
      onLayout={onLayout}
      style={[styles.bottomBar, { paddingBottom: finishBarBottomPadding(clearance) }]}
    >
      <GlassButton
        label={cta.label}
        size="lg"
        disabled={cta.kind === "disabled"}
        accessibilityLabel={cta.kind === "ready" ? accessibilityLabel : cta.label}
        onPress={() => (cta.kind === "next" ? onOpenFactor(cta.factor) : onFinish())}
        testID="finish-bar-button"
      />
    </View>
  )
}
