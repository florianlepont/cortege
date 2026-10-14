# Règles de choix du parcours et du relevé (v1)

Statut : brouillon révisé le 2026-10-14 selon les décisions du propriétaire, à relire et valider

Date de rédaction : 2026-10-13 (première rédaction), révisée le 2026-10-14

Validation du propriétaire : à confirmer par écrit avec la date à la section 13, après relecture de
cette version révisée

Phase : 30, assistant de choix du parcours (V1). Cette spécification est la source de vérité de la
phase : aucun plan de code n'encode une règle ni ne construit un écran avant que le propriétaire
l'ait relue et validée par écrit, avec la date (décision D-10, critère 1 de la feuille de route).
Les décisions du propriétaire des 2026-10-13 et 2026-10-14 sont enregistrées dans
`.planning/phases/30-route-choice-assistant-inserted-v1/30-OWNER-DECISIONS.md` ; elles l'emportent
sur les défauts de la première rédaction. Le détail des changements est dans le journal des
révisions, en fin de document.

Sources, citées dans tout le document par leur lettre et le numéro de page imprimé en pied de
page :

- **S** : *Indice de Biodiversité Potentielle pour les forêts de France métropolitaine (IBP FR
  v3.2) : définition et fiches de relevé*, CNPF et INRAE Dynafor, 02/02/26, 28 pages. Empreinte
  SHA-256 `f130b3d66522ec0f5692e87e361b628b4941ce9748d1ed5519a49734854bd001`. Citée « S p. N ».
- **M** : *Méthodes de relevé de l'Indice de Biodiversité Potentielle (IBP)*, Gonin P. et Larrieu
  L., 09/09/25, 28 pages. Empreinte SHA-256
  `3954746756b770f338055310973ada871ea5bdd768cb6be1ce60581a7a87d7f2`. Citée « M p. N ». C'est le
  document que S cite (S p. 18) comme « Gonin, Larrieu, 2025 ». Il est référencé dans
  [`../references/README.md`](../references/README.md). Les deux PDF ne sont pas dans le dépôt.

Légende des rubriques « nature » des règles : **T** = seuil ou correspondance écrit
explicitement dans le texte officiel (déterministe) ; **J** = le texte officiel dit « selon le
cas » ou donne une plage (décision du propriétaire) ; **H** = heuristique de l'application, absente
du texte officiel (décision du propriétaire).

