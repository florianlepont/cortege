import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useColorScheme } from "react-native"
import { brandColors } from "./brand-tokens"
import {
  DEFAULT_THEME_MODE,
  loadThemeModePreference,
  saveThemeModePreference,
} from "../storage/theme-preference"

/**
 * Phase 12 (DS-12, UX audit): light/dark theming on the same semantic tokens.
 *
 * `brand-tokens.ts` keeps every dimension (spacing, radius, typography, motion…) and every
 * theme-invariant hue (the brand palette itself, plus a handful of neutrals pinned to a
 * permanently-dark surface). Everything that actually needs to invert between light and dark —
 * canvas/panel/text/field/status-soft neutrals, and the semantic/component/field-state/score
 * tokens derived from them — lives here, resolved once per render through `useBrandTheme()`.
 *
 * The mechanical rule this phase's file-by-file sweep follows: a file that used any of
 * `brandSemanticColors`, `ibpScoreTokens`, `brandFieldState`, or a color field of
 * `brandComponentTokens` (not a size), or any of `brandColors`'s dynamic neutrals below, now calls
 * `useBrandTheme()` and builds its `StyleSheet.create` inside a `createStyles(theme)` factory,
 * memoised with `useMemo(() => createStyles(theme), [theme])`. A file using only the static hues
 * (`brandColors.forest`, `.moss`, …) or a static token group is untouched.
 */
export type BrandColorScheme = "light" | "dark"
export type BrandThemeMode = BrandColorScheme | "automatic"

// The neutrals that invert between light and dark: backgrounds, text, dividers and the status-soft
// fills. Everything else in `brandColors` (the brand hues, plus forestNight/disabledMuted/
// disabledNeutral/white/black) stays theme-invariant and is merged in unchanged below.
type BrandDynamicNeutrals = {
  canvas: string
  panel: string
  surfaceSoft: string
  panelMuted: string
  warningSoft: string
  inputFill: string
  inputBorder: string
  divider: string
  textPrimary: string
  textSecondary: string
  successSoft: string
  errorSoft: string
}

const lightNeutrals: BrandDynamicNeutrals = {
  canvas: "#EEF1E8",
  panel: "#F7F6F0",
  surfaceSoft: "#F0EEE4",
  panelMuted: "#E8E5D9",
  warningSoft: "#F7E6CA",
  inputFill: "#F2F0E8",
  // DS-14 (UX audit, Phase 2): 3.60:1 on inputFill, clearing the WCAG 3:1 non-text floor.
  inputBorder: "#807D75",
  divider: "#D3D7C8",
  textPrimary: "#24311F",
  textSecondary: "#51604B",
  successSoft: "#E6ECCE",
  errorSoft: "#F3D3C8",
}

// OA-80 (owner acceptance, 2026-09-29): the forest-based dark palette was "far too much green".
// The owner chose direction A "Graphite" in sketch 001 (`.planning/sketches/001-dark-palette/`):
// a near-black canvas as Linear, cards one step lighter with thin borders, soft greys, and green
// kept for the primary action. Text pairs are >= 7:1 on canvas and panel, inputBorder/inputFill
// >= 3:1.
const darkNeutrals: BrandDynamicNeutrals = {
  canvas: "#08090A",
  panel: "#111214",
  surfaceSoft: "#0D0E10",
  panelMuted: "#17181B",
  warningSoft: "#2A2112",
  inputFill: "#111214",
  inputBorder: "#686D74",
  divider: "#212226",
  textPrimary: "#F2F3F1",
  textSecondary: "#9A9FA6",
  successSoft: "#16200F",
  errorSoft: "#2B1714",
}

export type BrandColors = typeof brandColors & BrandDynamicNeutrals

function resolvePalette(scheme: BrandColorScheme): BrandColors {
  return { ...brandColors, ...(scheme === "dark" ? darkNeutrals : lightNeutrals) }
}

// Darkened/lightened text tokens paired with a status-soft background, so the pair always clears
// WCAG AA (4.5:1) whichever scheme is active — replaces the old static
// `brandOnWarningSurface`/`brandOnDangerSurface`/`brandOnSuccessSurface`.
export type BrandOnSurfaceColors = {
  warning: string
  danger: string
  success: string
}

