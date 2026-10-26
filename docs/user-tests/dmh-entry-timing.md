# Test plan: temps de saisie du facteur F (dendromicrohabitats), avant et après

Basé sur le critère 3 de la feuille de route de la phase 32, la décision D-08 (saisie plus rapide, données enregistrées inchangées), l'exigence `REQ-FT-dmh-speed` et la section « Recording-Speed Work » de la recherche de la phase 32 (`32-RESEARCH.md`).

Légende : ✅ Réussi · ❌ Échec · ⚠️ Réussi avec un problème · 🔲 Non testé

Ce document est le **protocole**, écrit avant toute séance. La mesure « avant » (section 7) est prise sur le flux actuel du facteur F (puces à cocher, puis compteurs séparés), avant tout changement de la saisie. La mesure « après » (section 8) rejoue exactement le même protocole sur la version finie de la phase (plan 32-16).

---

## 1. But

Prouver que **saisir le facteur F est plus rapide qu'avant**, mesuré sur un vrai relevé, sur le même téléphone, avec le même type de build (critère 3 de la phase 32, décision D-08).

Deux choses sont mesurées, avant et après : le **temps** et l'**effort** (touchers, défilements, corrections). La mesure « avant » dit aussi quel levier compte vraiment (les défilements ou les appuis), pour garder ou abandonner chaque levier avec le propriétaire (section 9, point P-04 du plan 32-09).

Hors périmètre : le temps de lecture de la fiche, le temps d'ouverture du guide des dendromicrohabitats, la vitesse des autres facteurs.

## 2. Scénarios

Chaque scénario est une feuille de papier écrite à l'avance (groupe, nombre d'arbres), pour que le temps de lecture soit exclu de la mesure. Les groupes portent les intitulés exacts de l'application (puces du facteur F), dans l'ordre de l'IBP.

### S1 : peu de groupes (mode déplafonné)

| Groupe                                           | Arbres |
| ------------------------------------------------ | ------ |
| 1. Loges de pic                                  | 2      |
| 5. Aubier apparent                               | 2      |
| 12. Plantes et lichens épiphytiques ou parasites | 1      |

Soit 3 groupes et 5 arbres.

### S2 : beaucoup de groupes (mode déplafonné)

Le relevé réel du propriétaire (groupe, arbres). **À remplir à la tâche 3 du plan 32-07**, d'après la feuille que le propriétaire utilise à la séance. Si le propriétaire n'a pas de relevé réel, on garde la liste provisoire du jeu de test (`dmh-entry-scenarios.ts`) :

| Groupe                                           | Arbres |
| ------------------------------------------------ | ------ |
| 1. Loges de pic                                  | 3      |
| 2. Cavités à terreau                             | 2      |
| 4. Concavités                                    | 2      |
| 5. Aubier apparent                               | 3      |
| 6. Aubier et bois de cœur apparents              | 2      |
| 7. Bois mort dans le houppier                    | 3      |
| 10. Champignons pérennes                         | 1      |
| 12. Plantes et lichens épiphytiques ou parasites | 3      |
| 15. Coulées de sève et de résine                 | 1      |

Soit 9 groupes et 20 arbres.

Tableau S2 retenu à la séance : _à remplir (relevé réel ou liste provisoire)._

### S3 : mode plafonné (non-régression)

Brouillon dont le parcours **plafonne** F. Taper « 5 » dans le champ « arbres par hectare », puis cocher les trois groupes de S1 (1, 5 et 12). Il n'y a pas de compteur par groupe dans ce mode. Ce scénario sert à vérifier que le mode plafonné n'est pas devenu plus lent.

## 3. Préparation

- **Même iPhone** (celui du propriétaire) et **même type de build** (Release) pour l'avant et l'après. Avant : build de `origin/main` avec l'aide de mesure. Après : build du dernier commit de la phase avec la même aide de mesure (plan 32-16).
- **Deux brouillons préparés à l'avance** :
  1. un brouillon dont le parcours compte F **en plein** (relevé déplafonné) avec une **surface de 1 ha** déjà enregistrée : pour S1 et S2 ;
  2. un brouillon dont le parcours **plafonne** F : pour S3.
- **Entre deux essais** : remettre F à vide (décocher tous les groupes, remettre les compteurs à 0, vider le champ), puis **quitter la page F**. Cette sortie affiche une alerte de remise à zéro : l'ignorer, elle ne compte pas. Revenir ensuite sur F pour l'essai suivant.
- Les trois feuilles de scénario sont **lues avant** de commencer l'essai : la lecture n'est pas chronométrée.
- Téléphone chargé, branché ou non, luminosité habituelle. Noter si la séance a lieu au bureau ou sur le terrain (gants, soleil) : le bureau suffit pour le critère, un essai sur le terrain est un meilleur témoin.

## 4. Mesure

L'aide de mesure est un correctif jetable (`32-dmh-timing-diag.patch`, dans le dossier de la phase), appliqué seulement pour les builds de mesure. Elle n'entre jamais dans le code de l'application ni dans `main`.

