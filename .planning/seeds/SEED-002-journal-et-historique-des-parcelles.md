---
id: SEED-002
status: triggered
scheduled_in: Phase 24
planted: 2026-10-06
planted_during: Phase 12.1 (Owner acceptance testing)
trigger_when: a phase of its own, later; NOT part of phase 12.1 (owner decision 2026-10-06). Surfaces at the next milestone scan, or with any milestone that touches the survey page, the history, the survey events or the parcel history
scope: small
---

# SEED-002: Séparer le journal des changements et l'historique des parcelles (OA-124)

La page « Historique » d'un relevé regroupe deux informations différentes : le journal des
changements du relevé (ses événements : création, modifications, synchronisation, terminé) et
l'historique des relevés faits sur la même parcelle (les relevés précédents, avec l'évolution du
score). Le propriétaire veut les séparer.

## Why This Matters

Retour du passage téléphone du 6 octobre 2026 : « séparer les logs (historique des changements sur
le relevé) et l'historique des relevés sur la parcelle, qui sont deux infos différentes aujourd'hui
regroupées dans "historique" ».

Les deux répondent à des questions différentes. Le journal des changements dit ce qui s'est passé
sur ce relevé (utile pour comprendre une synchronisation, une modification, un statut). L'historique
de la parcelle dit comment la parcelle évolue d'une année à l'autre (utile pour comparer, pour le
suivi de la forêt). Mélangés sur une seule page, aucun des deux ne se lit bien.

## When to Surface

**Trigger:** une phase à part, plus tard. Décision du propriétaire (6 octobre 2026) : ce sujet ne se
traite pas dans la phase 12.1 et ne bloque pas sa sortie. Il remonte au prochain examen de jalon, ou
dès qu'un jalon touche la page d'un relevé, l'historique, les événements de relevé ou l'historique
de parcelle.

## Scope Estimate

**Small** : la donnée existe des deux côtés (`useSurveyDetailData` charge déjà les événements et
l'historique de la parcelle). Il s'agit d'une décision de présentation : deux pages ou deux entrées
distinctes sur la page du relevé. Planche d'abord (OA-124 demande une planche avant de construire),
car le journal des changements est surtout technique et l'historique de la parcelle est une
information de fond.

## Questions à trancher sur la planche

- Où vivent-ils : deux lignes de la liste de la page du relevé (« Journal du relevé » et
  « Historique de la parcelle »), ou l'historique de la parcelle remonté vers « Contexte et
  parcelles » (puisqu'il parle de la parcelle) ?
- Le journal des changements reste-t-il visible de tous les utilisateurs, ou seulement en mode
  détaillé (c'est le plus technique des deux) ?
- Un relevé d'un autre membre (page en lecture seule, OA-115) montre-t-il l'historique de la
  parcelle, comme aujourd'hui, et jamais le journal des changements ?

## Breadcrumbs

- `mobile/src/screens/SurveyHistoryScreen.tsx` : la page « Historique » actuelle (les deux
  informations ensemble).
- `mobile/src/screens/survey-detail/EventsTab.tsx` : le journal des changements (événements du
  relevé).
- `mobile/src/screens/survey-detail/HistorySection.tsx` : l'historique des relevés de la parcelle
  (évolution du score).
- `mobile/src/screens/survey-detail/useSurveyDetailData.ts` : le chargement commun des deux.
- `mobile/src/screens/community-survey/CommunitySurveyScreen.tsx` : l'historique de la parcelle sur
  la page d'un relevé d'un autre membre.
- `api/src/surveys/survey-events.service.ts`, `api/src/surveys/parcels.service.ts`
  (`getParcelSurveyHistory`) : les deux sources côté serveur.
- Journal `docs/user-tests/owner-acceptance.md` : OA-112 (dates de l'historique), OA-122 (bouton
  recharger retiré), OA-124 (cette graine), OA-115 (page en lecture seule).

## Notes

Plantée sur demande du propriétaire (« seed GSD ») après le passage téléphone.
