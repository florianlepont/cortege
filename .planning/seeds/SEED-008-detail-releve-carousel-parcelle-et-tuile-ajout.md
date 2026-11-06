---
id: SEED-008
status: dormant
planted: 2026-10-12
planted_during: Phase 27 closing (first written as SEED-007, renumbered because another seed took that number the same day)
trigger_when: Phase 35 (UX/UI Audit) at the latest, or any phase that reworks the survey detail summary
scope: small
---

# SEED-008: Détail d'un relevé, la parcelle dans le carrousel photo et une tuile « Ajouter une photo »

Deux retouches du résumé d'un relevé (`surveyDetail`), demandées par le propriétaire le 2026-10-12, pour gagner de la place.

## Why This Matters

1. **La vue parcelle entre dans le carrousel photo.** Aujourd'hui le résumé empile le bloc photos et une carte de la parcelle. Mettre la vue parcelle comme première diapositive (ou dernière) du carrousel libère un bloc entier de hauteur.
2. **Le bouton « Ajouter une photo » devient une tuile.** La pastille « Ajouter » (bouton verre au-dessus de la bande) est remplacée par une tuile vide « Ajouter une photo » placée dans la bande, à la suite des photos, donc au même niveau que les vignettes et sans bouton à part.

## When to Surface

**Trigger:** la phase 27 a ajouté la note libre, la météo et la certitude au relevé, ce qui allonge le résumé. Si une phase retouche `surveyDetail`, traiter ces deux points en même temps. Au plus tard, l'audit UX/UI (Phase 35).

## Scope Estimate

**Small**, deux changements d'interface sans effet sur les données ni la synchro.

## Breadcrumbs

- `mobile/src/screens/SurveyDetailScreen.tsx` : assemble `PhotosStrip` et `ParcelMapCard`
- `mobile/src/screens/survey-detail/PhotosStrip.tsx` : bande photos, bouton d'ajout (`handleAdd`, `photoStyles.addPill`), règles d'affichage (brouillon sans photo : ajout ; relevé soumis sans photo : aucun bloc)
- `mobile/src/screens/survey-detail/PhotoTile.tsx` : vignette, base de la tuile vide
- `mobile/src/screens/survey-detail/ParcelMapCard.tsx` : carte de la parcelle (aussi utilisée par `SurveyContextScreen`)
- `mobile/src/i18n/fr/survey-detail.ts` : textes (`add`, alertes `addPhotoTitle`, `a11y.addPhoto`)
- `.planning/phases/` du détail de relevé (OA-46) pour les décisions du résumé

## Notes

- La tuile d'ajout ne doit exister que là où l'ajout est permis aujourd'hui (brouillon). Un relevé soumis sans photo garde l'absence de bloc.
- Une carte dans un carrousel horizontal gêne le geste de déplacement de la carte : la diapositive parcelle doit rester une image fixe qui ouvre `surveyContext` au toucher, pas une carte interactive.
- Accessibilité : la tuile garde le libellé `a11y.addPhoto`, le carrousel annonce la position (« parcelle, 1 sur N »).