const lightOnSurface: BrandOnSurfaceColors = {
  warning: "#7A4A0A",
  danger: "#8A2F14",
  success: brandColors.forest,
}

// Light-on-dark counterparts (script-verified >= 4.5:1 against `darkNeutrals`' warningSoft/
// errorSoft/successSoft).
const darkOnSurface: BrandOnSurfaceColors = {
  warning: "#F0C989",
  danger: "#E8A78F",
  success: "#CBE0A6",
}

export type BrandSemanticColors = {
  backgroundCanvas: string
  surfaceBase: string
  surfaceElevated: string
  surfaceSoft: string
  textPrimary: string
  textSecondary: string
  textStrong: string
  heroSurface: string
  heroBorder: string
  ctaPrimary: string
  ctaAccent: string
  ctaSecondaryOutline: string
  ctaDanger: string
  successSurface: string
  errorSurface: string
  warningSurface: string
}

function makeSemanticColors(colors: BrandColors, scheme: BrandColorScheme): BrandSemanticColors {
  return {
    backgroundCanvas: colors.canvas,
    surfaceBase: colors.panel,
    // Phase 12: was a flat `brandColors.white` — a raised card now needs its own dark tone since
    // `white` itself stays theme-invariant (still used elsewhere as pure white-on-color).
    surfaceElevated: scheme === "dark" ? "#111214" : brandColors.white,
    surfaceSoft: colors.surfaceSoft,
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    // OA-83: `forest` is theme-invariant, so forest text vanished on the dark canvas. Strong text
    // (titles, labels, links) takes the light sage on dark.
    textStrong: scheme === "dark" ? colors.textPrimary : colors.forest,
    // OA-80 (sketch 001, direction A "Graphite" chosen by the owner): in dark mode the forest
    // heroes become a bordered surface, and the primary action a mid green that keeps white text.
    heroSurface: scheme === "dark" ? colors.panel : colors.forest,
    heroBorder: scheme === "dark" ? "#26282C" : colors.forest,
    ctaPrimary: scheme === "dark" ? "#4A7535" : colors.forest,
    ctaAccent: colors.moss,
    ctaSecondaryOutline: scheme === "dark" ? "#C9CCC8" : colors.forest,
    ctaDanger: colors.terracotta,
    successSurface: colors.successSoft,
    errorSurface: colors.errorSoft,
    warningSurface: colors.warningSoft,
  }
}

export type BrandComponentColors = {
  button: {
    primaryBackground: string
    secondaryBackground: string
    secondaryBorder: string
    dangerBackground: string
  }
  card: {
    surfaceBorder: string
    softSurface: string
    panelBorder: string
  }
  field: {
    background: string
    border: string
    borderError: string
  }
  statusChip: {
    neutralBorder: string
    neutralBackground: string
    successBorder: string
    successBackground: string
    warningBorder: string
    warningBackground: string
    dangerBorder: string
    dangerBackground: string
    textColor: string
    onDarkBorder: string
    onDarkBackground: string
    onDarkTextColor: string
  }
  choiceChip: {
    border: string
    background: string
    interactiveBorder: string
    interactiveBackground: string
    activeBorder: string
    activeBackground: string
    text: string
    activeText: string
    staticText: string
    successBackground: string
    warningBackground: string
    dangerBackground: string
  }
  surveyList: {
    cardAccentNeutral: string
    cardAccentSuccess: string
    cardAccentWarning: string
    cardAccentDanger: string
    cardSelectedBorder: string
    cardSelectedBackground: string
    workflowNeutralBackground: string
    workflowSuccessBackground: string
    workflowWarningBackground: string
    workflowDangerBackground: string
    workflowNeutralText: string
    workflowSuccessText: string
    workflowWarningText: string
    workflowDangerText: string
    progressTrack: string
    supportDangerText: string
    badgeDangerText: string
  }
  notice: {
    infoBackground: string
    infoBorder: string
    successBackground: string
    successBorder: string
    warningBackground: string
    warningBorder: string
    dangerBackground: string
    dangerBorder: string
    title: string
    text: string
    warningText: string
    dangerText: string
    successText: string
  }
}

