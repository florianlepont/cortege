import { useLayoutEffect } from "react"
import { Platform, Pressable, StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"

const menuText = fr.surveyDetail.menu
const a11y = fr.surveyDetail.a11y

export type HeaderNavigation = {
  setOptions: (options: Partial<NativeStackNavigationOptions>) => void
}

type UseSurveyDetailHeaderParams = {
  navigation: HeaderNavigation
  siteName: string
  /** Both callbacks must be stable (`useLatestCallback`): the header items capture them. */
  onShare: () => void
  onDelete: () => void
  /** Opens the sheet that holds "Supprimer" where the native menu is not available. */
  onOpenMenu: () => void
}

/**
 * The summary's header actions (OA-48, OA-49): "Partager" as its own visible button, and a "…"
 * menu that only holds "Supprimer". On iOS they are native header items (the system draws the
 * glass and the menu); elsewhere two icon buttons, the second opening a sheet.
 */
export function useSurveyDetailHeader({
  navigation,
  siteName,
  onShare,
  onDelete,
  onOpenMenu,
}: UseSurveyDetailHeaderParams): void {
  const theme = useBrandTheme()
  const tint = theme.semanticColors.textStrong

  useLayoutEffect(() => {
    if (Platform.OS === "ios") {
      navigation.setOptions({
        unstable_headerRightItems: () => [
          {
            type: "button",
            label: menuText.share,
            icon: { type: "sfSymbol", name: "square.and.arrow.up" },
            tintColor: tint,
            accessibilityLabel: a11y.shareSurvey(siteName),
            onPress: onShare,
          },
          {
            type: "menu",
            label: a11y.openMenu(siteName),
            icon: { type: "sfSymbol", name: "ellipsis" },
            tintColor: tint,
            accessibilityLabel: a11y.openMenu(siteName),
            menu: {
              items: [
                {
                  type: "action",
                  label: menuText.delete,
                  icon: { type: "sfSymbol", name: "trash" },
                  destructive: true,
                  onPress: onDelete,
                },
              ],
            },
          },
        ],
      })
      return
    }
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.row}>
          <Pressable
            style={styles.button}
            onPress={onShare}
            accessibilityRole="button"
            accessibilityLabel={a11y.shareSurvey(siteName)}
          >
            <Ionicons name="share-outline" size={22} color={tint} />
          </Pressable>
          <Pressable
            style={styles.button}
            onPress={onOpenMenu}
            accessibilityRole="button"
            accessibilityLabel={a11y.openMenu(siteName)}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={tint} />
          </Pressable>
        </View>
      ),
    })
  }, [navigation, siteName, tint, onShare, onDelete, onOpenMenu])
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  button: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
})
