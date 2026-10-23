import { StyleSheet, View } from "react-native"
import type { RouteAdvice as RouteAdviceResult, RouteWarningCode } from "@cortege/ibp-domain"
import { brandSpacing4 } from "../../app/brand-tokens"
import { ROUTE_WARNING_TEXT, routeAdviceText } from "../../app/route-text"
import { AppNotice } from "../../ui/AppNotice"

export type RouteNoticesProps = {
  /** The package's warning codes. */
  warnings: readonly RouteWarningCode[]
}

/**
 * The package's warnings under the reasons (UI-SPEC section 4.3): one warning notice per code, from
 * the catalogue sentence of the code. Each is a polite live region, so a warning that appears after
 * an answer is read out.
 */
export function RouteNotices({ warnings }: RouteNoticesProps) {
  if (warnings.length === 0) return null
  return (
    <View style={styles.list}>
      {warnings.map((code) => (
        <View key={code} accessibilityLiveRegion="polite" testID={`route-notice-${code}`}>
          <AppNotice
            tone="warning"
            icon="alert-circle-outline"
            message={ROUTE_WARNING_TEXT[code]}
          />
        </View>
      ))}
    </View>
  )
}

export type RouteAdviceProps = {
  advice: RouteAdviceResult
}

/**
 * The advice block (O-04, R-18 to R-21): the estimated duration as an indication for an observer used
 * to the IBP, and the notes on the uncapped counting, a beginner and a short time. Information only:
 * rendered apart from the suggestion with no action, and nothing here feeds back into the parcours,
 * the mode or the surface.
 */
export function RouteAdvice({ advice }: RouteAdviceProps) {
  if (advice.advice.length === 0) return null
  const lines = advice.advice.map((code) =>
    routeAdviceText(code, { estimated_minutes: advice.estimated_minutes }),
  )
  return (
    <View testID="route-advice">
      <AppNotice tone="info" icon="information-circle-outline" message={lines.join("\n")} />
    </View>
  )
}

const styles = StyleSheet.create({
  list: {
    gap: brandSpacing4.sm,
  },
})
