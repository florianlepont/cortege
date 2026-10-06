import { useMemo } from "react"
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { AppText as Text } from "../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import { useHeaderHeight } from "@react-navigation/elements"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { brandColors, brandSpacing } from "../app/brand-tokens"
import { useBrandTheme } from "../app/theme"
import { formatAreaMegabytes } from "../app/formatters"
import { useAppBottomTabBarHeight } from "../app/useAppBottomTabBarHeight"
import { fr } from "../i18n"
import type { OfflineAreaSummary } from "../storage/offline-map"
import { AppGroupedList, type AppGroupedListSection } from "../ui/AppGroupedList"
import { createAccountStyles, createPageTitleStyles } from "./account/styles"

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
  const styles = useMemo(() => createAccountStyles(theme), [theme])
  const titleStyles = useMemo(() => createPageTitleStyles(theme), [theme])
  const headerHeight = useHeaderHeight()
  const insets = useSafeAreaInsets()
  const tabBarHeight = useAppBottomTabBarHeight(Platform.select({ ios: 84, default: 68 }) ?? 68)

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
          paddingTop: Platform.OS === "ios" ? headerHeight + brandSpacing.md : brandSpacing.md,
          paddingBottom: Math.max(tabBarHeight, insets.bottom) + brandSpacing.md,
          paddingHorizontal: brandSpacing.md,
        },
      ]}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
    >
      <Text style={titleStyles.pageTitle} accessibilityRole="header">
        {manage.title}
      </Text>
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
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: "600" },
  meta: { fontSize: 14, lineHeight: 20 },
  delete: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
})
