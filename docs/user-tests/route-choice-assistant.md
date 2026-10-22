# Test plan: assistant de choix du parcours (test enregistré, sans aide)

Basé sur [route-choice-rules-v1.md](../specs/route-choice-rules-v1.md) (règles validées par le propriétaire le 2026-10-14), les histoires US-C13 et US-C14 de [epic-c-ibp-survey-data-entry.md](../specs/epic-c-ibp-survey-data-entry.md) et la section 7.4 de la recherche de la phase 30.

Légende : ✅ Réussi · ❌ Échec · ⚠️ Réussi avec un problème · 🔲 Non testé

Ce document est le **protocole**, écrit avant toute séance. Les attentes (parcours, mode de relevé, surface décrite, règle) sont fixées ici d'avance : elles viennent de la table de décision validée (`ROUTE_RULE_CASES` dans `packages/ibp-domain/src/route/cases.ts`) et ont été calculées avec `recommendRoute` sur les réponses de chaque scénario, jamais devinées. Le compte rendu de la séance est rempli plus tard dans la section « Rapport », en bas.

---

## 1. But

Prouver que **quelqu'un qui ne connaît pas la méthode choisit son parcours sans aide** avec l'application (critère 4 de la feuille de route de la phase 30, décision D-10, exigence `REQ-FT-route-test`).

Ce que l'on mesure : l'étape obligatoire « Choix du parcours » (une question par écran, proposition avec ses raisons, explications des mots de la méthode dans les icônes i, sélecteur « Choisir le parcours ») se comprend seule. On ne mesure pas la rapidité de la prise en main de l'application en général.

Hors périmètre depuis les décisions O-14 et O-18 : l'inventaire prévu, l'étude, le diagnostic rapide et tout échantillonnage de plusieurs placettes. Il n'y a aucune carte de parcours (elle viendra avec la phase 31).

## 2. Testeurs

- Trois à cinq personnes (décision O-13), dont le testeur du propriétaire. Pas le propriétaire, ni personne qui a lu la spécification ou utilisé l'assistant avant la séance.
- Personne qui ne connaît pas la méthode de relevé de l'IBP en détail : elle peut avoir entendu parler de l'IBP, mais ne l'a jamais relevé avec les parcours de la méthode officielle.
- Chaque testeur reçoit un code (T1 à T5). Aucun nom, aucune adresse ni aucun autre moyen de l'identifier n'est écrit dans ce dépôt.

### Pré-contrôle (avant d'inviter la personne à la séance)

Le facilitateur pose trois questions, sans rien expliquer. **Le testeur doit échouer à définir ces trois mots**. S'il définit correctement l'un d'eux, il n'est pas retenu pour ce test.

| #   | Question                               | Définition correcte (le facilitateur la garde pour lui)                                                            |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| P-1 | Que veut dire « relevé plafonné » ?    | On arrête de compter un élément dès que son score est sûr.                                                         |
| P-2 | Qu'est-ce qu'une « placette » ?        | Une surface de forme simple et de taille connue (par exemple un cercle d'un hectare) dans laquelle on relève tout. |
| P-3 | Qu'est-ce qu'un « parcours partiel » ? | On ne décrit qu'une partie du peuplement, bien choisie, et on jette un coup d'œil rapide au reste.                 |

Résultat du pré-contrôle par testeur : voir le tableau 6.1.

## 3. Matériel et préparation

- Un téléphone avec la **version à tester de l'application** (build réel, pas le simulateur), connecté à un compte de test. L'API qui accepte `survey_route` doit être **déployée avant** d'installer ce build (ordre de déploiement du contrat d'API) : sinon l'enregistrement du parcours échoue et le test ne vaut rien.
- Les phrases françaises de l'étape ont été relues par le propriétaire avant la séance (plan 30-24, point P-4). Ne pas tester un texte qui sera encore changé.
- Une parcelle de test, **ouverte au moins une fois en ligne avant la séance** par le facilitateur, pour que sa géométrie reste disponible hors connexion. L'application estime la surface d'après la parcelle : cette surface ne sera pas celle des fiches, et le testeur doit la corriger comme les fiches le disent. Le facilitateur note la surface estimée affichée.
- Un enregistreur d'écran avec le son (ou un second appareil qui filme l'écran et enregistre la voix), un chronomètre, ce protocole imprimé, les trois fiches de scénario (section 5) imprimées séparément, un formulaire de consentement par testeur.
- Mode avion : le facilitateur sait l'activer et le désactiver. Le scénario (c) se fait en mode avion.