function makeComponentColors(
  colors: BrandColors,
  semanticColors: BrandSemanticColors,
  onSurface: BrandOnSurfaceColors,
): BrandComponentColors {
  return {
    button: {
      primaryBackground: semanticColors.ctaPrimary,
      secondaryBackground: semanticColors.surfaceElevated,
      secondaryBorder: semanticColors.ctaSecondaryOutline,
      dangerBackground: semanticColors.ctaDanger,
    },
    card: {
      surfaceBorder: colors.panelMuted,
      softSurface: semanticColors.surfaceSoft,
      panelBorder: colors.divider,
    },
    field: {
      background: colors.inputFill,
      border: colors.inputBorder,
      borderError: colors.terracotta,
    },
    statusChip: {
      neutralBorder: colors.divider,
      neutralBackground: colors.panelMuted,
      successBorder: "#BBD09B",
      successBackground: colors.successSoft,
      warningBorder: "#E7C281",
      warningBackground: colors.warningSoft,
      dangerBorder: "#E4A595",
      dangerBackground: colors.errorSoft,
      textColor: semanticColors.textStrong,
      onDarkBorder: "rgba(255, 255, 255, 0.25)",
      onDarkBackground: "rgba(255, 255, 255, 0.15)",
      onDarkTextColor: "rgba(255, 255, 255, 0.90)",
    },
    choiceChip: {
      border: colors.inputBorder,
      background: colors.panelMuted,
      interactiveBorder: semanticColors.textStrong,
      interactiveBackground: semanticColors.surfaceElevated,
      activeBorder: colors.forest,
      activeBackground: colors.forest,
      text: semanticColors.textStrong,
      activeText: brandColors.white,
      staticText: colors.textSecondary,
      successBackground: colors.successSoft,
      warningBackground: colors.warningSoft,
      dangerBackground: colors.errorSoft,
    },
    surveyList: {
      cardAccentNeutral: colors.divider,
      cardAccentSuccess: colors.sage,
      cardAccentWarning: colors.ochre,
      cardAccentDanger: colors.terracotta,
      cardSelectedBorder: semanticColors.textStrong,
      cardSelectedBackground: colors.panel,
      workflowNeutralBackground: colors.panelMuted,
      workflowSuccessBackground: colors.successSoft,
      workflowWarningBackground: colors.warningSoft,
      workflowDangerBackground: colors.errorSoft,
      workflowNeutralText: semanticColors.textStrong,
      workflowSuccessText: semanticColors.textStrong,
      workflowWarningText: onSurface.warning,
      workflowDangerText: onSurface.danger,
      progressTrack: colors.divider,
      supportDangerText: onSurface.danger,
      badgeDangerText: onSurface.danger,
    },
    notice: {
      infoBackground: colors.panelMuted,
      infoBorder: colors.divider,
      successBackground: colors.successSoft,
      successBorder: "#BBD09B",
      warningBackground: colors.warningSoft,
      warningBorder: "#E7C281",
      dangerBackground: colors.errorSoft,
      dangerBorder: "#E4A595",
      title: colors.textPrimary,
      text: colors.textSecondary,
      warningText: onSurface.warning,
      dangerText: onSurface.danger,
      successText: semanticColors.textStrong,
    },
  }
}

export type BrandFieldState = {
  empty: { border: string; background: string; icon: string; text: string }
  error: { border: string; background: string; icon: string; text: string }
  complete: { border: string; background: string; icon: string; text: string }
}

function makeFieldState(colors: BrandColors, onSurface: BrandOnSurfaceColors): BrandFieldState {
  return {
    empty: {
      border: colors.inputBorder,
      background: colors.inputFill,
      icon: colors.textSecondary,
      text: colors.textPrimary,
    },
    error: {
      border: colors.terracotta,
      background: colors.errorSoft,
      icon: onSurface.danger,
      text: onSurface.danger,
    },
    complete: {
      border: colors.moss,
      background: colors.successSoft,
      icon: colors.forest,
      text: colors.forest,
    },
  }
}

