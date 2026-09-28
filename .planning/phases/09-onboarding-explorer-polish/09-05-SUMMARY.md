# Batch 5 — Explorer tiered native sheet (MAP-01)

## What shipped

- Added `@gorhom/bottom-sheet: ^5.2.14` (compatible with the repo's existing reanimated 4.5.1 /
  gesture-handler ~2.32.0).
- `screens/public-map/ExplorerSheet.tsx` (+ test): 2 detents (`["50%", "92%"]`), closed
  (`index={-1}`, no screen space) by default; a `visible` prop drives `snapToIndex(0)`/`close()` via
  `useEffect`; an `onChange` index of `-1` (user-dragged-to-dismiss) triggers `onDismiss`.
- `SelectedSurveyCard.tsx`, `ClusterListSheet.tsx`, `ParcelHistoryCard.tsx`: dropped `AppCard` and
  their own `bottom` positioning — they're now plain content rendered inside `ExplorerSheet`.
- `PublicMapScreen.tsx`: one `sheetContent` variable (parcel history > cluster list > selected
  survey > null) replaces the three separately absolutely-positioned cards; `closeSheet` clears all
  three selection states at once.
- `test/gorhom-bottom-sheet.mock.ts` + `jest.unit.config.js`: a custom mock registered via
  `moduleNameMapper['^@gorhom/bottom-sheet$']` — the library's own `mock.js` lacks
  `__esModule: true`, which broke `import BottomSheet from "@gorhom/bottom-sheet"` under ts-jest's
  CJS interop (the whole exports object was imported instead of its default). The custom mock's
  `BottomSheet` forwardRef component drives `onChange` for real so tests exercise the actual wiring.

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` green.
`public-map/styles.ts` briefly exceeded the 400-line file cap (`__checks__/structure.test.ts`,
D-04) after adding sheet styles — fixed by moving them inline into `ExplorerSheet.tsx`.
