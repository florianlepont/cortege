import { useMemo } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { brandSpacing, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppButton } from "../../ui/AppButton"
import { AppGroupedList } from "../../ui/AppGroupedList"
import { AppText as Text } from "../../ui/AppText"

const t = fr.home.tools

export type GenusTarget = { id: string; name: string; progress: number }

type GenusTargetSheetProps = {
  visible: boolean
  genusName: string
  /** The surveys in progress the genus can still go into. */
  targets: GenusTarget[]
  onStartSurvey: () => void
  onChooseTarget: (surveyId: string) => void
  onClose: () => void
}

/**
 * OA-114: where a genus found by photo goes. A native iOS page sheet (grabber, swipe down to close,
 * system grouped list), not a custom panel: starting a survey with the genus is the one filled
 * button at the top, adding it to a survey in progress is the list below.
 */
export function GenusTargetSheet({
  visible,
  genusName,
  targets,
  onStartSurvey,
  onChooseTarget,
  onClose,
}: GenusTargetSheetProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            {t.chooseSurveyTitle({ genus: genusName })}
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={10}>
            <Text style={styles.close}>{t.close}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <AppButton
            label={t.startSurvey}
            size="lg"
            onPress={() => {
              onClose()
              onStartSurvey()
            }}
            testID="genus-target-start"
          />
          <AppGroupedList
            sections={[
              {
                key: "targets",
                title: t.addToSurveyTitle,
                footer: targets.length > 0 ? t.addToSurveyFooter : t.noOpenSurvey,
                rows: targets.map((target) => ({
                  key: target.id,
                  label: target.name,
                  value: `${target.progress}/10`,
                  onPress: () => {
                    onClose()
                    onChooseTarget(target.id)
                  },
                })),
              },
            ]}
          />
        </ScrollView>
      </View>
    </Modal>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    sheet: { flex: 1, backgroundColor: theme.colors.canvas },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 12,
    },
    title: { ...brandTypography.sectionTitle, color: theme.semanticColors.textStrong },
    close: { ...brandTypography.button, color: theme.semanticColors.accent },
    content: { paddingHorizontal: 20, paddingBottom: brandSpacing.xl, gap: 8 },
  })
}
