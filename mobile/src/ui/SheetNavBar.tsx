import { Ref, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandSpacing4, brandTypeScale, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { AppPressable } from "./AppPressable"
import { AppText as Text } from "./AppText"
import { GlassSurface } from "./GlassSurface"

/** The bar is 52 high (redesign brief B-C1); the targets are 44. */
export const SHEET_NAV_BAR_HEIGHT = 52
const TARGET = 44
const CLOSE_CIRCLE = 30
const CLOSE_GLYPH = 16
const BACK_GLYPH = 22

type SheetNavBarProps = {
  /** The centred title, drawn when there is no back control (a view with a back has no room). */
  title?: string
  /** The focus target of the title (a screen reader lands on it when the view opens). */
  titleRef?: Ref<View>
  /** The leading back control: a chevron and a plain-weight label. */
  back?: {
    label: string
    accessibilityLabel: string
    onPress: () => void
    testID?: string
  }
  closeLabel: string
  onClose: () => void
  closeTestID?: string
  /** Whether the content under the bar has scrolled: only then the bottom hairline shows. */
  scrolled: boolean
  testID?: string
}

/**
 * Phase 32 (redesign B-C1, option B): the bar of a sheet whose content scrolls under it, drawn the
 * way an iOS sheet bar looks. Opaque canvas (scrolled text never shows through), 52 high, a leading
 * back control (chevron and a Sora-Medium label in the accent text ink) or a centred navigation
 * title, and a small 30 pt glass close circle inside a 44 pt target. A hairline in `colors.divider`
 * appears at the bottom edge only once the content has scrolled. It is meant to be the first child
 * of the sheet's scroll view with `stickyHeaderIndices={[0]}` (a header outside the scroll view was
 * drawn under scrolled text in the iOS form sheet, the help sheet finding); it carries its own
 * `zIndex`. Reusable by the other sheets (help, finish, export).
 */
export function SheetNavBar({
  title,
  titleRef,
  back,
  closeLabel,
  onClose,
  closeTestID,
  scrolled,
  testID,
}: SheetNavBarProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.bar} testID={testID}>
      <View style={styles.row}>
        {back ? (
          <AppPressable
            testID={back.testID}
            style={styles.back}
            onPress={back.onPress}
            accessibilityRole="button"
            accessibilityLabel={back.accessibilityLabel}
          >
            <Ionicons
              name="chevron-back-outline"
              size={BACK_GLYPH}
              color={theme.visual.accentText}
            />
            <Text style={styles.backText}>{back.label}</Text>
          </AppPressable>
        ) : (
          <View style={styles.side} />
        )}
        {title && !back ? (
          <View ref={titleRef} accessible accessibilityRole="header" style={styles.titleBox}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
        ) : (
          <View style={styles.fill} />
        )}
        <AppPressable
          testID={closeTestID}
          style={styles.closeTarget}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        >
          <GlassSurface style={styles.closeCircle} surface={theme.visual.sheet.close}>
            <Ionicons
              name="close-outline"
              size={CLOSE_GLYPH}
              color={theme.visual.sheet.closeIcon}
            />
          </GlassSurface>
        </AppPressable>
      </View>
      {scrolled ? (
        <View style={styles.hairline} testID={testID ? `${testID}-hairline` : undefined} />
      ) : null}
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    bar: {
      paddingHorizontal: brandSpacing4.md,
      backgroundColor: theme.semanticColors.backgroundCanvas,
      zIndex: 1,
    },
    row: {
      height: SHEET_NAV_BAR_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
    },
    // Keeps the title centred on the catalogue: as wide as the close target.
    side: {
      width: TARGET,
    },
    fill: {
      flex: 1,
    },
    titleBox: {
      flex: 1,
      alignItems: "center",
    },
    title: {
      ...brandTypography.navTitle,
      color: theme.semanticColors.textStrong,
    },
    back: {
      minHeight: TARGET,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.xxs,
    },
    backText: {
      fontSize: brandTypeScale.body.fontSize,
      lineHeight: brandTypeScale.body.lineHeight,
      fontFamily: brandTypography.heroBody.fontFamily,
      color: theme.visual.accentText,
    },
    closeTarget: {
      width: TARGET,
      height: TARGET,
      alignItems: "center",
      justifyContent: "center",
    },
    closeCircle: {
      width: CLOSE_CIRCLE,
      height: CLOSE_CIRCLE,
      borderRadius: CLOSE_CIRCLE / 2,
      borderWidth: 1,
      borderColor: theme.visual.sheet.closeHairline,
      alignItems: "center",
      justifyContent: "center",
    },
    hairline: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 1,
      backgroundColor: theme.colors.divider,
    },
  })
}
