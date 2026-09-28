import { useMemo } from "react"
import { View } from "react-native"
import { shouldShowDevTools } from "../../app/dev-tools"
import { SurveyDetailTab } from "../../app/types"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppChoiceChip } from "../../ui/AppChoiceChip"
import { createDetailStyles } from "./styles"

type DetailTabBarProps = {
  activeTab: SurveyDetailTab
  onSelectTab: (tab: SurveyDetailTab) => void
}

const t = fr.surveyDetail.tabs

export function DetailTabBar({ activeTab, onSelectTab }: DetailTabBarProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createDetailStyles(theme), [theme])
  return (
    <View style={styles.filterChipsRow}>
      <AppChoiceChip
        label={t.summary}
        active={activeTab === "summary"}
        onPress={() => onSelectTab("summary")}
      />
      <AppChoiceChip
        label={t.events}
        active={activeTab === "events"}
        onPress={() => onSelectTab("events")}
      />
      {/* The Debug tab shows ids, error codes and raw payloads: dev builds only (D-06). */}
      {shouldShowDevTools() ? (
        <AppChoiceChip
          label={t.debug}
          active={activeTab === "debug"}
          onPress={() => onSelectTab("debug")}
        />
      ) : null}
    </View>
  )
}
