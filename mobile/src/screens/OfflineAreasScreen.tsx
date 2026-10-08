import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { AppText as Text } from "../ui/AppText"
import { PageTitle } from "../ui/PageTitle"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { brandColors, brandSpacing, brandSpacing4, brandTypeScale } from "../app/brand-tokens"
import { useBrandTheme } from "../app/theme"
import { formatAreaMegabytes } from "../app/formatters"
import { useAppBottomTabBarHeight } from "../app/useAppBottomTabBarHeight"
import { fr } from "../i18n"
import type { OfflineAreaSummary } from "../storage/offline-map"
import { AppGroupedList, type AppGroupedListSection } from "../ui/AppGroupedList"
import { useFrameLargeTitle } from "../ui/frame-large-title"
import { accountStyles as styles } from "./account/styles"

const t = fr.offlineMap.areas
const manage = t.manage

type OfflineAreasScreenProps = {
  areas: OfflineAreaSummary[]
  onDeleteArea: (areaId: string) => void
}

/**
 * Paramètres > Cartes hors ligne (owner decision, 2026-10-06): the zones downloaded on the phone,
 * with their size and a delete button. Downloading stays on the Explorer and the survey flow.
 */
export function OfflineAreasScreen({ areas, onDeleteArea }: OfflineAreasScreenProps) {
  const theme = useBrandTheme()
  const insets = useSafeAreaInsets()
  const tabBarHeight = useAppBottomTabBarHeight(Platform.select({ ios: 84, default: 68 }) ?? 68)
  const largeTitle = useFrameLargeTitle()

  const confirmDelete = (area: OfflineAreaSummary): void => {
    Alert.alert(manage.confirmDeleteTitle(area.name), manage.confirmDeleteMessage, [
      { text: fr.common.actions.cancel, style: "cancel" },
      { text: manage.confirmDelete, style: "destructive", onPress: () => onDeleteArea(area.id) },
    ])
  }

  const sections: AppGroupedListSection[] =
    areas.length === 0
      ? []
      : [
          {
            key: "areas",
            footer: manage.footer,
            rows: areas.map((area) => ({
              key: area.id,
              kind: "custom" as const,
              content: (
                <View style={rowStyles.row}>
                  <View style={rowStyles.info}>
                    <Text style={[rowStyles.name, { color: theme.colors.textPrimary }]}>
                      {area.name}
                    </Text>
                    <Text style={[rowStyles.meta, { color: theme.colors.textSecondary }]}>
                      {manage.sizeAndStatus({
                        megabytes: formatAreaMegabytes(area.estimatedBytes),
                        status: t.status[area.status],
                      })}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => confirmDelete(area)}
                    accessibilityRole="button"
                    accessibilityLabel={t.a11y.deleteArea(area.name)}
                    hitSlop={8}
                    style={rowStyles.delete}
                  >
                    <Ionicons name="trash-outline" size={20} color={brandColors.terracotta} />
                  </Pressable>
                </View>
              ),
            })),
          },
        ]

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          // D-19: the route's ScreenFrame starts the page below the transparent header. 12.2-17:
          // under the native large title iOS insets the scroll view (header, tab bar) itself.
          paddingTop: brandSpacing.md,
          paddingBottom: (largeTitle ? 0 : Math.max(tabBarHeight, insets.bottom)) + brandSpacing.md,
          paddingHorizontal: brandSpacing.md,
        },
      ]}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior={largeTitle ? "automatic" : "never"}
      automaticallyAdjustContentInsets={false}
    >
      <PageTitle>{manage.title}</PageTitle>
      {areas.length === 0 ? (
        <View>
          <Text style={[rowStyles.meta, { color: theme.colors.textSecondary }]}>
            {manage.empty}
          </Text>
          <Text style={[rowStyles.meta, { color: theme.colors.textSecondary }]}>
            {manage.footer}
          </Text>
        </View>
      ) : (
        <AppGroupedList sections={sections} />
      )}
    </ScrollView>
  )
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: brandSpacing4.smd, minHeight: 56 },
  info: { flex: 1, gap: brandSpacing4.xxs },
  name: { fontSize: brandTypeScale.headline.fontSize, fontWeight: "600" },
  meta: { fontSize: 14, lineHeight: 20 },
  delete: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
})