## 4. Règles de la séance (« sans aide »)

1. **Consentement écrit avant d'enregistrer** (section 8). Sans consentement signé, la séance a lieu sans enregistrement, le facilitateur prend des notes, et le consentement manquant est noté dans le rapport.
2. Le facilitateur lit à voix haute la consigne générale ci-dessous, puis remet **la fiche du scénario et rien d'autre**. Il ne parle plus du scénario.
3. **Aucune réponse** à une question sur l'application ou sur la méthode, une fois l'écran « Choix du parcours » ouvert. Réponse unique permise : « Faites comme si j'étais absent. Dites-moi ce que vous pensez. »
4. Le testeur **pense à voix haute** : il dit ce qu'il lit, ce qu'il comprend, ce qui l'étonne.
5. Le facilitateur note **chaque question** posée et **chaque hésitation de plus de 10 secondes** (heure et écran).
6. Avant l'écran « Choix du parcours » (premières étapes d'un nouveau relevé : nom, parcelle), ces étapes ne sont pas testées : si le testeur est bloqué, le facilitateur peut lui montrer où appuyer. Chaque aide de ce genre est notée « hors périmètre ». Dès que l'écran « Choix du parcours » s'ouvre, le facilitateur se tait.
7. Si le testeur est bloqué plus de 3 minutes sur l'étape, il peut abandonner : le scénario est un échec et la raison est notée.
8. Ordre : (a) pour tous les testeurs en premier. Ensuite, T1, T3 et T5 font (b) puis (c) ; T2 et T4 font (c) puis (b), pour répartir l'effet d'apprentissage.

Consigne générale lue au testeur :

> « Je vais vous demander de faire trois relevés dans l'application, sur des morceaux de forêt que je vais vous décrire sur une fiche. Je ne teste pas vous, je teste l'application. Je ne pourrai pas vous aider : dites à voix haute ce que vous lisez et ce que vous pensez. Si vous ne comprenez pas un mot, dites-le, c'est exactement ce que je cherche. »

## 5. Scénarios

Mise à jour 2026-10-22 : l'étape pose une question par écran, avec le bouton « Continuer » (même en-tête et même barre de progression que les étapes 1 à 3), puis affiche le résultat ; le glossaire de l'écran a été retiré, les mots sont expliqués dans les icônes i. Les attentes des scénarios ne changent pas, elles viennent de la table de décision.

Chaque scénario part d'un **nouveau relevé** (« Créer un relevé » depuis l'accueil ou depuis Mes Relevés). L'étape « Choix du parcours » arrive donc après la carte des parcelles. Le scénario est terminé quand le relevé est créé avec un parcours choisi (le testeur appuie sur « Utiliser ce parcours » ou, dans le sélecteur, sur le bouton qui enregistre).

Chaque fiche est écrite comme le testeur la lit : sans les mots de la méthode.

### Scénario (a) : plantation de 2 hectares

**Fiche du testeur**

> Vous allez faire un relevé dans une plantation de pins. Tous les arbres sont de la même essence et du même âge, plantés en rangs.
> Elle fait **2 hectares**. On y marche sans difficulté et on voit loin entre les rangs. Elle est large : plus de 100 mètres d'un bord à l'autre.
> Créez un nouveau relevé et allez jusqu'à ce que l'application ait enregistré comment vous allez faire ce relevé. Dites à voix haute ce que vous comprenez.

