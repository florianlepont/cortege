# Batch 6 — Parcel selection formSheet and remaining Liquid Glass (DS-15)

## What shipped

- `navigation/stacks/SurveysStack.tsx`: the `surveyParcels` screen's options gained
  `presentation: "formSheet"`, `sheetAllowedDetents: [0.62, 0.94]`, `sheetInitialDetentIndex: 1`,
  `sheetGrabberVisible: true`, `sheetCornerRadius: 24`, `sheetExpandsWhenScrolledToEdge: true` —
  see `21-CONTEXT.md` for why this route (not `ParcelMapModal`) is the DS-15 target. The rest of the
  file's own dark-mode conversion (theme-aware header colors) is also in this commit.
- `SurveyParcelSelectionScreen.tsx`: the bottom info card (`AppCard`) → `AppCard glass`; its title
  color moved from the static `forest` to `theme.colors.textPrimary` since the card now floats as
  auto-tone glass (adapts with the theme) rather than a fixed light panel.
- `survey-form/parcels.styles.ts` / `ParcelsSection.tsx` / `ParcelMapModal.tsx`: the inline map's two
  floating action buttons, the fullscreen map's top bar, close buttons and bottom info sheet all
  moved from a flat fill to `GlassSurface` — `tone="dark"` for the two icon buttons that float
  directly over the map (matching the fixed dark scrim treatment they already used), `tone="auto"`
  for the top bar and bottom info sheet (readable info cards, follow the app's own theme); their text
  colors were corrected to the theme-aware `theme.colors.textPrimary`/`textSecondary` to match
  (previously hard-set to white, which was only ever correct for the `heroScrimOnDark` fill they no
  longer carry).

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` green.