// Replaces the old static `ibpScoreTokens.colors` — same shape (band tone -> {background, text}).
export type BrandIbpScoreColors = {
  high: { background: string; text: string }
  mid: { background: string; text: string }
  low: { background: string; text: string }
  empty: { background: string; text: string }
}

function makeIbpScoreColors(
  colors: BrandColors,
  onSurface: BrandOnSurfaceColors,
): BrandIbpScoreColors {
  return {
    high: { background: colors.sage, text: colors.forest },
    mid: { background: colors.warningSoft, text: onSurface.warning },
    low: { background: colors.errorSoft, text: onSurface.danger },
    empty: { background: colors.panelMuted, text: colors.textSecondary },
  }
}

export type BrandTheme = {
  mode: BrandThemeMode
  scheme: BrandColorScheme
  setMode: (mode: BrandThemeMode) => void
  colors: BrandColors
  onSurface: BrandOnSurfaceColors
  semanticColors: BrandSemanticColors
  componentColors: BrandComponentColors
  fieldState: BrandFieldState
  ibpScoreColors: BrandIbpScoreColors
}

function buildTheme(
  mode: BrandThemeMode,
  scheme: BrandColorScheme,
  setMode: BrandTheme["setMode"],
): BrandTheme {
  const colors = resolvePalette(scheme)
  const onSurface = scheme === "dark" ? darkOnSurface : lightOnSurface
  const semanticColors = makeSemanticColors(colors, scheme)
  return {
    mode,
    scheme,
    setMode,
    colors,
    onSurface,
    semanticColors,
    componentColors: makeComponentColors(colors, semanticColors, onSurface),
    fieldState: makeFieldState(colors, onSurface),
    ibpScoreColors: makeIbpScoreColors(colors, onSurface),
  }
}

// The default theme (light, "automatic", a no-op setter) doubles as the context's default value —
// deliberately not a "must be used inside a provider" throw like `useStatus`/`useSession`. Nearly
// every styled file in the app calls `useBrandTheme()` (this phase's whole point), including a
// great many component tests that render a screen or a `ui/` primitive in isolation with no
// wrapping provider; defaulting to the light theme there keeps that large existing test suite
// working unchanged, at the cost of never being able to detect a genuinely missing provider. The
// real app always mounts `BrandThemeProvider` in `App.tsx`, so this default is only ever observed
// in tests.
// Exported for tests that call a theme-taking helper (jsTabScreenOptions, buildJsTabBarStyle…)
// directly, outside a component — the same light/"automatic" theme `useBrandTheme()` falls back to
// without a provider, so a test's expected value stays exactly what the pre-Phase-12 static tokens
// resolved to.
export const defaultTheme = buildTheme(DEFAULT_THEME_MODE, "light", () => {})

const BrandThemeContext = createContext<BrandTheme>(defaultTheme)

/**
 * Wraps the app (outside `AppStateProvider`, in `App.tsx`) so a theme choice is available before
 * auth resolves and to every screen. Resolves "automatic" against the OS scheme (`useColorScheme`)
 * — `app.json`'s `userInterfaceStyle: "automatic"` is what lets that OS value reflect the device's
 * own setting rather than being pinned light. The chosen mode persists to `local_meta`
 * (`storage/theme-preference.ts`) and is read back on the next launch.
 */
export function BrandThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme()
  const [mode, setModeState] = useState<BrandThemeMode>(DEFAULT_THEME_MODE)

  useEffect(() => {
    let cancelled = false
    void loadThemeModePreference().then((saved) => {
      if (!cancelled) setModeState(saved)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const setMode = useCallback((next: BrandThemeMode) => {
    setModeState(next)
    void saveThemeModePreference(next)
  }, [])

  const scheme: BrandColorScheme =
    mode === "automatic" ? (systemScheme === "dark" ? "dark" : "light") : mode

  const value = useMemo(() => buildTheme(mode, scheme, setMode), [mode, scheme, setMode])

  return createElement(BrandThemeContext.Provider, { value }, children)
}

export function useBrandTheme(): BrandTheme {
  return useContext(BrandThemeContext)
}
