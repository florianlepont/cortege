# Règles de choix du parcours et du comptage (v1)

Statut : brouillon, à valider par le propriétaire

Date de rédaction : 2026-10-13

Validation du propriétaire : à remplir par le plan 30-02

Phase : 30, assistant de choix du parcours (V1). Cette spécification est la source de vérité de la
phase : aucun plan n'encode une règle ni ne construit un écran avant que le propriétaire l'ait
validée par écrit, avec la date (décision D-10, critère 1 de la feuille de route).

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
écrite ici : elles vivent dans le catalogue français de l'application et sont relues au plan
30-13.

## 1. Objet, champ et vocabulaire

**Ce que fait l'assistant.** Après le choix des parcelles, il propose à l'observateur un
**parcours** (la façon de parcourir le peuplement) et un **comptage** (rapide ou complet), explique
chaque proposition en français courant, permet de la changer ou de choisir directement, puis
enregistre le « Parcours utilisé » avec le relevé. L'étape est facultative, utilisable hors
connexion, et ne bloque jamais la création du relevé.

**Ce qu'il ne fait jamais.**

- Il ne change ni la version de la méthode IBP (v3.0 ou v3.2) ni le cas (1 à 4) : ils restent
  choisis à la création du relevé (décision D-01). Le parcours et le comptage sont indépendants de
  la version et du cas.
- Il ne trace aucun itinéraire et n'affiche aucune carte de parcours : cela relève de la phase 31.
  Le tracé par boussole et GPS est reporté en V2.
- Il ne modifie aucun score plafonné : le comptage complet ajoute des données de détail, il ne
  change pas le calcul d'un relevé isolé (décision D-09).

**Règle de séparation (D-01).** Le *parcours* correspond à la case « Méthode » de la fiche de
relevé officielle (S p. 20). Le *comptage* correspond au champ « Facteurs déplafonnés » de la même
fiche. La *version* et le *cas* sont d'autres champs de la fiche et ne sont pas touchés.

**Vocabulaire imposé (décision O-12, U-O1).**

| Mot dans l'application | Sens | Ne pas confondre avec |
|---|---|---|
| Parcours | la façon de parcourir (case « Méthode » de la fiche officielle) | « Méthode IBP », qui reste la version (v3.2 ou v3.0) |
| Comptage rapide (relevé plafonné) | on arrête de compter un élément dès que son score est sûr | le « score plafonné à 2 » du facteur A, qui est autre chose |
| Comptage complet (relevé déplafonné) | on compte tout, élément par élément | idem |

Le mot « plafonné » seul n'est jamais utilisé pour le comptage dans l'application, et n'est jamais
repris dans une ligne de score : le facteur A dit déjà « score plafonné à 2 si le couvert des
autochtones est inférieur à 50 % » (S p. 20), ce qui n'a aucun rapport. Le test avec un
utilisateur (plan 30-15) vérifie cette confusion. Le mot « méthode » n'est jamais employé pour le
parcours dans un texte destiné à l'observateur.

## 2. Sources et écarts entre les documents

Les écarts suivants existent entre S et M. Ils sont notés ici et non masqués ; la lecture retenue
est donnée avec sa raison.

