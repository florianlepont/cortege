# Batch 3 — Native splash and adaptive icon (ONB-02)

## What shipped

- `app.json`: `expo-splash-screen` plugin configured (`backgroundColor: "#334E2B"`,
  `image: "./assets/logo-app.png"`, `imageWidth: 160`, `resizeMode: "contain"`) and
  `android.adaptiveIcon` (`foregroundImage: logo-app.png`, `backgroundColor: "#FFFFFF"`) — verified
  via Pillow that the visible mark is ~68% of canvas width, safe from adaptive-icon mask clipping
  (see `18-CONTEXT.md`).
- `App.tsx`: `void SplashScreen.preventAutoHideAsync()` at module scope, and
  `useEffect(() => { void SplashScreen.hideAsync() }, [])` in the root `App()` — the native splash
  now stays up until React has mounted, so no default Expo splash flashes before `TypewriterSplash`
  takes over.
- `package.json`: added `expo-splash-screen: ~57.0.9`.
- `state/contexts.test.tsx`, `state/render-counts.test.tsx`: added `jest.mock("expo-splash-screen", ...)`.

## Deliberate scope decision

The native splash isn't pixel-identical to `TypewriterSplash`'s exact logo position — it only needs
to avoid the default-Expo-splash flash the criterion names. See `18-CONTEXT.md`.

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` green.
