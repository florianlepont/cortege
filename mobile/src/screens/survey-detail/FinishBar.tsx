import { useMemo } from "react"
import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppBottomTabBarHeight } from "../../app/useAppBottomTabBarHeight"
import { useBrandTheme } from "../../app/theme"
import type { FactorKey } from "../../app/types"
import { AppButton } from "../../ui/AppButton"
import { type FinishCta } from "./summary-state"
import { createSummaryScreenStyles } from "./summary-screen.styles"

type FinishBarProps = {
  cta: FinishCta
  accessibilityLabel: string
  onFinish: () => void
  onOpenFactor: (factor: FactorKey) => void
}

/**
 * The summary's single bottom button (OA-40): "Commencer / Continuer la notation" while factors
 * remain, greyed with what is still missing otherwise, then "Terminer le relevé". There is no lock and no deadline, and nothing once the survey is finished.
 */
export function FinishBar({ cta, accessibilityLabel, onFinish, onOpenFactor }: FinishBarProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const insets = useSafeAreaInsets()
  // The tab bar floats over the page: the button sits above it, not behind it (OA-94).
  const tabBarHeight = useAppBottomTabBarHeight()
  if (cta.kind === "hidden") return null
  return (
    <View
      style={[styles.bottomBar, { paddingBottom: Math.max(tabBarHeight, insets.bottom, 12) + 8 }]}
    >
      <AppButton
        label={cta.label}
        size="lg"
        disabled={cta.kind === "disabled"}
        accessibilityLabel={cta.kind === "ready" ? accessibilityLabel : cta.label}
        onPress={() => (cta.kind === "next" ? onOpenFactor(cta.factor) : onFinish())}
      />
    </View>
  )
}
