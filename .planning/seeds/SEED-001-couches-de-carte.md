---
id: SEED-001
status: dormant
planted: 2026-10-06
planted_during: Phase 12.1 (owner acceptance testing)
trigger_when: after the phone pass of phase 12.1 and before phase 13 (field validation); or any milestone that touches the maps, offline packs or the Explorer
scope: medium
---

# SEED-001: Couches de carte (OA-127)

Aujourd'hui l'app ne propose que deux fonds : le Plan IGN gris et l'orthophoto satellite. Le
propriétaire veut travailler sur les couches de carte : fond colorisé, relief, couches forestières
(BD Forêt), ou d'autres fonds.

## Why This Matters

Message du propriétaire pendant le passage téléphone du 6 octobre 2026 : « il faut qu'on travaille
sur les différentes couches de map. Aujourd'hui on ajuste la couche de base grise et la satellite,
mais probablement qu'il faut colorisée les map ou utiliser d'autres couches de map ».

Pour une app de relevés forestiers, le fond gris est sobre mais ne montre pas le couvert : un fond
plus lisible pour la forêt aide à situer une parcelle sur le terrain et à lire les parcelles
colorées par score (OA-126).

## When to Surface

**Trigger:** après le passage téléphone de la phase 12.1, avant la phase 13 (validation terrain), ou
dès qu'un jalon touche les cartes, les zones hors ligne ou l'Explorer.

## Scope Estimate

**Medium** : une planche comparative d'abord (mêmes lieux, mêmes parcelles, chaque fond), puis un
choix, puis l'intégration (style, bascule, paquets hors ligne). Les contraintes ci-dessous peuvent
alourdir l'intégration.

## Contraintes à vérifier

- Usage raisonnable des services IGN (Géoplateforme) : nombre de tuiles, zooms 13 à 17 hors ligne.
- Taille des zones hors ligne : un paquet contient chaque fond proposé (aujourd'hui deux). Ajouter
  des fonds multiplie le poids, à moins de ne télécharger que le fond choisi.
- Le cadastre et les couleurs des parcelles (sélectionnée, étudiée, non étudiée, score) doivent rester
  lisibles sur chaque fond.
- Mode sombre.
- Les sprites et ressources des styles : le style « Gris » de l'IGN n'a pas de sprite @2x
  (découvert au passage téléphone, il bloquait le téléchargement hors ligne, OA-120).

## Breadcrumbs

- `mobile/src/map/basemaps.ts`, `mobile/src/map/maplibre/styles.ts` : les deux fonds et leurs URLs
  (`PLAN_IGN_STYLE_URL`, `ORTHO_STYLE`).
- `mobile/src/map/offline-styles.ts`, `mobile/src/map/offline-packs.ts` : un paquet natif par fond.
- `mobile/src/hooks/useMapStyle.ts`, `mobile/src/screens/public-map/MapControls.tsx` : choix et
  bascule du fond (un seul bouton Plan / Satellite aujourd'hui).
- Journal `docs/user-tests/owner-acceptance.md` : OA-61, OA-62 (fond unique, bascule), OA-126
  (parcelles colorées), OA-127 (cette graine) ; décision « basemap and offline maps » sous le tableau.

## Notes

Planche d'abord, avec le propriétaire : cinq fonds côte à côte sur la même forêt (Plan IGN standard,
Plan IGN gris, orthophoto, carte topographique, fond avec BD Forêt), parcelles et cadastre dessinés par
dessus.
