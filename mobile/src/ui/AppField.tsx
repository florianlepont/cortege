import { useMemo, useState, type Ref } from "react"
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { AppText as Text } from "./AppText"
import {
  brandComponentTokens,
  brandRadius,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../app/brand-tokens"
import { fr } from "../i18n"
import { BrandTheme, useBrandTheme } from "../app/theme"

type AppFieldProps = {
  label: string
  error?: string | null
  inputRef?: Ref<TextInput>
  containerStyle?: StyleProp<ViewStyle>
  labelStyle?: StyleProp<TextStyle>
  inputStyle?: StyleProp<TextStyle>
  /** A unit drawn inside the field at its end ("ha"); decorative, the label says the unit. */
  suffix?: string
  testID?: string
} & TextInputProps

export function AppField({
  label,
  error,
  inputRef,
  containerStyle,
  labelStyle,
  inputStyle,
  suffix,
  testID,
  placeholderTextColor,
  onFocus,
  onBlur,
  ...inputProps
}: AppFieldProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [focused, setFocused] = useState(false)

  const input = (
    <TextInput
      ref={inputRef}
      style={[
        styles.input,
        focused ? styles.inputFocused : null,
        error ? styles.inputError : null,
        suffix ? styles.inputWithSuffix : null,
        inputStyle,
      ]}
      placeholderTextColor={placeholderTextColor ?? theme.colors.textSecondary}
      inputAccessoryViewButtonLabel={fr.common.actions.keyboardDone}
      testID={testID}
      onFocus={(event) => {
        setFocused(true)
        onFocus?.(event)
      }}
      onBlur={(event) => {
        setFocused(false)
        onBlur?.(event)
      }}
      {...inputProps}
    />
  )

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, labelStyle]}>{label}</Text>
      {suffix ? (
        <View>
          {input}
          <View style={styles.suffixBox} pointerEvents="none">
            <Text style={styles.suffix} accessible={false} importantForAccessibility="no">
              {suffix}
            </Text>
          </View>
        </View>
      ) : (
        input
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    container: {
      gap: brandComponentTokens.field.gap,
    },
    label: {
      ...brandTypography.label,
      color: theme.colors.textPrimary,
      marginTop: brandSpacing4.xxs,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.componentColors.field.border,
      borderRadius: brandRadius.field,
      paddingHorizontal: brandComponentTokens.field.horizontalPadding,
      minHeight: brandComponentTokens.field.minHeight,
      paddingVertical: brandComponentTokens.field.verticalPadding,
      backgroundColor: theme.componentColors.field.background,
      color: theme.colors.textPrimary,
      ...brandTypography.input,
      fontSize: brandTypeScale.subhead.fontSize,
      lineHeight: 18,
      fontWeight: "500",
    },
    inputFocused: {
      borderColor: theme.colors.forest,
      backgroundColor: theme.semanticColors.surfaceElevated,
      shadowColor: theme.colors.forest,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    inputError: {
      borderColor: theme.componentColors.field.borderError,
    },
    error: {
      ...brandTypography.meta,
      color: theme.componentColors.field.borderError,
    },
    inputWithSuffix: {
      paddingRight: brandComponentTokens.field.horizontalPadding + 40,
    },
    suffixBox: {
      position: "absolute",
      top: 0,
      bottom: 0,
      right: brandComponentTokens.field.horizontalPadding,
      justifyContent: "center",
    },
    suffix: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
  })
}
