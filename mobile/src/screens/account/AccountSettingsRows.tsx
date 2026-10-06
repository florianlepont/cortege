import { useState } from "react"
import { Alert, View } from "react-native"
import Animated, { FadeIn, FadeOut, ReduceMotion } from "react-native-reanimated"
import { AuthUser } from "../../app/types"
import { brandMotion } from "../../app/brand-tokens"
import { AppButton } from "../../ui/AppButton"
import { AppField } from "../../ui/AppField"
import type { AppGroupedListRow } from "../../ui/AppGroupedList"
import { fr } from "../../i18n"
import { profileStyles as styles } from "./styles"

const entering = FadeIn.duration(brandMotion.durations.base).reduceMotion(ReduceMotion.System)
const exiting = FadeOut.duration(brandMotion.durations.fast).reduceMotion(ReduceMotion.System)

// ACC-06 : validation email correcte
export const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

type UseAccountConnectionRowsInput = {
  currentUser: AuthUser | null
  profileUpdating: boolean
  onChangeEmail: (newEmail: string) => Promise<void>
  onPasswordReset: () => Promise<void>
}

// ACC-03/ACC-09: the "Connexion" section's rows (email, password; the credits moved to Paramètres, OA-74), as AppGroupedList row
// descriptors instead of standalone AppSettingsRow cards mixed in with the profile form.
export function useAccountConnectionRows({
  currentUser,
  profileUpdating,
  onChangeEmail,
  onPasswordReset,
}: UseAccountConnectionRowsInput): AppGroupedListRow[] {
  const [emailEditing, setEmailEditing] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const currentEmail = currentUser?.email ?? null

  const closeEmailEditor = (): void => {
    setEmailEditing(false)
    setNewEmail("")
  }

  // ACC-I05 : confirmation avant reset mot de passe
  const handlePasswordReset = (): void => {
    const texts = fr.account.alerts.passwordReset
    Alert.alert(texts.title, texts.message(currentEmail ?? texts.emailFallback), [
      { text: fr.common.actions.cancel, style: "cancel" },
      { text: texts.confirm, onPress: () => void onPasswordReset() },
    ])
  }

  const emailRow: AppGroupedListRow = emailEditing
    ? {
        key: "email",
        kind: "custom",
        content: (
          <Animated.View style={styles.emailEditBlock} entering={entering} exiting={exiting}>
            <AppField
              label={fr.account.email.newLabel}
              value={newEmail}
              onChangeText={setNewEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoFocus
              containerStyle={styles.fieldGroup}
              labelStyle={styles.fieldLabel}
              inputStyle={styles.fieldInput}
              returnKeyType="done"
              // ACC-06 : afficher une erreur inline si email invalide
              error={
                newEmail.length > 0 && !isValidEmail(newEmail)
                  ? fr.account.email.invalid
                  : undefined
              }
            />
            <View style={styles.emailEditActions}>
              <AppButton
                label={fr.common.actions.cancel}
                variant="secondary"
                size="sm"
                onPress={closeEmailEditor}
              />
              <AppButton
                label={fr.common.actions.save}
                size="sm"
                loading={profileUpdating}
                disabled={profileUpdating || !isValidEmail(newEmail)}
                onPress={() => void onChangeEmail(newEmail).then(closeEmailEditor)}
              />
            </View>
          </Animated.View>
        ),
      }
    : {
        key: "email",
        label: fr.account.email.label,
        value: currentEmail ?? fr.account.email.empty,
        accessibilityLabel: fr.account.a11y.editEmail,
        onPress: () => {
          setNewEmail(currentEmail ?? "")
          setEmailEditing(true)
        },
      }

  // ACC-I08 : value = action courte, pas une description longue
  const passwordRow: AppGroupedListRow = {
    key: "password",
    label: fr.account.password.label,
    value: fr.account.password.action,
    accessibilityLabel: fr.account.a11y.resetPassword,
    onPress: handlePasswordReset,
  }

  return [emailRow, passwordRow]
}

type UseLogoutRowInput = { onLogout: () => Promise<void> }

// ACC-10 : Se déconnecter, isolé en bas de la liste groupée, séparé du reste.
export function useLogoutRow({ onLogout }: UseLogoutRowInput): AppGroupedListRow {
  // ACC-I05 : confirmation avant déconnexion
  const handleLogout = (): void => {
    const texts = fr.account.alerts.logout
    Alert.alert(texts.title, texts.message, [
      { text: fr.common.actions.cancel, style: "cancel" },
      { text: texts.confirm, style: "destructive", onPress: () => void onLogout() },
    ])
  }

  return {
    key: "logout",
    label: fr.account.logout,
    destructive: true,
    centered: true,
    accessibilityLabel: fr.account.logout,
    onPress: handleLogout,
  }
}
