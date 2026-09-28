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
import { brandComponentTokens, brandRadius, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"

type AppFieldProps = {
  label: string
  error?: string | null
  inputRef?: Ref<TextInput>
  containerStyle?: StyleProp<ViewStyle>
  labelStyle?: StyleProp<TextStyle>
  inputStyle?: StyleProp<TextStyle>
  testID?: string
} & TextInputProps

export function AppField({
  label,
  error,
  inputRef,
  containerStyle,
  labelStyle,
  inputStyle,
  testID,
  placeholderTextColor,
  onFocus,
  onBlur,
  ...inputProps
}: AppFieldProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [focused, setFocused] = useState(false)

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, labelStyle]}>{label}</Text>
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          focused ? styles.inputFocused : null,
          error ? styles.inputError : null,
          inputStyle,
        ]}
        placeholderTextColor={placeholderTextColor ?? theme.colors.textSecondary}
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
      marginTop: 2,
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
      fontSize: 15,
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
  })
}
