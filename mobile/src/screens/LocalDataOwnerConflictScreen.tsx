import { useMemo } from "react"
import { Image, ImageSourcePropType, ScrollView, StyleSheet, View } from "react-native"
import { AppText as Text } from "../ui/AppText"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { brandColors, brandSpacing, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { AppButton } from "../ui/AppButton"
import { AppCard } from "../ui/AppCard"
import { AppSectionHeader } from "../ui/AppSectionHeader"
import { fr } from "../i18n"

const t = fr.ownerConflict

type LocalDataOwnerConflictScreenProps = {
  foreignWorkSummary: string
  foreignOwnerEmail: string | null
  onSwitchAccount: () => void
  onDiscard: () => void
  logoSource?: ImageSourcePropType
}

/**
 * D-04 blocking screen: unsynced local data belongs to a different Auth0
 * account than the one currently logged in. Sync stays suspended and
 * exactly two choices are offered — no dismiss, no merge.
 */
export function LocalDataOwnerConflictScreen({
  foreignWorkSummary,
  foreignOwnerEmail,
  onSwitchAccount,
  onDiscard,
  logoSource,
}: LocalDataOwnerConflictScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const insets = useSafeAreaInsets()

  const bodyText = t.body({ summary: foreignWorkSummary, email: foreignOwnerEmail })

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, brandSpacing.xl) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <View style={styles.heroAccent} />
          <AppCard variant="surface" style={styles.heroCard}>
            {logoSource ? (
              <Image source={logoSource} style={styles.heroLogo} resizeMode="contain" />
            ) : null}
            <Text style={styles.heroEyebrow}>{t.eyebrow}</Text>
            <AppSectionHeader
              title={t.title}
              titleStyle={styles.heroTitle}
              subtitleStyle={styles.heroSubtitle}
            />
          </AppCard>
        </View>

        <AppCard variant="panelElevated" style={styles.bodyCard}>
          <Text style={styles.bodyText}>{bodyText}</Text>

          <View style={styles.actions}>
            <AppButton label={t.switchAccount} onPress={onSwitchAccount} size="lg" />
            <AppButton label={t.discard} variant="dangerSoft" onPress={onDiscard} size="lg" />
          </View>
        </AppCard>
      </ScrollView>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
    },
    scroll: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: brandSpacing.lg,
      paddingTop: brandSpacing.lg,
      gap: brandSpacing.lg,
    },
    heroWrap: {
      position: "relative",
    },
    heroAccent: {
      position: "absolute",
      top: 16,
      right: 14,
      width: 120,
      height: 120,
      borderRadius: 999,
      backgroundColor: brandColors.terracotta,
      opacity: 0.22,
    },
    heroCard: {
      gap: brandSpacing.sm,
      padding: brandSpacing.lg,
    },
    heroLogo: {
      width: 132,
      height: 42,
      marginLeft: -18,
    },
    heroEyebrow: {
      ...brandTypography.heroEyebrow,
      color: brandColors.moss,
      letterSpacing: 1.6,
    },
    heroTitle: {
      ...brandTypography.sectionTitle,
      color: theme.semanticColors.textStrong,
    },
    heroSubtitle: {
      ...brandTypography.sectionBody,
      color: theme.colors.textSecondary,
    },
    bodyCard: {
      gap: brandSpacing.md,
    },
    bodyText: {
      ...brandTypography.sectionBody,
      color: theme.colors.textPrimary,
    },
    actions: {
      gap: 10,
      marginTop: 4,
    },
  })
}
