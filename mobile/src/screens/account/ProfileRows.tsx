import { useMemo, useRef } from "react"
import { Pressable, TextInput, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import type { Ionicons } from "@expo/vector-icons"
import { AppGroupedListIconTile, type AppGroupedListRow } from "../../ui/AppGroupedList"
import { GlassSurface } from "../../ui/GlassSurface"
import { createProfileRowStyles } from "./styles"

const t = fr.account.profile

type ProfileFieldRowProps = {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  placeholder: string
  onChangeText: (value: string) => void
  inputRef?: React.RefObject<TextInput | null>
  onSubmitEditing?: () => void
  returnKeyType: "next" | "done"
}

function ProfileFieldRow({
  icon,
  label,
  value,
  placeholder,
  onChangeText,
  inputRef,
  onSubmitEditing,
  returnKeyType,
}: ProfileFieldRowProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createProfileRowStyles(theme), [theme])
  return (
    <View style={styles.row}>
      <AppGroupedListIconTile name={icon} />
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        accessibilityLabel={label}
        style={styles.input}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType={returnKeyType}
        blurOnSubmit={returnKeyType === "done"}
        onSubmitEditing={onSubmitEditing}
      />
    </View>
  )
}

type ProfileRowsInput = {
  firstName: string
  lastName: string
  displayName: string
  onFirstNameChange: (value: string) => void
  onLastNameChange: (value: string) => void
  onDisplayNameChange: (value: string) => void
}

/** OA-70: the profile as three rows of the grouped list, with keyboard chaining (ACC-13). */
export function useProfileRows({
  firstName,
  lastName,
  displayName,
  onFirstNameChange,
  onLastNameChange,
  onDisplayNameChange,
}: ProfileRowsInput): AppGroupedListRow[] {
  const lastNameRef = useRef<TextInput>(null)
  const displayNameRef = useRef<TextInput>(null)
  return [
    {
      key: "firstName",
      kind: "custom",
      content: (
        <ProfileFieldRow
          icon="person-outline"
          label={t.firstName}
          value={firstName}
          placeholder={t.firstNamePlaceholder}
          onChangeText={onFirstNameChange}
          returnKeyType="next"
          onSubmitEditing={() => lastNameRef.current?.focus()}
        />
      ),
    },
    {
      key: "lastName",
      kind: "custom",
      content: (
        <ProfileFieldRow
          icon="person-outline"
          label={t.lastName}
          value={lastName}
          placeholder={t.lastNamePlaceholder}
          onChangeText={onLastNameChange}
          inputRef={lastNameRef}
          returnKeyType="next"
          onSubmitEditing={() => displayNameRef.current?.focus()}
        />
      ),
    },
    {
      key: "displayName",
      kind: "custom",
      content: (
        <ProfileFieldRow
          icon="at-outline"
          label={t.displayName}
          value={displayName}
          placeholder={t.displayNamePlaceholder}
          onChangeText={onDisplayNameChange}
          inputRef={displayNameRef}
          returnKeyType="done"
        />
      ),
    },
  ]
}

type ProfileSaveBarProps = {
  bottom: number
  saving: boolean
  onSave: () => void
  onCancel: () => void
}

/**
 * OA-72: shown only while the profile has unsaved changes (a floating glass bar, the app's save
 * pattern), instead of a permanent "Sauvegardé" chip.
 */
export function ProfileSaveBar({ bottom, saving, onSave, onCancel }: ProfileSaveBarProps) {
  const theme: BrandTheme = useBrandTheme()
  const styles = useMemo(() => createProfileRowStyles(theme), [theme])
  return (
    <GlassSurface style={[styles.saveBar, { bottom }]}>
      <Text style={styles.saveBarText} numberOfLines={2}>
        {t.unsavedBar}
      </Text>
      <Pressable
        style={styles.saveBarCancel}
        onPress={onCancel}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel={t.cancel}
      >
        <Text style={styles.saveBarCancelText}>{t.cancel}</Text>
      </Pressable>
      <Pressable
        style={[styles.saveBarSave, saving ? styles.saveBarSaveDisabled : null]}
        onPress={onSave}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel={t.save}
        accessibilityState={{ disabled: saving, busy: saving }}
      >
        <Text style={styles.saveBarSaveText}>{saving ? t.saving : t.save}</Text>
      </Pressable>
    </GlassSurface>
  )
}