| # | Écart | Lecture retenue par la spécification | Raison |
|---|---|---|---|
| 1 | Temps d'apprentissage d'un débutant : « une demi-journée » (S p. 19 et le résumé de M p. 2) ou « une journée » (M p. 17 et p. 19) | l'application n'écrit aucune durée d'apprentissage ; elle dit seulement de prévoir du temps (conseil `beginner`) | les textes ne s'accordent pas, même à l'intérieur de M, et aucun seuil n'est nécessaire au calcul |
| 2 | Limite du parcours en plein : « < 5 ha » (S p. 18, M p. 6, M p. 4) contre « petite : < dizaine d'ha » (M tableau 2, p. 5) | 5 ha (`ROUTE_FULL_MAX_HA`, décision O-05) | cité trois fois, et le tableau 1 (M p. 4) utilise 1 ha et 5 ha |
| 3 | Demi-largeur de bande : 10 à 20 m de chaque côté (S p. 18), 10 à 25 m selon la visibilité (M p. 15), 10 à 15 m sur la fiche 2021 (comparaison v3.0 et v3.2, ligne GS-3) | conseil de terrain tiré de M p. 15 : 10 à 15 m (faible visibilité ou terrain très accidenté), 15 à 20 m (visibilité moyenne), 20 à 25 m (bonne visibilité) | M est plus détaillé ; ce n'est pas une entrée de règle, seulement un conseil |
| 4 | Les tableaux 4, 5 et 7 de M sont étiquetés « IBP v3.0 » ; les seuils des facteurs C, D, E diffèrent entre v3.0 et v3.2, et le facteur H n'a plus de score 1 | la spécification reprend de M la **structure** de calcul (quelles données, quelle somme, quelle division) ; les seuils de score viennent toujours du paquet, par version | le paquet sait déjà noter chaque version (`rules/v3-0.ts`, `rules/v3-2.ts`) |
| 5 | La case « Méthode » de la fiche S p. 20 ne propose que « parcours en plein », « échantillonnage typologique » et « parcours partiel par bande ou placette » ; l'échantillonnage systématique a sa propre fiche (M p. 13 : « elle est différente ... car les relevés sont déplafonnés ») | le parcours `systematic` est enregistré comme un quatrième parcours (décision O-16) | M le décrit comme une méthode à part entière (M p. 3, p. 13) |
| 6 | La définition des « valeurs adjacentes » de la boîte à moustaches : donnée en annexe (M p. 27 : plus petite valeur supérieure ou égale à Q1 moins 1,5 fois l'écart interquartile, et symétriquement) ; la méthode de calcul des quartiles n'est pas donnée | seule la méthode des quartiles reste à décider (ambiguïté G-9, section 10) | utile pour la phase 30.1 uniquement |

Autres faits repris tels quels : l'IBP se relève par peuplement ou par type de peuplement
homogène, jamais sur toute une forêt (M p. 4 et p. 21, S p. 18 note 1) ; la moyenne des scores de
plusieurs peuplements n'est pas représentative (M p. 21).

## 3. Glossaire

Définitions en français courant, une ligne par terme. Elles servent de source au catalogue de
l'application (le plan 30-13 relit le texte exact). Règle : l'application écrit
« dendromicrohabitat » et « surface totale du groupe » en toutes lettres, jamais « dmh » ni « Sg »,
et ne dit jamais « CNPF » (le texte dit « la méthode officielle de l'IBP »).

| Terme | Définition en français courant |
|---|---|
| peuplement | un morceau de forêt homogène : mêmes arbres, même âge, même aspect (S p. 18 note 1) |
| parcours en plein | on marche dans tout le peuplement, par bandes régulières, et on note tout ce que l'on voit (S p. 18, M p. 6) |
| parcours partiel | on ne décrit qu'une partie du peuplement, bien choisie (au moins 1 ha et 10 à 20 % du peuplement), et on jette un coup d'œil rapide au reste (M p. 7) |
| bande | une large allée que l'on suit à pied, de 20 à 50 m de large (M p. 7) |
| placette | une surface de forme simple et de taille connue, par exemple un cercle d'un hectare (rayon de 56,4 m), où l'on relève tout (M p. 7, p. 15) |
| échantillonnage typologique | plusieurs placettes d'un hectare, choisies à l'œil pour représenter un type de peuplement : diagnostic rapide, sans les bordures (M p. 10) |
| échantillonnage systématique | de petites placettes (0,20 ha, parfois 0,33 ha) placées à intervalles réguliers, comme dans un inventaire ; les données sont regroupées ensuite (M p. 13) |
| comptage rapide | on arrête de compter un élément dès que son score est sûr ; c'est le plus rapide (relevé plafonné, S p. 18, M p. 16) |
| comptage complet | on compte tout, sans s'arrêter ; c'est plus long, mais nécessaire pour regrouper des placettes ou pour une étude (relevé déplafonné, S p. 18, M p. 16) |
| groupe de relevés | plusieurs placettes d'un même peuplement ou type de peuplement, dont les données sont calculées ensemble (S p. 18) |
| surface décrite (zone de relevé) | la surface que l'observateur décrit réellement, appelée « zone de relevé IBP » sur la fiche (S p. 20) |
| reste du peuplement (relevé complémentaire) | la partie non parcourue : on note seulement ce que l'on voit sans effort, comme une mare, un rocher ou une lisière (M p. 8) |
| dendromicrohabitat | un petit abri sur un arbre vivant ou mort : loge de pic, cavité, écorce décollée, champignon, nid (facteur F) |
| surface totale du groupe | la somme des surfaces des placettes d'un groupe (notée Sg dans le texte officiel, M p. 9) |

## 4. Questions posées à l'observateur

Chaque question a un identifiant, une réponse fermée (aucun texte libre) et une condition
d'affichage. **Règle (D-05) : une question n'est posée que si sa réponse peut changer le résultat**
(le parcours, le comptage ou la surface décrite conseillée). La durée estimée et les conseils ne
comptent pas comme un résultat : ils ne justifient pas une question. Les conditions d'affichage
sont calculées par le paquet (fonction pure), jamais par l'écran.

| Id | Question (sens) | Réponses permises (codes) | Défaut | Posée quand |
|---|---|---|---|---|
| `purpose` | Pourquoi faites-vous ce relevé ? | `whole_stand` (décrire un peuplement en entier), `rapid_diagnosis` (diagnostic rapide, sans les bordures), `study` (étude ou inventaire), `systematic_planned` (un inventaire à points réguliers est déjà prévu) | `whole_stand` | toujours |
| `surface` | Quelle est la surface du peuplement ? (clé enregistrée `surface_ha`) | un nombre d'hectares, supérieur à 0 et au plus `ROUTE_SURFACE_MAX_HA`, virgule décimale acceptée | estimée d'après les parcelles choisies, vide si le calcul est impossible | toujours |
| `homogeneity` | Le peuplement est-il homogène ? | `homogeneous` (plantation, taillis de châtaignier, jeune peuplement), `heterogeneous` (futaie irrégulière mélangée, plusieurs essences et âges) | aucun | objectif `whole_stand` avec une surface valide au-dessus de `ROUTE_SMALL_STAND_HA` (1 ha) ; ou objectif `rapid_diagnosis` ou `study` avec une surface au-dessus de 1 ha et en dessous de `ROUTE_TYPOLOGICAL_LARGE_TYPE_HA` (40 ha), parce que la part échantillonnée (10 ou 20 %) en dépend ; jamais pour `systematic_planned` |
| `difficulty` | Est-il difficile à observer ? (visibilité de moins de 10 à 15 m, peuplement difficilement pénétrable, relief accidenté) | `true`, `false` | aucun | objectif `whole_stand` et surface entre 1 et 5 ha ; ou parcours partiel atteint avec un peuplement `homogeneous` |
| `narrow` | Le peuplement fait-il moins de 100 m de large ? | `true`, `false` | aucun | parcours partiel atteint avec un peuplement `homogeneous` et `difficulty` à `false` (dans les autres cas la bande s'impose déjà, la réponse ne changerait rien) |
| `refine` | Pour affiner (facultatif) : expérience de l'IBP et temps disponible | `experience` : `regular` ou `beginner` ; `hours_available` : nombre d'heures, supérieur à 0 et au plus `ROUTE_HOURS_MAX` | aucun | toujours proposée, repliée, jamais obligatoire ; elle ne change jamais le parcours (décision O-04) |

**Clés des réponses enregistrées** (section 8) : `purpose`, `surface_ha`, `homogeneity`,
`difficulty`, `narrow`, `experience`, `hours_available`, et `subdivided` (voir la règle R-11b :
vrai quand l'observateur a découpé un grand peuplement et que `surface_ha` est la surface d'un
morceau).

**Divulgation progressive.** Une seule question est ouverte à la fois ; une question déjà
répondue se replie en une ligne et peut être rouverte. Changer une réponse recalcule les questions
nécessaires et la proposition. Une réponse devenue inutile est gardée en mémoire pendant la
session (pour ne rien perdre si l'observateur revient en arrière) mais n'est pas enregistrée tant
qu'elle n'est pas de nouveau nécessaire (décision U-O14 : les réponses d'un assistant abandonné ne
sont pas conservées ; l'enregistrement se fait une seule fois, à l'acceptation).

**Deux choix qui ne sont pas des questions.**

- Le choix « une fiche par placette » de la règle R-15 : il se fait dans le sélecteur de parcours
  (écran « Choisir le parcours »), en choisissant « Comptage complet » et un nom de groupe. L'assistant
  ne pose pas cette question.
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
| `ROUTE_SUBDIVIDE_HETEROGENEOUS_HA` | 10 ha | M p. 4 (« 10-20 ha selon l'hétérogénéité ») | au-dessus : trois options, pour un peuplement `heterogeneous` (décision O-02) |
| `ROUTE_SUBDIVIDE_HOMOGENEOUS_HA` | 20 ha | M p. 4 | idem pour un peuplement `homogeneous` (décision O-02) |
| `ROUTE_TYPOLOGICAL_LARGE_TYPE_HA` | 40 ha | M p. 11 | à partir de cette surface, 5 à 8 placettes de 1 ha au lieu d'une part en pourcentage |
| `TYPOLOGICAL_PLOT_HA` | 1 ha | M p. 10 | placette typologique conseillée |
| `TYPOLOGICAL_PLOT_MIN_HA` | 0,5 ha | M p. 10 | en dessous, le score ne se calcule pas sur la placette seule |
| `TYPOLOGICAL_LARGE_PLOTS_MIN` et `TYPOLOGICAL_LARGE_PLOTS_MAX` | 5 et 8 placettes de 1 ha | M p. 11 | type de peuplement de 40 ha et plus |
| `SYSTEMATIC_PLOT_HA` et `SYSTEMATIC_PLOT_LARGE_HA` | 0,20 ha et 0,33 ha | M p. 13 | placette systématique (0,33 ha si le taux d'échantillonnage serait inférieur à 10 %) |
| `SYSTEMATIC_GROUP_MIN_HA` | 1 ha | M p. 14 | surface minimale d'un groupe pour un score pertinent (avertissement, jamais un blocage) |
| `PARTIAL_SAMPLE_MIN_HA` | 1 ha | M p. 7 | surface minimale échantillonnée d'un parcours partiel |
| `PARTIAL_SAMPLE_SHARE_HOMOGENEOUS` et `PARTIAL_SAMPLE_SHARE_HETEROGENEOUS` | 0,10 et 0,20 | M p. 7 | part échantillonnée : 10 % (plantation pure) à 20 % (futaie irrégulière mélangée) |
| `PARTIAL_OVER_HALF_SHARE` | 0,5 | M p. 7 | au-delà, avertissement `partial_over_half` |
| `ROUTE_NARROW_WIDTH_M` | 100 m | M p. 8 (tableau 3) | un peuplement plus étroit se décrit mieux en bandes |
| `ROUTE_MINUTES_PER_HA_EASY` et `ROUTE_MINUTES_PER_HA_HARD` | 15 à 20 et 25 à 30 minutes par hectare et par personne | S p. 19 ; M p. 17 | durée estimée d'un opérateur habitué à l'IBP |
| `ROUTE_SURFACE_MAX_HA` | 5000 ha | valeur par défaut de la décision U-O11 | borne de saisie d'une surface (erreur `surface_invalid`, `zone_too_large`) |
| `ROUTE_HOURS_MAX` | 24 h | choix de l'application | borne du temps disponible |
| `STRATUM_MIN_COVER_PERCENT` | 20 % | S p. 20 | une strate compte à partir de ce couvert (section 7) |
| `DMH_GROUP_DENSITY_CAP_PER_HA` | 2 arbres par hectare | M p. 9, p. 17 | plafond par groupe de dendromicrohabitats (section 7) |
| `GROUP_NAME_MAX_LENGTH` | 60 caractères | choix de l'application | longueur du nom de groupe (section 8) |
| `ROUTE_RECORD_MAX_BYTES` | 4096 octets | choix de l'application | taille maximale de l'enregistrement (section 8) |

### Table des règles

Lecture : « S » est la surface du peuplement (réponse `surface_ha`), « T » le seuil de découpage
(10 ha pour un peuplement `heterogeneous`, 20 ha pour un peuplement `homogeneous`, décision O-02).
Chaque règle a un identifiant, une source (document et page), une nature (T, J ou H, voir
l'en-tête) et **un cas de test** écrit « réponses → résultat attendu ». Le paquet porte les mêmes
identifiants dans son jeu de cas (`ROUTE_RULE_CASES`) : une règle de la table sans cas, ou un cas
sans règle, est une erreur détectée par un test.

Ordre des raisons renvoyées (au plus quatre) : la raison tirée des réponses d'abord, puis, pour un
parcours partiel, la raison du type (bande ou placette) et la raison du relevé complémentaire,
et la raison du comptage en dernier.

**Étape 0 : préconditions et avertissements (aucun changement de parcours)**

| Id | Condition | Résultat | Source | Nature | Cas de test |
|---|---|---|---|---|---|
| R-01 | S absente, nulle, négative, ou supérieure à `ROUTE_SURFACE_MAX_HA` | aucun parcours ni comptage ; la question `surface` reste ouverte ; code d'erreur `surface_missing` (absente) ou `surface_invalid` (hors plage) | S p. 18 ; M p. 2 | T | `purpose=whole_stand`, `surface_ha` absente → aucune proposition, `surface_missing` |
| R-02 | 0 < S < `ROUTE_TINY_STAND_HA` (0,5 ha) | la proposition est inchangée ; avertissement `small_stand` en plus | M p. 4 | T | `purpose=whole_stand`, `surface_ha=0.4` → `full`, `capped`, zone 0.4, raisons `whole_stand_small` puis `capped_default`, avertissement `small_stand` |
| R-03 | peuplement linéaire (largeur inférieure à 15 m : haie, ripisylve) | hors champ de l'application (décision O-10) : aucune question, aucun code ; les seuils restent par hectare ; une phrase fixe sous la question de surface l'explique | S p. 6 | T (règle officielle, non prise en charge) | `purpose=whole_stand`, `surface_ha=0.8` pour une haie → même résultat que R-07 ; le code `linear_stand_unsupported` n'existe pas |

**Étape 1 : l'objectif choisit la famille de parcours**

| Id | Condition | Résultat | Source | Nature | Cas de test |
|---|---|---|---|---|---|
| R-04 | `purpose=systematic_planned` | parcours `systematic`, comptage `uncapped` avec les neuf éléments de `UNCAPPABLE_FACTORS` (A B C D E F G I J) ; raisons `systematic_planned` puis `uncapped_group` ; conseils `uncapped_longer` et `group_pending` ; zone conseillée `SYSTEMATIC_PLOT_HA` | M p. 4 (cas 2), p. 5, p. 13 | T | `purpose=systematic_planned`, `surface_ha=120` → `systematic`, `uncapped` [A,B,C,D,E,F,G,I,J], zone 0.2, raisons [`systematic_planned`, `uncapped_group`], conseils [`uncapped_longer`, `group_pending`] |
| R-05 | `purpose=rapid_diagnosis` ou `purpose=study` | parcours `typological` ; avec `rapid_diagnosis` : comptage `capped`, raisons `typological_rapid` puis `capped_default` ; avec `study` : comptage `uncapped` (préréglage `study`, voir R-17), raisons `typological_study` puis `uncapped_study`, conseil `uncapped_longer` ; zone par fiche `TYPOLOGICAL_PLOT_HA` sans dépasser S ; surface totale à échantillonner `sample_total_ha` (voir « Surface décrite conseillée ») ; conseil `group_pending` | M p. 4 (cas 1 et 3), p. 5, p. 10 | T | `purpose=rapid_diagnosis`, `surface_ha=30`, `homogeneity=homogeneous` → `typological`, `capped`, zone 1, `sample_total_ha` 3, raisons [`typological_rapid`, `capped_default`], conseil [`group_pending`] |
| R-06 | `purpose=whole_stand` | passe à l'étape 2 (R-07 à R-11b) | M p. 4 | T | `purpose=whole_stand`, `surface_ha=3`, `homogeneity=heterogeneous`, `difficulty=false` → le résultat est celui de R-10 (`full`) |

**Étape 2 : diagnostic exhaustif d'un peuplement, par surface, homogénéité et difficulté**

| Id | Condition | Résultat | Source | Nature | Cas de test |
|---|---|---|---|---|---|
| R-07 | S ≤ `ROUTE_SMALL_STAND_HA` (1 ha) | `full`, `capped`, zone = S ; raisons `whole_stand_small` puis `capped_default` ; ni `homogeneity` ni `difficulty` n'est posée | M p. 4 | T | `purpose=whole_stand`, `surface_ha=0.8` → `full`, `capped`, zone 0.8, raisons [`whole_stand_small`, `capped_default`], aucune autre question |
| R-08 | 1 < S ≤ `ROUTE_FULL_MAX_HA` (5 ha) et `difficulty=true` | `partial` (bande par R-12a), `capped` ; raisons `partial_hard_to_observe`, `partial_strip_why`, `complement_advised`, `capped_default` | M p. 4 | T | `purpose=whole_stand`, `surface_ha=3`, `homogeneity=heterogeneous`, `difficulty=true` → `partial_strip`, `capped`, zone 1, complément fait, surface totale évaluée 3 |
| R-09 | 1 < S ≤ 5 ha, `difficulty=false`, `homogeneity=homogeneous` | `partial` (bande si `narrow=true`, sinon placette, R-12a et R-12b), `capped` ; raison de tête `partial_homogeneous` | M p. 4 | T | `purpose=whole_stand`, `surface_ha=2`, `homogeneity=homogeneous`, `difficulty=false`, `narrow=false` → `partial_plot`, `capped`, zone 1, raisons [`partial_homogeneous`, `partial_plot_why`, `complement_advised`, `capped_default`], aucun avertissement |
| R-10 | 1 < S ≤ 5 ha, `difficulty=false`, `homogeneity=heterogeneous` | `full`, `capped`, zone = S ; raisons `whole_stand_heterogeneous` puis `capped_default` | M p. 4 ; S p. 18 | T | `purpose=whole_stand`, `surface_ha=4.5`, `homogeneity=heterogeneous`, `difficulty=false` → `full`, `capped`, zone 4.5 |
| R-11 | 5 < S ≤ T | `partial`, `capped` ; raison de tête `partial_medium_stand` ; la forme (bande ou placette) suit R-12a et R-12b ; `difficulty` n'est posée que si le peuplement est `homogeneous` | M p. 4 | T (le seuil 10 ou 20 selon l'hétérogénéité est J, décision O-02) | `purpose=whole_stand`, `surface_ha=15`, `homogeneity=homogeneous`, `difficulty=false`, `narrow=false` → `partial_plot`, `capped`, zone 1.5, raisons [`partial_medium_stand`, `partial_plot_why`, `complement_advised`, `capped_default`] |
| R-11b | S > T | aucun parcours tant que l'observateur n'a pas choisi ; trois options, dans l'ordre : `subdivide` (préselectionnée, décision O-03), `typological`, `partial` ; raison `large_stand` ; `subdivide` n'est pas un parcours : l'assistant redemande la surface d'un morceau et enregistre `subdivided=true` ; `typological` renvoie le résultat de R-05 avec les raisons `large_stand` et `typological_large` ; `partial` renvoie le résultat de R-12a ou R-12b avec les raisons `large_stand` et `partial_medium_stand` | M p. 4 | J (décision O-03) | `purpose=whole_stand`, `surface_ha=12`, `homogeneity=heterogeneous` → options [`subdivide`, `typological`, `partial`], `subdivide` préselectionnée, raison [`large_stand`], aucun parcours |

**Étape 3 : paramètres d'un parcours partiel**

| Id | Condition | Résultat | Source | Nature | Cas de test |
|---|---|---|---|---|---|
| R-12a | parcours partiel et (`homogeneity=heterogeneous` ou `difficulty=true` ou `narrow=true`) | `partial_strip` ; raison `partial_strip_why` ; conseil de terrain : bandes de 20 à 50 m de large (demi-largeur de 10 à 25 m selon la visibilité) | M p. 7, p. 8, p. 15 | T | `purpose=whole_stand`, `surface_ha=8`, `homogeneity=heterogeneous` → `partial_strip`, zone 1.6, raisons [`partial_medium_stand`, `partial_strip_why`, `complement_advised`, `capped_default`] |
| R-12b | parcours partiel dans tous les autres cas | `partial_plot` ; raison `partial_plot_why` ; conseil de terrain : placettes de 1 ha préférées (rayon horizontal de 56,4 m), 0,5 ha (39,9 m) ou 0,33 ha (32,6 m) possibles | M p. 7, p. 8 | T | `purpose=whole_stand`, `surface_ha=8`, `homogeneity=homogeneous`, `difficulty=false`, `narrow=false` → `partial_plot`, zone 1, raisons [`partial_medium_stand`, `partial_plot_why`, `complement_advised`, `capped_default`] |
| R-13 | parcours partiel | zone conseillée = min(S, max(`PARTIAL_SAMPLE_MIN_HA`, part × S)) arrondie à 2 décimales, part = 0,10 (`homogeneous`) ou 0,20 (`heterogeneous`) ; contrôles de la section « Contrôles de la surface décrite » (`partial_over_half` quand zone > 0,5 × S, `partial_below_minimum` quand zone < 1 ha) | M p. 7 | T (la correspondance entre homogénéité et 10 ou 20 % est J : le texte donne les deux extrêmes, une plantation pure et une futaie irrégulière mélangée) | `surface_ha=8`, `homogeneity=heterogeneous` → zone 1.6 ; l'observateur saisit 4.5 → `partial_over_half` (4.5 > 4) |
| R-14 | parcours partiel | relevé complémentaire conseillé pour quatre éléments (A, G, I, J), proposé par défaut : `complement` = `done` vrai, surface totale évaluée = S ; raison `complement_advised` | M p. 8 ; S p. 20 | T | tout parcours partiel avec `surface_ha=8` → `complement.done=true`, `complement.total_surface_ha=8` |
| R-15 | parcours partiel par placettes, plusieurs placettes | par défaut une seule fiche continue : la zone est la somme des placettes et le comptage est rapide ; l'alternative « une fiche par placette » se choisit dans le sélecteur (comptage complet et nom de groupe), pas par une question ; le calcul du groupe est renvoyé à la phase 30.1 (conseil `group_pending` dès qu'un nom de groupe est donné) | M p. 7 ; M p. 5 | T | proposition `partial_plot` → enregistrement sans `group_name`, `capped` ; l'observateur choisit « Comptage complet » et le nom « Chênaie nord » → `partial_plot`, `uncapped`, `group_name="Chênaie nord"`, conseil `group_pending` |

**Étape 4 : comptage et éléments comptés en entier**

| Id | Condition | Résultat | Source | Nature | Cas de test |
|---|---|---|---|---|---|
| R-16 | comptage par défaut selon le parcours | `full` : `capped` ; `partial_strip` : `capped` (relevé continu) ; `partial_plot` : `capped` (une fiche continue) ou `uncapped` (une fiche par placette, voir R-15) ; `typological` : `capped` ; `systematic` : `uncapped` | M p. 5 (tableau 2) | T | `full` → `capped` ; `partial_plot` avec nom de groupe → `uncapped` ; `typological` → `capped` ; `systematic` → `uncapped` avec A B C D E F G I J |
| R-17 | comptage `uncapped` choisi (objectif `study`, parcours `systematic`, ou choix dans le sélecteur) | le comptage est complet pour une liste d'éléments, jamais pour H ; préréglages : `study` = A B C D E F G I J ; `mature` = A C D E F ; `always_max` = un sous-ensemble choisi de A C D E F I J (tous proposés au départ) ; `minimum` = C D E ; `custom` = au choix, au moins un élément. Conseil pour `mature` et `always_max` : garder le plafond de 1 arbre par hectare pour les bois morts de dimension moyenne et les gros bois, sauf besoin de l'étude | M p. 23, p. 24 ; S p. 20, p. 21 (note 1) | T (les listes) ; les offrir en préréglages est J (décision O-01) | préréglage `mature` → [A,C,D,E,F] ; `minimum` → [C,D,E] ; `study` → [A,B,C,D,E,F,G,I,J] ; `custom` sans aucun élément → refusé (au moins un élément) |
| R-18 | tout comptage `uncapped` | conseil `uncapped_longer` : le comptage complet demande plus de temps | S p. 19 ; M p. 17 | T | `systematic` → conseils contiennent `uncapped_longer` ; `full` et `capped` → absent |

**Étape 5 : durée et conseils (jamais un changement de parcours)**

| Id | Condition | Résultat | Source | Nature | Cas de test |
|---|---|---|---|---|---|
| R-19 | surface échantillonnée A connue (parcours `full` : S ; `partial_*` : la zone ; `typological` : `sample_total_ha` ; pas d'estimation pour `systematic`) | conseil `duration` avec une plage `estimated_minutes` : minimum et maximum = A × (15 et 20) minutes, ou A × (25 et 30) si `difficulty=true`, arrondis à la minute | S p. 19 ; M p. 17 | T pour les nombres ; H pour la bande difficile choisie par `difficulty=true` | `full`, `surface_ha=4`, `difficulty` non posée → 60 à 80 minutes ; `partial_strip`, zone 1, `difficulty=true` → 25 à 30 minutes ; `typological`, `surface_ha=100` → de 5 × 15 = 75 à 8 × 20 = 160 minutes |
| R-20 | `hours_available` donné et inférieur à la durée minimale estimée | conseil `time_short` ; le parcours ne change jamais (décision O-04) | S p. 19 ; M p. 17 (les durées seulement : comparer au temps disponible n'est pas écrit) | H (décision O-04) | `full`, `surface_ha=4`, `hours_available=0.5` → conseil `time_short` ; le parcours reste `full` |
| R-21 | `experience=beginner` | conseil `beginner` ; le parcours ne change jamais (décision O-04) | M p. 4 (point 4) ; S p. 19 | J et H (décision O-04) | `experience=beginner` avec `surface_ha=8`, `homogeneity=heterogeneous` → même parcours que sans la réponse (`partial_strip`), conseil `beginner` en plus |

### Cas limites

Les cas ci-dessous fixent le comportement aux seuils 0,5, 1, 5, 10, 20 et 40 ha et aux autres
bornes. Chaque identifiant `R-nn#étiquette` désigne la règle `R-nn` dont il fixe une borne.

| Id | Règle | Source | Cas (réponses → résultat attendu) |
|---|---|---|---|
| R-01#zero | R-01 | S p. 18 | `surface_ha=0` → `surface_invalid`, aucune proposition |
| R-01#at-max | R-01 | S p. 18 | `purpose=whole_stand`, `surface_ha=5000`, `homogeneity=homogeneous` → proposition calculée (options de R-11b), pas d'erreur |
| R-01#above-max | R-01 | S p. 18 | `surface_ha=5000.01` → `surface_invalid`, aucune proposition |
| R-02#at-half-ha | R-02 | M p. 4 | `purpose=whole_stand`, `surface_ha=0.5` → `full`, zone 0.5, aucun avertissement `small_stand` |
| R-05#below-40ha | R-05 | M p. 11 | `purpose=rapid_diagnosis`, `surface_ha=39.99`, `homogeneity=homogeneous` → `typological`, `sample_total_ha` 4 (10 %) ; avec `heterogeneous` → 8 (20 %) |
| R-05#at-40ha | R-05 | M p. 11 | `purpose=rapid_diagnosis`, `surface_ha=40` → `typological`, `sample_total_ha` de 5 à 8 (plan des 5 à 8 placettes), `homogeneity` non posée |
| R-05#study | R-05 | M p. 4 | `purpose=study`, `surface_ha=300` → `typological`, `uncapped` [A,B,C,D,E,F,G,I,J], raisons [`typological_study`, `uncapped_study`] |
| R-07#at-1ha | R-07 | M p. 4 | `purpose=whole_stand`, `surface_ha=1` → `full`, zone 1, `homogeneity` non posée |
| R-08#just-above-1ha | R-08 | M p. 4 | `surface_ha=1.01`, `homogeneity=heterogeneous`, `difficulty=true` → `partial_strip`, zone 1 |
| R-10#at-5ha | R-10 | M p. 4 | `surface_ha=5`, `homogeneity=heterogeneous`, `difficulty=false` → `full`, zone 5 |
| R-11#just-above-5ha | R-11 | M p. 4 | `surface_ha=5.01`, `homogeneity=heterogeneous` → `partial_strip`, zone 1 (0,2 × 5,01 arrondi à 1,00) |
| R-11#hetero-at-10ha | R-11 | M p. 4 | `surface_ha=10`, `homogeneity=heterogeneous` → `partial_strip`, zone 2, pas d'options |
| R-11#homo-between-10-and-20ha | R-11 | M p. 4 | `surface_ha=12`, `homogeneity=homogeneous`, `difficulty=false`, `narrow=false` → `partial_plot`, zone 1.2, pas d'options |
| R-11#homo-at-20ha | R-11 | M p. 4 | `surface_ha=20`, `homogeneity=homogeneous`, `difficulty=false`, `narrow=false` → `partial_plot`, zone 2, pas d'options |
| R-11b#hetero-above-10ha | R-11b | M p. 4 | `surface_ha=10.01`, `homogeneity=heterogeneous` → options [`subdivide`, `typological`, `partial`], aucun parcours |
| R-11b#homo-above-20ha | R-11b | M p. 4 | `surface_ha=20.01`, `homogeneity=homogeneous` → options [`subdivide`, `typological`, `partial`], aucun parcours |
| R-12a#narrow | R-12a | M p. 8 | `surface_ha=8`, `homogeneity=homogeneous`, `difficulty=false`, `narrow=true` → `partial_strip` |
| R-13#at-half | R-13 | M p. 7 | `surface_ha=2`, `homogeneity=homogeneous`, `difficulty=false`, `narrow=false` → zone 1 (exactement la moitié), aucun avertissement `partial_over_half` |
| R-13#above-half | R-13 | M p. 7 | `surface_ha=1.5`, `homogeneity=homogeneous`, `difficulty=false`, `narrow=false` → zone 1 (plus de la moitié), avertissement `partial_over_half` |
| R-13#below-minimum | R-13 | M p. 7 | `surface_ha=8`, zone saisie 0.9 → avertissement `partial_below_minimum` |
| R-14#complement-below-zone | R-14 | M p. 8 | zone 2, surface totale évaluée saisie 1.5 → erreur `complement_below_zone` |
| R-20#at-minimum | R-20 | S p. 19 | `full`, `surface_ha=4`, `hours_available=1` (60 minutes, égal au minimum estimé) → aucun conseil `time_short` |

### Surface décrite conseillée

Pour chaque parcours, la proposition renvoie la surface que le relevé décrit (la « zone de relevé
IBP » de la fiche, S p. 20), arrondie à 2 décimales :

| Parcours | Surface décrite conseillée (clé `zone_surface_ha`) | Source |
|---|---|---|
| `full` | la surface du peuplement S | M p. 6 |
| `partial_strip`, `partial_plot` | min(S, max(1 ha, part × S)), part 0,10 ou 0,20 selon l'homogénéité (R-13) ; pour des placettes plusieurs, la somme de leurs surfaces | M p. 7 |
| `typological` | **la surface de cette fiche** : `TYPOLOGICAL_PLOT_HA` (1 ha), sans dépasser S ; 0,5 ha possible. Le paquet renvoie en plus une aide, `sample_total_ha`, la surface totale à échantillonner dans le type : si S < 40 ha, max(1 ha, part × S) ; si S ≥ 40 ha, de 5 à 8 ha (5 à 8 placettes de 1 ha) | M p. 10, p. 11 |
| `systematic` | **la surface de cette fiche** : `SYSTEMATIC_PLOT_HA` (0,20 ha, ou 0,33 ha au choix de l'observateur) | M p. 13 |

La valeur retenue pour `typological` et `systematic` (la surface de la fiche, non la surface totale
des placettes) est la décision O-17 (section 11) : elle correspond à la fiche officielle, qui est
une fiche par placette (M p. 5, tableau 2), et elle permet à la phase 30.1 de regrouper les fiches
sans migration.

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

### Codes ajoutés par rapport à la recherche préliminaire

Pour que chaque phrase de l'assistant corresponde à une règle, la rédaction de cette spécification
ajoute les codes suivants, absents de la liste préliminaire (à relire avec les phrases au plan
30-13) : raisons `typological_study` (R-05 avec `study`), `typological_large` et `large_stand`
(R-11b) ; codes d'erreur de la surface `surface_missing` et `surface_invalid` (R-01) ; conseil
`group_pending` (R-04, R-05, R-15, décision O-06) ; champ de résultat `sample_total_ha`. Le code
`linear_stand_unsupported` de la liste préliminaire n'est pas créé (décision O-10).

## 6. Comptage : rapide ou complet

**Deux modes (S p. 18, M p. 16).** En **comptage rapide** (relevé plafonné), on arrête les
observations d'un facteur dès que son score définitif est sûr (exemple officiel : arrêt à 5 très
gros bois par hectare pour le facteur E) ; il suppose de connaître la surface du relevé pour
calculer les seuils. En **comptage complet** (relevé déplafonné), tous les éléments sont comptés et
notés en détail, notamment le couvert des essences autochtones (A) et des strates (B) en
pourcentage. Le comptage rapide est « la méthode la plus rapide, utilisée dans la majorité des
cas » ; le comptage complet est réservé à quelques cas : regroupement de placettes, étude,
peuplement mal discriminé par l'IBP (forêt mature, scores toujours maximaux ou minimaux).

**Le comptage par défaut de chaque parcours (R-16, M p. 5 tableau 2).**

| Parcours | Comptage par défaut | Remarque |
|---|---|---|
| `full` | `capped` | plafonné selon la surface du peuplement (M p. 6) |
| `partial_strip` | `capped` | relevé en continu |
| `partial_plot` | `capped` (une fiche continue) ou `uncapped` (une fiche par placette) | R-15 |
| `typological` | `capped` | un score par placette, puis moyenne et dispersion (section 10) |
| `systematic` | `uncapped` | le score se calcule sur le groupe de placettes (section 10) |

**Les éléments comptés en entier (R-17).** L'enregistrement porte la liste des facteurs du champ
« Facteurs déplafonnés » de la fiche (S p. 20). Cinq préréglages sont proposés ; toucher un facteur
bascule le préréglage sur `custom`.

| Préréglage | Éléments comptés en entier | Cas visé | Source |
|---|---|---|---|
| `study` | A B C D E F G I J | étude ou travail de recherche | M p. 24 |
| `mature` | A C D E F | peuplement à forte maturité | M p. 23 |
| `always_max` | sous-ensemble choisi de A C D E F I J (tous proposés au départ) | peuplement dont certains scores sont toujours maximaux | M p. 23 |
| `minimum` | C D E | peuplement dont certains scores sont toujours nuls (jeune plantation, garrigue) | M p. 24 |
| `custom` | au choix, au moins un élément | tout autre besoin | S p. 21 (note 1) |

Le facteur H n'est jamais compté en entier (c'est une classe, pas un comptage). La liste complète
des facteurs liftables est `UNCAPPABLE_FACTORS` = A, B, C, D, E, F, G, I, J. Plus la liste est
longue, plus le relevé l'est : le texte officiel demande de choisir les facteurs selon l'objectif
(M p. 23).

**Différences par facteur** (tableau 7 de M p. 17, chapitre 8 de M p. 23-24, fiche S p. 20-21).

| Facteur | Comptage rapide | Comptage complet | Ce que l'application change |
|---|---|---|---|
| A | genres comptés jusqu'à 5 (3 en cas 3) ; couvert des autochtones : moins ou plus de 50 % | tous les genres ; couvert en pourcentage | rien de plus : le couvert est déjà saisi en pourcentage ; les essences exotiques et les noms d'espèce restent hors champ |
| B | nombre de strates présentes (couvrant au moins 20 % de la surface échantillonnée) | couvert de chaque strate, en pourcentage de la surface échantillonnée | **nouvelle saisie** `strata_cover` (section 7) |
| C et D | au plus 3 bois morts de grosse dimension et 1 de dimension moyenne par hectare | tous les bois morts | rien de plus : les comptes sont déjà sans plafond ; textes et indices changent |
| E | au plus 5 très gros bois et 1 gros bois par hectare | tous les très gros bois et gros bois | idem |
| F | au plus 2 arbres par hectare et par groupe de dendromicrohabitats, au plus 8 au total | tous les arbres porteurs, groupe par groupe | **nouvelle saisie** `dmh_counts` (section 7) |
| G | pourcentage de milieux ouverts, avec arrêt à 5 % (score maximal) | pourcentage sans arrêt à 5 % (M p. 24) | rien de plus : le pourcentage est déjà saisi sans plafond |
| H | classe | sans objet | rien |
| I et J | au plus 2 types comptés | tous les types observés | rien de plus : le nombre de types est déjà saisi sans plafond |

**Les plafonds de comptage d'un groupe** (3, 1, 5, 1, 2 et 8 fois la surface totale du groupe) ne
changent jamais un score : ils servent à arrêter de compter quand le score maximal est certain (S
p. 18, M p. 17). Ils ne sont pas appliqués par l'application (section 10).

## 7. Saisie en comptage complet

**Principe (D-07, D-09).** En comptage complet, deux facteurs reçoivent des champs de détail
nouveaux : B (couvert de chaque strate) et F (arbres par groupe de dendromicrohabitats). Aucun
autre facteur n'en reçoit : A, C, D, E, G, I, J gardent leur saisie actuelle, seuls les textes
d'aide changent. Pour un relevé isolé, les deux modes donnent **le même score pour les mêmes
données** : le comptage complet ajoute de la donnée, il ne change aucun calcul.

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

## 8. Données enregistrées (Parcours utilisé)

Une seule structure JSON versionnée, `survey_route`, rangée à côté de `survey_note` et `weather`
(même schéma que la phase 27 : colonne nullable côté API, clé du `payload_json` local côté
téléphone, aucune migration SQLite). Elle est **hors de `factors`** : aucun calculateur ne la voit.

| Clé | Sens | Type | Valeurs permises, bornes | Présente quand |
|---|---|---|---|---|
| `version` | version de la structure | nombre | `1` | toujours |
| `method` | le parcours | texte | `full`, `partial_strip`, `partial_plot`, `typological`, `systematic` | toujours |
| `counting` | le comptage | texte | `capped`, `uncapped` | toujours |
| `uncapped_factors` | « Facteurs déplafonnés » de la fiche | liste de lettres | sous-ensemble non vide de A B C D E F G I J, sans doublon, **triée** | seulement si `counting` vaut `uncapped` |
| `zone_surface_ha` | « zone de relevé IBP, surface (ha) » de la fiche | nombre | strictement supérieur à 0, au plus `ROUTE_SURFACE_MAX_HA`, 2 décimales | toujours (obligatoire) |
| `complement` | relevé complémentaire dans la zone non échantillonnée | objet | `done` (vrai ou faux) ; `total_surface_ha` (nombre, au moins `zone_surface_ha`, au plus `ROUTE_SURFACE_MAX_HA`, 2 décimales) présent seulement si `done` est vrai | parcours partiel seulement |
| `group_name` | « Nom groupe de relevés si plusieurs placettes » | texte | au plus `GROUP_NAME_MAX_LENGTH` (60) caractères, sans espace en tête ou en fin | facultatif |
| `guide` | ce qui a conduit au choix | objet | voir ci-dessous | si l'assistant a été utilisé ou le parcours choisi à la main |

Contenu de `guide` :

| Clé | Sens | Valeurs |
|---|---|---|
| `chosen_by` | qui a choisi | `guide` (le parcours, le comptage et les éléments enregistrés sont ceux que l'assistant avait proposés) ou `observer` (l'observateur a changé la proposition ou a choisi directement) |
| `suggested` | la dernière proposition de l'assistant | objet `method` et `counting` (mêmes valeurs que ci-dessus) ; absent si l'observateur a choisi directement sans réponses complètes |
| `answers` | les réponses nécessaires de la section 4 | `purpose`, `surface_ha`, `homogeneity`, `difficulty`, `narrow`, `experience`, `hours_available`, `subdivided` ; chaque clé n'est présente que si la question était nécessaire et répondue ; `hours_available` entre 0 (exclu) et `ROUTE_HOURS_MAX`, 2 décimales |

**Règles.**

- Aucun texte libre sauf `group_name` (donc rien à effacer pour la suppression de compte au-delà
  de ce que la décision D-24 prévoit déjà pour les notes). Voir la décision O-08.
- **Forme canonique, établie sur le téléphone** : nombres arrondis comme indiqué, liste des
  facteurs triée sans doublon, nom de groupe sans espaces en tête et en fin. Le serveur stocke tel
  quel et compare sans reformater ; sinon un rejeu du même relevé produirait un faux conflit.
- **Un relevé sans enregistrement est valide** : assistant passé, ou relevé créé avant cette phase.
  Rien n'est inventé, la clé est absente.
- **Brouillon seulement** : le parcours se modifie tant que le relevé est un brouillon et devient
  en lecture seule à la soumission, comme `ibp_method_version` (décision D-09). La décision O-08
  tranche si `group_name` fait exception.
- **Taille** : au plus `ROUTE_RECORD_MAX_BYTES` (4096 octets) une fois sérialisé.
- **Place pour la phase 31** : elle lit `method` et `zone_surface_ha` pour savoir quoi dessiner
  (bandes ou placettes). Une référence au tracé sera ajoutée par la phase 31 ; rien n'est
  enregistré pour cela maintenant.
- **Ce que la phase 30.1 lira** (sans migration) : `group_name`, `method`, `counting`,
  `zone_surface_ha` de chaque fiche, et les données de détail des facteurs (section 10).

Exemple (parcours partiel par placettes, une fiche continue, assistant accepté) :

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
      "purpose": "whole_stand",
      "surface_ha": 15,
      "homogeneity": "homogeneous",
      "difficulty": false,
      "narrow": false
    }
  }
}
```

## 9. Affichage

Textes proposés, relus au plan 30-13. Les libellés sont des légendes courtes ; les valeurs
viennent du catalogue.

**Page « Contexte » du relevé** (nouvelle section « Parcours utilisé », après « Méthode et
station »).

| Ligne | Exemple de valeur | Affichée quand |
|---|---|---|
| Parcours | Parcours partiel par placettes | enregistrement présent |
| Comptage | Comptage rapide (relevé plafonné) ou Comptage complet (relevé déplafonné) | enregistrement présent |
| Éléments comptés en entier | A Genres d'arbres, B Strates, F Dendromicrohabitats | comptage complet |
| Surface décrite | 1,2 ha | enregistrement présent |
| Reste du peuplement | Regardé rapidement, surface totale évaluée 8 ha, ou Non regardé | parcours partiel |
| Groupe de relevés | le nom | un nom a été donné |
| Choix | Conseillé par l'app d'après vos réponses, ou Choisi par vous | enregistrement présent |
| Vos réponses | Peuplement de 8 ha, homogène, facile à observer (réponses fermées uniquement) | `guide.answers` présent |

Brouillon : un lien « Modifier le parcours » ouvre le sélecteur ; sans enregistrement : « Parcours
non choisi » avec un lien « Choisir le parcours ». Relevé soumis ou relevé d'un autre membre :
les mêmes lignes en texte, sans lien (lecture seule, D-09). Valeur proposée pour un relevé soumis
sans enregistrement (décision O-07) : une ligne discrète « Parcours : non renseigné » et la phrase
« Ce relevé a été fait avant l'assistant de choix du parcours ».

**Bloc du PDF** (nouveau bloc « Parcours utilisé », juste après « Conditions du relevé », ou après
les cartes d'identité s'il n'y a pas de bloc de conditions). Lignes (légende à gauche) :
« Parcours », « Comptage », « Éléments comptés en entier » (comptage complet seulement), « Surface
décrite », « Reste du peuplement » (parcours partiel seulement), « Groupe de relevés » (si un nom
existe), « Choix ». La valeur de « Choix » est une phrase : « Conseillé par l'application d'après
vos réponses : peuplement de 8 ha, homogène, facile à observer. » ou « Choisi directement par
l'observateur. ». Tout texte variable (le nom de groupe) est échappé. Le bloc s'imprime aussi pour
un brouillon.

**La ligne « Mode de relevé » des cartes d'identité du PDF** (« Relevé plafonné, aucun facteur
déplafonné ») est supprimée **uniquement quand le bloc « Parcours utilisé » s'imprime**, car il
répéterait la ligne de comptage. Pour un relevé sans enregistrement, rien de nouveau ne s'imprime
et la ligne reste exactement comme aujourd'hui (valeur proposée de la décision O-07 : pas de
régression sur les exports passés).

**Écrans de facteurs.** Un facteur compté en entier porte une pastille « Comptage complet » dans
l'en-tête du pager, une étiquette dans la liste des facteurs et une phrase d'explication au-dessus
de son premier champ ; un facteur compté en rapide n'affiche rien de plus. Le PDF imprime pour B
le couvert de chaque strate et pour F le nombre d'arbres par groupe quand ces détails existent.

**Résumé de la page de détail.** La ligne « Contexte » peut ajouter l'étiquette courte du parcours
après le cas (« v3.2 · cas 2 · Parcours en plein »), tronquée sur une ligne (décision U-O9).

## 10. Groupe de placettes

### Définition

Un **groupe de relevés** (ou groupe de placettes) est un ensemble de placettes installées dans le
même peuplement ou type de peuplement, chaque placette faisant l'objet d'un relevé IBP sur sa
propre fiche, avec un **nom de groupe commun** (« Nom groupe de relevés si plusieurs placettes »,
S p. 20). Une placette peut être rattachée au groupe **avant** le relevé (la surface totale du
groupe est alors connue) ou **après** (par exemple le classement des placettes d'un inventaire
systématique à la fin de l'inventaire ; la surface totale n'est connue qu'à l'issue des relevés)
(S p. 18, M p. 2, M p. 14).

L'IBP du groupe est calculé **sur les données brutes regroupées, comme si elles ne formaient qu'un
seul relevé**, et non en faisant la moyenne des scores des placettes (M p. 9). Cela exige le
comptage complet, sinon les nombres sont sous-estimés (S p. 18). Le calcul est « plus complexe et
doit être réservé aux situations qui le nécessitent vraiment » (S p. 18).

### Calcul par facteur (tableau 5 de M, p. 9)

Notations : `s_i` est la surface de la placette `i` et `Sg` la surface totale du groupe, somme des
`s_i`. Les seuils de score appliqués ensuite sont ceux de la version du relevé (section 2, écart 4).

| Facteur | Données par placette | Règle de regroupement | État de la saisie actuelle |
|---|---|---|---|
| A | liste des genres ; couvert des essences autochtones (%) | union des genres de toutes les placettes et du relevé complémentaire ; couvert = moyenne des couverts des placettes **pondérée par les surfaces** `s_i` (note 1 du tableau) ; puis seuils et plafond de couvert habituels | la liste de genres et `native_cover_percent` existent déjà |
| B | couvert (%) de chacune des cinq strates | par strate, moyenne pondérée par les surfaces ; une strate compte à partir de 20 % ; puis seuils | **nouvelle saisie** `strata_cover` (section 7) |
| C et D | nombre de bois morts de grosse dimension (BMg) et de dimension moyenne (BMm) | pour chaque catégorie : somme des nombres des placettes divisée par `Sg` = densité par hectare ; puis seuils de la version | les nombres et la surface de la saisie existent déjà ; appel groupé avec `surface_ha = Sg` |
| E | nombre de très gros bois (TGB) et de gros bois (GB) | idem | idem |
| F | nombre d'arbres porteurs par groupe de dendromicrohabitats | par groupe : somme divisée par `Sg`, **plafonnée à 2 arbres par hectare**, puis somme des groupes ; puis seuils | **nouvelle saisie** `dmh_counts` et `surface_ha` (section 7) |
| G | surfaces de trouées (`sT`), de lisières florifères converties en surface avec 2 m de large (`sL`) et de peuplement peu dense (`sPC`) | `%MOpl = (sT + sL + sPC) / Sg` ; avec un relevé complémentaire, on ajoute le pourcentage des lisières qui ne recoupent pas les placettes, rapporté à la surface du peuplement (ambiguïté G-11) ; puis seuils | le pourcentage par placette existe ; la moyenne pondérée des pourcentages équivaut quand chacun est rapporté à sa propre placette |
| H | le score de H | scores identiques : ce score ; scores différents : score 1 si le maximum est 1, sinon 2 (rédigé pour la version v3.0 ; ambiguïté G-1) | la classe H existe déjà |
| I et J | types de milieux aquatiques et rocheux trouvés | union des types trouvés sur les placettes et dans le relevé complémentaire ; puis seuils ; pour J, un type ne compte que s'il couvre plus de 20 m² cumulés (M p. 17 ; ambiguïté G-2) | `type_count` et `types` existent déjà, sans surface par type |

### Plafonds de comptage avec la surface totale connue d'avance

Quand `Sg` est connue au moment des relevés, on peut arrêter de compter à : BMg 3 × `Sg` et BMm
1 × `Sg` (C et D) ; TGB 5 × `Sg` et GB 1 × `Sg` (E) ; 2 × `Sg` par groupe de dendromicrohabitats et
8 × `Sg` au total (F) (S p. 18, M p. 2, M p. 17). **Ces plafonds ne changent jamais un score** : ils
servent à arrêter de compter quand le score maximal est certain. Le calcul regroupé peut donc les
ignorer et appliquer les seuils aux densités regroupées. Seul le plafond de 2 arbres par hectare
et par groupe de dendromicrohabitats est une vraie règle de score (déjà dans le paquet).

### Placettes en limite

Pour les placettes de faible surface à rayon mesuré avec précision, les éléments situés en limite
se notent ainsi (M p. 17) : un nouveau genre est compté pour A ; les bois morts sur pied (C), les
très gros bois (E) et les arbres porteurs de dendromicrohabitats (F) comptent pour la moitié ; un
bois mort au sol (D) compte si la partie du tronc dans la placette respecte les seuils ; les
milieux ouverts (G) comptent pour la surface ou la longueur de lisière incluse ; les milieux
aquatiques (I) sont comptés ; les milieux rocheux (J) comptent au-delà de 20 m². C'est une règle de
**saisie** (consigne à l'observateur), sans effet sur le calcul.

### Échantillonnage typologique : une autre agrégation

L'échantillonnage typologique ne regroupe pas les données : un score est calculé **par placette**
(placettes d'au moins `TYPOLOGICAL_PLOT_MIN_HA`), puis on calcule, par type de peuplement, la
**moyenne** et la **dispersion** des scores « peuplement et gestion » (facteurs A à G) (M p. 10,
p. 12, annexe p. 27). La dispersion est l'écart entre les valeurs adjacentes supérieure et
inférieure de la boîte à moustaches ; ces valeurs sont définies en annexe (M p. 27 : plus petite
valeur supérieure ou égale à Q1 moins 1,5 fois l'écart interquartile, et plus grande valeur
inférieure ou égale à Q3 plus 1,5 fois l'écart interquartile). Échelle d'interprétation de la
dispersion (en pourcentage du score maximal, M p. 27) : très faible moins de 10 % ; faible de 10 à
19 % ; moyenne de 20 à 39 % ; élevée de 40 à 49 % ; très élevée 50 % et plus. Une typologie des
peuplements est « indispensable » avant de relever (M p. 10) : chaque placette est rattachée à un
type (ambiguïté G-9).

### Ambiguïtés trouvées

Chaque ligne demande une ligne de décision ou une décision du propriétaire avant la phase 30.1.

| # | Ambiguïté | Pourquoi elle compte | Traitement proposé |
|---|---|---|---|
| G-1 | Les tableaux 4, 5 et 7 sont étiquetés « IBP v3.0 ». La règle de H du tableau 5 utilise le score 1, qui n'existe plus (la v3.2 et la v3.0 de l'application n'admettent que 0, 2 et 5) | que vaut H quand les placettes diffèrent (par exemple 0 et 5) ? | scores identiques : ce score ; sinon 2 (proposition à confirmer) |
| G-2 | Pour J, un type ne compte que s'il dépasse 20 m² cumulés (M p. 17), alors que le tableau 5 dit « faire la liste complète des types » | l'application ne stocke aucune surface par type | compter l'union des types qualifiant déjà dans leur propre placette ; lecture prudente à confirmer |
| G-3 | Couvert de A quand il existe un relevé complémentaire | la fiche n'ajoute que des genres pour le complément | le complément ajoute des genres, jamais du couvert |
| G-4 | Pondération par la surface quand les placettes n'ont pas la même taille (sous-placettes, placettes en limite) | moyennes de A et de B | toujours pondérer par la surface (à surfaces égales, c'est la moyenne simple) |
| G-5 | Les membres d'un groupe doivent partager la version et le cas, sinon les seuils et les hauteurs de strates diffèrent | le calcul regroupé exige un seul jeu de règles | refuser ou avertir quand `ibp_method_version`, `ibp_cas` ou `ibp_cas3_scale` diffèrent (le texte officiel est muet) |
| G-6 | Surface minimale d'un groupe de 1 ha, « analyser avec plus de prudence » en dessous (M p. 14) | bloquer ou avertir ? | avertir, ne jamais bloquer |
| G-7 | Quelle fiche porte le résultat du groupe ? Le texte officiel travaille avec un tableur, il n'existe aucun score « officiel » par placette ; une placette de moins de 0,5 ha n'a pas de score propre (M p. 7) | modèle du produit | le résultat du groupe est une vue calculée sur les fiches membres, jamais écrite dans les scores d'une fiche |
| G-8 | Une placette peut rejoindre un groupe après l'inventaire (M p. 14), alors que l'enregistrement du parcours est en lecture seule après soumission (D-09) | le nom de groupe ne pourrait pas être posé tardivement | soit `group_name` reste modifiable après soumission (exception à D-09), soit le regroupement vit dans une table locale séparée ; décision O-08 |
| G-9 | L'échantillonnage typologique exige un nom de type de peuplement par placette ; les valeurs adjacentes sont définies (M p. 27) mais pas la méthode de calcul des quartiles | second agrégateur ; le résultat dépend de la méthode des quartiles | reporter avec le lot de groupe ; proposer la méthode des quartiles du tableur officiel (interpolation inclusive) à confirmer avec une feuille d'exemple |
| G-10 | `group_name` est un texte libre (même risque que les notes, D-24) | un nom pourrait désigner une personne | au plus 60 caractères ; consigne « n'écrivez pas de nom de personne » ; risque accepté par le propriétaire ou suggestions génériques (décision O-08) |
| G-11 | Le relevé complémentaire d'un groupe exprime son pourcentage de lisières par rapport à la surface du peuplement, qui n'est pas `Sg` | G regroupé | hors du premier lot de groupe (proposition à confirmer) |

À ces ambiguïtés s'ajoute une vérification de saisie, sans ambiguïté de règle : une fiche membre
en comptage rapide n'a pas les détails nécessaires (nombres par groupe de dendromicrohabitats,
couverts de strates) ; le résultat de groupe doit le signaler comme « données manquantes ».

### Taille estimée du lot de groupe

| Partie | Travail | Taille |
|---|---|---|
| Paquet | un module de regroupement (surfaces, genres, couverts, nombres, nombres par groupe de dendromicrohabitats) qui construit un jeu de facteurs fusionné avec `surface_ha = Sg` et appelle les calculateurs de la version ; règles de H et de J ; contrôle de version et de cas ; moyenne et dispersion typologiques ; 15 à 20 cas de parité (`MAT-GRP-*`, deux versions) dans les trois suites ; couverture à 100 % | 2 plans |
| API | rien d'obligatoire si le résultat de groupe est une vue calculée sur le téléphone (`group_name` est déjà dans l'enregistrement) ; un point d'accès seulement pour montrer le groupe aux autres membres | 0 plan (1 si partagé) |
| Synchronisation | aucune | 0 plan |
| Application | créer la placette suivante d'un groupe depuis un relevé ; lister les membres ; écran du résultat regroupé avec avertissements (1 ha minimum, cas mélangés, données manquantes) ; `Sg` déclarée avant ou calculée après ; le groupe dans la liste et le détail ; une page PDF de groupe ; soumission de chaque membre séparément | 3 à 4 plans |
| Documents et tests | lignes de la matrice v2 ; une vérification enregistrée avec de vraies données de placettes | 1 plan |
| **Total** | | **6 à 8 plans**, soit environ la taille du reste de la phase 30 |

### Décision D-04

**Recommandation : le calcul regroupé devient une phase 30.1.** La spécification (cette section)
définit le modèle de groupe et le calcul complet, comme l'exige D-04. La phase 30 les écrit mais ne
les implémente pas.

Raisons :

1. le lot de groupe est aussi gros que tout le reste de la phase (6 à 8 plans, tableau ci-dessus) ;
2. il dépend de la saisie en comptage complet et de l'enregistrement du parcours, que la phase 30
   livre d'abord ;
3. les questions de modèle G-5, G-7 et G-8 demandent un usage réel sur le terrain pour être
   tranchées ;
4. rien n'est perdu à attendre : la phase 30 enregistre tout ce que le calcul regroupé lira, et ce
   calcul est une fonction pure sur des données déjà enregistrées, donc **sans migration** ;
5. l'agrégation typologique (G-9) est un second agrégateur qui appartient au même lot.

**Ce que la phase 30 enregistre pour la phase 30.1** : le nom de groupe (`group_name`), le
parcours et le comptage (`method`, `counting`) et la surface décrite de chaque fiche
(`zone_surface_ha`, décision O-17), les détails nouveaux de B (`strata_cover`) et de F
(`dmh_counts` et `surface_ha`), ainsi que les données déjà saisies : genres et couvert des
autochtones (A), nombres et surface de C, D et E, pourcentage de G, classe de H, types de I et J.
Tant que le calcul regroupé n'existe pas, l'application dit que le résultat du groupe est « à
calculer avec la feuille de calcul de la méthode officielle » (décision O-06).

**Critères pour garder le calcul regroupé dans la phase 30** (il faut les trois) : le propriétaire
tranche par écrit G-1, G-2, G-5, G-7 et G-8 ; il accepte le budget de 6 à 8 plans de plus (la phase
est alors replanifiée avant tout code) ; il dispose de vraies données de placettes pour vérifier le
résultat.

Décision du propriétaire (plan 30-02) : à remplir au plan 30-02. Confirmation de clôture (plan
30-23) : à remplir au plan 30-23.

## 11. Décisions du propriétaire

Chaque ligne donne la question, le **défaut conseillé** (recommandation de la recherche ou de la
maquette de l'interface), la cellule « Décision validée » **laissée vide** (le propriétaire la
remplit au plan 30-02, jamais Claude) et l'effet si la décision diffère du défaut. Répondre à une
décision `O-nn` répond aussi à la décision `U-O` qui lui est liée (notée dans la question). Un
changement structurel (D-04 gardé dans la phase 30, nom de groupe modifiable après soumission,
détails qui comptent dans le score, étape numérotée de l'assistant) arrête la phase pour une
replanification.

| Id | Question | Défaut conseillé | Décision validée | Effet si différent |
|---|---|---|---|---|
| O-01 | Comptage par facteur ou un seul indicateur ? Offrir les préréglages ? (lié à U-O12) | enregistrer `counting` et `uncapped_factors` ; cinq préréglages (`study`, `mature`, `always_max`, `minimum`, `custom`) et une puce par facteur ; l'étude sur un petit peuplement n'a pas de règle propre (l'objectif `study` mène à `typological`, M p. 4 cas 3), l'observateur qui veut un parcours en plein complet le choisit directement | | un seul indicateur : `uncapped_factors` disparaît (enregistrement 30-03, règle R-17 en 30-05, sélecteur 30-19, écrans de facteurs 30-14 et 30-17) ; l'objectif `study` vers `full` : R-05 change (30-05) |
| O-02 | Où se place la limite de 10 à 20 ha, et comment l'hétérogénéité la déplace-t-elle ? | 10 ha pour un peuplement varié, 20 ha pour un peuplement homogène | | constantes `ROUTE_SUBDIVIDE_*` et cas de R-11 et R-11b (30-05) |
| O-03 | Au-dessus de la limite, quelle option est préselectionnée ? (lié à U-O5) | « Découper en sous-peuplements » préselectionnée ; les deux autres à un contact | | préselection de R-11b (30-05, 30-16) |
| O-04 | L'expérience et le temps disponible changent-ils la proposition ? (lié à U-O4) | non : conseils seulement (R-20 et R-21) | | R-20 et R-21 deviennent des règles de parcours, la question `refine` change (30-05, 30-15) |
| O-05 | Limite du parcours en plein | 5 ha (M p. 4 et p. 6) plutôt que « dizaine d'ha » (M p. 5) | | constante `ROUTE_FULL_MAX_HA` et cas limites (30-05) |
| O-06 | Que dit l'application sur les groupes de placettes (typologique, systématique) tant que le calcul regroupé n'existe pas ? (lié à U-O6) | un avis d'information « à calculer avec la feuille de calcul de la méthode officielle » (conseil `group_pending`) ; l'alternative est de masquer ces deux parcours de la proposition et de les garder dans le sélecteur | | règles R-04 et R-05 (30-05), carte de conseils (30-16) |
| O-07 | Relevés sans parcours enregistré (lié à U-O7) | PDF inchangé (la ligne « Mode de relevé : Relevé plafonné, aucun facteur déplafonné » reste) ; page Contexte : « Parcours non choisi » pour un brouillon, « Parcours : non renseigné » pour un relevé soumis | | PDF et tests épinglés (30-13), page Contexte (30-20) |
| O-08 | Nom de groupe : texte libre accepté ? Modifiable après soumission ? (lié à U-O8, ambiguïtés G-8 et G-10) | texte libre de 60 caractères au plus, aucun nom de personne demandé, lecture seule après soumission comme le reste du parcours | | modifiable après soumission : exception à la lecture seule côté API (30-07, 30-09), page Contexte (30-20) ; changement structurel |
| O-09 | L'assistant s'applique-t-il aux relevés v3.0 ? | oui, pour la v3.0 et la v3.2 (les règles de parcours ne dépendent pas de la version) | | condition d'entrée de l'assistant (30-18) |
| O-10 | Peuplements linéaires de moins de 15 m de large | hors champ : aucune question, aucun code ; une phrase fixe d'aide sous la question de surface | | seuils par kilomètre à ajouter au paquet (hors phase 30), question de largeur (30-05, 30-15) |
| O-11 | Peuplement de moins de 0,5 ha | avertir (`small_stand`), ne jamais bloquer | | règle R-02 (30-05) |
| O-12 | Vocabulaire (lié à U-O1) | « Parcours » pour la route, « Comptage » pour le mode, « Méthode IBP » reste la version | | tout le catalogue (30-10) et le test avec des utilisateurs (30-23) |
| O-13 | Test enregistré avec des utilisateurs | trois à cinq testeurs qui ne connaissent pas la méthode, dont le testeur du propriétaire ; chacun réussit seul le scénario (a) ; au moins deux sur trois réussissent (b) ou (c) | | protocole (30-21) et clôture (30-23) |
| O-14 | D-04 : où va le calcul regroupé des placettes ? | scinder vers une phase 30.1 (section 10) | | gardé dans la phase 30 : replanification de 6 à 8 plans de plus avant tout code ; changement structurel |
| O-15 | Relevé d'un autre membre : montrer le parcours en lecture seule ? (lié à U-O15) | oui (peu coûteux, aide à juger la comparabilité d'un score) | | lecture communautaire de l'API (30-09), page communautaire (30-20) |
| O-16 | Enregistrer `systematic` comme parcours alors que la case « Méthode » de la fiche officielle ne le liste pas | oui (M p. 13 lui donne sa propre fiche) | | valeurs de `method` (30-03, 30-05, 30-07) |
| O-17 | Surface décrite d'un échantillonnage typologique ou systématique : surface de cette fiche ou surface totale des placettes ? (question soulevée par la rédaction de cette spécification) | la surface de cette fiche (1 ha, 0,20 ha), qui est la « zone de relevé IBP » de la fiche officielle ; la surface totale à échantillonner n'est qu'une aide (`sample_total_ha`). Le texte actuel de la maquette (carte « Détails du parcours », « Surface totale des placettes ») est à corriger en conséquence | | libellé et aide de la carte de détails (30-16, 30-19), zones conseillées de R-04 et R-05 (30-05), regroupement de la phase 30.1 |
| U-O1 | Vocabulaire du comptage (O-12) | « Comptage rapide (relevé plafonné) » et « Comptage complet (relevé déplafonné) » ; les mots officiels seuls uniquement entre parenthèses | | catalogue (30-10) |
| U-O2 | L'assistant est-il une étape numérotée de la création ? | non : sans numéro, étiquette « Facultatif », sans retour vers la carte des parcelles (la création doit rester courte, SEED-007) | | changement structurel : navigation et création (30-18) |
| U-O3 | La réponse par défaut de la question d'objectif (« Décrire un peuplement en entier ») est-elle préselectionnée, avec un bouton « Suivant » ? | oui ; l'alternative est aucune préselection et un clic de plus dans le cas courant | | questionnaire (30-15) |
| U-O4 | Expérience et temps : conseils seulement (O-04) | conseils seulement, section repliée | | idem O-04 |
| U-O5 | Au-dessus de la limite de découpage : option préselectionnée et rôle de « Découper en sous-peuplements » (O-03) | préselectionnée et étiquetée « Conseillé » ; ce n'est pas un parcours : elle rouvre la question de surface pour un morceau | | idem O-03 |
| U-O6 | Ce que dit l'application sur les groupes avant la phase 30.1 (O-06, O-14) | un avis d'information ; l'alternative est de masquer les deux parcours de la proposition | | idem O-06 |
| U-O7 | Relevés sans parcours (O-07) | PDF inchangé ; « Parcours non choisi » (brouillon) ou « Parcours : non renseigné » (soumis) | | idem O-07 |
| U-O8 | Nom de groupe : texte libre de 60 caractères, affiché dans Contexte et le PDF ; modifiable après soumission ? (O-08) | accepté en texte libre, lecture seule après soumission | | idem O-08 |
| U-O9 | La ligne « Contexte » du résumé du relevé porte-t-elle l'étiquette courte du parcours ? | oui, tronquée sur une ligne (retrait peu coûteux) | | résumé du relevé (30-20) |
| U-O10 | Détails de B et de F quand un facteur sort de la liste des éléments comptés en entier : conservés et masqués, jamais lus par un calculateur ; la clé notée garde sa dernière valeur (section 7) | règle de la section 7 | | si les détails comptent tant qu'ils sont présents : calculateurs et cas de parité `MAT-B-*` et `MAT-F-*` changés (30-06, 30-11, 30-17) ; changement structurel |
| U-O11 | Surface maximale acceptée et phrase d'erreur | 5000 ha ; « Cette surface semble trop grande. Vérifiez-la. » | | constante `ROUTE_SURFACE_MAX_HA` (30-03) |
| U-O12 | Offrir les cinq préréglages de comptage complet et les puces par facteur (O-01) | oui | | idem O-01 |
| U-O13 | Relecture de chaque phrase française (questions, légendes, raisons, avertissements, conseils, glossaire, phrases des facteurs) | plan 30-22 ; la structure et le ton sont fixés | | calendrier du plan 30-22 |
| U-O14 | Les réponses partielles d'un assistant abandonné ne sont pas conservées | non conservées : l'enregistrement se fait une seule fois, à l'acceptation | | questionnaire et écran (30-15, 30-18) |
| U-O15 | Parcours en lecture seule sur le relevé d'un autre membre (O-15) | pas conçu dans la maquette ; si oui, réutiliser les lignes de Contexte dans la page communautaire | | idem O-15 |

## 12. Exigences proposées

Identifiants proposés, au format `REQ-{épopée}-{nom}` de `.planning/REQUIREMENTS.md`. Ils sont
ajoutés à `.planning/REQUIREMENTS.md` par l'orchestrateur à la fin de la planification, pas par
cette spécification.

- **REQ-DOC-route-rules** : les règles de parcours et de comptage de la méthode officielle sont
  écrites en français dans `docs/specs/route-choice-rules-v1.md`, avec un cas de test par règle et
  la page citée, et validées par écrit par le propriétaire, avec la date, avant tout écran
  (critère 1, D-10).
- **REQ-C-route-guide** : une étape guidée facultative, utilisable hors connexion, après le choix
  des parcelles, pose les questions, propose le parcours et le comptage, les explique en français
  courant, permet de les changer ou de choisir directement (critère 2, D-05, D-06).
- **REQ-C-route-record** : le parcours utilisé (parcours, comptage et éléments comptés en entier,
  surface décrite, relevé complémentaire, nom de groupe, réponses) est enregistré avec le relevé,
  synchronisé et en lecture seule après soumission (critère 3, D-08, D-09).
- **REQ-C-route-display** : le parcours utilisé s'affiche en texte dans le détail du relevé et dans
  le PDF, à la place de la ligne fixe « Relevé plafonné, aucun facteur déplafonné » (critère 3,
  D-09).
- **REQ-C-uncapped-entry** : en comptage complet, le formulaire ajoute le couvert de chaque strate
  (B) et les nombres par groupe de dendromicrohabitats (F) ; la saisie et les scores du comptage
  rapide ne changent pas (D-07, D-09).
- **REQ-FT-route-test** : un testeur qui ne connaît pas la méthode choisit son parcours sans aide,
  dans un test enregistré dont le compte rendu est dans `docs/user-tests/` (critère 4, D-10).
- **REQ-C-route-group** : *phase 30.1 si la décision D-04 confirme la scission* : l'IBP d'un groupe
  de placettes se calcule en regroupant leurs données brutes, uniquement dans le paquet (D-03).

## 13. Validation

Validé par le propriétaire le :

Réponse du propriétaire :

Ces deux lignes sont remplies au plan 30-02, avec la date et la réponse écrite du propriétaire.
**Aucun plan n'encode une règle et aucun plan ne construit un écran tant qu'elles ne sont pas
remplies.**
