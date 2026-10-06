---
id: SEED-003
status: dormant
planted: 2026-10-06
planted_during: Phase 11 (Durable Backend) / Phase 13 (Field Validation) pending
trigger_when: next milestone, when the community/social surface or map navigation is reworked
scope: unknown
---

# SEED-003: Recherche globale

La recherche porte sur l'ensemble des items de l'application, pas seulement sur les relevés : mes relevés, ceux de la communauté, les lieux sur la carte, et plus largement tout objet que l'app expose.

## Why This Matters

Aujourd'hui la recherche est un champ natif dans l'en-tête de Mes Relevés et ne filtre que la liste locale. L'utilisateur s'attend à un point d'entrée unique, une recherche à l'échelle de l'application : une saisie retrouve n'importe quel item (relevés à moi ou aux membres, lieux et parcelles sur la carte, genres, facteurs IBP, réglages, écrans) et y emmène directement.

## When to Surface

**Trigger:** prochain jalon, ou toute phase touchant la recherche, l'Explorer ou le partage entre membres.

## Scope Estimate

**Unknown** — à estimer. Pistes : une seule barre avec résultats groupés par type d'item (Relevés / Communauté / Lieux et parcelles / Genres et facteurs / Réglages), navigation directe vers l'item, géocodage de lieux (IGN est déjà le fournisseur cadastre côté API), recherche communauté côté serveur (le local-first ne contient que mes données).

## Breadcrumbs

- `mobile/src/screens/SurveyListScreen.tsx`, `mobile/src/screens/survey-list/FilterBar.tsx` : recherche actuelle (mes relevés)
- `mobile/src/navigation/stacks/SurveysStack.tsx` : barre de recherche native dans l'en-tête
- `mobile/src/hooks/usePublicMapExplorer.ts` (Explorer, carte par bbox) : cible du « chercher un lieu »
- `api/src/surveys/cadastre-provider.service.ts` : fournisseur IGN, base possible du géocodage
- Phase 2 (partage entre membres) et Phase 9 (Explorer) dans `.planning/ROADMAP.md`

## Notes

Idée du propriétaire, 2026-10-06. Le périmètre exact des types d'items est à trancher à l'enrichissement. Question ouverte : où vit la barre (onglet dédié, ou accessible depuis chaque onglet).
