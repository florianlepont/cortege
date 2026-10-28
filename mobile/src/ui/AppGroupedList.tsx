import { Children, Fragment, ReactNode, useMemo } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"
import { AppText as Text } from "./AppText"
import { Ionicons } from "@expo/vector-icons"
import { brandRadius, brandSpacing4, brandTypeScale, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { AppPressable } from "./AppPressable"

type AppGroupedListNavRow = {
  key: string
  kind?: "nav"
  label: string
  value?: string
  onPress?: () => void
  destructive?: boolean
  centered?: boolean
  loading?: boolean
  disabled?: boolean
  accessibilityLabel?: string
  accessibilityHint?: string
  /** Leading outline glyph in a 28 pt tile (D-07: `-outline` names only). */
  icon?: keyof typeof Ionicons.glyphMap
  /**
   * The label may wrap to two lines and the value never shrinks (used by the "Historique de la
   * parcelle" rows, whose label would be truncated at 375 pt).
   */
  multiline?: boolean
  /**
   * The opposite choice: the label stays on one line whole and the value wraps to at most this many
   * lines, right-aligned (the summary's "Parcelles" row, whose value names the parcours).
   */
  valueLines?: number
  /**
   * Phase 32: how many lines the label may take (default 1; 2 when `multiline`). Wins over
   * `multiline` for the label only.
   */
  labelLines?: number
  /** Phase 32: a second line under the label (13/18, secondary ink), e.g. a guide entry's caption. */
  subtitle?: string
  /** Phase 32: the label in the medium 15/21 body face (a choice list) instead of 16 SemiBold. */
  medium?: boolean
  /** Phase 32: a taller row than the default 48 (a 56 pt target for a list of choices). */
  minHeight?: number
  testID?: string
}

type AppGroupedListCustomRow = {
  key: string
  kind: "custom"
  content: ReactNode
}

export type AppGroupedListRow = AppGroupedListNavRow | AppGroupedListCustomRow

export type AppGroupedListSection = {
  key: string
  title?: string
  footer?: string
  rows: AppGroupedListRow[]
}

type AppGroupedListProps = {
  sections: AppGroupedListSection[]
}

function hasIcon(row: AppGroupedListRow): boolean {
  return !isCustomRow(row) && Boolean(row.icon)
}

function isCustomRow(row: AppGroupedListRow): row is AppGroupedListCustomRow {
  return row.kind === "custom"
}

/**
 * 12.2 (D-12): the leading tile of a row, 28 pt, radius 12, 18% moss over the glass with the accent
 * outline glyph. Decorative: the row label carries the meaning.
 */
export function AppGroupedListIconTile({
  name,
  destructive,
}: {
  name: keyof typeof Ionicons.glyphMap
  destructive?: boolean
}) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <View style={styles.iconTile} accessible={false}>
      <Ionicons
        name={name}
        size={ICON_SIZE}
        color={destructive ? theme.colors.terracotta : theme.visual.glass.iconTint}
      />
    </View>
  )
}

/**
 * ACC-03: an iOS-style grouped list (Profil, Connexion, Données, À propos), replacing a mix of
 * inline forms, standalone rows and pills with one consistent structure.
 */
export function AppGroupedList({ sections }: AppGroupedListProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.list}>
      {sections.map((section) => (
        <View key={section.key} style={styles.section}>
          {section.title ? (
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {section.title}
            </Text>
          ) : null}
          <AppGroupedContainer
            dividerInset={(index) =>
              hasIcon(section.rows[index]) ? ICON_DIVIDER_INSET : DEFAULT_DIVIDER_INSET
            }
          >
            {section.rows.map((row) =>
              isCustomRow(row) ? (
                <View key={row.key} style={styles.customRow}>
                  {row.content}
                </View>
              ) : (
                <NavRow key={row.key} row={row} theme={theme} styles={styles} />
              ),
            )}
          </AppGroupedContainer>
          {section.footer ? <Text style={styles.sectionFooter}>{section.footer}</Text> : null}
        </View>
      ))}
    </View>
  )
}

type AppGroupedContainerProps = {
  children: ReactNode
  /**
   * Where the hairlines between children start (left margin). A number for all of them, or a
   * function of the index of the child under the hairline (so a row with a leading tile can start
   * its hairline under the label). Default 16.
   */
  dividerInset?: number | ((index: number) => number)
}

/**
 * Phase 32 (redesign A-I1): the one grouped container of the app, a glass card at the card radius
 * with a 1 pt hairline between its children, clipped. The Settings lists, the F group list and the
 * guide sheet all use it, so the list look is defined once. It is a single level: put rows in it,
 * never another card.
 */
export function AppGroupedContainer({
  children,
  dividerInset = DEFAULT_DIVIDER_INSET,
}: AppGroupedContainerProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const items = Children.toArray(children)

  return (
    <View style={styles.sectionBody}>
      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <View
              style={[
                styles.divider,
                {
                  marginLeft:
                    typeof dividerInset === "function" ? dividerInset(index) : dividerInset,
                },
              ]}
            />
          ) : null}
          {item}
        </Fragment>
      ))}
    </View>
  )
}

type GroupedListStyles = ReturnType<typeof createStyles>

