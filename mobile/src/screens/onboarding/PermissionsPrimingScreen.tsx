import { useMemo, useState } from "react"
import { Linking, StyleSheet, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import * as ImagePicker from "expo-image-picker"
import * as Location from "expo-location"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { brandSpacing, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppButton } from "../../ui/AppButton"
import { GlassButton } from "../../ui/GlassButton"
import { permissionIconColors } from "./permission-icons"
import { AppCard } from "../../ui/AppCard"
import { BrandHighlight } from "../../ui/BrandHighlight"

const t = fr.onboarding.permissions

type PermissionState = "idle" | "granted" | "denied"

type PermissionRowProps = {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  body: string
  actionLabel: string
  grantedLabel: string
  deniedLabel: string
  status: PermissionState
  onRequest: () => void
}

function PermissionRow({
  icon,
  title,
  body,
  actionLabel,
  grantedLabel,
  deniedLabel,
  status,
  onRequest,
}: PermissionRowProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const iconColors = useMemo(() => permissionIconColors(theme), [theme])
  return (
    <AppCard variant="panelElevated" padding={16} style={styles.row}>
      <View style={styles.rowHeader}>
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={20} color={iconColors.icon} />
        </View>
        <View style={styles.rowCopy}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowBody}>{body}</Text>
        </View>
      </View>

      {status === "idle" ? (
        <AppButton label={actionLabel} variant="secondary" size="sm" onPress={onRequest} />
      ) : status === "granted" ? (
        <View style={styles.rowStatus}>
          <Ionicons name="checkmark-circle-outline" size={16} color={iconColors.grantedIcon} />
          <Text style={styles.rowStatusGranted}>{grantedLabel}</Text>
        </View>
      ) : (
        <View style={styles.rowStatus}>
          <Ionicons name="close-circle-outline" size={16} color={iconColors.deniedIcon} />
          <Text style={styles.rowStatusDenied}>{deniedLabel}</Text>
          <Text
            style={styles.settingsLink}
            onPress={() => void Linking.openSettings()}
            accessibilityRole="link"
          >
            {t.openSettings}
          </Text>
        </View>
      )}
    </AppCard>
  )
}

type PermissionsPrimingScreenProps = {
  onDone: () => void
}

/** ONB-01: requests location and camera with context, and links to Settings on refusal. */
export function PermissionsPrimingScreen({ onDone }: PermissionsPrimingScreenProps) {
  const insets = useSafeAreaInsets()
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [locationStatus, setLocationStatus] = useState<PermissionState>("idle")
  const [cameraStatus, setCameraStatus] = useState<PermissionState>("idle")

  const handleRequestLocation = async (): Promise<void> => {
    const result = await Location.requestForegroundPermissionsAsync()
    setLocationStatus(result.granted ? "granted" : "denied")
  }

  const handleRequestCamera = async (): Promise<void> => {
    const result = await ImagePicker.requestCameraPermissionsAsync()
    setCameraStatus(result.granted ? "granted" : "denied")
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + brandSpacing.xl }]}>
      <View style={styles.header}>
        <BrandHighlight>{t.eyebrow}</BrandHighlight>
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.body}>{t.body}</Text>
      </View>

      <View style={styles.rows}>
        <PermissionRow
          icon="location-outline"
          title={t.location.title}
          body={t.location.body}
          actionLabel={t.location.action}
          grantedLabel={t.location.granted}
          deniedLabel={t.location.denied}
          status={locationStatus}
          onRequest={() => void handleRequestLocation()}
        />
        <PermissionRow
          icon="camera-outline"
          title={t.camera.title}
          body={t.camera.body}
          actionLabel={t.camera.action}
          grantedLabel={t.camera.granted}
          deniedLabel={t.camera.denied}
          status={cameraStatus}
          onRequest={() => void handleRequestCamera()}
        />
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, brandSpacing.lg) }]}>
        <GlassButton label={t.continue} size="lg" onPress={onDone} style={styles.continueButton} />
      </View>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
      justifyContent: "space-between",
    },
    header: {
      paddingHorizontal: brandSpacing.xl,
      gap: brandSpacing.sm,
    },
    title: {
      ...brandTypography.sectionTitle,
      color: theme.semanticColors.textStrong,
    },
    body: {
      ...brandTypography.sectionBody,
      color: theme.colors.textSecondary,
    },
    rows: {
      paddingHorizontal: brandSpacing.lg,
      gap: brandSpacing.sm,
    },
    row: {
      gap: brandSpacing.sm,
    },
    rowHeader: {
      flexDirection: "row",
      gap: brandSpacing.sm,
    },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: permissionIconColors(theme).tile,
      alignItems: "center",
      justifyContent: "center",
    },
    rowCopy: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      ...brandTypography.input,
      color: theme.semanticColors.textStrong,
    },
    rowBody: {
      ...brandTypography.sectionBody,
      color: theme.colors.textSecondary,
    },
    rowStatus: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
    },
    rowStatusGranted: {
      ...brandTypography.meta,
      color: theme.semanticColors.textStrong,
    },
    rowStatusDenied: {
      ...brandTypography.meta,
      color: permissionIconColors(theme).deniedIcon,
    },
    settingsLink: {
      ...brandTypography.meta,
      color: theme.semanticColors.textStrong,
      textDecorationLine: "underline",
    },
    footer: {
      paddingHorizontal: brandSpacing.lg,
      paddingTop: brandSpacing.md,
    },
    continueButton: {
      width: "100%",
    },
  })
}
