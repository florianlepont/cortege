import { useMemo } from "react"
import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useBrandTheme } from "../../app/theme"
import { AppButton } from "../../ui/AppButton"
import { type FinishCta } from "./summary-state"
import { createSummaryScreenStyles } from "./summary-screen.styles"

type FinishBarProps = {
  cta: FinishCta
  accessibilityLabel: string
  onFinish: () => void
}

/**
 * The summary's single bottom button (OA-40): greyed with what is still missing, then
 * "Terminer le relevé". There is no lock and no deadline, and nothing once the survey is finished.
 */
export function FinishBar({ cta, accessibilityLabel, onFinish }: FinishBarProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const insets = useSafeAreaInsets()
  if (cta.kind === "hidden") return null
  return (
    <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <AppButton
        label={cta.label}
        size="lg"
        disabled={cta.kind === "disabled"}
        accessibilityLabel={cta.kind === "ready" ? accessibilityLabel : cta.label}
        onPress={onFinish}
      />
    </View>
  )
}
