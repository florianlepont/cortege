import { useLayoutEffect } from "react"
import { Platform, StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"

const menuText = fr.surveyDetail.menu
const a11y = fr.surveyDetail.a11y

export type HeaderNavigation = {
  setOptions: (options: Partial<NativeStackNavigationOptions>) => void
}

type UseSurveyDetailHeaderParams = {
  navigation: HeaderNavigation
  siteName: string
  /**
   * 12.2-17: the page is named by the native large title (iOS native tab tree): the header's title
   * follows the survey's name, and renaming moves to the "…" menu.
   */
  largeTitle?: boolean
  /** Renames the survey (stable); offered in the menu under the large title, when editable. */
  onRename?: () => void
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
 *
 * 12.2-17: under the native large title the header's title is the survey's name (it shrinks into
 * the bar as the page scrolls, so the name stays on screen) and the menu offers "Renommer" first.
 */
export function useSurveyDetailHeader({
  navigation,
  siteName,
  largeTitle = false,
  onRename,
  onShare,
  onDelete,
  onOpenMenu,
}: UseSurveyDetailHeaderParams): void {
  const theme = useBrandTheme()
  const tint = theme.semanticColors.textStrong

  useLayoutEffect(() => {
    if (Platform.OS === "ios") {
      const renameItems = onRename
        ? [
            {
              type: "action" as const,
              label: menuText.rename,
              icon: { type: "sfSymbol" as const, name: "pencil" as const },
              onPress: onRename,
            },
          ]
        : []
      navigation.setOptions({
        ...(largeTitle ? { title: siteName } : {}),
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
                ...renameItems,
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
          <AppPressable
            style={styles.button}
            onPress={onShare}
            accessibilityRole="button"
            accessibilityLabel={a11y.shareSurvey(siteName)}
          >
            <Ionicons name="share-outline" size={22} color={tint} />
          </AppPressable>
          <AppPressable
            style={styles.button}
            onPress={onOpenMenu}
            accessibilityRole="button"
            accessibilityLabel={a11y.openMenu(siteName)}
          >
            <Ionicons name="ellipsis-horizontal-outline" size={22} color={tint} />
          </AppPressable>
        </View>
      ),
    })
  }, [navigation, siteName, largeTitle, tint, onRename, onShare, onDelete, onOpenMenu])
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  button: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
})
