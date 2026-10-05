import { useMemo } from "react"
import { Image, StyleSheet } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppCard } from "../../ui/AppCard"

const t = fr.surveyList

export function ListEmptyState() {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  // P2-PERSON-04: marten illustration + warm copy
  return (
    <AppCard variant="panelElevated" padding={24} style={styles.emptyState}>
      <Image
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        source={require("../../../assets/auth/marten.png")}
        style={styles.emptyStateMarten}
        resizeMode="contain"
      />
      <Text style={styles.emptyStateTitle}>{t.empty.none.title}</Text>
      <Text style={styles.emptyStateBody}>{t.empty.none.body}</Text>
    </AppCard>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    emptyState: {
      alignItems: "center",
      gap: 10,
    },
    // P2-PERSON-04: marten illustration
    emptyStateMarten: {
      width: 110,
      height: 110,
      marginBottom: 4,
    },
    emptyStateTitle: {
      ...brandTypography.input,
      color: theme.semanticColors.textStrong,
    },
    emptyStateBody: {
      ...brandTypography.sectionBody,
      textAlign: "center",
      color: theme.colors.textSecondary,
    },
  })
}
