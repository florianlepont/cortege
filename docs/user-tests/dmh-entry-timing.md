# Saisie du facteur F (dendromicrohabitats) : chronométrage abandonné

Basé sur le critère 3 de la feuille de route de la phase 32, la décision D-08 et l'exigence `REQ-FT-dmh-speed`.

## 1. Décision du propriétaire (2026-10-27)

Le chronométrage de la saisie du facteur F sur l'iPhone, prévu avant et après la phase, est **abandonné**. Le propriétaire ne s'intéresse pas au temps de saisie : il veut seulement que **saisir le facteur F avec beaucoup de groupes soit plus simple qu'avant**. Le protocole écrit le 2026-10-26 (séances chronométrées, aide de mesure, règle de réussite sur le temps) n'a pas été exécuté : aucun temps n'a été mesuré et aucun n'est annoncé.

Les trois leviers de la décision D-08 restent tels qu'ils sont construits : (a) le « + » et le compteur sur la ligne du groupe, en mode déplafonné ; (b) les groupes rangés par forme ; (c) les groupes cochés ou comptés en premier à l'arrivée sur la page. Aucun levier n'est retiré pour une raison de mesure ; le propriétaire peut en faire retirer un après l'avoir essayé.

## 2. Comment la simplicité est montrée

1. **Le décompte automatique des appuis** (`mobile/src/screens/factor-detail/dmh-entry-cost.test.tsx`) : l'ancien flux demande 8 appuis pour S1 et 29 pour S2 ; le test rejoue S1 et S2 avec la nouvelle liste, compte ses appuis et vérifie que les données enregistrées sont exactement les mêmes (`OLD_FLOW_PRESSES` et `OLD_FLOW_F_PAYLOAD` dans `dmh-entry-scenarios.ts`).
2. **L'essai du propriétaire** : à la fin de la phase, le propriétaire essaie la nouvelle liste du facteur F sur son téléphone et confirme par écrit qu'elle est plus simple qu'avant (section 4, plan 32-16).

## 3. Scénarios de référence

Ils servent au décompte automatique et peuvent guider l'essai du propriétaire. Les groupes portent les intitulés exacts de l'application, dans l'ordre de l'IBP.

### S1 : peu de groupes (mode déplafonné, surface de 1 ha)

| Groupe                                           | Arbres |
| ------------------------------------------------ | ------ |
| 1. Loges de pic                                  | 2      |
| 5. Aubier apparent                               | 2      |
| 12. Plantes et lichens épiphytiques ou parasites | 1      |

Soit 3 groupes et 5 arbres. Ancien flux : **8 appuis** (3 puces et 5 « + »).

### S2 : beaucoup de groupes (mode déplafonné, surface de 1 ha)

Liste provisoire du jeu de test, gardée telle quelle (aucune séance n'a eu lieu, il n'y a donc pas de relevé réel à reporter) :

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

Soit 9 groupes et 20 arbres. Ancien flux : **29 appuis** (9 puces et 20 « + »).

### S3 : mode plafonné (non-régression)

Brouillon dont le parcours **plafonne** F : taper « 5 » dans le champ « arbres par hectare », puis cocher les trois groupes de S1 (1, 5 et 12). Il n'y a pas de compteur par groupe dans ce mode. Ancien flux : 3 coches ; le nouveau flux n'en demande pas plus.

## 4. Essai du propriétaire (fin de phase)

Rempli par le plan 32-16, en une seule ligne, d'après la réponse écrite du propriétaire.

Résultat : _à remplir par le plan 32-16._

## 5. Trace

L'aide de mesure (`32-dmh-timing-diag.patch`, dans le dossier de la phase) reste un simple fichier de trace : elle n'a servi à aucun build, elle n'est jamais entrée dans le code de l'application et elle ne sera jamais fusionnée.
