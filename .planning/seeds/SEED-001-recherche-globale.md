---
id: SEED-001
status: dormant
planted: 2026-10-06
planted_during: Phase 11 (Durable Backend) / Phase 13 (Field Validation) pending
trigger_when: next milestone, when the community/social surface or map navigation is reworked
scope: unknown
---

# SEED-001: Recherche globale

Le champ de recherche couvre toute l'application, pas seulement l'un ou l'autre : mes relevés, les relevés de la communauté, et les lieux sur la carte.

## Why This Matters

Aujourd'hui la recherche est un champ natif dans l'en-tête de Mes Relevés et ne filtre que la liste locale. L'utilisateur s'attend à un point d'entrée unique : taper un nom de commune, de lieu-dit ou de parcelle doit centrer la carte, et la même saisie doit retrouver ses propres relevés et ceux des autres membres.

## When to Surface

**Trigger:** prochain jalon, ou toute phase touchant la recherche, l'Explorer ou le partage entre membres.

## Scope Estimate

**Unknown** — à estimer. Pistes : une seule barre avec résultats groupés (Mes relevés / Communauté / Lieux), géocodage de lieux (IGN est déjà le fournisseur cadastre côté API), recherche communauté côté serveur (le local-first ne contient que mes données).

## Breadcrumbs

- `mobile/src/screens/SurveyListScreen.tsx`, `mobile/src/screens/survey-list/FilterBar.tsx` : recherche actuelle (mes relevés)
- `mobile/src/navigation/stacks/SurveysStack.tsx` : barre de recherche native dans l'en-tête
- `mobile/src/hooks/usePublicMapExplorer.ts` (Explorer, carte par bbox) : cible du « chercher un lieu »
- `api/src/surveys/cadastre-provider.service.ts` : fournisseur IGN, base possible du géocodage
- Phase 2 (partage entre membres) et Phase 9 (Explorer) dans `.planning/ROADMAP.md`

## Notes

Idée du propriétaire, 2026-10-06. Question ouverte : où vit la barre (onglet dédié, ou accessible depuis chaque onglet).
