import { LayoutRectangle, View } from "react-native"
import { AppButton } from "../../ui/AppButton"
import { AppCard } from "../../ui/AppCard"
import { AppField } from "../../ui/AppField"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { MethodVersionPicker, type SurveyFormMethod } from "./MethodVersionPicker"
import { formStyles } from "./styles"
import { fr } from "../../i18n"

// Step 1 of the wizard: the survey's IBP method (D-02) and its site name.
export function SiteSection({
  method,
  siteName,
  setSiteName,
  siteNameError,
  identityReady,
  onLayout,
  onFocus,
  onBlur,
  onContinue,
}: {
  method: SurveyFormMethod
  siteName: string
  setSiteName: (value: string) => void
  siteNameError: string | null
  identityReady: boolean
  onLayout: (layout: LayoutRectangle) => void
  onFocus: () => void
  onBlur: () => void
  onContinue: () => void
}) {
  return (
    <View
      style={formStyles.identityStepContent}
      onLayout={(event) => {
        onLayout(event.nativeEvent.layout)
      }}
    >
      <MethodVersionPicker
        version={method.version}
        locked={method.locked}
        onChange={method.setVersion}
      />

      <AppCard variant="panelElevated" style={formStyles.panel}>
        <AppSectionHeader
          title={fr.surveyForm.site.title}
          subtitle={fr.surveyForm.site.subtitle}
          titleStyle={formStyles.panelTitle}
          subtitleStyle={formStyles.panelBody}
        />

        <AppField
          label={fr.surveyForm.site.nameLabel}
          value={siteName}
          onChangeText={setSiteName}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={fr.surveyForm.site.namePlaceholder}
          error={siteNameError}
          inputStyle={formStyles.input}
        />
      </AppCard>

      <AppButton
        label={fr.surveyForm.site.continue}
        disabled={!identityReady}
        style={formStyles.primaryButton}
        onPress={onContinue}
      />
    </View>
  )
}
