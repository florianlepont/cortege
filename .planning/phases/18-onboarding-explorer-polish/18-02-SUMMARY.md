# Batch 2 — First-launch carousel + permissions priming (ONB-01)

## What shipped

- `storage/onboarding-preference.ts` (+ sqlite test): a `local_meta` "seen" flag, mirroring
  `map-preference.ts`'s pattern exactly — `loadOnboardingSeen()` / `markOnboardingSeen()`.
- `i18n/fr/onboarding.ts`: the three carousel slides (ten factors · offline · member map) and the
  permissions-priming screen's copy, including the "open Settings" fallback for a prior refusal.
- `screens/onboarding/OnboardingCarouselScreen.tsx`, `PermissionsPrimingScreen.tsx`,
  `OnboardingFlow.tsx` (+ tests): `OnboardingFlow` composes carousel → permissions and calls
  `markOnboardingSeen()` once the user completes (or skips through) both steps.
- `App.tsx`: `showOnboarding` defaults to `false` (optimistic "already seen", to avoid a flash for
  returning users) and flips to `true` via a `useEffect` that awaits `loadOnboardingSeen()`.
  `OnboardingFlow` renders as the topmost overlay, stacked over the auth overlay, since a
  first-time user should see the carousel before being asked to sign in.
- `state/contexts.test.tsx`, `state/render-counts.test.tsx`: added a
  `../storage/onboarding-preference` mock (resolves `true` by default) alongside the existing
  full-`App`-mount mocks.

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` green.