**Attendu** (calculé avec `recommendRoute`, réponses : surface 2 ha, homogène, facile à observer, large)

| #      | Élément                  | Résultat attendu                                                                      | Règle       |
| ------ | ------------------------ | ------------------------------------------------------------------------------------- | ----------- |
| RC-A-1 | Questions posées         | surface, homogène ou non, difficile à observer ou non, moins de 100 m de large ou non | R-09        |
| RC-A-2 | Parcours proposé         | Parcours partiel par placette                                                         | R-09, R-12b |
| RC-A-3 | Mode de relevé           | Relevé plafonné                                                                       | R-16        |
| RC-A-4 | Surface décrite          | 1 ha (reste du peuplement regardé rapidement, surface totale évaluée 2 ha)            | R-13, R-14  |
| RC-A-5 | Première raison affichée | le peuplement est homogène, une partie bien choisie le représente                     | R-09        |

### Scénario (b) : forêt mélangée de 12 hectares

**Fiche du testeur**

> Vous allez faire un relevé dans une forêt mélangée : plusieurs essences, des arbres de tous les âges, des trouées. Elle est très variée.
> Elle fait **12 hectares** d'un seul tenant.
> Si l'application vous demande la surface d'un morceau de cette forêt, prenez un morceau de **3 hectares**, de même nature que le reste, où l'on voit loin et où l'on marche sans peine.
> Créez un nouveau relevé et allez jusqu'à ce que l'application ait enregistré comment vous allez faire ce relevé. Dites à voix haute ce que vous comprenez.

**Attendu** (réponses : surface 12 ha, varié)

| #      | Élément                                                   | Résultat attendu                                                                                                                                                                  | Règle                             |
| ------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| RC-B-1 | Questions posées                                          | surface, homogène ou non                                                                                                                                                          | R-11b                             |
| RC-B-2 | Écran « Grand peuplement »                                | deux options seulement : « Découper en sous-peuplements » (présélectionnée, marquée « Conseillé ») et « Parcours partiel, sans découper » ; aucun parcours proposé avant le choix | R-11b                             |
| RC-B-3 | Réussite, voie 1 : le testeur découpe                     | l'application demande la surface d'un morceau (3 ha), puis si c'est difficile à observer (non) : Parcours en plein, Relevé plafonné, surface décrite 3 ha                         | R-11b puis R-10                   |
| RC-B-4 | Réussite, voie 2 : le testeur choisit le parcours partiel | Parcours partiel par bande, Relevé plafonné, surface décrite 2,4 ha (reste du peuplement : surface totale évaluée 12 ha)                                                          | R-11b#choose-partial, R-11, R-12a |

Les deux voies sont une réussite. Le facilitateur ne dit jamais laquelle est conseillée ; il note laquelle est choisie et pourquoi.

### Scénario (c) : jeune peuplement très serré de 3 hectares, en mode avion

**Avant la remise de la fiche** : le facilitateur active le mode avion et vérifie que la parcelle de test s'ouvre. Il ne le commente pas.

**Fiche du testeur**

> Vous allez faire un relevé dans un jeune peuplement de chênes, tous du même âge. Les arbres sont si serrés et les branches si basses qu'on voit à moins de 10 mètres devant soi, et on avance difficilement.
> Il fait **3 hectares**.
> Créez un nouveau relevé et allez jusqu'à ce que l'application ait enregistré comment vous allez faire ce relevé. Dites à voix haute ce que vous comprenez.

**Attendu** (réponses : surface 3 ha, homogène, difficile à observer)

