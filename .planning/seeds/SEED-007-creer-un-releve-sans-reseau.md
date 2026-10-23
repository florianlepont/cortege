---
id: SEED-007
status: dormant
planted: 2026-10-12
planted_during: Phase 27 closing (device checks)
trigger_when: Phase 35 (UX/UI Audit & Design System Update), as a workflow finding of the new-survey wizard
scope: medium
---

# SEED-007: Créer un relevé sans réseau

Sans réseau et sans zone téléchargée, l'assistant de nouveau relevé ne laisse pas passer l'étape « sélection de parcelles » : l'observateur est bloqué avant d'avoir pu commencer.

## Why This Matters

Constat du propriétaire, 2026-10-12, en préparant le contrôle du rattrapage hors ligne de la météo (DC-27-03) : « je peux pas sélectionner une parcelle hors ligne ». Les parcelles viennent du cadastre de l'IGN par l'API ; seules les zones déjà téléchargées (cartes hors ligne, Phase 17) ont une géométrie sur le téléphone. En forêt sans couverture, ou dans une zone jamais téléchargée, l'application, pourtant conçue hors ligne d'abord, ne permet pas de commencer un relevé. Ce comportement existe depuis avant la Phase 27.

Conséquences liées : le scénario « parcelle choisie hors ligne, météo remplie au retour du réseau » (D-11 de la Phase 27) ne peut pas se produire de cette façon ; la météo n'est rattrapée que si le réseau tombe après le choix de la parcelle.

## When to Surface

**Trigger:** Phase 35 (audit UX/UI), au titre du parcours de création de relevé. À trancher avec le propriétaire avant la bêta si les testeurs de terrain travaillent hors couverture (Phase 37).

## Scope Estimate

**Medium** : à cadrer. Pistes à comparer pendant l'audit :
- permettre de terminer l'assistant sans parcelle (nom du site, méthode, position GPS), la parcelle étant rattachée plus tard quand le réseau revient ;
- proposer, avant de partir, de télécharger la zone du relevé à venir (le prompt de carte hors ligne existe déjà, `OfflineMapPrompt`) et le dire clairement dans l'assistant ;
- reprendre le dernier relevé ou le dernier site comme point de départ.
Chaque piste touche les règles de synchronisation (un relevé sans parcelle à l'envoi) et la météo (point de recherche = position GPS à défaut de parcelle) : lire `sync-conflict-resolution-v1.md` et `27-CONTEXT.md` (D-10, D-11, D-39, D-44) avant de décider.

## Breadcrumbs

- `mobile/src/screens/SurveyParcelSelectionScreen.tsx`, `mobile/src/screens/parcel-selection/` : l'étape qui bloque
- `mobile/src/hooks/useParcelStatuses.ts`, `mobile/src/storage/offline-map.ts` (`getCachedParcelById`) : source des parcelles, cache des zones téléchargées
- `mobile/src/hooks/useOfflineMapPrompt.ts`, `mobile/src/ui/OfflineMapPrompt.tsx` : proposition de télécharger la zone
- `mobile/src/hooks/useWeatherPrefill.ts`, `mobile/src/storage/weather.ts` : point de recherche de la météo (`weather_point:<id>`)
- `docs/user-tests/device-checks.md` : ligne DC-27-03

## Notes

Questions ouvertes : un relevé sans parcelle est-il envoyable ? la validation à la soumission exige-t-elle une parcelle (règles de `@cortege/ibp-domain`) ? l'étape « parcelles » pourrait-elle devenir facultative jusqu'à la soumission ?