Les identifiants de code (codes de raison, clés d'enregistrement, constantes) sont écrits entre
accents graves, en anglais et en `snake_case` : le paquet `@cortege/ibp-domain` renvoie des codes,
l'application les traduit en phrases françaises. Aucune phrase destinée à l'observateur n'est
écrite ici : elles vivent dans le catalogue français de l'application et sont relues avant la
clôture de la phase.

## 1. Objet, champ et vocabulaire

**Ce que fait l'assistant.** Après le choix des parcelles, il propose à l'observateur un
**parcours** (la façon de parcourir le peuplement) et un **mode de relevé** (relevé plafonné ou
relevé déplafonné), explique chaque proposition en français courant, permet de la changer ou de
choisir directement, puis enregistre le « Parcours utilisé » avec le relevé. **Le choix du parcours
est obligatoire dès la création du relevé** (décision du propriétaire du 2026-10-13) : l'étape ne
se saute pas, et un nouveau relevé n'existe pas sans parcours. Elle reste utilisable hors
connexion.

**Ce que l'assistant propose.** Un seul usage est couvert : le **diagnostic exhaustif d'un
peuplement**. Le parcours est choisi à partir du peuplement seulement : sa surface, son homogénéité,
la difficulté à l'observer et sa largeur. L'application ne demande pas l'objectif du relevé
(décision du 2026-10-13). Le temps disponible et l'expérience de l'observateur sont de l'information
et ne choisissent jamais le parcours (décision du 2026-10-14, règles R-19 à R-21).

**Ce qui n'est pas couvert.** Les cas du texte officiel qui mènent à un échantillonnage de
plusieurs placettes (diagnostic rapide, étude, inventaire prévu, M p. 4 cas 1 à 3) ne sont pas dans
l'application : voir la section 10.

**Ce qu'il ne fait jamais.**

- Il ne change ni la version de la méthode IBP (v3.0 ou v3.2) ni le cas (1 à 4) : ils restent
  choisis à la création du relevé (décision D-01). Le parcours et le mode de relevé sont
  indépendants de la version et du cas.
- Il ne trace aucun itinéraire et n'affiche aucune carte de parcours : cela relève de la phase 31.
  Le tracé par boussole et GPS est reporté en V2.
- **Il ne modifie aucun score.** Le score IBP ne dépend pas du parcours : il est calculé à partir
  des comptes et des pourcentages saisis. Le parcours sert à la **traçabilité** (comment le relevé
  a été fait) et à la **comparabilité** (juger si deux scores se comparent). Le relevé déplafonné
  ajoute des données de détail ; il ne change pas le calcul d'un relevé isolé (décision D-09).

**Règle de séparation (D-01).** Le *parcours* correspond à la case « Méthode » de la fiche de
relevé officielle (S p. 20). Le *mode de relevé* correspond au champ « Facteurs déplafonnés » de la
même fiche. La *version* et le *cas* sont d'autres champs de la fiche et ne sont pas touchés.

**Vocabulaire imposé (décision du 2026-10-14 : les mots de la méthode officielle).** Chaque terme
garde, juste dessous dans l'application, une phrase d'explication en français courant (glossaire,
section 3), parce que le critère 4 mesure qu'un novice comprend.

| Mot dans l'application | Sens | Ne pas confondre avec |
|---|---|---|
| parcours en plein | on marche dans tout le peuplement | « Méthode IBP », qui reste la version (v3.2 ou v3.0) |
| parcours partiel (par bande ou par placette) | on ne décrit qu'une partie du peuplement | idem |
| relevé plafonné | on arrête de compter un élément dès que son score est sûr | le « score plafonné à 2 » du facteur A, qui est autre chose |
| relevé déplafonné | on compte tout, élément par élément | idem |
| peuplement | un morceau de forêt homogène | une parcelle cadastrale |

Le mot « plafonné » n'est jamais repris dans une ligne de score : le facteur A dit déjà « score
plafonné à 2 si le couvert des autochtones est inférieur à 50 % » (S p. 20), ce qui n'a aucun
rapport. Le test avec des utilisateurs vérifie cette confusion possible. Les libellés « Comptage
rapide » et « Comptage complet » ne sont employés nulle part. Le mot « méthode » n'est jamais
employé pour le parcours dans un texte destiné à l'observateur.

## 2. Sources et écarts entre les documents

Les écarts suivants existent entre S et M. Ils sont notés ici et non masqués ; la lecture retenue
est donnée avec sa raison.

| # | Écart | Lecture retenue par la spécification | Raison |
|---|---|---|---|
| 1 | Temps d'apprentissage d'un débutant : « une demi-journée » (S p. 19 et le résumé de M p. 2) ou « une journée » (M p. 17 et p. 19) | l'application n'écrit aucune durée d'apprentissage ni aucun coefficient ; elle dit seulement qu'un débutant a besoin de plus de temps (conseil `beginner`) | les textes ne s'accordent pas, même à l'intérieur de M, et aucun seuil n'est nécessaire au calcul |
| 2 | Limite du parcours en plein : « < 5 ha » (S p. 18, M p. 6, M p. 4) contre « petite : < dizaine d'ha » (M tableau 2, p. 5) | 5 ha (`ROUTE_FULL_MAX_HA`, décision O-05) | cité trois fois, et le tableau 1 (M p. 4) utilise 1 ha et 5 ha |
| 3 | Demi-largeur de bande : 10 à 20 m de chaque côté (S p. 18), 10 à 25 m selon la visibilité (M p. 15), 10 à 15 m sur la fiche 2021 (comparaison v3.0 et v3.2, ligne GS-3) | conseil de terrain tiré de M p. 15 : 10 à 15 m (faible visibilité ou terrain très accidenté), 15 à 20 m (visibilité moyenne), 20 à 25 m (bonne visibilité) | M est plus détaillé ; ce n'est pas une entrée de règle, seulement un conseil |
| 4 | Les tableaux 4, 5 et 7 de M sont étiquetés « IBP v3.0 » ; les seuils des facteurs C, D, E diffèrent entre v3.0 et v3.2, et le facteur H n'a plus de score 1 | la spécification reprend de M la **structure** de calcul (quelles données, quelle somme, quelle division) ; les seuils de score viennent toujours du paquet, par version | le paquet sait déjà noter chaque version (`rules/v3-0.ts`, `rules/v3-2.ts`) |

Les durées de S p. 19 et M p. 17 sont données par le texte officiel comme des **indications**, et
le texte officiel demande de standardiser l'effort de relevé pour limiter l'effet observateur
(passage de M à citer avec sa page à la relecture). C'est pourquoi la durée de la règle R-19 est
une plage affichée comme information.

Autres faits repris tels quels : l'IBP se relève par peuplement ou par type de peuplement
homogène, jamais sur toute une forêt (M p. 4 et p. 21, S p. 18 note 1) ; la moyenne des scores de
plusieurs peuplements n'est pas représentative (M p. 21).

## 3. Glossaire

Définitions en français courant, une ligne par terme. Elles servent de source au catalogue de
l'application : chaque terme du vocabulaire imposé porte sa phrase juste dessous. Règle :
l'application écrit « dendromicrohabitat » en toutes lettres, jamais « dmh », et ne dit jamais
« CNPF » (le texte dit « la méthode officielle de l'IBP »).

| Terme | Définition en français courant |
|---|---|
| peuplement | un morceau de forêt homogène : mêmes arbres, même âge, même aspect (S p. 18 note 1) |
| parcours en plein | on marche dans tout le peuplement, par bandes régulières, et on note tout ce que l'on voit (S p. 18, M p. 6) |
| parcours partiel | on ne décrit qu'une partie du peuplement, bien choisie (au moins 1 ha et 10 à 20 % du peuplement), et on jette un coup d'œil rapide au reste (M p. 7) |
| par bande | on suit à pied une large allée de 20 à 50 m de large (M p. 7) |
| par placette | on relève tout dans une surface de forme simple et de taille connue, par exemple un cercle d'un hectare (rayon de 56,4 m) (M p. 7, p. 15) |
| relevé plafonné | on arrête de compter un élément dès que son score est sûr ; c'est le plus rapide et le plus courant (S p. 18, M p. 16) |
| relevé déplafonné | on compte tout, sans s'arrêter, pour les facteurs choisis ; c'est plus long, mais cela donne le détail (S p. 18, M p. 16) |
| surface décrite (zone de relevé) | la surface que l'observateur décrit réellement, appelée « zone de relevé IBP » sur la fiche (S p. 20) |
| reste du peuplement (relevé complémentaire) | la partie non parcourue : on note seulement ce que l'on voit sans effort, comme une mare, un rocher ou une lisière (M p. 8) |
| dendromicrohabitat | un petit abri sur un arbre vivant ou mort : loge de pic, cavité, écorce décollée, champignon, nid (facteur F) |

## 4. Questions posées à l'observateur

Chaque question a un identifiant, une réponse fermée (aucun texte libre) et une condition
d'affichage. **Règle (D-05) : une question n'est posée que si sa réponse peut changer le résultat**
(le parcours, le mode de relevé ou la surface décrite conseillée). La durée estimée et les conseils
ne comptent pas comme un résultat : ils ne justifient pas une question. Les conditions d'affichage
sont calculées par le paquet (fonction pure), jamais par l'écran. Il n'y a **pas de question
d'objectif** : le parcours se choisit pour le diagnostic exhaustif d'un peuplement.

| Id | Question (sens) | Réponses permises (codes) | Défaut | Posée quand |
|---|---|---|---|---|
| `surface` | Quelle est la surface du peuplement ? (clé enregistrée `surface_ha`) | un nombre d'hectares, supérieur à 0 et au plus `ROUTE_SURFACE_MAX_HA`, virgule décimale acceptée | estimée d'après les parcelles choisies, vide si le calcul est impossible | toujours |
| `homogeneity` | Le peuplement est-il homogène ? | `homogeneous` (plantation, taillis de châtaignier, jeune peuplement), `heterogeneous` (futaie irrégulière mélangée, plusieurs essences et âges) | aucun | surface valide au-dessus de `ROUTE_SMALL_STAND_HA` (1 ha) |
| `difficulty` | Est-il difficile à observer ? (visibilité de moins de 10 à 15 m, peuplement difficilement pénétrable, relief accidenté) | `true`, `false` | aucun | surface entre 1 et 5 ha ; ou parcours partiel atteint avec un peuplement `homogeneous` |
| `narrow` | Le peuplement fait-il moins de 100 m de large ? | `true`, `false` | aucun | parcours partiel atteint avec un peuplement `homogeneous` et `difficulty` à `false` (dans les autres cas la bande s'impose déjà, la réponse ne changerait rien) |
| `refine` | Pour affiner (facultatif) : expérience de l'IBP et temps disponible | `experience` : `regular` ou `beginner` ; `hours_available` : nombre d'heures, supérieur à 0 et au plus `ROUTE_HOURS_MAX` | aucun | toujours proposée, repliée, jamais obligatoire ; **elle ne change jamais le parcours ni le mode de relevé** (décision du 2026-10-14) |

**Clés des réponses enregistrées** (section 8) : `surface_ha`, `homogeneity`, `difficulty`,
`narrow`, `experience`, `hours_available`, et `subdivided` (voir la règle R-11b : vrai quand
l'observateur a découpé un grand peuplement et que `surface_ha` est la surface d'un morceau).

**Divulgation progressive.** Une seule question est ouverte à la fois ; une question déjà
répondue se replie en une ligne et peut être rouverte. Changer une réponse recalcule les questions
nécessaires et la proposition. Une réponse devenue inutile est gardée en mémoire pendant la
session (pour ne rien perdre si l'observateur revient en arrière) mais n'est pas enregistrée tant
qu'elle n'est pas de nouveau nécessaire (décision U-O14 : les réponses d'un assistant abandonné ne
sont pas conservées ; l'enregistrement se fait une seule fois, à l'acceptation).

**Étape obligatoire (décision du 2026-10-13).** L'assistant est une étape de la création du relevé
qui ne se saute pas : le relevé ne se crée qu'avec un parcours accepté. Un chemin rapide, « Je
connais déjà mon parcours », ouvre directement le sélecteur de parcours (« Choisir le parcours ») :
l'observateur y choisit le parcours, le mode de relevé et la surface décrite sans répondre aux
questions. La surface se saisit à la main quand le calcul d'après les parcelles est impossible,
donc rien ne bloque hors connexion. Le moment exact de la création du brouillon (à l'acceptation du
parcours, proposé) est à confirmer à la relecture.

**Deux choix qui ne sont pas des questions.**

- Le relevé déplafonné : il se choisit à la main dans le sélecteur, par cinq préréglages et une
  puce par facteur (décision O-01), jamais suggéré par l'assistant. L'assistant ne pose aucune
  question qui le justifierait.
- Le peuplement linéaire (largeur inférieure à 15 m, haie, ripisylve) de la règle R-03 : aucune
  question, aucun code ; voir la décision O-10 (section 11).

**Questions nécessaires, calculées par le paquet.** Pour un jeu de réponses partiel, le paquet
renvoie la liste ordonnée des questions à afficher (nom proposé : `routeQuestionsFor`), puis la
recommandation complète quand toutes les réponses nécessaires sont données (nom proposé :
`recommendRoute`). Les réponses non nécessaires sont ignorées par `recommendRoute`.

## 5. Règles de choix du parcours

### Constantes

Chaque seuil est une constante nommée du paquet, avec sa source. Aucun seuil n'est écrit ailleurs.

| Constante | Valeur | Source | Rôle |
|---|---|---|---|
| `ROUTE_TINY_STAND_HA` | 0,5 ha | M p. 4 | en dessous, avertissement `small_stand` |
| `ROUTE_SMALL_STAND_HA` | 1 ha | M p. 4 | jusqu'à cette surface : parcours en plein |
| `ROUTE_FULL_MAX_HA` | 5 ha | M p. 4, p. 6 ; S p. 18 | limite du parcours en plein (décision O-05) |
| `ROUTE_SUBDIVIDE_HETEROGENEOUS_HA` | 10 ha | M p. 4 (« 10-20 ha selon l'hétérogénéité ») | au-dessus : deux options, pour un peuplement `heterogeneous` (décision O-02) |
| `ROUTE_SUBDIVIDE_HOMOGENEOUS_HA` | 20 ha | M p. 4 | idem pour un peuplement `homogeneous` (décision O-02) |
| `PARTIAL_SAMPLE_MIN_HA` | 1 ha | M p. 7 | surface minimale échantillonnée d'un parcours partiel |
| `PARTIAL_SAMPLE_SHARE_HOMOGENEOUS` et `PARTIAL_SAMPLE_SHARE_HETEROGENEOUS` | 0,10 et 0,20 | M p. 7 | part échantillonnée : 10 % (plantation pure) à 20 % (futaie irrégulière mélangée) |
| `PARTIAL_OVER_HALF_SHARE` | 0,5 | M p. 7 | au-delà, avertissement `partial_over_half` |
| `ROUTE_NARROW_WIDTH_M` | 100 m | M p. 8 (tableau 3) | un peuplement plus étroit se décrit mieux en bandes |
| `ROUTE_MINUTES_PER_HA_EASY` et `ROUTE_MINUTES_PER_HA_HARD` | 15 à 20 et 25 à 30 minutes par hectare et par personne | S p. 19 ; M p. 17 | durée estimée d'un opérateur habitué à l'IBP, donnée comme information seule |
| `ROUTE_SURFACE_MAX_HA` | 5000 ha | valeur par défaut de la décision U-O11 | borne de saisie d'une surface (erreur `surface_invalid`, `zone_too_large`) |
| `ROUTE_HOURS_MAX` | 24 h | choix de l'application | borne du temps disponible |
| `STRATUM_MIN_COVER_PERCENT` | 20 % | S p. 20 | une strate compte à partir de ce couvert (section 7) |
| `DMH_GROUP_DENSITY_CAP_PER_HA` | 2 arbres par hectare | M p. 9, p. 17 | plafond par groupe de dendromicrohabitats (section 7) |
| `ROUTE_RECORD_MAX_BYTES` | 4096 octets | choix de l'application | taille maximale de l'enregistrement (section 8) |

### Table des règles

Lecture : « S » est la surface du peuplement (réponse `surface_ha`), « T » le seuil de découpage
(10 ha pour un peuplement `heterogeneous`, 20 ha pour un peuplement `homogeneous`, décision O-02).
Chaque règle a un identifiant, une source (document et page), une nature (T, J ou H, voir
l'en-tête) et **un cas de test** écrit « réponses → résultat attendu ». Le paquet porte les mêmes
identifiants dans son jeu de cas (`ROUTE_RULE_CASES`) : une règle de la table sans cas, ou un cas
sans règle, est une erreur détectée par un test. La table compte 20 règles et 23 cas limites.

**Identifiants conservés, sans renumérotation.** Les règles R-04, R-05 et R-06 de la première
rédaction (celles de l'objectif, de l'échantillonnage typologique et de l'échantillonnage
systématique) sont retirées ; leurs identifiants ne sont pas réutilisés et les règles restantes
gardent les leurs, ce qui laisse un trou entre R-03 et R-07.

**Principe : seules la surface, l'homogénéité, la difficulté et la largeur choisissent le
parcours.** L'expérience et le temps disponible ne figurent dans aucune condition des règles R-01
à R-18 ; ils n'alimentent que les conseils R-20 et R-21.

Ordre des raisons renvoyées (au plus quatre) : la raison tirée des réponses d'abord, puis, pour un
parcours partiel, la raison du type (bande ou placette) et la raison du relevé complémentaire,
et la raison du mode de relevé en dernier.

**Étape 0 : préconditions et avertissements (aucun changement de parcours)**

| Id | Condition | Résultat | Source | Nature | Cas de test |
|---|---|---|---|---|---|
| R-01 | S absente, nulle, négative, ou supérieure à `ROUTE_SURFACE_MAX_HA` | aucun parcours ni mode de relevé ; la question `surface` reste ouverte ; code d'erreur `surface_missing` (absente) ou `surface_invalid` (hors plage) | S p. 18 ; M p. 2 | T | `surface_ha` absente → aucune proposition, `surface_missing` |
| R-02 | 0 < S < `ROUTE_TINY_STAND_HA` (0,5 ha) | la proposition est inchangée ; avertissement `small_stand` en plus | M p. 4 | T | `surface_ha=0.4` → `full`, `capped`, zone 0.4, raisons `whole_stand_small` puis `capped_default`, avertissement `small_stand` |
| R-03 | peuplement linéaire (largeur inférieure à 15 m : haie, ripisylve) | hors champ de l'application (décision O-10) : aucune question, aucun code ; les seuils restent par hectare ; une phrase fixe sous la question de surface l'explique | S p. 6 | T (règle officielle, non prise en charge) | `surface_ha=0.8` pour une haie → même résultat que R-07 ; le code `linear_stand_unsupported` n'existe pas |

**Étape 1 : diagnostic exhaustif d'un peuplement, par surface, homogénéité et difficulté**

| Id | Condition | Résultat | Source | Nature | Cas de test |
|---|---|---|---|---|---|
| R-07 | S ≤ `ROUTE_SMALL_STAND_HA` (1 ha) | `full`, `capped`, zone = S ; raisons `whole_stand_small` puis `capped_default` ; ni `homogeneity` ni `difficulty` n'est posée | M p. 4 | T | `surface_ha=0.8` → `full`, `capped`, zone 0.8, raisons [`whole_stand_small`, `capped_default`], aucune autre question |
| R-08 | 1 < S ≤ `ROUTE_FULL_MAX_HA` (5 ha) et `difficulty=true` | `partial` (bande par R-12a), `capped` ; raisons `partial_hard_to_observe`, `partial_strip_why`, `complement_advised`, `capped_default` | M p. 4 | T | `surface_ha=3`, `homogeneity=heterogeneous`, `difficulty=true` → `partial_strip`, `capped`, zone 1, complément fait, surface totale évaluée 3 |
| R-09 | 1 < S ≤ 5 ha, `difficulty=false`, `homogeneity=homogeneous` | `partial` (bande si `narrow=true`, sinon placette, R-12a et R-12b), `capped` ; raison de tête `partial_homogeneous` | M p. 4 | T | `surface_ha=2`, `homogeneity=homogeneous`, `difficulty=false`, `narrow=false` → `partial_plot`, `capped`, zone 1, raisons [`partial_homogeneous`, `partial_plot_why`, `complement_advised`, `capped_default`], aucun avertissement |
| R-10 | 1 < S ≤ 5 ha, `difficulty=false`, `homogeneity=heterogeneous` | `full`, `capped`, zone = S ; raisons `whole_stand_heterogeneous` puis `capped_default` | M p. 4 ; S p. 18 | T | `surface_ha=4.5`, `homogeneity=heterogeneous`, `difficulty=false` → `full`, `capped`, zone 4.5 |
| R-11 | 5 < S ≤ T | `partial`, `capped` ; raison de tête `partial_medium_stand` ; la forme (bande ou placette) suit R-12a et R-12b ; `difficulty` n'est posée que si le peuplement est `homogeneous` | M p. 4 | T (le seuil 10 ou 20 selon l'hétérogénéité est J, décision O-02) | `surface_ha=15`, `homogeneity=homogeneous`, `difficulty=false`, `narrow=false` → `partial_plot`, `capped`, zone 1.5, raisons [`partial_medium_stand`, `partial_plot_why`, `complement_advised`, `capped_default`] |
| R-11b | S > T | aucun parcours tant que l'observateur n'a pas choisi ; **deux options seulement**, dans l'ordre : `subdivide` (préselectionnée et étiquetée « Conseillé », décision O-03), `partial` ; raison `large_stand` ; `subdivide` n'est pas un parcours : l'assistant redemande la surface d'un morceau et enregistre `subdivided=true` ; `partial` renvoie le résultat de R-12a ou R-12b avec les raisons `large_stand` et `partial_medium_stand` | M p. 4 | J (décision O-03) | `surface_ha=12`, `homogeneity=heterogeneous` → options [`subdivide`, `partial`], `subdivide` préselectionnée, raison [`large_stand`], aucun parcours |

**Étape 2 : paramètres d'un parcours partiel**

| Id | Condition | Résultat | Source | Nature | Cas de test |
|---|---|---|---|---|---|
| R-12a | parcours partiel et (`homogeneity=heterogeneous` ou `difficulty=true` ou `narrow=true`) | `partial_strip` ; raison `partial_strip_why` ; conseil de terrain : bandes de 20 à 50 m de large (demi-largeur de 10 à 25 m selon la visibilité) | M p. 7, p. 8, p. 15 | T | `surface_ha=8`, `homogeneity=heterogeneous` → `partial_strip`, zone 1.6, raisons [`partial_medium_stand`, `partial_strip_why`, `complement_advised`, `capped_default`] |
| R-12b | parcours partiel dans tous les autres cas | `partial_plot` ; raison `partial_plot_why` ; conseil de terrain : placettes de 1 ha préférées (rayon horizontal de 56,4 m), 0,5 ha (39,9 m) ou 0,33 ha (32,6 m) possibles | M p. 7, p. 8 | T | `surface_ha=8`, `homogeneity=homogeneous`, `difficulty=false`, `narrow=false` → `partial_plot`, zone 1, raisons [`partial_medium_stand`, `partial_plot_why`, `complement_advised`, `capped_default`] |
| R-13 | parcours partiel | zone conseillée = min(S, max(`PARTIAL_SAMPLE_MIN_HA`, part × S)) arrondie à 2 décimales, part = 0,10 (`homogeneous`) ou 0,20 (`heterogeneous`) ; contrôles de la section « Contrôles de la surface décrite » (`partial_over_half` quand zone > 0,5 × S, `partial_below_minimum` quand zone < 1 ha) | M p. 7 | T (la correspondance entre homogénéité et 10 ou 20 % est J : le texte donne les deux extrêmes, une plantation pure et une futaie irrégulière mélangée) | `surface_ha=8`, `homogeneity=heterogeneous` → zone 1.6 ; l'observateur saisit 4.5 → `partial_over_half` (4.5 > 4) |
| R-14 | parcours partiel | relevé complémentaire conseillé pour quatre éléments (A, G, I, J), proposé par défaut : `complement` = `done` vrai, surface totale évaluée = S ; raison `complement_advised` | M p. 8 ; S p. 20 | T | tout parcours partiel avec `surface_ha=8` → `complement.done=true`, `complement.total_surface_ha=8` |
| R-15 | parcours partiel par placette, plusieurs placettes parcourues | **une seule fiche** : la surface décrite (`zone_surface_ha`) est la **somme des surfaces des placettes** parcourues, et les contrôles de R-13 s'appliquent à cette somme ; le mode de relevé reste celui de la fiche ; il n'y a ni fiche par placette ni nom de groupe | M p. 7 | T | `partial_plot` sur 8 ha, trois placettes de 0,5 ha, 0,5 ha et 0,4 ha → une seule fiche, `zone_surface_ha` 1.4, aucun avertissement ; deux placettes de 0,4 ha → zone 0.8 et avertissement `partial_below_minimum` |

**Étape 3 : mode de relevé et facteurs comptés en entier**

| Id | Condition | Résultat | Source | Nature | Cas de test |
|---|---|---|---|---|---|
| R-16 | mode de relevé par défaut | `capped` pour les trois parcours (`full`, `partial_strip`, `partial_plot`) : l'assistant ne propose jamais le relevé déplafonné | M p. 5 (tableau 2) | T | `full` → `capped` ; `partial_strip` → `capped` ; `partial_plot` → `capped` |
| R-17 | mode `uncapped` choisi à la main dans le sélecteur (décision O-01) | le relevé est déplafonné pour une liste de facteurs, jamais pour H ; préréglages : `all_factors` = A B C D E F G I J ; `mature` = A C D E F ; `always_max` = un sous-ensemble choisi de A C D E F I J (tous proposés au départ) ; `minimum` = C D E ; `custom` = au choix, au moins un facteur. Conseil pour `mature` et `always_max` : garder le plafond de 1 arbre par hectare pour les bois morts de dimension moyenne et les gros bois, sauf besoin particulier | M p. 23, p. 24 ; S p. 20, p. 21 (note 1) | T (les listes) ; les offrir en préréglages est J (décision O-01) | préréglage `mature` → [A,C,D,E,F] ; `minimum` → [C,D,E] ; `all_factors` → [A,B,C,D,E,F,G,I,J] ; `custom` sans aucun facteur → refusé (au moins un facteur) |
| R-18 | tout mode `uncapped` | conseil `uncapped_longer` : le relevé déplafonné demande plus de temps | S p. 19 ; M p. 17 | T | `uncapped` choisi dans le sélecteur → conseils contiennent `uncapped_longer` ; `full` et `capped` → absent |

**Étape 4 : durée et conseils, information seule (jamais un changement de parcours)**

Décision du propriétaire du 2026-10-14 : la durée, le temps disponible et l'expérience sont de
l'information, comme dans la méthode officielle qui choisit le parcours d'après le peuplement
seul. Aucune règle ne déplace la proposition à cause du temps ou de l'expérience, et aucun
coefficient de débutant n'existe.

| Id | Condition | Résultat | Source | Nature | Cas de test |
|---|---|---|---|---|---|
| R-19 | surface échantillonnée A connue (parcours `full` : S ; `partial_*` : la zone) | conseil `duration` avec une plage `estimated_minutes` : minimum et maximum = A × (15 et 20) minutes, ou A × (25 et 30) si `difficulty=true`, arrondis à la minute ; affichée dans la section repliée « Pour affiner » comme une indication pour un opérateur habitué à l'IBP | S p. 19 ; M p. 17 | T pour les nombres ; H pour la plage difficile choisie par `difficulty=true` | `full`, `surface_ha=4`, `difficulty` non posée → 60 à 80 minutes ; `partial_strip`, zone 1, `difficulty=true` → 25 à 30 minutes ; `partial_plot`, zone 1.2 → 18 à 24 minutes |
| R-20 | `hours_available` donné et inférieur à la durée minimale estimée | conseil `time_short` ; le parcours ne change jamais | S p. 19 ; M p. 17 (les durées seulement : comparer au temps disponible n'est pas écrit) | H (décision du 2026-10-14) | `full`, `surface_ha=4`, `hours_available=0.5` → conseil `time_short` ; le parcours reste `full` |
| R-21 | `experience=beginner` | conseil `beginner` (un débutant a besoin de plus de temps, sans nombre ni coefficient) ; le parcours ne change jamais | M p. 4 (point 4) ; S p. 19 | J et H (décision du 2026-10-14) | `experience=beginner` avec `surface_ha=8`, `homogeneity=heterogeneous` → même parcours que sans la réponse (`partial_strip`), conseil `beginner` en plus |

### Cas limites

Les cas ci-dessous fixent le comportement aux seuils 0,5, 1, 5, 10 et 20 ha et aux autres
bornes. Chaque identifiant `R-nn#étiquette` désigne la règle `R-nn` dont il fixe une borne.

| Id | Règle | Source | Cas (réponses → résultat attendu) |
|---|---|---|---|
| R-01#zero | R-01 | S p. 18 | `surface_ha=0` → `surface_invalid`, aucune proposition |
| R-01#at-max | R-01 | S p. 18 | `surface_ha=5000`, `homogeneity=homogeneous` → proposition calculée (options de R-11b), pas d'erreur |
| R-01#above-max | R-01 | S p. 18 | `surface_ha=5000.01` → `surface_invalid`, aucune proposition |
| R-02#at-half-ha | R-02 | M p. 4 | `surface_ha=0.5` → `full`, zone 0.5, aucun avertissement `small_stand` |
| R-07#at-1ha | R-07 | M p. 4 | `surface_ha=1` → `full`, zone 1, `homogeneity` non posée |
| R-08#just-above-1ha | R-08 | M p. 4 | `surface_ha=1.01`, `homogeneity=heterogeneous`, `difficulty=true` → `partial_strip`, zone 1 |
| R-10#at-5ha | R-10 | M p. 4 | `surface_ha=5`, `homogeneity=heterogeneous`, `difficulty=false` → `full`, zone 5 |
| R-11#just-above-5ha | R-11 | M p. 4 | `surface_ha=5.01`, `homogeneity=heterogeneous` → `partial_strip`, zone 1 (0,2 × 5,01 arrondi à 1,00) |
| R-11#hetero-at-10ha | R-11 | M p. 4 | `surface_ha=10`, `homogeneity=heterogeneous` → `partial_strip`, zone 2, pas d'options |
| R-11#homo-between-10-and-20ha | R-11 | M p. 4 | `surface_ha=12`, `homogeneity=homogeneous`, `difficulty=false`, `narrow=false` → `partial_plot`, zone 1.2, pas d'options |
| R-11#homo-at-20ha | R-11 | M p. 4 | `surface_ha=20`, `homogeneity=homogeneous`, `difficulty=false`, `narrow=false` → `partial_plot`, zone 2, pas d'options |
| R-11b#hetero-above-10ha | R-11b | M p. 4 | `surface_ha=10.01`, `homogeneity=heterogeneous` → options [`subdivide`, `partial`], aucun parcours |
| R-11b#homo-above-20ha | R-11b | M p. 4 | `surface_ha=20.01`, `homogeneity=homogeneous` → options [`subdivide`, `partial`], aucun parcours |
| R-11b#choose-partial | R-11b | M p. 4 | `surface_ha=12`, `homogeneity=heterogeneous`, option `partial` choisie → `partial_strip`, zone 2.4, raisons [`large_stand`, `partial_medium_stand`, `partial_strip_why`, `complement_advised`] |
| R-12a#narrow | R-12a | M p. 8 | `surface_ha=8`, `homogeneity=homogeneous`, `difficulty=false`, `narrow=true` → `partial_strip` |
| R-13#at-half | R-13 | M p. 7 | `surface_ha=2`, `homogeneity=homogeneous`, `difficulty=false`, `narrow=false` → zone 1 (exactement la moitié), aucun avertissement `partial_over_half` |
| R-13#above-half | R-13 | M p. 7 | `surface_ha=1.5`, `homogeneity=homogeneous`, `difficulty=false`, `narrow=false` → zone 1 (plus de la moitié), avertissement `partial_over_half` |
| R-13#below-minimum | R-13 | M p. 7 | `surface_ha=8`, zone saisie 0.9 → avertissement `partial_below_minimum` |
| R-14#complement-below-zone | R-14 | M p. 8 | zone 2, surface totale évaluée saisie 1.5 → erreur `complement_below_zone` |
| R-15#sum-of-plots | R-15 | M p. 7 | placettes de 0.5, 0.5 et 0.4 ha → `zone_surface_ha` 1.4 sur une seule fiche, pas de `zone_above_stand` si S ≥ 1.4 |
| R-17#custom-empty | R-17 | S p. 21 (note 1) | `custom` avec la liste vide → refus, `counting` reste `capped` |
| R-20#at-minimum | R-20 | S p. 19 | `full`, `surface_ha=4`, `hours_available=1` (60 minutes, égal au minimum estimé) → aucun conseil `time_short` |
| R-21#no-effect | R-21 | M p. 4 | pour un même jeu de réponses de peuplement, `experience` et `hours_available` de toute valeur → `method`, `counting` et `zone_surface_ha` identiques |

### Surface décrite conseillée

Pour chaque parcours, la proposition renvoie la surface que le relevé décrit (la « zone de relevé
IBP » de la fiche, S p. 20), arrondie à 2 décimales :

| Parcours | Surface décrite conseillée (clé `zone_surface_ha`) | Source |
|---|---|---|
| `full` | la surface du peuplement S | M p. 6 |
| `partial_strip`, `partial_plot` | min(S, max(1 ha, part × S)), part 0,10 ou 0,20 selon l'homogénéité (R-13) ; pour plusieurs placettes parcourues, la somme de leurs surfaces sur la même fiche (R-15) | M p. 7 |

### Contrôles de la surface décrite

Le paquet expose ces contrôles ; l'écran n'en contient aucun. Une **erreur** empêche
l'enregistrement, un **avertissement** ne l'empêche pas.

| Code | Gravité | Condition | Cas de test |
|---|---|---|---|
| `zone_not_positive` | erreur | surface décrite absente ou inférieure ou égale à 0 | zone 0 → `zone_not_positive` |
| `zone_too_large` | erreur | surface décrite supérieure à `ROUTE_SURFACE_MAX_HA` | zone 5000.01 → `zone_too_large` |
| `zone_above_stand` | erreur | surface décrite supérieure à S (la surface totale évaluée du relevé complémentaire n'est pas concernée) | S 2, zone 2.5 → `zone_above_stand` |
| `partial_over_half` | avertissement | parcours partiel et surface décrite supérieure à 0,5 × S | S 8, zone 4.5 → `partial_over_half` ; zone 4 → aucun |
| `partial_below_minimum` | avertissement | parcours partiel et surface décrite inférieure à `PARTIAL_SAMPLE_MIN_HA` | zone 0.9 → `partial_below_minimum` ; zone 1 → aucun |
| `complement_below_zone` | erreur | relevé complémentaire fait et surface totale évaluée inférieure à la surface décrite | zone 2, totale 1.5 → `complement_below_zone` ; totale 2 → aucun |

### Codes ajoutés ou retirés par rapport à la première rédaction

**Ajoutés** (à relire avec les phrases au catalogue) : raison `large_stand` (R-11b) ; codes d'erreur
de la surface `surface_missing` et `surface_invalid` (R-01) ; préréglage `all_factors` (R-17,
nouveau nom du préréglage `study`, pour ne plus évoquer une étude) ; code d'erreur de l'API
`route_required` (section 8). Le code `linear_stand_unsupported` de la liste préliminaire n'est pas
créé (décision O-10).

**Retirés** : voir le journal des révisions en fin de document pour la liste complète des codes,
constantes, champs et questions supprimés.

## 6. Relevé plafonné ou déplafonné

**Deux modes (S p. 18, M p. 16).** En **relevé plafonné**, on arrête les observations d'un facteur
dès que son score définitif est sûr (exemple officiel : arrêt à 5 très gros bois par hectare pour
le facteur E) ; il suppose de connaître la surface du relevé pour calculer les seuils. En **relevé
déplafonné**, tous les éléments sont comptés et notés en détail, notamment le couvert des essences
autochtones (A) et des strates (B) en pourcentage. Le relevé plafonné est « la méthode la plus
rapide, utilisée dans la majorité des cas » ; le relevé déplafonné est réservé à quelques cas :
peuplement mal discriminé par l'IBP (forêt mature, scores toujours maximaux ou minimaux), besoin de
détail. Il se choisit à la main (décision O-01), jamais depuis une question.

**Le mode par défaut de chaque parcours (R-16, M p. 5 tableau 2).**

| Parcours | Mode par défaut | Remarque |
|---|---|---|
| `full` | `capped` | plafonné selon la surface du peuplement (M p. 6) |
| `partial_strip` | `capped` | relevé en continu |
| `partial_plot` | `capped` | une seule fiche continue ; plusieurs placettes se somment (R-15) |

**Les facteurs comptés en entier (R-17).** L'enregistrement porte la liste des facteurs du champ
« Facteurs déplafonnés » de la fiche (S p. 20). Cinq préréglages sont proposés ; toucher un facteur
bascule le préréglage sur `custom`.

| Préréglage | Facteurs comptés en entier | Cas visé | Source |
|---|---|---|---|
| `all_factors` | A B C D E F G I J | tout compter, pour le détail ou la recherche | M p. 24 |
| `mature` | A C D E F | peuplement à forte maturité | M p. 23 |
| `always_max` | sous-ensemble choisi de A C D E F I J (tous proposés au départ) | peuplement dont certains scores sont toujours maximaux | M p. 23 |
| `minimum` | C D E | peuplement dont certains scores sont toujours nuls (jeune plantation, garrigue) | M p. 24 |
| `custom` | au choix, au moins un facteur | tout autre besoin | S p. 21 (note 1) |

Le facteur H n'est jamais compté en entier (c'est une classe, pas un comptage). La liste complète
des facteurs concernés est `UNCAPPABLE_FACTORS` = A, B, C, D, E, F, G, I, J. Plus la liste est
longue, plus le relevé l'est : le texte officiel demande de choisir les facteurs selon le besoin
(M p. 23).

**Différences par facteur** (tableau 7 de M p. 17, chapitre 8 de M p. 23-24, fiche S p. 20-21).

| Facteur | Relevé plafonné | Relevé déplafonné | Ce que l'application change |
|---|---|---|---|
| A | genres comptés jusqu'à 5 (3 en cas 3) ; couvert des autochtones : moins ou plus de 50 % | tous les genres ; couvert en pourcentage | rien de plus : le couvert est déjà saisi en pourcentage ; les essences exotiques et les noms d'espèce restent hors champ |
| B | nombre de strates présentes (couvrant au moins 20 % de la surface échantillonnée) | couvert de chaque strate, en pourcentage de la surface échantillonnée | **nouvelle saisie** `strata_cover` (section 7) |
| C et D | au plus 3 bois morts de grosse dimension et 1 de dimension moyenne par hectare | tous les bois morts | rien de plus : les comptes sont déjà sans plafond ; textes et indices changent |
| E | au plus 5 très gros bois et 1 gros bois par hectare | tous les très gros bois et gros bois | idem |
| F | au plus 2 arbres par hectare et par groupe de dendromicrohabitats, au plus 8 au total | tous les arbres porteurs, groupe par groupe | **nouvelle saisie** `dmh_counts` (section 7) |
| G | pourcentage de milieux ouverts, avec arrêt à 5 % (score maximal) | pourcentage sans arrêt à 5 % (M p. 24) | rien de plus : le pourcentage est déjà saisi sans plafond |
| H | classe | sans objet | rien |
| I et J | au plus 2 types comptés | tous les types observés | rien de plus : le nombre de types est déjà saisi sans plafond |

**Les seuils d'arrêt de comptage** (3, 1, 5, 1, 2 et 8 fois la surface décrite de la fiche) ne
changent jamais un score : ils servent à arrêter de compter quand le score maximal est certain (S
p. 18, M p. 17). Ils ne sont pas appliqués par l'application.

## 7. Saisie en relevé déplafonné

**Principe (D-07, D-09).** En relevé déplafonné, deux facteurs reçoivent des champs de détail
nouveaux : B (couvert de chaque strate) et F (arbres par groupe de dendromicrohabitats). Aucun
autre facteur n'en reçoit : A, C, D, E, G, I, J gardent leur saisie actuelle, seuls les textes
d'aide changent. Pour un relevé isolé, les deux modes donnent **le même score pour les mêmes
données** : le relevé déplafonné ajoute de la donnée, il ne change aucun calcul.

**B : `strata_cover`.** Un objet dont les cinq clés sont les codes de strate `very_low`, `low`,
`intermediate`, `high`, `herbaceous` (ceux de la saisie actuelle de B) et dont les valeurs sont des
nombres de 0 à 100 (un pourcentage de la surface échantillonnée, arrondi à 1 décimale). Une strate
compte à partir de `STRATUM_MIN_COVER_PERCENT` (20 %) (S p. 20) ; les strates se superposent, la
somme peut dépasser 100 %. Le nombre de strates est calculé par un utilitaire pur du paquet
(`strataCountFromCover`). Cas : 19 % ne compte pas, 20 % compte.

**F : `dmh_counts` et la surface.** Un objet dont les clés sont les quinze groupes de
dendromicrohabitats `dmh_01` à `dmh_15` et dont les valeurs sont des nombres entiers d'arbres
(0 et plus). La densité d'un groupe est son nombre d'arbres divisé par la surface décrite de la
saisie du facteur F (clé `surface_ha` de F, préremplie depuis la surface décrite du parcours comme
pour C, D et E) ; elle est plafonnée à `DMH_GROUP_DENSITY_CAP_PER_HA` (2 arbres par hectare), puis
les groupes sont additionnés (M p. 9 et p. 17). Le calcul est un utilitaire pur du paquet
(`dmhDensityPerHa`). La nouvelle clé n'est **pas** `dmh_group_counts` : cette clé existe déjà,
c'est un tableau de nombres que le calculateur actuel plafonne à 2 sans jamais diviser par une
surface ; lui donner un autre sens changerait le score de relevés existants.

**Règle U-O10 (valeur proposée).** Une clé de détail n'est jamais lue par un calculateur de score.
Tant qu'un facteur est compté en entier, l'application écrit sa clé notée (`strata_count`,
`trees_per_ha`) à partir du détail, avec les utilitaires du paquet. Quand le facteur sort de la
liste des facteurs comptés en entier, les détails sont **conservés et masqués** (jamais effacés),
la clé notée garde sa dernière valeur et redevient modifiable. Une clé de détail n'est enregistrée
qu'avec sa clé notée (règle de la phase 25.1). Conséquence : les calculateurs, le jeu de cas de
parité et la matrice de validation ne changent pas.

**Autres entrées.** Pour C, D et E, les trois champs de surface préremplis depuis la surface
décrite du parcours restent modifiables jusqu'à ce que l'observateur y touche ; un seul
enregistrement de surface fait foi pour l'ensemble.

**Placettes en limite (consigne de saisie, parcours par placette).** Pour les placettes de faible
surface à rayon mesuré avec précision, les éléments situés en limite se notent ainsi (M p. 17) : un
nouveau genre est compté pour A ; les bois morts sur pied (C), les très gros bois (E) et les arbres
porteurs de dendromicrohabitats (F) comptent pour la moitié ; un bois mort au sol (D) compte si la
partie du tronc dans la placette respecte les seuils ; les milieux ouverts (G) comptent pour la
surface ou la longueur de lisière incluse ; les milieux aquatiques (I) sont comptés ; les milieux
rocheux (J) comptent au-delà de 20 m². C'est une règle de **saisie** (consigne à l'observateur),
sans effet sur le calcul.

## 8. Données enregistrées (Parcours utilisé)

Une seule structure JSON versionnée, `survey_route`, rangée à côté de `survey_note` et `weather`
(même schéma que la phase 27 : colonne nullable côté API, clé du `payload_json` local côté
téléphone, aucune migration SQLite). Elle est **hors de `factors`** : aucun calculateur ne la voit.
Le score ne dépend pas d'elle : l'enregistrement sert à la traçabilité et à la comparabilité.

| Clé | Sens | Type | Valeurs permises, bornes | Présente quand |
|---|---|---|---|---|
| `version` | version de la structure | nombre | `1` | toujours |
| `method` | le parcours | texte | `full`, `partial_strip`, `partial_plot` | toujours |
| `counting` | le mode de relevé | texte | `capped`, `uncapped` | toujours |
| `uncapped_factors` | « Facteurs déplafonnés » de la fiche | liste de lettres | sous-ensemble non vide de A B C D E F G I J, sans doublon, **triée** | seulement si `counting` vaut `uncapped` |
| `zone_surface_ha` | « zone de relevé IBP, surface (ha) » de la fiche | nombre | strictement supérieur à 0, au plus `ROUTE_SURFACE_MAX_HA`, 2 décimales ; pour plusieurs placettes, leur somme (R-15) | toujours (obligatoire) |
| `complement` | relevé complémentaire dans la zone non échantillonnée | objet | `done` (vrai ou faux) ; `total_surface_ha` (nombre, au moins `zone_surface_ha`, au plus `ROUTE_SURFACE_MAX_HA`, 2 décimales) présent seulement si `done` est vrai | parcours partiel seulement |
| `guide` | ce qui a conduit au choix | objet | voir ci-dessous | toujours (voir `chosen_by`) |

Contenu de `guide` :

| Clé | Sens | Valeurs |
|---|---|---|
| `chosen_by` | qui a choisi | `guide` (le parcours, le mode de relevé et les facteurs enregistrés sont ceux que l'assistant avait proposés) ou `observer` (l'observateur a changé la proposition ou a choisi directement par le chemin rapide) |
| `suggested` | la dernière proposition de l'assistant | objet `method` et `counting` (mêmes valeurs que ci-dessus) ; absent si l'observateur a choisi directement sans réponses complètes |
| `answers` | les réponses nécessaires de la section 4 | `surface_ha`, `homogeneity`, `difficulty`, `narrow`, `experience`, `hours_available`, `subdivided` ; chaque clé n'est présente que si la question était nécessaire et répondue ; `hours_available` entre 0 (exclu) et `ROUTE_HOURS_MAX`, 2 décimales |

**Règles.**

- **Le parcours est obligatoire (décision du 2026-10-13).**
  - Tout nouveau relevé porte un enregistrement valide dès sa création ; le client ne sait pas
    créer un relevé sans lui.
  - Le validateur du paquet (nom proposé : `validateSurveyRoute`) refuse un enregistrement absent
    pour un nouveau relevé, et contrôle les valeurs, les bornes, la forme canonique et la taille
    d'un enregistrement présent.
  - **API** : le serveur refuse de créer un relevé sans `survey_route` et de soumettre un relevé qui
    n'en porte pas (code `route_required`) quand la requête vient du nouveau client. Le mécanisme
    qui distingue le nouveau client d'un ancien (marqueur de version du client ou création
    seulement) est à fixer à la conception de l'API ; il est listé parmi les points à relire.
  - **Brouillons déjà existants sans parcours** : ils restent des brouillons valides, mais doivent
    recevoir un parcours **avant la soumission** (la soumission est refusée sinon).
  - **Relevés déjà soumis sans parcours** : ils restent tels quels et s'affichent « Parcours : non
    renseigné » (à confirmer à la relecture finale). Rien n'est inventé.
- Aucun texte libre dans l'enregistrement : rien à effacer pour la suppression de compte au-delà de
  ce que la décision D-24 prévoit déjà pour les notes.
- **Forme canonique, établie sur le téléphone** : nombres arrondis comme indiqué, liste des
  facteurs triée sans doublon. Le serveur stocke tel quel et compare sans reformater ; sinon un
  rejeu du même relevé produirait un faux conflit.
- **Brouillon seulement** : le parcours se modifie tant que le relevé est un brouillon (il ne peut
  jamais être supprimé) et devient en lecture seule à la soumission, comme `ibp_method_version`
  (décision D-09).
- **Taille** : au plus `ROUTE_RECORD_MAX_BYTES` (4096 octets) une fois sérialisé.
- **Le score est indépendant du parcours** : changer le parcours d'un brouillon ne modifie aucun
  score ; le parcours dit comment le relevé a été fait, il n'entre dans aucun calcul.
- **Place pour la phase 31** : elle lit `method` et `zone_surface_ha` pour savoir quoi dessiner
  (bandes ou placettes). Une référence au tracé sera ajoutée par la phase 31 ; rien n'est
  enregistré pour cela maintenant.

Exemple (parcours partiel par placette, une fiche continue, assistant accepté) :

```json
{
  "version": 1,
  "method": "partial_plot",
  "counting": "capped",
  "zone_surface_ha": 1.5,
  "complement": { "done": true, "total_surface_ha": 15 },
  "guide": {
    "chosen_by": "guide",
    "suggested": { "method": "partial_plot", "counting": "capped" },
    "answers": {
      "surface_ha": 15,
      "homogeneity": "homogeneous",
      "difficulty": false,
      "narrow": false
    }
  }
}
```

## 9. Affichage

Textes proposés, relus avant la clôture de la phase. Les libellés sont des légendes courtes ; les
valeurs viennent du catalogue, avec le vocabulaire de la méthode (section 1).

**Page « Contexte » du relevé** (nouvelle section « Parcours utilisé », après « Méthode et
station »).

| Ligne | Exemple de valeur | Affichée quand |
|---|---|---|
| Parcours | Parcours partiel par placette | enregistrement présent |
| Mode de relevé | Relevé plafonné ou Relevé déplafonné | enregistrement présent |
| Facteurs comptés en entier | A Genres d'arbres, B Strates, F Dendromicrohabitats | relevé déplafonné |
| Surface décrite | 1,2 ha | enregistrement présent |
| Reste du peuplement | Regardé rapidement, surface totale évaluée 8 ha, ou Non regardé | parcours partiel |
| Choix | Conseillé par l'app d'après vos réponses, ou Choisi par vous | enregistrement présent |
| Vos réponses | Peuplement de 8 ha, homogène, facile à observer (réponses fermées uniquement) | `guide.answers` présent |

Brouillon : un lien « Modifier le parcours » ouvre le sélecteur. Un brouillon ancien sans
enregistrement affiche « Parcours à choisir » avec un lien « Choisir le parcours » et ne peut pas
être soumis tant que le parcours manque. Relevé soumis ou relevé d'un autre membre : les mêmes
lignes en texte, sans lien (lecture seule, D-09 ; décision O-15 : le parcours d'un autre membre se
montre en lecture seule). Relevé **déjà soumis avant cette phase** sans enregistrement : une ligne
discrète « Parcours : non renseigné » et la phrase « Ce relevé a été fait avant l'assistant de
choix du parcours ».

**Bloc du PDF** (nouveau bloc « Parcours utilisé », juste après « Conditions du relevé », ou après
les cartes d'identité s'il n'y a pas de bloc de conditions). Lignes (légende à gauche) :
« Parcours », « Mode de relevé », « Facteurs comptés en entier » (relevé déplafonné seulement),
« Surface décrite », « Reste du peuplement » (parcours partiel seulement), « Choix ». La valeur de
« Choix » est une phrase : « Conseillé par l'application d'après vos réponses : peuplement de 8 ha,
homogène, facile à observer. » ou « Choisi directement par l'observateur. ». Tout texte variable
est échappé. Le bloc s'imprime aussi pour un brouillon.

**La ligne « Mode de relevé » des cartes d'identité du PDF** (« Relevé plafonné, aucun facteur
déplafonné ») est supprimée **uniquement quand le bloc « Parcours utilisé » s'imprime**, car il
répéterait la ligne de mode. Pour un relevé sans enregistrement (déjà soumis avant cette phase),
rien de nouveau ne s'imprime et la ligne reste exactement comme aujourd'hui (pas de régression sur
les exports passés).

**Écrans de facteurs.** Un facteur compté en entier porte une pastille « Relevé déplafonné » dans
l'en-tête du pager, une étiquette dans la liste des facteurs et une phrase d'explication au-dessus
de son premier champ ; un facteur en relevé plafonné n'affiche rien de plus. Le PDF imprime pour B
le couvert de chaque strate et pour F le nombre d'arbres par groupe quand ces détails existent.

**Résumé de la page de détail.** La ligne « Contexte » peut ajouter l'étiquette courte du parcours
après le cas (« v3.2 · cas 2 · Parcours en plein »), tronquée sur une ligne (décision U-O9).

## 10. Parcours écartés

Écarté par décision du propriétaire du 2026-10-13 : le parcours typologique, le parcours
systématique, la fiche par placette, le groupe de placettes et le calcul regroupé ne sont pas dans
l'application ; pas de phase 30.1.

Conséquences : le diagnostic rapide, l'étude (cas 3 de M p. 4) et l'inventaire prévu (cas 2) du
texte officiel mènent tous à ces parcours d'échantillonnage et ne sont donc pas couverts. Les
placettes ne sont pas retirées pour autant : elles restent dans le parcours partiel (par placette),
sur une seule fiche (règle R-15). Pour mémoire, le texte officiel traite l'échantillonnage dans
M p. 10 à 14 et le calcul regroupé dans S p. 18 et M p. 9 ; la liste des ambiguïtés de la première
rédaction (G-1 à G-11) n'est pas conservée.

## 11. Décisions du propriétaire

Chaque ligne donne la question, le **défaut conseillé** (recommandation de la recherche ou de la
maquette de l'interface), la décision validée par le propriétaire (réponse reprise de
`30-OWNER-DECISIONS.md`, avec sa date, jamais écrite par Claude) et l'effet si la décision diffère
du défaut. Les réponses sont celles données en discussion les 2026-10-13 et 2026-10-14 ; elles ne
valent pas validation de la spécification, qui se fait à la section 13. Répondre à une décision
`O-nn` répond aussi à la décision `U-O` qui lui est liée (notée dans la question). Les lignes
O-18 à O-20 sont ajoutées par la révision du 2026-10-14. Un changement structurel arrête la phase
pour une replanification.

| Id | Question | Défaut conseillé | Décision validée | Effet si différent |
|---|---|---|---|---|
| O-01 | Comptage par facteur ou un seul indicateur ? Offrir les préréglages ? (lié à U-O12) | enregistrer `counting` et `uncapped_factors` ; cinq préréglages (`all_factors`, `mature`, `always_max`, `minimum`, `custom`) et une puce par facteur ; le relevé déplafonné est un choix manuel, jamais suggéré | 2026-10-13, réponse en discussion : « Par facteur, avec préréglages » | un seul indicateur : `uncapped_factors` disparaît (enregistrement, règle R-17, sélecteur, écrans de facteurs) |
| O-02 | Où se place la limite de 10 à 20 ha, et comment l'hétérogénéité la déplace-t-elle ? | 10 ha pour un peuplement varié, 20 ha pour un peuplement homogène | 2026-10-13, réponse en discussion : « 10 ha varié / 20 ha homogène » | constantes `ROUTE_SUBDIVIDE_*` et cas de R-11 et R-11b |
| O-03 | Au-dessus de la limite, quelle option est préselectionnée ? (lié à U-O5) | « Découper en sous-peuplements » préselectionnée et étiquetée « Conseillé » ; seule autre option : le parcours partiel | 2026-10-13, réponse en discussion : « Découper en sous-peuplements » | préselection de R-11b |
| O-04 | L'expérience et le temps disponible changent-ils la proposition ? (lié à U-O4) | non : information seule (R-19 à R-21), jamais une règle | 2026-10-13, réponse en discussion : « Oui, ils déplacent la proposition » (temps et expérience, débutant x 2) ; puis 2026-10-14, réponse en discussion : « Retire ces critères de temps s'ils ne sont pas dans la méthode, ça devient une information ». Retenue : information seule, aucun coefficient | R-20 et R-21 deviendraient des règles de parcours (écarté) |
| O-05 | Limite du parcours en plein | 5 ha (M p. 4 et p. 6) plutôt que « dizaine d'ha » (M p. 5) | 2026-10-13, réponse en discussion : « Oui, 5 ha et avertissement sous 0,5 ha » | constante `ROUTE_FULL_MAX_HA` et cas limites |
| O-06 | Que dit l'application sur les groupes de placettes tant que le calcul regroupé n'existe pas ? (lié à U-O6) | sans objet après la révision | Sans objet : parcours typologique et systématique retirés | sans objet |
| O-07 | Relevés sans parcours enregistré (lié à U-O7) | brouillon sans parcours : à compléter avant la soumission ; relevé déjà soumis : « Parcours : non renseigné » ; PDF des relevés déjà soumis inchangé | 2026-10-13, réponse en discussion : le propriétaire a demandé que le choix du parcours soit obligatoire (« mais le choix du parcours devrait être obligatoire ? sinon je vois pas comment l'IBP peut se calculer »), puis choisi « Obligatoire dès la création ». Les relevés déjà soumis restent « Parcours : non renseigné » : à confirmer à la relecture finale | si les relevés déjà soumis devaient recevoir un parcours : un écran de rattrapage (hors phase 30) |
| O-08 | Nom de groupe : texte libre accepté ? Modifiable après soumission ? | sans objet après la révision | Sans objet : parcours typologique et systématique retirés | sans objet |
| O-09 | L'assistant s'applique-t-il aux relevés v3.0 ? | oui, pour la v3.0 et la v3.2 (les règles de parcours ne dépendent pas de la version) | 2026-10-13, réponse en discussion : « Oui, v3.0 et v3.2 » | condition d'entrée de l'assistant |
| O-10 | Peuplements linéaires de moins de 15 m de large | hors champ : aucune question, aucun code ; une phrase fixe d'aide sous la question de surface | 2026-10-13, réponse en discussion : d'abord « Les prendre en charge », puis, après l'explication des conséquences : « Hors champ, finalement » | seuils par kilomètre à ajouter au paquet (hors phase 30), question de largeur |
| O-11 | Peuplement de moins de 0,5 ha | avertir (`small_stand`), ne jamais bloquer | 2026-10-13, réponse en discussion : « Oui, 5 ha et avertissement sous 0,5 ha » | règle R-02 |
| O-12 | Vocabulaire (lié à U-O1) | les mots de la méthode officielle : « parcours en plein », « parcours partiel » (par bande ou par placette), « relevé plafonné », « relevé déplafonné », « peuplement », chacun avec une phrase d'explication | 2026-10-13, réponse en discussion : « Parcours / Comptage rapide ou complet » ; puis 2026-10-14, réponse en discussion : « reprends le vocabulaire de la méthode ». Retenu : les mots de la méthode, aucun libellé « Comptage rapide » ou « Comptage complet » | tout le catalogue et le test avec des utilisateurs |
| O-13 | Test enregistré avec des utilisateurs | trois à cinq testeurs qui ne connaissent pas la méthode, dont le testeur du propriétaire ; chacun réussit seul le scénario (a) ; au moins deux sur trois réussissent (b) ou (c) | 2026-10-13, réponse en discussion : « 3 à 5 testeurs » | protocole et clôture |
| O-14 | Où va le calcul regroupé des placettes, et que deviennent les parcours typologique et systématique ? | retirés de l'application, pas de phase 30.1 | 2026-10-13, réponse en discussion : « retire les parcours typologiques et systémiques de l'application. Ils ne sont pas utilisés pour nos usages. » ; confirmé le 2026-10-14 (« Retirés ; placettes dans le partiel ») | sans objet : décision prise |
| O-15 | Relevé d'un autre membre : montrer le parcours en lecture seule ? (lié à U-O15) | oui (peu coûteux, aide à juger la comparabilité d'un score) | 2026-10-13, réponse en discussion : « Oui » | lecture communautaire de l'API, page communautaire |
| O-16 | Enregistrer `systematic` comme parcours | sans objet après la révision | Sans objet : parcours typologique et systématique retirés | sans objet |
| O-17 | Surface décrite d'un échantillonnage : surface de cette fiche ou surface totale ? | sans objet après la révision | Sans objet : parcours typologique et systématique retirés | sans objet |
| O-18 | Question d'objectif (« étude ou inventaire ») | supprimée : le parcours se choisit d'après le peuplement seul, pour le diagnostic exhaustif d'un peuplement | 2026-10-13, réponse en discussion : le propriétaire n'a pas compris la question ; après l'explication (étude = cas 3, échantillonnage sur un massif ; inventaire = cas 2, grille d'inventaire prévue) il a choisi de garder ces parcours retirés (voir O-14). Le relevé déplafonné reste un choix manuel | question `purpose` de la première rédaction à rétablir (écarté) |
| O-19 | Parcours obligatoire ? | oui, dès la création du relevé, avec le chemin rapide « Je connais déjà mon parcours » | 2026-10-13, réponse en discussion : « Obligatoire dès la création » (voir O-07) | sections 4, 8 et 9 |
| O-20 | Les placettes restent-elles ? | oui, dans le parcours partiel (par bande ou par placette), sur une seule fiche, avec la somme des placettes comme zone | 2026-10-14, réponse en discussion : « Retirés ; placettes dans le partiel » (précision enregistrée dans `30-OWNER-DECISIONS.md`, section « Placettes ») | règle R-15 |
| U-O1 | Vocabulaire du mode de relevé (O-12) | « relevé plafonné » et « relevé déplafonné », les mots de la méthode, avec leur phrase d'explication | 2026-10-14, réponse en discussion : « reprends le vocabulaire de la méthode » | catalogue |
| U-O2 | L'assistant est-il une étape de la création ? | oui, obligatoire, sans possibilité de le sauter ; chemin rapide « Je connais déjà mon parcours » | 2026-10-13, réponse en discussion : « Obligatoire dès la création » | changement structurel : navigation et création |
| U-O3 | La réponse par défaut de la question d'objectif est-elle préselectionnée ? | sans objet après la révision | Sans objet : parcours typologique et systématique retirés (question d'objectif supprimée, voir O-18) | sans objet |
| U-O4 | Expérience et temps : conseils seulement (O-04) | information seule, section repliée | voir O-04 : 2026-10-14, « Retire ces critères de temps s'ils ne sont pas dans la méthode, ça devient une information » | idem O-04 |
| U-O5 | Au-dessus de la limite de découpage : option préselectionnée et rôle de « Découper en sous-peuplements » (O-03) | préselectionnée et étiquetée « Conseillé » ; ce n'est pas un parcours : elle rouvre la question de surface pour un morceau | voir O-03 : 2026-10-13, « Découper en sous-peuplements » | idem O-03 |
| U-O6 | Ce que dit l'application sur les groupes | sans objet après la révision | Sans objet : parcours typologique et systématique retirés | sans objet |
| U-O7 | Relevés sans parcours (O-07) | voir O-07 | voir O-07 : « Obligatoire dès la création » (2026-10-13) ; relevés déjà soumis « Parcours : non renseigné », à confirmer | idem O-07 |
| U-O8 | Nom de groupe | sans objet après la révision | Sans objet : parcours typologique et systématique retirés | sans objet |
| U-O9 | La ligne « Contexte » du résumé du relevé porte-t-elle l'étiquette courte du parcours ? | oui, tronquée sur une ligne (retrait peu coûteux) | 2026-10-13, réponse en discussion : « Oui, garder ces quatre défauts » (U-O9, U-O10, U-O11, U-O14) | résumé du relevé |
| U-O10 | Détails de B et de F quand un facteur sort de la liste des facteurs comptés en entier : conservés et masqués, jamais lus par un calculateur ; la clé notée garde sa dernière valeur (section 7) | règle de la section 7 | 2026-10-13, réponse en discussion : « Oui, garder ces quatre défauts » | si les détails comptent tant qu'ils sont présents : calculateurs et cas de parité `MAT-B-*` et `MAT-F-*` changés ; changement structurel |
| U-O11 | Surface maximale acceptée et phrase d'erreur | 5000 ha ; « Cette surface semble trop grande. Vérifiez-la. » | 2026-10-13, réponse en discussion : « Oui, garder ces quatre défauts » | constante `ROUTE_SURFACE_MAX_HA` |
| U-O12 | Offrir les cinq préréglages et les puces par facteur (O-01) | oui | voir O-01 : « Par facteur, avec préréglages » (2026-10-13) | idem O-01 |
| U-O13 | Relecture de chaque phrase française (questions, légendes, raisons, avertissements, conseils, glossaire, phrases des facteurs) | relecture avant la clôture ; la structure et le ton sont fixés | Non posée au propriétaire : défaut conservé (à confirmer à la relecture finale) | calendrier de la relecture |
| U-O14 | Les réponses partielles d'un assistant abandonné ne sont pas conservées | non conservées : l'enregistrement se fait une seule fois, à l'acceptation | 2026-10-13, réponse en discussion : « Oui, garder ces quatre défauts » | questionnaire et écran |
| U-O15 | Parcours en lecture seule sur le relevé d'un autre membre (O-15) | oui ; réutiliser les lignes de Contexte dans la page communautaire | voir O-15 : « Oui » (2026-10-13) | idem O-15 |

## 12. Exigences proposées

Identifiants proposés, au format `REQ-{épopée}-{nom}` de `.planning/REQUIREMENTS.md`. Ils sont
ajoutés à `.planning/REQUIREMENTS.md` par l'orchestrateur à la fin de la planification, pas par
cette spécification.

- **REQ-DOC-route-rules** : les règles de parcours et de relevé de la méthode officielle sont
  écrites en français dans `docs/specs/route-choice-rules-v1.md`, avec un cas de test par règle et
  la page citée, et validées par écrit par le propriétaire, avec la date, avant tout écran
  (critère 1, D-10).
- **REQ-C-route-guide** : une étape guidée **obligatoire** à la création du relevé, utilisable hors
  connexion, après le choix des parcelles, pose les questions, propose le parcours en plein ou le
  parcours partiel, les explique en français courant, permet de les changer ou de choisir
  directement par le chemin rapide « Je connais déjà mon parcours » (critère 2, D-05).
- **REQ-C-route-record** : le parcours utilisé (parcours, mode de relevé et facteurs comptés en
  entier, surface décrite, relevé complémentaire, réponses) est enregistré avec le relevé,
  obligatoire pour tout nouveau relevé, synchronisé et en lecture seule après soumission ; l'API
  refuse la création et la soumission sans lui depuis le nouveau client (critère 3, D-08, D-09).
- **REQ-C-route-display** : le parcours utilisé s'affiche en texte dans le détail du relevé et dans
  le PDF, à la place de la ligne fixe « Relevé plafonné, aucun facteur déplafonné » (critère 3,
  D-09).
- **REQ-C-uncapped-entry** : en relevé déplafonné, le formulaire ajoute le couvert de chaque strate
  (B) et les nombres par groupe de dendromicrohabitats (F) ; la saisie et les scores du relevé
  plafonné ne changent pas (D-07, D-09).
- **REQ-FT-route-test** : un testeur qui ne connaît pas la méthode choisit son parcours sans aide,
  dans un test enregistré dont le compte rendu est dans `docs/user-tests/` (critère 4, D-10).

## 13. Validation

Validé par le propriétaire le :

Réponse du propriétaire :

Ces deux lignes sont remplies après la relecture de cette version révisée, avec la date et la
réponse écrite du propriétaire. **Aucun plan de code n'encode une règle et aucun plan ne construit
un écran tant qu'elles ne sont pas remplies.**

## Journal des révisions

### 2026-10-14 : révision selon les décisions du propriétaire

Source : `.planning/phases/30-route-choice-assistant-inserted-v1/30-OWNER-DECISIONS.md`. Les
identifiants de règle survivants sont **conservés** (pas de renumérotation) ; les trous sont
volontaires.

**Pourquoi.** Le propriétaire a retiré les parcours typologique et systématique (« Ils ne sont pas
utilisés pour nos usages »), a confirmé que les placettes restent dans le parcours partiel, a fait
du temps et de l'expérience de l'information seule, a demandé le vocabulaire de la méthode et a
rendu le choix du parcours obligatoire dès la création.

**Règles.**

- Retirées : R-04 (objectif de planification), R-05 (objectif d'étude ou de diagnostic rapide), R-06
  (passage de l'objectif au diagnostic d'un peuplement), et toute l'ancienne étape 1 (l'objectif).
- Modifiées : R-11b (deux options au lieu de trois), R-15 (une seule fiche, somme des placettes, ni
  fiche par placette ni nom de groupe), R-16 (tous les parcours en `capped` par défaut), R-17 (le
  relevé déplafonné est un choix manuel ; le préréglage `study` devient `all_factors`), R-18 et
  R-19 (sans `systematic` ni échantillonnage), R-20 et R-21 (réaffirmées comme information seule).
- Conservées telles quelles : R-01, R-02, R-03, R-07 à R-10 (sans l'objectif), R-11, R-12a, R-12b,
  R-13, R-14.
- Cas limites retirés : R-05#below-40ha, R-05#at-40ha, R-05#study. Ajoutés : R-11b#choose-partial,
  R-15#sum-of-plots, R-17#custom-empty, R-21#no-effect.

**Question retirée** : `purpose` (objectif) et toutes ses conséquences ; la condition de la question
`homogeneity` ne dépend plus d'elle.

**Codes retirés** : raisons `typological_study`, `typological_large`, `typological_rapid`,
`systematic_planned`, `uncapped_study`, `uncapped_group` ; conseil `group_pending` ; valeurs de
`purpose` (`whole_stand`, `rapid_diagnosis`, `study`, `systematic_planned`) ; valeurs de `method`
`typological` et `systematic` ; option `typological` de R-11b.

**Constantes retirées** : `ROUTE_TYPOLOGICAL_LARGE_TYPE_HA`, `TYPOLOGICAL_PLOT_HA`,
`TYPOLOGICAL_PLOT_MIN_HA`, `TYPOLOGICAL_LARGE_PLOTS_MIN`, `TYPOLOGICAL_LARGE_PLOTS_MAX`,
`SYSTEMATIC_PLOT_HA`, `SYSTEMATIC_PLOT_LARGE_HA`, `SYSTEMATIC_GROUP_MIN_HA`, `GROUP_NAME_MAX_LENGTH`.

**Champs retirés** : `group_name` (enregistrement et réponses), `sample_total_ha` (aide de résultat),
la réponse `purpose` de `guide.answers`.

**Sections.** La section 10 (Groupe de placettes, dont les ambiguïtés G-1 à G-11 et la
taille du lot 30.1) devient une note courte. Les écarts 5 et 6 de la section 2 sont retirés. Le
tableau de la section 11 est rempli avec les réponses du propriétaire ; les lignes O-18 à O-20 sont
ajoutées ; les lignes O-06, O-08, O-16, O-17, U-O3, U-O6 et U-O8 sont sans objet. REQ-C-route-group
est retiré de la section 12.

**Vocabulaire.** « Comptage rapide » et « Comptage complet » disparaissent au profit de « relevé
plafonné » et « relevé déplafonné » ; « Comptage » devient « Mode de relevé » dans l'affichage ;
« parcours en plein » et « parcours partiel (par bande ou par placette) » sont les seuls parcours.
Le glossaire perd les termes de groupe et d'échantillonnage.

**Temps et expérience.** R-19 à R-21 restent des conseils qui ne changent jamais le parcours ; aucun
coefficient de débutant ; la section « Pour affiner » reste repliée et facultative ; la spécification
note que le texte officiel donne les durées comme des indications.

**Parcours obligatoire.** Sections 1, 4, 8, 9 et 12 : étape non sautable, chemin rapide « Je connais
déjà mon parcours », enregistrement obligatoire pour tout nouveau relevé, refus par l'API
(`route_required`) de la création et de la soumission sans parcours depuis le nouveau client,
brouillons existants complétés avant la soumission, relevés déjà soumis « Parcours : non renseigné ».
Le score ne dépend pas du parcours.

**Ce qui ne change pas.** Section 7 (détails de B et F), constantes de partiel, règles de surface
décrite, forme canonique de l'enregistrement. La section 13 reste vide : le propriétaire relit cette
version et la valide par écrit plus tard.
