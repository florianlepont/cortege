# Batch 6 — Compte as a grouped iOS-style list (ACC-03)

## What shipped

- `AccountScreen.tsx`: `IdentityCard` and `ProfileCard` stay their own cards above the list (rich,
  non-tabular content — an avatar picker and three text fields don't read well squeezed into a
  grouped-table row); below them, one `AppGroupedList` covers "Connexion" (email, password),
  "Données" (a single row to Settings) and "À propos" (the app version, via `expo-constants`), with
  "Se déconnecter" isolated in red as its own section. This replaces the previous mix: `ProfileCard`
  rendering `AccountSettingsRows`' two `AppSettingsRow`s as children between the fields and the
  save button, then a separate `LogoutButton`.
- `AccountSettingsRows.tsx`: `AccountSettingsRows`/`LogoutButton` (components) become
  `useAccountConnectionRows`/`useLogoutRow` (hooks returning `AppGroupedListRow` descriptors) — same
  email-edit-toggle and password-reset-confirm logic, now producing rows for `AppGroupedList`
  instead of rendering `AppSettingsRow` cards directly.
- `ProfileCard.tsx`: its `children` slot (where the settings rows used to render) removed — it was
  the only caller and no longer passes anything into it.
- `AccountRoute.tsx`: now reads `navigation` (previously entirely unused) to wire
  `onOpenSyncAndData` → `navigation.navigate("settings")`.
- ACC-04: the profile field placeholders ("Florian"/"Lepont", a real member's name) become generic
  examples ("ex. Marie"/"ex. Dupont").
- `account/styles.ts`'s now-dead `logoutButton` style removed (caught by
  `__checks__/structure.test.ts`'s unused-style-key gate).

## Deliberate scope decision

Settings (`SettingsScreen.tsx`: sync actions, dev tools, delete account) is untouched — the
"Données" row opens it rather than duplicating or relocating its content. See 16-CONTEXT.md.

## Test notes

New `AccountScreen.test.tsx`: loading state, the grouped sections' rows (email view/edit toggle,
password-reset confirmation, the Données row's navigation, the version row, sign-out's destructive
confirm-then-call). `routes.test.tsx`'s `AccountRoute` test extended for `onOpenSyncAndData`.

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` and
`npm run test:coverage:mobile` — green.