function NavRow({
  row,
  theme,
  styles,
}: {
  row: AppGroupedListNavRow
  theme: BrandTheme
  styles: GroupedListStyles
}) {
  const isInteractive = Boolean(row.onPress) && !row.disabled && !row.loading
  const labelStyle = [
    styles.label,
    row.medium ? styles.labelMedium : null,
    row.destructive ? styles.labelDestructive : null,
    row.centered ? styles.labelCentered : null,
    row.valueLines ? styles.valueFixed : null,
  ]
  const labelLines = row.labelLines ?? (row.multiline ? 2 : 1)

  return (
    <AppPressable
      disableScale
      disableRipple
      style={({ pressed }) => [
        styles.row,
        row.centered ? styles.rowCentered : null,
        row.minHeight ? { minHeight: row.minHeight } : null,
        pressed && isInteractive ? styles.rowPressed : null,
      ]}
      onPress={row.onPress}
      disabled={!isInteractive}
      accessibilityRole={row.onPress ? "button" : "none"}
      accessibilityLabel={row.accessibilityLabel ?? row.label}
      accessibilityHint={row.accessibilityHint}
      accessibilityState={{ disabled: row.disabled || row.loading, busy: row.loading }}
      testID={row.testID}
    >
      {row.icon ? <AppGroupedListIconTile name={row.icon} destructive={row.destructive} /> : null}
      {row.subtitle ? (
        <View style={styles.labelColumn}>
          <Text style={labelStyle} numberOfLines={labelLines}>
            {row.label}
          </Text>
          <Text style={styles.subtitle}>{row.subtitle}</Text>
        </View>
      ) : (
        <Text style={labelStyle} numberOfLines={labelLines}>
          {row.label}
        </Text>
      )}
      {!row.centered ? (
        <View style={styles.rowTrailing}>
          {row.value ? (
            <Text
              style={[
                styles.value,
                row.multiline ? styles.valueFixed : null,
                row.valueLines ? styles.valueWrapped : null,
              ]}
              numberOfLines={row.valueLines ?? 1}
            >
              {row.value}
            </Text>
          ) : null}
          {row.loading ? (
            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
          ) : row.onPress ? (
            <Ionicons name="chevron-forward-outline" size={16} color={theme.colors.textSecondary} />
          ) : null}
        </View>
      ) : null}
    </AppPressable>
  )
}

const ROW_MIN_HEIGHT = 48
const ICON_TILE_SIZE = 28
const ICON_SIZE = 20
const DEFAULT_DIVIDER_INSET = brandSpacing4.md
// With a leading tile, the hairline starts under the label.
const ICON_DIVIDER_INSET = brandSpacing4.md + ICON_TILE_SIZE + brandSpacing4.smd

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    list: {
      gap: brandSpacing4.md,
    },
    // Compact rule (UI-SPEC): the header sits 24 above (16 list gap + 8) and 8 below.
    section: {
      gap: brandSpacing4.sm,
    },
    sectionTitle: {
      ...brandTypography.sectionHeader,
      color: theme.colors.textSecondary,
      marginTop: brandSpacing4.sm,
      paddingHorizontal: brandSpacing4.xs,
    },
    sectionFooter: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
      paddingHorizontal: brandSpacing4.xs,
    },
    // 12.2 (D-12): a glass card, translucent fill and hairline, no blur and no elevation.
    sectionBody: {
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: theme.visual.glass.cardBorder,
      backgroundColor: theme.visual.glass.cardFill,
      boxShadow: theme.visual.glass.cardShadow,
      overflow: "hidden",
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.divider,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: brandSpacing4.smd,
      minHeight: ROW_MIN_HEIGHT,
      paddingHorizontal: brandSpacing4.md,
      paddingVertical: brandSpacing4.smd,
    },
    rowCentered: {
      justifyContent: "center",
    },
    rowPressed: {
      backgroundColor: theme.colors.surfaceSoft,
    },
    customRow: {
      paddingHorizontal: brandSpacing4.md,
      paddingVertical: brandSpacing4.xs,
    },
    iconTile: {
      width: ICON_TILE_SIZE,
      height: ICON_TILE_SIZE,
      borderRadius: brandRadius.badgeSm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.visual.glass.iconTile,
    },
    label: {
      ...brandTypography.input,
      flexShrink: 1,
      color: theme.colors.textPrimary,
    },
    labelMedium: {
      ...brandTypography.heroBody,
    },
    // A label with a subtitle under it.
    labelColumn: {
      flexShrink: 1,
      gap: brandSpacing4.xxs,
    },
    subtitle: {
      ...brandTypeScale.footnote,
      color: theme.colors.textSecondary,
    },
    labelDestructive: {
      color: theme.colors.terracotta,
    },
    labelCentered: {
      textAlign: "center",
      flex: 1,
    },
    rowTrailing: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.xs,
      flexShrink: 1,
      marginLeft: "auto",
    },
    value: {
      ...brandTypography.sectionBody,
      color: theme.colors.textSecondary,
      flexShrink: 1,
    },
    // multiline rows: the label wraps instead, the value stays whole.
    valueFixed: {
      flexShrink: 0,
    },
    valueWrapped: {
      flexShrink: 1,
      textAlign: "right",
    },
  })
}
