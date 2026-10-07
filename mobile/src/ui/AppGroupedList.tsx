import { Fragment, ReactNode, useMemo } from "react"
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native"
import { AppText as Text } from "./AppText"
import { Ionicons } from "@expo/vector-icons"
import { brandRadius, brandSpacing4, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"

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
  /** Leading outline glyph in a 28 pt tile (D-07: `-outline` names only). */
  icon?: keyof typeof Ionicons.glyphMap
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
          {section.title ? <Text style={styles.sectionTitle}>{section.title}</Text> : null}
          <View style={styles.sectionBody}>
            {section.rows.map((row, index) => (
              <Fragment key={row.key}>
                {index > 0 ? (
                  <View style={[styles.divider, hasIcon(row) ? styles.dividerInset : null]} />
                ) : null}
                {isCustomRow(row) ? (
                  <View style={styles.customRow}>{row.content}</View>
                ) : (
                  <NavRow row={row} theme={theme} styles={styles} />
                )}
              </Fragment>
            ))}
          </View>
          {section.footer ? <Text style={styles.sectionFooter}>{section.footer}</Text> : null}
        </View>
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
    row.destructive ? styles.labelDestructive : null,
    row.centered ? styles.labelCentered : null,
  ]

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        row.centered ? styles.rowCentered : null,
        pressed && isInteractive ? styles.rowPressed : null,
      ]}
      onPress={row.onPress}
      disabled={!isInteractive}
      accessibilityRole={row.onPress ? "button" : undefined}
      accessibilityLabel={row.accessibilityLabel ?? row.label}
      accessibilityState={{ disabled: row.disabled || row.loading, busy: row.loading }}
    >
      {row.icon ? <AppGroupedListIconTile name={row.icon} destructive={row.destructive} /> : null}
      <Text style={labelStyle} numberOfLines={1}>
        {row.label}
      </Text>
      {!row.centered ? (
        <View style={styles.rowTrailing}>
          {row.value ? (
            <Text style={styles.value} numberOfLines={1}>
              {row.value}
            </Text>
          ) : null}
          {row.loading ? (
            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
          ) : row.onPress ? (
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
          ) : null}
        </View>
      ) : null}
    </Pressable>
  )
}

const ROW_MIN_HEIGHT = 48
const ICON_TILE_SIZE = 28
const ICON_SIZE = 20

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
      marginLeft: brandSpacing4.md,
      backgroundColor: theme.colors.divider,
    },
    // With a leading tile, the hairline starts under the label.
    dividerInset: {
      marginLeft: brandSpacing4.md + ICON_TILE_SIZE + brandSpacing4.smd,
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
      fontSize: 16,
      flexShrink: 1,
      color: theme.colors.textPrimary,
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
  })
}
