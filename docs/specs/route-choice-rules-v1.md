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
| 1 | Temps d'apprentissage d'un débutant : « une demi-journée » (S p. 19) ou « une journée » (M p. 17 et p. 19) | l'application n'écrit aucune durée d'apprentissage ; elle dit seulement de prévoir du temps (conseil `beginner`) | les deux documents ne s'accordent pas, aucun seuil n'est nécessaire au calcul |
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
