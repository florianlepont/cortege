import { Fragment, ReactNode, useMemo } from "react"
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native"
import { AppText as Text } from "./AppText"
import { Ionicons } from "@expo/vector-icons"
import { brandRadius, brandSpacing, brandTypography } from "../app/brand-tokens"
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

function isCustomRow(row: AppGroupedListRow): row is AppGroupedListCustomRow {
  return row.kind === "custom"
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
                {index > 0 ? <View style={styles.divider} /> : null}
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

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    list: {
      gap: brandSpacing.md,
    },
    section: {
      gap: brandSpacing.xs,
    },
    sectionTitle: {
      ...brandTypography.meta,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.3,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      paddingHorizontal: brandSpacing.xs,
    },
    sectionFooter: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
      paddingHorizontal: brandSpacing.xs,
    },
    sectionBody: {
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: theme.componentColors.card.panelBorder,
      backgroundColor: theme.semanticColors.surfaceElevated,
      overflow: "hidden",
    },
    divider: {
      height: 1,
      marginLeft: brandSpacing.md,
      backgroundColor: theme.colors.divider,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: brandSpacing.sm,
      minHeight: ROW_MIN_HEIGHT,
      paddingHorizontal: brandSpacing.md,
      paddingVertical: brandSpacing.sm,
    },
    rowCentered: {
      justifyContent: "center",
    },
    rowPressed: {
      backgroundColor: theme.colors.surfaceSoft,
    },
    customRow: {
      paddingHorizontal: brandSpacing.md,
      paddingVertical: brandSpacing.sm,
    },
    label: {
      ...brandTypography.input,
      fontSize: 16,
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
      gap: brandSpacing.xs,
      flexShrink: 1,
    },
    value: {
      ...brandTypography.sectionBody,
      color: theme.colors.textSecondary,
      flexShrink: 1,
    },
  })
}