- **Début du chronomètre** : le premier toucher sur la page F.
- **Fin du chronomètre** : le dernier changement de F (dernier arbre compté, dernière case cochée ou dernier chiffre tapé). La surface est déjà enregistrée (section 3) : elle n'entre pas dans la mesure.
- **Touchers** : chaque contact du doigt sur la page F, y compris celui qui commence un défilement.
- **Défilements** : chaque geste vertical de défilement de la page F.
- **Corrections** : un compteur qui baisse, ou un groupe décoché.
- À la sortie de la page F, une **alerte** affiche les quatre nombres : secondes (une décimale), touches, défilements, corrections. Le propriétaire note les quatre nombres de chaque essai (ou fait une capture d'écran de l'alerte).
- Un **enregistrement d'écran** (celui de l'iPhone) est gardé comme preuve et pour recouper le temps image par image si un chiffre paraît faux.

## 5. Déroulé

Trois essais par scénario, dans un ordre qui tourne pour ne pas avantager le dernier scénario :

| Essai | Ordre des scénarios |
| ----- | ------------------- |
| 1     | S1, S2, S3          |
| 2     | S2, S3, S1          |
| 3     | S3, S1, S2          |

Pour chaque scénario de chaque essai :

1. Remettre F à vide et quitter la page F (alerte de remise à zéro ignorée).
2. Ouvrir le bon brouillon et aller au facteur F.
3. Saisir le scénario d'après la feuille, à la vitesse normale (ni précipitée, ni appliquée).
4. Quitter la page F, noter les quatre nombres de l'alerte.
5. Vérifier que le facteur F affiche bien le contenu de la feuille. Un essai faux (un arbre oublié, un faux appui non corrigé) est recommencé et noté comme remarque.

Cela fait neuf essais, au total.

## 6. Règle de réussite proposée

À confirmer par le propriétaire au plan 32-09 (point P-03) :

- **S2** : temps médian **au moins 25 % plus bas** qu'avant, et **moins de touchers** qu'avant.
- **S1 et S3** : temps médian **au plus 10 % plus haut** qu'avant (pas plus lent).
- Si un levier ne montre aucun gain d'après la mesure « avant », il est abandonné (D-08).

## 7. Résultats avant

Date : _à remplir_ · iPhone : _à remplir_ · Build : `origin/main` au commit _à remplir_, avec l'aide de mesure.

| Scénario | Essai | Secondes | Touchers | Défilements | Corrections |
| -------- | ----- | -------- | -------- | ----------- | ----------- |
| S1       | 1     |          |          |             |             |
| S1       | 2     |          |          |             |             |
| S1       | 3     |          |          |             |             |
| S2       | 1     |          |          |             |             |
| S2       | 2     |          |          |             |             |
| S2       | 3     |          |          |             |             |
| S3       | 1     |          |          |             |             |
| S3       | 2     |          |          |             |             |
| S3       | 3     |          |          |             |             |

| Scénario | Médiane secondes | Médiane touchers | Médiane défilements | Médiane corrections |
| -------- | ---------------- | ---------------- | ------------------- | ------------------- |
| S1       |                  |                  |                     |                     |
| S2       |                  |                  |                     |                     |
| S3       |                  |                  |                     |                     |

Remarques du propriétaire (gants, soleil, faux appuis) : _à remplir._

## 8. Résultats après

À remplir par le plan 32-16, sur le build du dernier commit de la phase, avec le même protocole et la même aide de mesure (reportée sur le commit de la phase si elle ne s'applique plus, module d'enregistrement inchangé).

Date : _à remplir_ · iPhone : _à remplir_ · Build : _à remplir_

| Scénario | Essai | Secondes | Touchers | Défilements | Corrections |
| -------- | ----- | -------- | -------- | ----------- | ----------- |
| S1       | 1     |          |          |             |             |
| S1       | 2     |          |          |             |             |
| S1       | 3     |          |          |             |             |
| S2       | 1     |          |          |             |             |
| S2       | 2     |          |          |             |             |
| S2       | 3     |          |          |             |             |
| S3       | 1     |          |          |             |             |
| S3       | 2     |          |          |             |             |
| S3       | 3     |          |          |             |             |

| Scénario | Médiane secondes | Médiane touchers | Médiane défilements | Médiane corrections |
| -------- | ---------------- | ---------------- | ------------------- | ------------------- |
| S1       |                  |                  |                     |                     |
| S2       |                  |                  |                     |                     |
| S3       |                  |                  |                     |                     |

Verdict (règle de la section 6) : _à remplir._

## 9. Leviers

Les trois leviers de la décision D-08. L'estimation vient des nombres de la section 7 (tâche 3 du plan 32-07) ; le propriétaire décide au plan 32-09 (point P-04) ; l'état après la mesure est ajouté par le plan 32-16.

| Levier                                                                      | Estimation d'après la mesure avant | État après la mesure |
| --------------------------------------------------------------------------- | ---------------------------------- | -------------------- |
| a. Compteur sur la ligne du groupe (moins et plus, sans passer par la puce) | _à remplir_                        | _à remplir_          |
| b. Regroupement des groupes par forme (sections repliables)                 | _à remplir_                        | _à remplir_          |
| c. Groupes déjà cochés ou comptés en premier, puis l'ordre de l'IBP         | _à remplir_                        | _à remplir_          |

## 10. Taille des boutons du compteur (O-32-1)

Question ouverte du plan 32-16 : le compteur compact (boutons de 44 à 48 points au lieu des 56 points actuels, prévus pour les gants) est-il acceptable sur le terrain ? Réponse du propriétaire, avec son essai en conditions réelles : _à remplir par le plan 32-16._
