---
id: SEED-004
status: triggered
scheduled_in: Phase 24
planted: 2026-10-07
planted_during: Phase 12.2 and 12.3 pending
trigger_when: Phase 12.2 (Visual Modernisation) if the Home is reworked, otherwise the next milestone scan
scope: small
---

# SEED-004: Liste des parcelles proches sur l'Accueil

Remettre la liste « Parcelles près de vous » (ancienne `NearbyParcelsSheet`, supprimée par l'assistant de nouveau relevé, OA-25), cette fois sur l'Accueil.

## Why This Matters

La phase 3 offrait la sélection d'une parcelle proche en un geste. L'assistant l'a retirée sans décision écrite. Décision du propriétaire, 2026-10-07 : la remettre, mais sur l'Accueil, pas dans la sélection de parcelle.

## When to Surface

**Trigger:** refonte de l'Accueil (Phase 12.2) ou prochain jalon.

## Scope Estimate

**Small** : l'Accueil publie déjà les parcelles proches (`useNearbyParcelsState`, carte `NearbyMapCard`). Il reste une liste cliquable qui démarre un relevé sur la parcelle choisie.

## Breadcrumbs

- `mobile/src/navigation/routes/HomeRoute.tsx`, `mobile/src/screens/HomeScreen.tsx` : consommateurs actuels des parcelles proches
- `mobile/src/i18n/fr/nearby-parcels-sheet.ts` : textes orphelins, réutilisables
- `git show 626cb81^:mobile/src/screens/survey-form/NearbyParcelsSheet.tsx` : ancienne implémentation
- `.planning/phases/12-field-entry-ergonomics/12-VERIFICATION.md`

## Notes

Décisions du 2026-10-07 liées : la ligne d'autosave visible et la jauge du total IBP sont abandonnées pour l'instant (critères 4 et 5 de la phase 3 réécrits).