| #      | Élément          | Résultat attendu                                                                                   | Règle                         |
| ------ | ---------------- | -------------------------------------------------------------------------------------------------- | ----------------------------- |
| RC-C-1 | Questions posées | surface, homogène ou non, difficile à observer ou non (la question sur la largeur n'est pas posée) | R-08                          |
| RC-C-2 | Parcours proposé | Parcours partiel par bande                                                                         | R-08, R-12a                   |
| RC-C-3 | Mode de relevé   | Relevé plafonné                                                                                    | R-16                          |
| RC-C-4 | Surface décrite  | 1 ha (reste du peuplement regardé rapidement, surface totale évaluée 3 ha)                         | R-13, R-14                    |
| RC-C-5 | Hors connexion   | l'étape fonctionne entièrement, sans message d'erreur lié au réseau                                | section 1 de la spécification |

À la fin du scénario (c), le facilitateur désactive le mode avion.

### Comment les attentes ont été calculées

Appel du paquet `@cortege/ibp-domain` le 2026-10-14, avant la séance :

| Scénario    | Réponses                                                              | `recommendRoute` donne                                                                                  |
| ----------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| (a)         | `surface_ha` 2, `homogeneous`, `difficulty` faux, `narrow` faux       | route `partial_plot`, `capped`, zone 1, complément fait sur 2 ha, règles R-09, R-12b, R-13, R-14, R-16  |
| (b)         | `surface_ha` 12, `heterogeneous`                                      | options `subdivide` (présélectionnée) et `partial`, raison `large_stand`, aucun parcours                |
| (b), voie 1 | `surface_ha` 3, `heterogeneous`, `difficulty` faux, `subdivided` vrai | route `full`, `capped`, zone 3, règles R-10, R-16                                                       |
| (b), voie 2 | `surface_ha` 12, `heterogeneous`, option `partial`                    | route `partial_strip`, `capped`, zone 2,4, complément fait sur 12 ha, règles R-11b, R-11, R-12a         |
| (c)         | `surface_ha` 3, `homogeneous`, `difficulty` vrai                      | route `partial_strip`, `capped`, zone 1, complément fait sur 3 ha, règles R-08, R-12a, R-13, R-14, R-16 |

Si la table de décision change avant la séance, ces attentes sont recalculées et la date ci-dessus est mise à jour.

## 6. Mesures de réussite

### 6.1 Pré-contrôle

| Testeur | P-1 plafonné | P-2 placette | P-3 parcours partiel | Retenu |
| ------- | :----------: | :----------: | :------------------: | :----: |
| T1      |      🔲      |      🔲      |          🔲          |   🔲   |
| T2      |      🔲      |      🔲      |          🔲          |   🔲   |
| T3      |      🔲      |      🔲      |          🔲          |   🔲   |
| T4      |      🔲      |      🔲      |          🔲          |   🔲   |
| T5      |      🔲      |      🔲      |          🔲          |   🔲   |

Un mot défini correctement par le testeur : ✅ à la place de 🔲 et le testeur n'est pas retenu. Un mot que le testeur ne sait pas définir : ❌.

### 6.2 Mesures par testeur et par scénario

Pour chaque scénario, le facilitateur renseigne :

1. **Terminé sans aide** : le testeur arrive à un parcours enregistré sans poser de question au facilitateur sur l'étape (une hésitation de plus de 10 secondes ne fait pas échouer, elle est notée).
2. **Parcours conforme** : le parcours et le mode de relevé obtenus sont ceux de l'attendu, **ou** une alternative justifiée : un parcours autre que celui conseillé, que le sélecteur permettait, avec une raison donnée par le testeur qui s'appuie sur un fait de la fiche (surface, homogénéité, visibilité, largeur). « Au hasard » ou « je ne sais pas » ne sont pas une justification. L'enregistrement est lu sur la page « Parcelles » du relevé (« Parcours utilisé »).
3. **Redit pourquoi** : à la fin du scénario, le facilitateur demande : « Pourquoi l'application vous propose cela ? ». Réussi si le testeur redonne, avec ses mots, une raison exacte (surface, homogène ou varié, difficile à observer, largeur).
4. **Durée** : du moment où l'écran « Choix du parcours » s'ouvre jusqu'à l'enregistrement du parcours. Repère : environ 3 minutes. Le dépassement n'est pas un échec, il est noté.

### 6.3 Questions de fin de séance (une fois, après les trois scénarios)

| #   | Question                                                                             | Réussi si                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-1 | « Quelle différence faites-vous entre "Méthode IBP v3.2" et "Parcours" ? »           | le testeur distingue la version de la méthode de la façon de parcourir le peuplement                                                               |
| Q-2 | « Que veut dire "relevé plafonné" ? »                                                | « on arrête de compter dès que le score est sûr » ou équivalent                                                                                    |
| Q-3 | « "Plafonné" a-t-il un rapport avec le score du facteur A ? » (si le testeur l'a vu) | le testeur ne confond pas : le plafond de comptage n'est pas un score limité à 2                                                                   |
| Q-4 | « Que feriez-vous si vous connaissiez déjà votre parcours ? »                        | le testeur repère « Je connais déjà mon parcours » (lien discret sous les questions, depuis le 2026-10-14) ou le sélecteur « Choisir le parcours » |
| Q-5 | « Y a-t-il un mot que vous n'avez pas compris ? »                                    | réponse notée telle quelle, sans note de réussite                                                                                                  |

Une confusion entre « plafonné » et le plafond du score du facteur A (Q-2, Q-3) est un point critique : voir la règle de passage.

### 6.4 Règle de passage (décision O-13)

Le test est **réussi** quand les deux conditions sont vraies :

1. **Chaque testeur** termine le scénario (a) sans aide (mesure 1) avec un parcours conforme (mesure 2).
2. **Au moins deux testeurs sur trois** (trois sur quatre, quatre sur cinq) terminent sans aide, avec un parcours conforme, au moins l'un des scénarios (b) ou (c). Lecture retenue de « au moins deux sur trois réussissent (b) ou (c) » de la décision O-13 : le seuil est compté par testeur, sur la réussite d'au moins un des deux scénarios.

Toute confusion qui revient chez deux testeurs ou plus, ou tout mot qu'au moins deux testeurs ne comprennent pas, devient une **correction de formulation** et un **nouveau test de la fiche concernée** avec un testeur retenu selon le pré-contrôle. Le critère 4 ne se ferme qu'avec un test réussi.

## 7. Tableaux de résultats

À remplir pendant et juste après chaque séance. Une ligne vide ou 🔲 signifie « non testé ».

### 7.1 Scénario (a)

| Testeur | Terminé sans aide | Parcours et mode obtenus | Conforme ou alternative justifiée | Redit pourquoi | Durée | Questions et hésitations | Statut |
| ------- | :---------------: | ------------------------ | :-------------------------------: | :------------: | :---: | ------------------------ | :----: |
| T1      |        🔲         |                          |                🔲                 |       🔲       |       |                          |   🔲   |
| T2      |        🔲         |                          |                🔲                 |       🔲       |       |                          |   🔲   |
| T3      |        🔲         |                          |                🔲                 |       🔲       |       |                          |   🔲   |
| T4      |        🔲         |                          |                🔲                 |       🔲       |       |                          |   🔲   |
| T5      |        🔲         |                          |                🔲                 |       🔲       |       |                          |   🔲   |

### 7.2 Scénario (b)

| Testeur | Terminé sans aide | Voie (découpe ou partiel) et résultat obtenu | Conforme ou alternative justifiée | Redit pourquoi | Durée | Questions et hésitations | Statut |
| ------- | :---------------: | -------------------------------------------- | :-------------------------------: | :------------: | :---: | ------------------------ | :----: |
| T1      |        🔲         |                                              |                🔲                 |       🔲       |       |                          |   🔲   |
| T2      |        🔲         |                                              |                🔲                 |       🔲       |       |                          |   🔲   |
| T3      |        🔲         |                                              |                🔲                 |       🔲       |       |                          |   🔲   |
| T4      |        🔲         |                                              |                🔲                 |       🔲       |       |                          |   🔲   |
| T5      |        🔲         |                                              |                🔲                 |       🔲       |       |                          |   🔲   |

### 7.3 Scénario (c), en mode avion

| Testeur | Terminé sans aide | Parcours et mode obtenus | Conforme ou alternative justifiée | Redit pourquoi | Durée | Questions et hésitations | Statut |
| ------- | :---------------: | ------------------------ | :-------------------------------: | :------------: | :---: | ------------------------ | :----: |
| T1      |        🔲         |                          |                🔲                 |       🔲       |       |                          |   🔲   |
| T2      |        🔲         |                          |                🔲                 |       🔲       |       |                          |   🔲   |
| T3      |        🔲         |                          |                🔲                 |       🔲       |       |                          |   🔲   |
| T4      |        🔲         |                          |                🔲                 |       🔲       |       |                          |   🔲   |
| T5      |        🔲         |                          |                🔲                 |       🔲       |       |                          |   🔲   |

### 7.4 Questions de fin de séance

| Testeur | Q-1 version et parcours | Q-2 plafonné | Q-3 pas de confusion avec le score de A | Q-4 chemin rapide | Q-5 mot non compris (texte) |
| ------- | :---------------------: | :----------: | :-------------------------------------: | :---------------: | --------------------------- |
| T1      |           🔲            |      🔲      |                   🔲                    |        🔲         |                             |
| T2      |           🔲            |      🔲      |                   🔲                    |        🔲         |                             |
| T3      |           🔲            |      🔲      |                   🔲                    |        🔲         |                             |
| T4      |           🔲            |      🔲      |                   🔲                    |        🔲         |                             |
| T5      |           🔲            |      🔲      |                   🔲                    |        🔲         |                             |

## 8. Enregistrement et consentement

- Le consentement est **écrit**, signé par le testeur avant le début de l'enregistrement. Texte à faire signer :

  > « J'accepte que l'écran du téléphone et ma voix soient enregistrés pendant cette séance, pour évaluer l'application et non pour m'évaluer. L'enregistrement ne sera vu que par l'équipe du projet, ne sera pas publié, et sera supprimé une fois le compte rendu rédigé. Le compte rendu ne contiendra ni mon nom ni rien qui permette de me reconnaître. Je peux arrêter la séance et demander la suppression de l'enregistrement quand je veux. »

- Les enregistrements (écran et son), les formulaires signés et la correspondance entre un code (T1 à T5) et une personne sont conservés **hors du dépôt**, dans un dossier privé du propriétaire. **Rien de cela n'est commité.**
- **Seul le rapport anonymisé est commité** (section « Rapport » ci-dessous) : codes T1 à T5, jamais de nom, d'adresse, de lieu de travail, ni de citation permettant de reconnaître la personne. Les citations sont courtes, sans détail personnel.
- Les enregistrements sont supprimés une fois le rapport anonymisé rédigé et relu.
- Le facilitateur ne met ni capture d'écran du compte du testeur ni informations du compte de test dans le rapport.

## 9. Suites

- Les défauts trouvés sont corrigés ou notés avec une décision (section « Rapport »). Une correction de texte du catalogue (`mobile/src/i18n/fr/route-guide.ts`) ou de l'écran est suivie d'un nouveau test de la fiche concernée.
- Le critère 4 est fermé par le plan 30-25, à partir du rapport ci-dessous.

---

## Rapport

À remplir par le plan 30-25, après la séance. Ne contient que des informations anonymisées.

### Séance

- Date(s) :
- Version de l'application et de l'API testées :
- Facilitateur :
- Nombre de testeurs retenus (pré-contrôle) :
- Consentements écrits recueillis :

### Résultats

(Reprendre les tableaux 6.1, 7.1, 7.2, 7.3 et 7.4 remplis.)

### Observations

- Questions posées et hésitations de plus de 10 secondes, par écran :
- Mots non compris :
- Confusions (plafonné et plafond du score de A, méthode et parcours) :

### Corrections décidées

| #   | Problème | Décision (correction, report, refus) | Nouveau test |
| --- | -------- | ------------------------------------ | ------------ |
|     |          |                                      |              |

### Verdict

- Règle de passage (section 6.4) :
- Critère 4 de la phase 30 :
