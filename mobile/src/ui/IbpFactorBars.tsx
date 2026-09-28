import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { AppText as Text } from "./AppText"
import { CONTEXT_FACTOR_KEYS, STAND_FACTOR_KEYS } from "@cortege/ibp-domain"
import { brandRadius, brandSpacing4, brandTypography } from "../app/brand-tokens"
import { FACTOR_TITLES } from "../app/constants"
import { BrandTheme, useBrandTheme } from "../app/theme"
import type { FactorKey } from "../app/types"
import { fr } from "../i18n"

// Every IBP factor scores 0-5 (packages/ibp-domain/src/rules/scales.ts), so every bar shares the
// same scale — no per-factor max lookup needed.
const MAX_FACTOR_POINTS = 5

const t = fr.components.ibpFactorBars

export type IbpFactorBarsEntries = Partial<Record<FactorKey, number | null>>

type IbpFactorBarsProps = {
  /** Retained points per factor; a missing or null entry renders as not filled. */
  entries: IbpFactorBarsEntries
}

/** DET-01: horizontal bars A-J (peuplement/gestion, then contexte) instead of a 10-axis radar. */
export function IbpFactorBars({ entries }: IbpFactorBarsProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <View style={styles.container}>
      <FactorBarGroup
        title={t.standGroup}
        factorKeys={STAND_FACTOR_KEYS}
        entries={entries}
        styles={styles}
      />
      <FactorBarGroup
        title={t.contextGroup}
        factorKeys={CONTEXT_FACTOR_KEYS}
        entries={entries}
        styles={styles}
      />
    </View>
  )
}

function FactorBarGroup({
  title,
  factorKeys,
  entries,
  styles,
}: {
  title: string
  factorKeys: readonly FactorKey[]
  entries: IbpFactorBarsEntries
  styles: ReturnType<typeof createStyles>
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      {factorKeys.map((factorKey) => (
        <FactorBarRow
          key={factorKey}
          factorKey={factorKey}
          points={entries[factorKey] ?? null}
          styles={styles}
        />
      ))}
    </View>
  )
}

function FactorBarRow({
  factorKey,
  points,
  styles,
}: {
  factorKey: FactorKey
  points: number | null
  styles: ReturnType<typeof createStyles>
}) {
  const filled = points != null
  const clamped = filled ? Math.max(0, Math.min(MAX_FACTOR_POINTS, points)) : 0
  const widthPercent = `${(clamped / MAX_FACTOR_POINTS) * 100}%` as const

  return (
    <View style={styles.row} testID={`ibp-factor-bar-${factorKey}`}>
      <View style={styles.rowLabel}>
        <View style={styles.factorBadge}>
          <Text style={styles.factorBadgeText}>{factorKey}</Text>
        </View>
        <Text numberOfLines={1} style={styles.factorTitle}>
          {FACTOR_TITLES[factorKey]}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            filled ? styles.fillFilled : styles.fillEmpty,
            { width: widthPercent },
          ]}
        />
      </View>
      <Text style={styles.pointsText}>{filled ? t.points({ points: clamped }) : t.notFilled}</Text>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    container: {
      gap: brandSpacing4.md,
    },
    group: {
      gap: brandSpacing4.sm,
    },
    groupTitle: {
      ...brandTypography.meta,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.3,
      color: theme.colors.forest,
      textTransform: "uppercase",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
    },
    rowLabel: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.xs,
      width: 96,
    },
    factorBadge: {
      width: 20,
      height: 20,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.panelMuted,
    },
    factorBadgeText: {
      ...brandTypography.meta,
      fontSize: 12,
      fontWeight: "800",
      color: theme.colors.forest,
    },
    factorTitle: {
      flex: 1,
      ...brandTypography.meta,
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    track: {
      flex: 1,
      height: 6,
      borderRadius: brandRadius.pill,
      backgroundColor: theme.colors.divider,
      overflow: "hidden",
    },
    fill: {
      height: "100%",
      borderRadius: brandRadius.pill,
    },
    fillFilled: {
      backgroundColor: theme.colors.moss,
    },
    fillEmpty: {
      backgroundColor: "transparent",
    },
    pointsText: {
      ...brandTypography.meta,
      fontSize: 12,
      width: 28,
      textAlign: "right",
      color: theme.colors.textSecondary,
    },
  })
}
