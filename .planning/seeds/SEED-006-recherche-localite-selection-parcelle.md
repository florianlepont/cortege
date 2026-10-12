---
id: SEED-006
status: dormant
planted: 2026-10-12
planted_during: Phase 27 and Phase 28 started in parallel
trigger_when: Phase 28 (Map Layers & Comparison) if the parcel-selection map is touched, otherwise the V1 scope scan before the beta (Phase 34)
scope: small
---

# SEED-006: Chercher une localité dans la sélection de parcelles

Dans un nouveau relevé, l'étape « sélection de parcelles » oblige à naviguer à la main sur la carte. Aucun champ ne permet de saisir une localité (commune, lieu-dit, adresse) pour y amener la carte.

## Why This Matters

Constat du propriétaire, 2026-10-12. Quand l'observateur crée un relevé ailleurs que là où il se trouve (préparation au bureau, relevé saisi après coup, forêt éloignée), il doit faire défiler et zoomer la carte depuis sa position ou depuis la France entière jusqu'à la bonne zone. Le GPS ne suffit pas dans ces cas.

La recherche globale (Phase 25) sait déjà résoudre une localité en position de carte, mais seulement depuis l'onglet Rechercher, qui ouvre l'Explorer. Elle n'est pas disponible dans l'assistant de nouveau relevé.

## When to Surface

**Trigger:** Phase 28 (couches de carte) si l'écran de sélection de parcelles ou le composant carte partagé est modifié, sinon le dernier balayage du périmètre V1 avant la bêta (Phase 34).

## Scope Estimate

**Small** : le service existe (`GET /v1/search/places`, `searchPlaces` dans `mobile/src/api/ibp-api.ts`, avec cache et erreur 503 `search_provider_unavailable` côté API). Il reste un champ de recherche sur l'écran de sélection de parcelles qui recentre la carte sur le résultat choisi, et un état hors ligne clair (la recherche de lieu exige le réseau, la carte déjà téléchargée reste utilisable).

## Breadcrumbs

- `mobile/src/screens/SurveyParcelSelectionScreen.tsx`, `mobile/src/screens/parcel-selection/` : écran et composants de la sélection
- `mobile/src/navigation/routes/ParcelSelectionRoute.tsx` : route
- `mobile/src/api/ibp-api.ts` (`searchPlaces`), `mobile/src/hooks/useGlobalSearch.ts`, `mobile/src/app/global-search.ts` : recherche de lieux déjà en place
- `api/src/surveys/geocoder.service.ts` : géocodeur IGN côté API
- `.planning/phases/25-global-search/` : décisions de la recherche globale (D-05, D-15 pour les lieux)
- `mobile/src/navigation/tab-bar.ts` (`shouldHideTabBar`) : la barre d'onglets est masquée pendant la sélection, donc l'onglet Rechercher n'est pas accessible depuis cet écran

## Notes

Questions ouvertes : champ en haut de la carte ou feuille dédiée ; réutiliser les résultats récents (`useSearchRecents`) ; proposer aussi la recherche par numéro de parcelle (`searchParcels`, déjà disponible) dans le même champ.
