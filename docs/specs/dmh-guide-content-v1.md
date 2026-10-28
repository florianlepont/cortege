# Contenu du guide des dendromicrohabitats (v1)

Statut : validée par le propriétaire le 2026-10-27

Validée sans expert : le propriétaire a validé ce document seul le 2026-10-27, sans relecture par un
expert (section 12). Les seuils et l'exactitude des dessins n'ont été lus que par le propriétaire : les
essais sur le terrain peuvent encore y trouver des erreurs, qui se corrigent par une révision datée de
ce document.

Date de rédaction : 2026-10-26

Validation du propriétaire : validé par le propriétaire le 2026-10-27, sans expert (section 12)

Phase : 32, informations détaillées sur les dendromicrohabitats (V1). Cette spécification est la
source unique de chaque texte et de chaque nombre que le guide affichera : aucun plan de code ne
recopie un texte ni ne fixe une structure avant que le propriétaire l'ait relue et validée par écrit,
avec la date, et qu'un expert l'ait relue (précédent : `route-choice-rules-v1.md`, phase 30). Le coût
de cette phase est la justesse du contenu : un seuil faux égare un observateur et change les comptes
sur le terrain.

Sources, citées dans tout le document par leur lettre et le numéro de page imprimé :

- **G** : Bütler R., Lachat T., Krumm F., Kraus D., Larrieu L. (2024), _Guide de poche des
  dendromicrohabitats. Description et seuils de grandeur pour leur inventaire dans les forêts
  tempérées et méditerranéennes_, deuxième édition révisée, Birmensdorf : Institut fédéral de
  recherches sur la forêt, la neige et le paysage, 64 pages. Version française. Empreinte SHA-256
  `cc5fb0450b4dcf6c79b16e173fa7f28d5464035801b756b24950ba88e42a7e68`. Citée « G p. N ».
- **T** : Larrieu L., Paillet Y., Winter S., Bütler R., Kraus D., Krumm F., Lachat T., Michel A.K.,
  Regnery B., Vandekerkhove K. (2018), _Tree related microhabitats in temperate and Mediterranean
  European forests: a hierarchical typology for inventory standardization_, Ecological Indicators 84 :
  194-207, DOI 10.1016/j.ecolind.2017.08.051. Source de la typologie en quinze groupes. Non relu en
  texte intégral (accès fermé) : sa typologie est reprise par G et par I.
- **I** : Gonin P., Larrieu L., Marty P., Baiges T., Corezzola S., Miozzo M., Palero N. (2026),
  _Indice de Biodiversité Potentielle pour les forêts de France métropolitaine (IBP FR v3.2) :
  définition et fiches de relevé_, Centre national de la propriété forestière et unité Dynafor de
  l'Institut national de recherche pour l'agriculture, l'alimentation et l'environnement, 02/02/26,
  28 pages. Empreinte SHA-256 `f130b3d66522ec0f5692e87e361b628b4941ce9748d1ed5519a49734854bd001`.
  Citée « I p. N ».

Les deux documents G et I ont été téléchargés dans un dossier temporaire hors du dépôt, leur empreinte
a été comparée aux valeurs ci-dessus (identiques) et ils ont été relus en texte pour ce brouillon le
2026-10-26 (première lecture le 2026-10-23 pour la recherche de la phase). Aucun des deux n'est dans
le dépôt. Les numéros de type (« N. nom ») sont ceux de l'édition 2024 de G : ils ne sont jamais
montrés à l'observateur.

Convention : « G p. N » et « I p. N » désignent la page imprimée en pied de page. Les codes
(`dmh_01`, `cavities`) sont en anglais, entre accents graves. Tout le reste est du français.

## 1. Objet et champ

Le guide des dendromicrohabitats est une aide à la lecture, atteinte depuis le facteur F du relevé,
sans réseau, et embarquée dans l'application. Il explique, groupe par groupe, ce que l'IBP compte,
comment le reconnaître, avec quoi on le confond et où va ce qu'on confond, et il montre un dessin
original par groupe.

Ce que le guide ne fait jamais :

- il ne modifie aucune donnée enregistrée (`F.dmh_groups`, `F.dmh_counts`, `trees_per_ha`), ni le
  score, ni les règles de l'IBP, ni le schéma SQLite (version 5), ni l'API ;
- il ne calcule rien : il affiche le libellé de la fiche de l'IBP ;
- il ne remplace pas la fiche de l'IBP : le seuil de l'IBP décide toujours, et celui du guide de
  poche n'apparaît que comme écart signalé (section 6, bloc « Écart avec le guide de poche »).

Contenu de chaque groupe (décisions D-06, D-09 et D-11, modifiée le 2026-10-26) : une définition, la
règle de l'IBP, comment le reconnaître, les confusions fréquentes, les types décrits par le guide de
poche (comptés ou non par l'IBP) et un dessin original, montré fixe sur la page du groupe. Les photos
que l'observateur joindrait à un dendromicrohabitat sont hors de cette phase (phase 34, reportée).

## 2. Sources et licence

État des droits, tel que relevé (recherche du 2026-10-23, confirmé par la relecture de G et de I) :

- G porte seulement la mention de droits de l'Institut fédéral de recherches sur la forêt, la neige et
  le paysage, 2024. Aucune licence de réutilisation ne figure dans le document. Sept photographes et
  trois illustrateurs y sont crédités (G p. 64). Les droits sont donc à considérer comme réservés.
- T est un article d'une revue d'un éditeur commercial, sans licence ouverte.
- I est protégé par le droit d'auteur de ses auteurs et de leurs institutions. Son logo est une marque
  déposée, que l'application n'utilise pas (I p. 28).

Conséquence (décisions D-02, D-03 et D-09) : tous les textes sont écrits par l'association à partir
des faits (noms de types, seuils, tailles) sans recopier une phrase des trois documents ; aucune
image des documents n'est reproduite (les dessins sont ceux de l'association, section 9) ; les
sources sont citées sur la page « Sources et licence » de l'application (section 8). Si l'Institut
fédéral accorde un jour une autorisation écrite, une variante du texte de licence la remplace
(O-32-9).

Précédence des seuils : la fiche de l'IBP dit elle-même que ses seuils peuvent légèrement différer de
ceux du guide de poche et qu'il faut suivre les siens (I p. 7 et I p. 13). Dans tout ce document, le
seuil de l'IBP est la règle de comptage ; le seuil du guide de poche n'apparaît que dans la colonne
« Seuil du guide de poche s'il diffère » (section 5) et dans le bloc « Écart avec le guide de poche »
(section 6).

## 3. Vocabulaire

Ces règles lient chaque texte destiné à l'application (sections 6 et 8).

- **dendromicrohabitat** : écrit en toutes lettres partout dans l'application, défini une seule fois,
  sur le chapeau du catalogue, avant d'être réemployé. L'abréviation est refusée par la barrière des
  abréviations et n'est jamais écrite.
- **groupe** : l'un des quinze groupes de l'IBP. Son libellé est toujours celui de la liste du facteur
  F (`factorInput.dmhGroupOptions`, par exemple « 5. Aubier apparent »), jamais retapé ailleurs.
- **type** : un type du guide de poche. Son numéro n'est jamais montré.
- **forme** : l'une des sept formes du guide de poche (section 4).
- **guide de poche** : nom court de G dans les textes de l'application.
- **institutions** : écrites en toutes lettres (Institut fédéral de recherches sur la forêt, la neige
  et le paysage ; Centre national de la propriété forestière ; Institut national de recherche pour
  l'agriculture, l'alimentation et l'environnement). Jamais de sigle d'institution dans un texte de
  l'application.
- Unités autorisées : cm, cm2, m, ha, et « IBP ». Aucun autre sigle, aucun numéro de type, aucun code
  en snake_case dans un texte de l'application. Aucun tiret cadratin (U+2014) dans tout le fichier.
- Les surfaces s'écrivent « 600 cm2 (environ 25 cm sur 25 cm) » et « 300 cm2 (environ 17 cm sur
  17 cm) » : jamais de format de papier.

## 4. Formes

Les sept formes du guide de poche partitionnent les quinze groupes (G p. 10 et 11). La colonne
« Titre court sur la liste » est le titre des sections de la liste du facteur F ; la colonne « Nom
dans le guide de poche » est affichée sur la page du groupe (« Forme : ... »). Question O-32-2 : noms
courts sur la liste et noms officiels sur la page du groupe, ou noms officiels partout.

| Forme (code)      | Nom dans le guide de poche                        | Titre court sur la liste   | Groupes |
| ----------------- | ------------------------------------------------- | -------------------------- | ------- |
| `cavities`        | Cavités                                           | Cavités                    | 1 à 4   |
| `wounds`          | Blessures et bois apparent                        | Blessures et bois apparent | 5 et 6  |
| `crown_deadwood`  | Bois mort dans le houppier                        | Bois mort dans le houppier | 7       |
| `growths`         | Excroissances                                     | Excroissances              | 8 et 9  |
| `fruiting_bodies` | Sporophores de champignons et myxomycètes         | Champignons et myxomycètes | 10, 11  |
| `epiphytic`       | Structures épiphytiques, épixyliques ou parasites | Plantes, nids et microsols | 12 à 14 |
| `exudates`        | Exsudats                                          | Exsudats                   | 15      |

## 5. Table de correspondance

Croisement de la typologie de l'IBP (quinze groupes, `dmh_01` à `dmh_15`, I p. 3, 12 et 13) avec celle
du guide de poche (édition 2024 : sept formes, dix-sept groupes, 52 types numérotés, G p. 3 à 63). La
table suit la structure que le code lira (`mobile/src/app/dmh-guide/structure.ts`, plan 32-10) :
la cellule « Forme » est le code de la forme de la section 4 ; les cellules de types sont des suites
« N. nom » séparées par « ; » (N est le numéro de l'édition 2024), ou « aucun ». La règle de l'IBP porte
sa page ; le seuil du guide de poche n'est donné que s'il diffère de celui de l'IBP, avec sa page.

| Code     | Groupe IBP                                       | Forme             | Types comptés par l'IBP                                                                                                                                                                                                                                    | Types décrits, non comptés                                      | Règle IBP (méthode 3.2)                                                                                                                                                                                                               | Seuil du guide de poche s'il diffère                                                                                                                                                  |
| -------- | ------------------------------------------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dmh_01` | 1. Loges de pic                                  | `cavities`        | 1. Loge de petite taille ; 2. Loge de taille moyenne ; 3. Loge de grande taille ; 4. Flûte de pic                                                                                                                                                          | aucun                                                           | Les quatre types comptent : entrée de moins de 4 cm, de 4 à 7 cm, de plus de 10 cm, ou au moins 3 loges en ligne dont l'entrée dépasse 3 cm (I p. 3 et 12)                                                                            | aucun écart relevé (G p. 12 à 15)                                                                                                                                                     |
| `dmh_02` | 2. Cavités à terreau                             | `cavities`        | 5. Cavité à terreau de pied ; 6. Cavité à terreau de tronc ; 7. Cavité à terreau semi-ouverte ; 8. Cavité à terreau ouverte vers le haut, en contact avec le sol ; 9. Cavité à terreau ouverte vers le haut, sans contact avec le sol ; 10. Branche creuse | aucun                                                           | Ouverture de plus de 10 cm, ou de plus de 30 cm si la cavité est semi-ouverte ou ouverte vers le haut (I p. 3 et 12)                                                                                                                  | aucun écart relevé (G p. 16 à 21)                                                                                                                                                     |
| `dmh_03` | 3. Orifices et galeries d'insectes               | `cavities`        | 11. Orifices et galeries d'insectes                                                                                                                                                                                                                        | aucun                                                           | Orifice de plus de 2 cm de diamètre (I p. 3 et 12)                                                                                                                                                                                    | Orifice de plus de 2 cm, ou nombreux orifices plus petits sur plus de 300 cm2 (G p. 22)                                                                                               |
| `dmh_04` | 4. Concavités                                    | `cavities`        | 12. Dendrotelme ; 13. Trou de nourrissage de pic ; 14. Concavité à fond dur de tronc ; 15. Concavité racinaire                                                                                                                                             | aucun                                                           | Ouverture de plus de 10 cm et profondeur de plus de 10 cm (I p. 3 et 12)                                                                                                                                                              | Dendrotelme : ouverture de plus de 15 cm (G p. 23) ; concavité racinaire : pente du toit de moins de 45 degrés en plus (G p. 26)                                                      |
| `dmh_05` | 5. Aubier apparent                               | `wounds`          | 16. Bois sans écorce ; 17. Blessure due au feu ; 18. Écorce décollée formant un abri ; 19. Écorce décollée formant une poche                                                                                                                               | aucun                                                           | Bois sans écorce ou blessure de feu sur plus de 600 cm2 ; écorce décollée avec un vide de plus de 1 cm, large et haute de plus de 10 cm (I p. 3 et 12)                                                                                | Bois sans écorce : plus de 300 cm2 (G p. 27)                                                                                                                                          |
| `dmh_06` | 6. Aubier et bois de cœur apparents              | `wounds`          | 20. Cime brisée ; 21. Bris de charpentière ; 22. Fente ; 23. Fente causée par la foudre ; 24. Fente à l'insertion d'une fourche                                                                                                                            | 25. Entailles de castor                                         | Cime brisée de plus de 20 cm de diamètre ; bris de charpentière au niveau du tronc sur plus de 300 cm2 ; fente de plus de 1 cm de large, 10 cm de profondeur et 30 cm de long (I p. 3 et 12)                                          | aucun écart de seuil sur les cinq types comptés (G p. 31 à 35) ; les entailles de castor (plus de 300 cm2, G p. 36) sont décrites par le guide de poche, non comptées par l'IBP       |
| `dmh_07` | 7. Bois mort dans le houppier                    | `crown_deadwood`  | 26. Branches mortes ; 27. Cime morte ; 28. Vestige de charpentière brisée                                                                                                                                                                                  | aucun                                                           | Branches mortes de plus de 20 cm de diamètre et de plus de 50 cm de long, ou de plus de 3 cm avec plus de 20 % du houppier mort ; cime morte de plus de 20 cm à la base ; vestige de plus de 20 cm et de plus de 50 cm (I p. 3 et 12) | Branches mortes : plus de 10 cm de diamètre, ou plus de 3 cm avec plus de 10 % de la couronne morte (G p. 37) ; cime morte : plus de 10 cm à la base (G p. 38)                        |
| `dmh_08` | 8. Agglomérations de gourmands ou de rameaux     | `growths`         | 29. Balai de sorcière ; 30. Gourmands ou brogne                                                                                                                                                                                                            | aucun                                                           | Balai de sorcière de plus de 50 cm ; brogne de plus de 5 gourmands (I p. 3 et 13)                                                                                                                                                     | aucun écart relevé (G p. 40 et 41)                                                                                                                                                    |
| `dmh_09` | 9. Loupes et chancres                            | `growths`         | 32. Loupe ; 33. Chancre                                                                                                                                                                                                                                    | aucun                                                           | Loupe ou chancre de plus de 20 cm de diamètre (I p. 3 et 13)                                                                                                                                                                          | Chancre : plus de 20 cm, ou grande partie du tronc couverte (G p. 44) ; loupe : aucun écart (G p. 43)                                                                                 |
| `dmh_10` | 10. Champignons pérennes                         | `fruiting_bodies` | 34. Polypore pérenne                                                                                                                                                                                                                                       | aucun                                                           | Polypore pérenne de plus de 5 cm de diamètre (I p. 3 et 13)                                                                                                                                                                           | aucun écart relevé (G p. 45)                                                                                                                                                          |
| `dmh_11` | 11. Champignons éphémères                        | `fruiting_bodies` | 35. Polypore annuel ; 36. Agaricale charnue                                                                                                                                                                                                                | 37. Champignons corticoïdes ; 38. Pyrénomycète ; 39. Myxomycète | Polypore annuel ou agaricale charnue de plus de 5 cm de diamètre, ou plus de 10 (I p. 3 et 13)                                                                                                                                        | aucun écart sur les deux types comptés (G p. 46 et 47) ; les trois autres types (G p. 48 à 50) sont décrits, non comptés                                                              |
| `dmh_12` | 12. Plantes et lichens épiphytiques ou parasites | `epiphytic`       | 40. Bryophyte (mousse et hépatique) ; 41. Lichen foliacé ou fruticuleux ; 42. Lierre ou liane ; 43. Fougère ; 44. Gui                                                                                                                                      | aucun                                                           | Mousses, lichens ou lierre et lianes sur plus de 20 % du tronc pour au moins l'un de ces types ; fougères de plus de 5 frondes ; gui, 10 boules de plus de 20 cm de diamètre (I p. 3 et 13)                                           | Mousses et lierre : plus de 10 % du tronc (G p. 51 et 53) ; lichens : plus de 10 % du tronc et plus de 1 cm d'épaisseur (G p. 52) ; gui : une boule de plus de 20 cm suffit (G p. 55) |
| `dmh_13` | 13. Nids                                         | `epiphytic`       | 45. Nid de vertébré                                                                                                                                                                                                                                        | 46. Nid d'invertébré                                            | Gros nid de vertébré de plus de 50 cm de diamètre (I p. 3 et 13)                                                                                                                                                                      | Nid de vertébré : plus de 10 cm de diamètre (G p. 56) ; nid d'invertébré : présence (G p. 57), non compté                                                                             |
| `dmh_14` | 14. Microsols                                    | `epiphytic`       | 49. Microsol du houppier                                                                                                                                                                                                                                   | 47. Microsol d'écorce ; 48. Microsol d'entre-écorce             | Microsol du houppier, à toute hauteur dans l'arbre (I p. 3 et 13)                                                                                                                                                                     | aucun écart de seuil sur le microsol du houppier (présence, G p. 60) ; deux autres sortes de microsols sont décrites (G p. 58 et 59), non comptées                                    |
| `dmh_15` | 15. Coulées de sève et de résine                 | `exudates`        | 51. Coulée de sève ; 52. Coulée de résine                                                                                                                                                                                                                  | aucun                                                           | Coulée de plus de 20 cm de long : sève active, résine fraîche ou ancienne (I p. 4 et 13)                                                                                                                                              | Coulée de sève ou de résine : plus de 10 cm de long (G p. 62 et 63)                                                                                                                   |

### Types sans groupe IBP

Le guide de poche décrit deux groupes qui n'ont aucun équivalent dans l'IBP.

| Type                           | Groupe du guide de poche (forme)       | Où l'application l'affiche                                                                                                                |
| ------------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 31. Galles                     | Galles (Excroissances), G p. 42        | Sur la fiche du groupe 9, sous « Décrits, mais non comptés » : défaut proposé, car les galles sont des excroissances voisines des loupes. |
| 50. Dépôt d'argile ou de limon | Dépôts alluviaux (Structures), G p. 61 | Nulle part dans l'application : listé ici seulement, il n'est pas lié à un groupe et se produit après une inondation.                     |

Le type 31 apparaît donc sur la fiche du groupe 9 mais pas dans la cellule « Types décrits, non
comptés » du groupe 9 de la table : la table ne range un type dans un groupe que si le guide de poche
le range dans ce groupe.

Vérification du compte : 43 types comptés, 9 non comptés, 52 au total. Les 9 non comptés sont les types
25 (dans le groupe 6), 37, 38 et 39 (groupe 11), 46 (groupe 13), 47 et 48 (groupe 14) et les deux types
sans groupe IBP, 31 et 50. La fiche de l'IBP dit s'appuyer sur 41 types (I p. 7) : elle réunit en une
seule vignette les deux cavités ouvertes vers le haut (types 8 et 9) et range la fente causée par la
foudre (type 23) comme variante de la fente, ce qui explique les deux types de différence avec les 43
du guide de poche (lecture à faire confirmer par l'expert, voir la liste des points à vérifier à la fin
de la section 6).

## 6. Fiches des groupes

Règles que suit chaque fiche :

- Les textes sont écrits par l'association avec ses propres mots, à partir des faits relevés dans G,
  T et I (noms, seuils, tailles). Aucune phrase de ces documents n'est reprise (D-02, D-09).
- La règle de l'IBP (méthode 3.2, I) décide du comptage et vient toujours en premier après la
  définition. Le repère de page en fin de règle (« fiche de l'IBP, pages 3 et 12 ») fait partie du
  texte affiché.
- Le seuil du guide de poche n'apparaît que dans « Écart avec le guide de poche », pour les neuf groupes
  concernés : 3, 4, 5, 6, 7, 12, 13, 14 et 15. Pour les groupes 6 et 14, l'écart ne porte pas sur un
  seuil mais sur ce que le guide de poche décrit en plus et que l'IBP ne compte pas.
- Pour les groupes 6, 12 et 15, la ligne « Méthode 3.0 » remplace la règle quand le relevé suit la
  méthode IBP version 3.0 (la fiche de la version 3.0 n'est plus en ligne : son libellé vient de
  `docs/technical/ibp-version-comparison-v3.0-v3.2.md`, lignes F-1 à F-3).
- Limites par champ : définition 1 à 2 phrases ; règle de l'IBP 1 à 3 phrases ; comment le
  reconnaître 2 à 4 phrases ; 2 à 4 confusions, chacune disant où va ce qu'on confond (« va dans le
  groupe N » ou « ne compte pas ») ; écart 1 phrase ; texte du dessin 1 phrase de moins de 20 mots.
- Aucun sigle, aucun numéro de type, aucun code, aucun tiret cadratin dans ces textes. Les noms de
  types sont ceux de la section 5, sans leur numéro.
- Le texte du dessin est la phrase lue à voix haute aux personnes qui utilisent un lecteur d'écran ;
  elle décrit le dessin livré (section 9), vu et relu pour ce brouillon.
- La liste des points à faire vérifier par l'expert est à la fin de cette section.

### `dmh_01` 1. Loges de pic

**Mots-clés** : pic, loge, loge de pic, trou de pic, trou rond, nid, nidification, flute, pic noir, pic epeiche, pic vert

**Définition** : Une loge de pic est un trou rond, creusé par un pic dans un tronc ou une grosse branche pour y nicher. Elle compte même si un autre animal l'occupe aujourd'hui.

**Ce qui compte pour l'IBP (méthode 3.2)** : Les quatre sortes de loges comptent, selon la taille de l'entrée : petite (moins de 4 cm), moyenne (de 4 à 7 cm), grande (plus de 10 cm), ou « flûte », c'est-à-dire au moins trois loges alignées sur le tronc dont l'entrée dépasse 3 cm (fiche de l'IBP, pages 3 et 12).

**Comment le reconnaître** : Cherchez une entrée nette, au bord franc, ronde ou ovale et haute pour les plus gros pics. Les petites loges sont souvent dans une branche morte, les moyennes dans du bois en décomposition, les grandes sur un tronc sans branche. Dans une flûte, deux loges voisines sont séparées d'au plus 2 m.

**Confusions fréquentes** :

- Un trou en entonnoir, plus large à l'entrée qu'au fond, creusé par un pic pour se nourrir, n'est pas une loge : il va dans le groupe 4.
- Une ouverture irrégulière qui laisse voir du terreau brun et friable est une cavité à terreau : elle va dans le groupe 2.
- De petits trous d'insectes dispersés ne sont pas des loges : ils vont dans le groupe 3 s'ils dépassent 2 cm, sinon ils ne comptent pas.

**Types comptés** : Loge de petite taille ; Loge de taille moyenne ; Loge de grande taille ; Flûte de pic

**Types décrits, non comptés** : aucun

**Texte du dessin** : Un tronc portant une grande loge ovale et, plus bas, deux petites loges rondes au centre sombre.

### `dmh_02` 2. Cavités à terreau

**Mots-clés** : terreau, cavite, creux, carie, arbre creux, tronc creux, pied creux, cheminee, branche creuse

**Définition** : Une cavité à terreau est un creux du bois, abrité de la pluie par un plafond, qui contient du terreau : une matière brune et friable faite de bois décomposé, de déjections et de restes d'animaux. Elle peut se trouver au pied de l'arbre, plus haut dans le tronc ou dans une grosse branche creuse.

**Ce qui compte pour l'IBP (méthode 3.2)** : L'ouverture doit mesurer plus de 10 cm, ou plus de 30 cm si la cavité est semi-ouverte (la pluie peut y entrer) ou ouverte vers le haut comme une cheminée (fiche de l'IBP, pages 3 et 12).

**Comment le reconnaître** : Regardez un creux dont l'ouverture est plus large que celle d'une loge de pic, aux bords irréguliers, sombre à l'intérieur. Le terreau se voit à l'ouverture ou sur le plancher du creux. Au pied de l'arbre, le plancher touche le sol, même si l'entrée est assez haute sur le tronc ; dans le tronc, le plancher est au-dessus du sol. Une branche creuse forme un tube dans une grosse branche brisée.

**Confusions fréquentes** :

- Un creux à fond dur, sans terreau, entre les racines ou dans le tronc est une concavité : il va dans le groupe 4.
- Dans une fourche, une cuvette qui retient l'eau est une concavité (groupe 4) ; si le bois y est altéré, c'est une cavité à terreau.
- Un simple tas de terre ou de feuilles au pied de l'arbre n'est pas du terreau : il ne compte pas.
- Une loge de pic est un trou rond et net, sans terreau : elle va dans le groupe 1.

**Types comptés** : Cavité à terreau de pied ; Cavité à terreau de tronc ; Cavité à terreau semi-ouverte ; Cavité à terreau ouverte vers le haut, en contact avec le sol ; Cavité à terreau ouverte vers le haut, sans contact avec le sol ; Branche creuse

**Types décrits, non comptés** : aucun

**Texte du dessin** : Un pied de tronc vu de l'extérieur, puis en coupe : une cavité voûtée avec du terreau au fond.

### `dmh_03` 3. Orifices et galeries d'insectes

**Mots-clés** : insecte, trou d'insecte, galerie, scolyte, orifice, larve, xylophage, sciure, tunnel

**Définition** : Ce sont des trous de sortie et des galeries creusés dans le bois par des larves d'insectes qui se nourrissent de bois. Les galeries forment un réseau de couloirs et de chambres, que l'on voit surtout là où l'écorce est tombée.

**Ce qui compte pour l'IBP (méthode 3.2)** : Un orifice compte à partir de 2 cm de diamètre (fiche de l'IBP, pages 3 et 12).

**Comment le reconnaître** : Cherchez des trous ronds ou ovales de plus de 2 cm dans l'écorce ou dans le bois, souvent entourés de fine sciure. Là où l'écorce est tombée, les galeries se voient gravées dans le bois : un couloir principal et des couloirs plus fins qui partent de chaque côté. Approchez-vous de l'arbre et mesurez le trou avant de le compter.

**Confusions fréquentes** :

- De minuscules trous dispersés, de moins de 2 cm, ne comptent pas.
- Un trou net et rond avec une chambre à l'intérieur est une loge de pic : il va dans le groupe 1.
- Une poche de pourriture n'est pas un trou d'insecte : elle ne compte pas ; une grande fente va dans le groupe 6.

**Écart avec le guide de poche** : Le guide de poche retient aussi de nombreux orifices plus petits répartis sur plus de 300 cm2 (environ 17 cm sur 17 cm), l'IBP retient seulement les orifices de plus de 2 cm.

**Types comptés** : Orifices et galeries d'insectes

**Types décrits, non comptés** : aucun

**Texte du dessin** : Un tronc avec des trous ronds et, au centre, une plaque d'écorce tombée montrant des galeries dans le bois.

### `dmh_04` 4. Concavités

**Mots-clés** : concavite, creux, cuvette, dendrotelme, eau, fourche, racine, contrefort, trou de nourrissage, pic

**Définition** : Une concavité est un creux ou une cuvette dans le bois, sec ou rempli d'eau, sans terreau, qui n'a pas été creusé par un insecte. Elle prend quatre formes : la cuvette qui retient l'eau de pluie (dendrotelme), le trou en entonnoir qu'un pic creuse pour se nourrir, le creux à fond dur dans le tronc et le creux entre les racines et le sol.

**Ce qui compte pour l'IBP (méthode 3.2)** : L'ouverture doit dépasser 10 cm et la profondeur aussi (fiche de l'IBP, pages 3 et 12).

**Comment le reconnaître** : Le creux a un fond dur et des parois couvertes d'écorce ou de bois sain, sans matière brune qui s'effrite. Au pied de l'arbre, c'est un vide entre des racines ou des contreforts et le sol. Dans une fourche ou sur une grosse branche, c'est une cuvette qui garde l'eau de pluie et des feuilles mortes. Le trou de nourrissage d'un pic est conique : plus large à l'ouverture qu'au fond.

**Confusions fréquentes** :

- Si le creux contient du terreau brun et friable, c'est une cavité à terreau : elle va dans le groupe 2.
- Un trou rond et net, creusé par un pic pour nicher, est une loge de pic : il va dans le groupe 1.
- Une écorce arrachée, sans profondeur, n'est pas une concavité : elle va dans le groupe 5.

**Écart avec le guide de poche** : Le guide de poche retient plus de 15 cm d'ouverture pour la cuvette qui retient l'eau et une pente du toit de moins de 45 degrés pour le creux entre les racines, l'IBP retient plus de 10 cm d'ouverture et ne mentionne pas de pente.

**Types comptés** : Dendrotelme ; Trou de nourrissage de pic ; Concavité à fond dur de tronc ; Concavité racinaire

**Types décrits, non comptés** : aucun

**Texte du dessin** : Une cuvette au creux d'une fourche, et un autre tronc dont le pied s'ouvre en arche.

### `dmh_05` 5. Aubier apparent

**Mots-clés** : bois nu, ecorce tombee, ecorce arrachee, ecorce decollee, brulure, feu, blessure, aubier, cicatrice, abri, chauve-souris

**Définition** : L'aubier apparent est le bois clair mis à nu parce que l'écorce a disparu : écorce arrachée, cicatrice de feu, ou écorce décollée qui laisse un vide derrière elle. L'écorce peut avoir été arrachée par un abattage, un débardage, une chute d'arbre ou de pierres, ou par un animal.

**Ce qui compte pour l'IBP (méthode 3.2)** : Comptent le bois sans écorce ou la blessure de feu sur plus de 600 cm2 (environ 25 cm sur 25 cm), ou l'écorce décollée avec un vide de plus de 1 cm derrière elle et plus de 10 cm de large et de haut (fiche de l'IBP, pages 3 et 12).

**Comment le reconnaître** : Une plage de bois clair et lisse apparaît dans l'écorce, et l'écorce forme un bord net tout autour. Une écorce décollée se détache du tronc comme une plaque : elle forme un abri si son ouverture est en bas, une poche si elle est en haut. Une cicatrice de feu est souvent triangulaire à la base du tronc, avec du bois noirci.

**Confusions fréquentes** :

- Une petite éraflure de l'écorce, sous 600 cm2, ne compte pas.
- Un bois mis à nu par un éclatement du tronc, une cassure ou une longue fente va dans le groupe 6.
- Un creux profond avec du terreau est une cavité à terreau : il va dans le groupe 2.
- Un champignon qui pousse sur la plage nue ne la remplace pas : l'arbre compte aussi dans le groupe 10 ou 11.

**Écart avec le guide de poche** : Le guide de poche retient plus de 300 cm2 de bois sans écorce, l'IBP retient plus de 600 cm2 (environ 25 cm sur 25 cm).

**Types comptés** : Bois sans écorce ; Blessure due au feu ; Écorce décollée formant un abri ; Écorce décollée formant une poche

**Types décrits, non comptés** : aucun

**Texte du dessin** : Une plage de bois nu aux bords irréguliers sur un tronc, avec une plaque d'écorce décollée sur le côté.

### `dmh_06` 6. Aubier et bois de cœur apparents

**Mots-clés** : cime brisee, fente, fissure, eclatement, cassure, bris, charpentiere, branche arrachee, foudre, bois de coeur, fourche, castor

**Définition** : Du bois de cœur, parfois aussi de l'aubier, est mis à nu sur un arbre vivant par une cassure ou un éclatement du bois : cime brisée, grosse branche arrachée au niveau du tronc, ou fente. Le bord de la blessure est entouré de bois vivant.

**Ce qui compte pour l'IBP (méthode 3.2)** : Comptent une cime brisée de plus de 20 cm de diamètre, un bris de charpentière au niveau du tronc sur plus de 300 cm2 (environ 17 cm sur 17 cm), ou une fente de plus de 1 cm de large, de plus de 10 cm de profondeur et de plus de 30 cm de long (fiche de l'IBP, pages 3 et 12).

**Méthode 3.0** : Comptent une cime brisée de plus de 20 cm de diamètre, un bris de charpentière au niveau du tronc de plus de 20 cm de diamètre ou de plus de 300 cm2, ou une fente de plus de 1 cm de large, de plus de 10 cm de profondeur et de plus de 30 cm de long (fiche de l'IBP version 3.0).

**Comment le reconnaître** : Le bois est nu parce qu'il a cassé ou éclaté, pas seulement parce que l'écorce est tombée : bord déchiqueté, esquilles, ou fente longue et ouverte. Le bord de la blessure est souvent entouré d'un bourrelet d'écorce vivante qui cherche à la refermer. Une fente causée par la foudre est souvent en spirale, avec plusieurs fentes et du bois éclaté. Regardez aussi les fourches : une fente peut s'ouvrir à l'insertion de deux branches.

**Confusions fréquentes** :

- Si seule l'écorce a disparu, sans cassure ni fente, c'est de l'aubier apparent : il va dans le groupe 5.
- Une branche cassée dont le bout éclaté reste dans le houppier, sans toucher le tronc, va dans le groupe 7.
- Une branche coupée compte ici seulement si elle est coupée à ras du tronc et si la surface sans écorce dépasse 300 cm2 ; si le reste de la branche est entièrement mort, long de plus de 50 cm et de plus de 20 cm de diamètre, elle va dans le groupe 7 ; dans les autres cas, elle ne compte pas.
- Une vieille souche bien séparée des brins vivants d'une cépée ne compte pas.

**Écart avec le guide de poche** : Le guide de poche retient aussi les entailles de castor sur plus de 300 cm2, l'IBP ne les retient pas.

**Types comptés** : Cime brisée ; Bris de charpentière ; Fente ; Fente causée par la foudre ; Fente à l'insertion d'une fourche

**Types décrits, non comptés** : Entailles de castor

**Texte du dessin** : Un tronc avec, sur le côté, une cassure déchiquetée et, au milieu, une longue fente en zigzag.

### `dmh_07` 7. Bois mort dans le houppier

**Mots-clés** : bois mort, branche morte, cime morte, houppier, couronne, charpentiere, moignon, vestige, chandelle

**Définition** : C'est du bois mort encore attaché à l'arbre vivant, dans le houppier : grosses branches mortes, cime entièrement morte, ou reste éclaté d'une grosse branche cassée. Ce bois sèche et chauffe au soleil, et abrite d'autres espèces que le bois mort tombé au sol.

**Ce qui compte pour l'IBP (méthode 3.2)** : Comptent des branches mortes de plus de 20 cm de diamètre et de plus de 50 cm de long, ou de plus de 3 cm de diamètre si plus de 20 % du houppier est mort ; une cime morte de plus de 20 cm de diamètre à la base ; le reste d'une grosse branche cassée, de plus de 20 cm de diamètre et de plus de 50 cm de long (fiche de l'IBP, pages 3 et 12).

**Comment le reconnaître** : Reculez et regardez dans le houppier : des branches sans feuilles ni aiguilles au milieu d'un feuillage vivant, une pointe morte au sommet, ou un moignon épais et éclaté. Les petites brindilles mortes ne comptent pas : il faut du gros bois, ou une grande part du houppier morte.

**Confusions fréquentes** :

- Une cime cassée qui met à nu le bois du tronc vivant va dans le groupe 6.
- Un arbre sans feuilles en hiver n'a pas forcément de bois mort : regardez les bourgeons et l'écorce avant de conclure.
- Des brindilles mortes isolées ne comptent pas.
- Un arbre entièrement mort ne compte pas : la méthode ne compte que les arbres vivants.

**Écart avec le guide de poche** : Le guide de poche retient des branches de plus de 10 cm de diamètre, ou de plus de 3 cm avec plus de 10 % du houppier mort, et une cime morte de plus de 10 cm à la base, l'IBP retient plus de 20 cm de diamètre avec plus de 50 cm de long, ou plus de 20 % du houppier mort, et plus de 20 cm à la base pour la cime.

**Types comptés** : Branches mortes ; Cime morte ; Vestige de charpentière brisée

**Types décrits, non comptés** : aucun

**Texte du dessin** : À gauche un houppier feuillu vivant ; à droite de grosses branches mortes sans feuilles et une pointe morte.

### `dmh_08` 8. Agglomérations de gourmands ou de rameaux

**Mots-clés** : balai de sorciere, brogne, gourmand, rameaux, pousses, touffe, rejets, bourgeons dormants

**Définition** : C'est un amas dense de jeunes pousses qui sortent d'un même point : soit un balai de sorcière, boule de rameaux serrés sur une branche, soit une brogne, touffe de gourmands sur le tronc. Ces pousses naissent de bourgeons dormants de l'arbre.

**Ce qui compte pour l'IBP (méthode 3.2)** : Comptent un balai de sorcière de plus de 50 cm, ou une brogne de plus de 5 gourmands (fiche de l'IBP, pages 3 et 13).

**Comment le reconnaître** : Un balai de sorcière se voit surtout dans le houppier, ou en hiver sur un arbre sans feuilles : une grosse boule de petites tiges serrées, sans ramification régulière, bien plus épaisse que la branche qui la porte. Une brogne est une touffe de pousses fines qui sortent directement de l'écorce du tronc. Comptez les pousses de la touffe : il en faut plus de 5.

**Confusions fréquentes** :

- Une boule de gui ressemble à un balai de sorcière, surtout en hiver : le gui est une plante qui vit sur l'arbre, aux tiges fourchues et aux feuilles épaisses, et il va dans le groupe 12.
- Quelques gourmands isolés, 5 ou moins, ne comptent pas.
- Un enchevêtrement de rameaux morts ne compte pas ici : un balai de sorcière est fait de pousses vivantes.
- Un nid d'oiseau vu d'en bas peut ressembler à un balai : il est fait de branchages posés, avec un creux sur le dessus, et il va dans le groupe 13 s'il dépasse 50 cm.

**Types comptés** : Balai de sorcière ; Gourmands ou brogne

**Types décrits, non comptés** : aucun

**Texte du dessin** : Une touffe de pousses fines sur un tronc, et une grosse boule de rameaux enchevêtrés au bout d'une branche.

### `dmh_09` 9. Loupes et chancres

**Mots-clés** : loupe, chancre, bosse, excroissance, tumeur, broussin, bourrelet, boule de bois, galle

**Définition** : C'est une excroissance du tronc en forme de boule de bois plus ou moins compacte. La loupe est un renflement arrondi, à l'écorce rugueuse, dont le bois reste sain ; le chancre est une plaie malade, où le bois est pourri et l'écorce ouverte.

**Ce qui compte pour l'IBP (méthode 3.2)** : La loupe ou le chancre doit dépasser 20 cm de diamètre (fiche de l'IBP, pages 3 et 13).

**Comment le reconnaître** : La loupe se voit de profil comme une bosse arrondie sur le tronc, que l'écorce continue de recouvrir. Le chancre est une plaie irrégulière, souvent enfoncée, avec des bourrelets en cercles autour d'un centre sombre ou pourri, une écorce ouverte ou craquelée et parfois du bois visible. Mesurez la plus grande largeur de l'excroissance.

**Confusions fréquentes** :

- Une touffe de pousses serrées sur le tronc est une brogne : elle va dans le groupe 8.
- Un creux est un trou, une loupe est une bosse : un creux dans le tronc va dans le groupe 2 ou 4.
- Les galles sont de petites déformations des feuilles, des rameaux ou des bourgeons : ce ne sont pas des loupes et elles ne comptent pas pour l'IBP.
- Une loupe et un chancre comptent tous deux ici : inutile de les distinguer pour le comptage, ils vont dans le groupe 9.

**Types comptés** : Loupe ; Chancre

**Types décrits, non comptés** : Galles

**Texte du dessin** : Un renflement arrondi sur le profil d'un tronc, et une plaie à bourrelets emboîtés avec un centre hachuré.

### `dmh_10` 10. Champignons pérennes

**Mots-clés** : champignon, polypore, amadouvier, sabot, console, perenne, champignon dur, ligneux, tubes

**Définition** : C'est la fructification d'un champignon du bois qui vit plusieurs années : un polypore en console ou en sabot, dur comme du bois. Il grossit chaque année et ajoute une couche de tubes sous lui.

**Ce qui compte pour l'IBP (méthode 3.2)** : Un polypore pérenne compte à partir de 5 cm de diamètre (fiche de l'IBP, pages 3 et 13).

**Comment le reconnaître** : Cherchez une console ou un sabot dur sur le tronc, dont le dessus porte des bourrelets en arcs et dont le dessous est percé de petits pores. On ne l'écrase pas à la main. Il reste en place toute l'année, et sur la tranche d'un vieux champignon on voit plusieurs couches de tubes superposées.

**Confusions fréquentes** :

- Un champignon mou ou élastique, avec une seule couche de tubes, est éphémère : il va dans le groupe 11.
- Un champignon charnu à lamelles est éphémère, même s'il est gros : il va dans le groupe 11.
- Une croûte noire et dure en pustule ou en demi-sphère n'est pas un polypore : elle ne compte pas pour l'IBP.
- Un champignon posé sur une plage de bois nu compte ici, et l'arbre compte aussi dans le groupe 5 ou 6 : un arbre compte une fois par groupe.

**Types comptés** : Polypore pérenne

**Types décrits, non comptés** : aucun

**Texte du dessin** : Un tronc portant trois champignons durs en console, aux bourrelets en arcs concentriques.

### `dmh_11` 11. Champignons éphémères

**Mots-clés** : champignon, polypore annuel, agaricale, lamelles, chapeau, ephemere, mou, charnu, myxomycete, croute

**Définition** : Ce sont des fructifications de champignons du bois qui ne poussent qu'une année et restent au moins quelques semaines : petits polypores souples en console, ou gros champignons charnus à lamelles qui poussent sur le bois.

**Ce qui compte pour l'IBP (méthode 3.2)** : Un polypore annuel ou un champignon charnu à lamelles compte s'il dépasse 5 cm de diamètre, ou s'il y en a plus de 10 ensemble (fiche de l'IBP, pages 3 et 13).

**Comment le reconnaître** : Cherchez des consoles minces ou des chapeaux fixés directement sur l'écorce ou sur le bois nu, sur le tronc ou une branche d'un arbre vivant. Un polypore annuel est souple ou coriace, jamais dur comme du bois, avec une seule couche de tubes. Un champignon à lamelles est épais et charnu, et se décompose vite.

**Confusions fréquentes** :

- Un polypore dur, ligneux, qui dure des années est un champignon pérenne : il va dans le groupe 10.
- Un champignon qui pousse sur le sol n'est pas un dendromicrohabitat : il ne compte pas.
- Les croûtes de champignons, les petites pustules noires et dures et les masses gélatineuses de myxomycètes sont décrites par le guide de poche, mais ne comptent pas pour l'IBP.
- Les mousses et les lichens sur l'écorce vont dans le groupe 12.

**Types comptés** : Polypore annuel ; Agaricale charnue

**Types décrits, non comptés** : Champignons corticoïdes ; Pyrénomycète ; Myxomycète

**Texte du dessin** : Une souche avec trois petites consoles superposées d'un côté et un champignon à chapeau de l'autre.

### `dmh_12` 12. Plantes et lichens épiphytiques ou parasites

**Mots-clés** : mousse, lichen, lierre, liane, clematite, fougere, gui, epiphyte, plante, parasite, bryophyte

**Définition** : Ce sont des mousses, des lichens, des plantes grimpantes, des fougères et du gui qui utilisent l'arbre surtout comme support. Le gui puise un peu de la sève de l'arbre ; mousses et lichens s'en servent seulement comme appui.

**Ce qui compte pour l'IBP (méthode 3.2)** : Comptent des mousses, des lichens ou du lierre et des lianes sur plus de 20 % du tronc, pour au moins l'un de ces types ; des fougères de plus de 5 frondes ; du gui avec 10 boules de plus de 20 cm de diamètre (fiche de l'IBP, pages 3 et 13).

**Méthode 3.0** : Comptent des mousses, des lichens ou du lierre et des lianes sur plus de 20 % du tronc, ou du gui avec 10 boules de plus de 20 cm de diamètre. Les fougères ne comptent pas dans la version 3.0 (fiche de l'IBP version 3.0).

**Comment le reconnaître** : Les mousses forment un tapis vert, les lichens des lobes plats ou de petits buissons gris-vert collés à l'écorce. Le lierre ou la clématite monte le long du tronc. Les fougères poussent directement sur le tronc ou à l'insertion d'une branche. Le gui est une touffe ronde et verte, bien visible dans le houppier.

**Confusions fréquentes** :

- Le gui ressemble à un balai de sorcière, qui est une touffe de rameaux de l'arbre lui-même : le balai va dans le groupe 8.
- Une pellicule verte ou sale, sans relief, n'est pas de la mousse : elle ne compte pas.
- Les champignons, même sur un lichen, ne comptent pas ici : ils vont dans le groupe 10 ou 11.
- Une herbe ou un arbuste qui pousse au pied de l'arbre ne compte pas ; le lierre ou la liane qui monte sur le tronc compte, même enracinée dans le sol.

**Écart avec le guide de poche** : Le guide de poche retient plus de 10 % du tronc pour les mousses, les lichens (sur plus de 1 cm d'épaisseur) et le lierre, et une seule boule de gui de plus de 20 cm, l'IBP retient plus de 20 % du tronc pour au moins l'un de ces types et 10 boules de gui de plus de 20 cm.

**Types comptés** : Bryophyte (mousse et hépatique) ; Lichen foliacé ou fruticuleux ; Lierre ou liane ; Fougère ; Gui

**Types décrits, non comptés** : aucun

**Texte du dessin** : Un tronc avec mousse, lierre grimpant, lichens, fougère, et une touffe de gui sur une branche.

### `dmh_13` 13. Nids

**Mots-clés** : nid, oiseau, rapace, ecureuil, branchages, aire, vertebre, rongeur, fourche

**Définition** : C'est un gros nid d'oiseau ou de rongeur, fait de branchages et posé dans une fourche ou contre le tronc. Les loges de pic ne sont pas des nids ici : elles ont leur propre groupe.

**Ce qui compte pour l'IBP (méthode 3.2)** : Seul un gros nid de vertébré compte, de plus de 50 cm de diamètre (fiche de l'IBP, pages 3 et 13).

**Comment le reconnaître** : Cherchez, souvent en regardant d'en dessous, une plate-forme ou une boule de branchages entrecroisés dans une fourche, contre le tronc ou dans le houppier. Un nid a un creux sur le dessus, et ses brindilles partent dans tous les sens. Pour compter, il doit dépasser 50 cm, donc être bien plus large que la branche qui le porte.

**Confusions fréquentes** :

- Une loge de pic ou une cavité occupée par un oiseau va dans le groupe 1 ou 2 : elle ne compte pas ici.
- Un balai de sorcière ou une boule de gui, vus d'en bas, ressemblent à un nid : le balai va dans le groupe 8, le gui dans le groupe 12.
- Un peu de terre prise dans une fourche est un microsol, pas un nid : elle va dans le groupe 14.
- Un nid d'insectes, comme celui des chenilles processionnaires, est décrit par le guide de poche mais ne compte pas pour l'IBP.

**Écart avec le guide de poche** : Le guide de poche retient les nids de vertébré de plus de 10 cm de diamètre, l'IBP retient seulement les gros nids de plus de 50 cm de diamètre.

**Types comptés** : Nid de vertébré

**Types décrits, non comptés** : Nid d'invertébré

**Texte du dessin** : Un gros nid de branchages avec deux œufs, posé au sommet d'un tronc qui s'évase.

### `dmh_14` 14. Microsols

**Mots-clés** : microsol, terre, humus, fourche, houppier, couronne, racines, mousse, sol aerien

**Définition** : Un microsol est une petite couche de sol jeune qui se forme sur l'arbre lui-même, à partir de brindilles, de feuilles, d'écorce et de mousses décomposées. On le trouve surtout dans le houppier, dans une fourche ou sur une zone plate d'une grosse branche, et des racines fines de l'arbre y pénètrent souvent.

**Ce qui compte pour l'IBP (méthode 3.2)** : Seul le microsol du houppier compte, à toute hauteur dans l'arbre (fiche de l'IBP, pages 3 et 13).

**Comment le reconnaître** : Cherchez une terre sombre et friable, comme du terreau de jardin, installée dans une fourche, au creux d'une grosse branche ou sur une zone plate du houppier. Elle porte souvent de la mousse ou de petites plantes, et des racines fines y descendent. On la trouve surtout sur de vieux arbres.

**Confusions fréquentes** :

- Du bois pourri au fond d'une cavité est du terreau : il va dans le groupe 2.
- Des feuilles qui s'accumulent sans former d'humus, sur du bois abîmé ou une souche, ne sont pas un microsol ; dans une fourche, c'est une cuvette à eau (groupe 4) ou une cavité à terreau si le bois est altéré (groupe 2).
- Un nid est fait de branchages posés, pas de terre : il va dans le groupe 13.
- Les plantes qui poussent dans ce sol se comptent à part, dans le groupe 12.

**Écart avec le guide de poche** : Le guide de poche retient trois sortes de microsols (sur l'écorce du tronc, entre les écorces et dans le houppier), l'IBP retient seulement celui du houppier.

**Types comptés** : Microsol du houppier

**Types décrits, non comptés** : Microsol d'écorce ; Microsol d'entre-écorce

**Texte du dessin** : Une grosse fourche de deux branches avec, dans l'angle, un tas de terre sombre portant un peu de mousse.

### `dmh_15` 15. Coulées de sève et de résine

**Mots-clés** : seve, resine, coulee, ecoulement, suintement, blessure, conifere, exsudat, gomme

**Définition** : Une coulée est un écoulement de sève (sur les feuillus, liquide et sombre) ou de résine (sur les conifères, épaisse, collante, jaune ou blanchâtre) qui part d'une blessure ou d'une fente et descend le long de l'écorce.

**Ce qui compte pour l'IBP (méthode 3.2)** : La coulée doit mesurer plus de 20 cm de long : sève active, ou résine fraîche ou ancienne (fiche de l'IBP, pages 4 et 13).

**Méthode 3.0** : Seule compte une coulée de sève active de plus de 20 cm de long (fiche de l'IBP version 3.0).

**Comment le reconnaître** : Une traînée mouillée et brillante part d'une blessure, d'une fente ou d'un moignon de branche et descend le long de l'écorce. La résine forme une masse épaisse, jaune, ambrée ou blanchâtre, qui durcit à l'air, sur un conifère. Mesurez la coulée sur toute sa longueur.

**Confusions fréquentes** :

- Une trace de pluie ou d'algues ne part pas d'une blessure : elle ne compte pas.
- Une coulée de sève sèche et ancienne n'est plus une coulée active : elle ne compte pas.
- Un bois mis à nu sans écoulement va dans le groupe 5 ou 6, selon que seule l'écorce manque ou que le bois est cassé.
- Une coulée de moins de 20 cm ne compte pas, même si elle est active.

**Écart avec le guide de poche** : Le guide de poche retient une coulée de plus de 10 cm de long, l'IBP retient plus de 20 cm.

**Types comptés** : Coulée de sève ; Coulée de résine

**Types décrits, non comptés** : aucun

**Texte du dessin** : Une longue coulée de sève sous une blessure, et une coulée de résine épaisse sur une écorce de conifère.

### Points à faire vérifier par l'expert

Ces points ne vont pas dans l'application. Ils listent ce que les documents G et I ne permettent pas
de trancher seuls ou ce que le brouillon a déduit ; l'expert les lit avec les fiches.

- `dmh_01` : une entrée ronde de 7 à 10 cm ne correspond à aucune des tailles nommées (moins de 4 cm,
  de 4 à 7 cm, plus de 10 cm), ni dans I ni dans G. À confirmer : compte-t-elle ?
- `dmh_02`, `dmh_03`, `dmh_07`, `dmh_08`, `dmh_12`, `dmh_15` : quelques éléments de reconnaissance ou
  de confusion viennent de la connaissance générale et non de G ni de I (tas de terre ou de feuilles
  au pied, poche de pourriture, arbre sans feuilles en hiver, gui aux tiges fourchues et aux feuilles
  épaisses, pellicule verte sans relief, couleur de la sève et de la résine, galeries en peigne).
  Chaque phrase concernée est à relire.
- `dmh_06` : I p. 12 donne pour la fente à l'insertion d'une fourche la seule longueur (plus de
  30 cm), alors que I p. 3 donne trois critères pour la fente. La fiche applique les trois critères à
  la fente et ne dit rien de la fourche : à confirmer. La ligne « Méthode 3.0 » suppose que la cime
  brisée et la fente sont les mêmes qu'en version 3.2, car le comparatif des versions ne signale que
  le bris de charpentière (ligne F-3) ; la fiche de la version 3.0 n'est plus en ligne.
- `dmh_06` et `dmh_14` : l'écart signalé n'est pas un seuil mais un type décrit en plus par le guide de
  poche (entailles de castor ; deux sortes de microsols). Il apparaît pourtant dans le bloc « Le seuil
  de l'IBP, pas celui du guide de poche » : l'expert dit s'il garde ce bloc pour ces deux groupes.
- `dmh_09` : le guide de poche compte aussi le chancre qui couvre une grande partie du tronc (G p. 44).
  La recherche ne signalait aucun écart pour ce groupe ; il n'y a donc pas de ligne « Écart avec le
  guide de poche » dans la fiche, mais la différence figure dans la table de la section 5. À décider :
  l'ajouter (dix groupes avec un écart au lieu de neuf).
- `dmh_11` : l'IBP dit « nombre > 10 » (I p. 3 et 13) et le guide de poche « groupe de plus de 10 »
  (G p. 46 et 47). La fiche écrit « plus de 10 ensemble » : à préciser (sur l'arbre ou en groupe).
  Le dessin montre une souche coupée alors que l'IBP compte des arbres vivants : à regarder.
- `dmh_12` : la ligne « Méthode 3.0 » suppose que la règle du gui est la même qu'en version 3.2 (le
  comparatif F-1 ne signale que les fougères et la précision « au moins l'un de ces types ») et que
  le seuil de 20 % s'applique de la même façon.
- Compte de types : I dit s'appuyer sur 41 types (I p. 7) alors que le guide de poche en compte 43 dans
  les groupes de l'IBP. L'écart de deux types est lu comme deux regroupements (cavités ouvertes vers le
  haut, fente causée par la foudre) : à confirmer.
- Galles (type 31) : affichées sur la fiche du groupe 9 sous « Décrits, mais non comptés » par défaut ;
  le dépôt d'argile ou de limon (type 50) n'est affiché nulle part. À confirmer.
- Dessins : les groupes 4 et 8 ont des traits qui touchent le bord du cadre ; dans le groupe 14, les
  racines fines ne sont pas dessinées (quelques traits de feuilles seulement) ; dans le groupe 1, les
  trois loges ne sont pas alignées en flûte. À regarder avec la section 9.

## 7. Ordre des groupes dans la liste

Règle (contrat d'interface, section S1.2), appliquée une seule fois, à l'arrivée sur la page du
facteur F, jamais pendant que l'observateur touche la liste : les sections qui contiennent un groupe
coché ou compté passent en premier ; dans une section, les groupes cochés ou comptés passent en
premier ; le reste suit l'ordre de base ci-dessous. L'ordre de stockage des groupes dans le relevé
ne change jamais, quel que soit l'ordre affiché.

Ordre de base : ordre IBP (1 à 15)

Ordre validé : `dmh_01`, `dmh_02`, `dmh_03`, `dmh_04`, `dmh_05`, `dmh_06`, `dmh_07`, `dmh_08`, `dmh_09`, `dmh_10`, `dmh_11`, `dmh_12`, `dmh_13`, `dmh_14`, `dmh_15`

Décision du propriétaire du 2026-10-27 (O-32-12) : option (a), cochés ou comptés d'abord, puis l'ordre
IBP de 1 à 15.

Question O-32-12 : le propriétaire a retenu le 2026-10-23 le levier « groupes fréquents ou déjà
cochés en premier ». La partie « déjà cochés » ne demande aucune source. La partie « fréquents » en
demande une, et il n'en existe pas de fiable : le guide de poche donne un mot de fréquence par type,
différent entre forêt naturelle et forêt exploitée, et dit lui-même que les fréquences locales
peuvent être différentes (G p. 7). Trois options :

- **(a)** Cochés ou comptés d'abord, puis l'ordre IBP. C'est le défaut proposé : aucune source de
  fréquence fiable, aucune règle inventée. La ligne « Ordre validé » reprend alors l'ordre IBP, de 1 à 15.
- **(b)** Cochés ou comptés d'abord, puis un ordre de fréquence fixe, que le propriétaire ou l'expert
  écrit dans la ligne « Ordre validé » avec sa source. L'ordre s'applique à l'intérieur de chaque
  section de forme ; il ne demande aucun changement de code au-delà de cette liste.
- **(c)** Selon les relevés précédents de l'observateur : cela demande de relire les relevés passés,
  ce que cette phase ne construit pas. Noté comme idée reportée, sauf si le propriétaire demande de
  replanifier la phase.

## 8. Textes de l'interface

Chaque phrase de l'interface avec sa future clé. Les valeurs entre accolades sont insérées par le
code. Aucun sigle, aucun tiret cadratin. Ces textes sont validés par le propriétaire le 2026-10-27
(section 12).

### 8.1. Liste du facteur F (`fr.factorDetail`)

Titres de la liste, gardés tels qu'ils sont (clés existantes) :

- `companionLabels.dmh_groups` (mode plafonné) : « Groupes de dendromicrohabitats observés (facultatif) »
- `countingMode.dmhTitle` (mode déplafonné) : « Arbres par groupe de dendromicrohabitats »
- `countingMode.dmhHelper` (mode déplafonné) : « Pour le score, l'app garde au plus 2 arbres par
  hectare et par groupe. »

Nouveaux textes (`dmhList`) :

- `entry.title` : « Guide des dendromicrohabitats »
- `entry.caption` : « Reconnaître chaque groupe, sans réseau. »
- `forms.cavities` : « Cavités »
- `forms.wounds` : « Blessures et bois apparent »
- `forms.crown_deadwood` : « Bois mort dans le houppier »
- `forms.growths` : « Excroissances »
- `forms.fruiting_bodies` : « Champignons et myxomycètes »
- `forms.epiphytic` : « Plantes, nids et microsols »
- `forms.exudates` : « Exsudats »
- `badge({ ticked, total })` : « {ticked} sur {total} »
- `sectionA11y({ form, ticked, total })` : « {form}, {ticked} groupes sur {total} cochés » (« 1 groupe sur
  {total} coché » quand un seul est coché)
- `summaryNone` : « Aucun groupe coché. »
- `summaryCapped({ groups })` : « 1 groupe coché » ou « {groups} groupes cochés »
- `summaryFull({ groups, trees })` : « 3 groupes, 14 arbres » (« 1 groupe » et « 1 arbre » au singulier)
- `treesCaption` : « Arbres »
- `lockedUntick` : « Ramenez le nombre à 0 pour décocher ce groupe. »
- `a11y.info({ label })` : « En savoir plus sur {label} »
- `a11y.infoHint` : « Ouvre le guide à ce groupe »
- `a11y.tickHint` : « Double-tapez pour cocher ou décocher »
- `a11y.tickLockedHint` : « Ramenez d'abord le nombre à 0 pour décocher »
- `a11y.withCount({ label, trees })` : « {label}, {trees} arbres » (« 1 arbre » au singulier)
- `a11y.add({ label })` : « Compter un arbre dans {label} »
- `a11y.addHint` : « Coche le groupe et compte 1 »
- `stepper.label({ label })` : « Nombre d'arbres, {label} »
- `stepper.value({ trees })` : « {trees} arbres » (« 1 arbre » au singulier)
- `stepper.increment` : « Ajouter un arbre »
- `stepper.decrement` : « Retirer un arbre »
- `stepper.editHint` : « Double-tapez pour saisir le nombre »

### 8.2. Feuille du guide (`fr.dmhGuide`)

Feuille et catalogue :

- `sheet.title` : « Dendromicrohabitats »
- `sheet.back` : « Tous les groupes »
- `sheet.backA11y` : « Retour à tous les groupes »
- `sheet.close` : « Fermer le guide »
- `sheet.lead` : « Un dendromicrohabitat est un petit milieu de vie porté par un arbre : une cavité,
  une écorce décollée, un champignon, un nid. L'IBP en compte quinze groupes, à partir d'un seuil de
  taille. »
- `sheet.rowHint` : « Ouvre la fiche du groupe »
- `sheet.sourcesLink` : « Sources et licence »
- `sheet.groupAnnounce({ label })` : « Groupe {label} »
- `sheet.catalogueAnnounce` : « Tous les groupes »

Recherche :

- `search.label` : « Rechercher un groupe »
- `search.placeholder` : « Rechercher : pic, lierre, gui »
- `search.clear` : « Effacer la recherche »
- `search.found({ count })` : « 1 groupe trouvé » ou « {count} groupes trouvés »
- `search.emptyTitle` : « Aucun groupe trouvé »
- `search.emptyBody` : « Essayez un mot courant : pic, lierre, gui, champignon, nid. »
- `search.emptyAction` : « Voir les 15 groupes »

Page d'un groupe (les fiches de la section 6 donnent le contenu de chaque groupe ; le titre est le
libellé du groupe, jamais retapé) :

- `group.form({ form })` : « Forme : {form} » (nom officiel de la section 4)
- `group.definitionTitle` : « De quoi s'agit-il ? »
- `group.ibpTitle` : « Ce qui compte pour l'IBP »
- `group.methodNote.v30` : « Texte pour la méthode IBP version 3.0 »
- `group.methodNote.v32` : « Texte pour la méthode IBP version 3.2 »
- `group.recogniseTitle` : « Comment le reconnaître »
- `group.confusionsTitle` : « Confusions fréquentes »
- `group.typesTitle` : « Types décrits par le guide de poche »
- `group.typesCounted` : « Comptés par l'IBP »
- `group.typesNotCounted` : « Décrits, mais non comptés par l'IBP »
- `group.typeCountedA11y({ name })` : « {name}. Compté par l'IBP »
- `group.typeNotCountedA11y({ name })` : « {name}. Non compté par l'IBP »
- `group.differenceTitle` : « Le seuil de l'IBP, pas celui du guide de poche »
- `group.differenceLead` : « Pour l'IBP, suivez toujours le seuil de l'IBP. »
- `group.footer` : « Description : guide de poche des dendromicrohabitats, 2024. Seuils : IBP version 3.2. »

Page « Sources et licence » :

- `sources.title` : « Sources et licence »
- `sources.lead` : « Les textes de ce guide sont écrits par l'association Etats Sauvages à partir des
  documents ci-dessous. Aucun texte ni aucune image de ces documents n'est reproduit. »
- `sources.authors` : « Auteurs » ; `sources.publisher` : « Éditeur » ; `sources.year` : « Année » ;
  `sources.usedFor` : « Utilisé pour »
- Premier document : titre « Guide de poche des dendromicrohabitats, deuxième édition » ; auteurs
  « Bütler, Lachat, Krumm, Kraus et Larrieu » ; éditeur « Institut fédéral de recherches sur la forêt,
  la neige et le paysage, Birmensdorf » ; année « 2024 » ; utilisé pour « la description des types de
  chaque groupe »
- Deuxième document : titre « Tree related microhabitats in temperate and Mediterranean European
  forests: a hierarchical typology for inventory standardization » ; auteurs « Larrieu, Paillet,
  Winter, Bütler, Kraus, Krumm, Lachat, Michel, Regnery et Vandekerkhove » ; éditeur « revue Ecological
  Indicators, volume 84 » ; année « 2018 » ; utilisé pour « la typologie en quinze groupes »
- Troisième document : titre « Indice de Biodiversité Potentielle pour les forêts de France
  métropolitaine, version 3.2 » ; auteurs « Gonin, Larrieu, Marty, Baiges, Corezzola, Miozzo et
  Palero » ; éditeur « Centre national de la propriété forestière et unité Dynafor de l'Institut
  national de recherche pour l'agriculture, l'alimentation et l'environnement » ; année « 2026 » ;
  utilisé pour « les seuils de comptage »
- `sources.precedence` : « Pour le relevé, les seuils de l'IBP version 3.2 font foi. Le guide de poche
  sert à reconnaître les éléments. »
- `sources.drawings` : « Dessins originaux de l'association Etats Sauvages. » (une seule phrase pour
  les quinze dessins, aucune mention d'auteur par dessin)
- `sources.offline` : « Tout le guide est dans l'application. Il fonctionne sans réseau. »
- `sources.consulted` : « Documents consultés le 23 octobre 2026. »
- Variante de licence si l'Institut fédéral accorde une autorisation écrite : pas de texte tant que
  cette autorisation n'existe pas (O-32-9).

## 9. Dessins originaux

Décisions D-06, D-09 et D-11 (propriétaire, 2026-10-24, modifiée le 2026-10-26). Il y a quinze
dessins au trait originaux, un par groupe de l'IBP, dessinés par l'assistant pour l'association et
qui lui appartiennent. Aucune image du guide de poche ni d'un autre document n'est reproduite.

Style approuvé sur trois essais (groupes 1, 10 et 13) le 2026-10-24 : un cadre de 800 sur 600, des
traits sombres sans remplissage, des épaisseurs de 4 à 12 (6 pour les lignes principales, plus fines
pour les détails, plus épaisses pour les points), des bouts arrondis, aucune couleur, aucun texte.
Les quinze dessins ont été refaits le 2026-10-26 après la vérification en ligne dont les notes sont
gardées à côté des sources.

Fabrication. Les sources sont dans `.planning/phases/32-detailed-dmh-information-inserted-v1/drawings/`,
un fichier vectoriel par groupe. Dans l'application ce sont des dessins vectoriels et non des
fichiers d'image : le module `mobile/src/app/dmh-guide/drawings.ts` est généré par
`mobile/scripts/build-dmh-drawings.mjs` à partir des sources. Chaque dessin est tracé dans l'encre
du texte du thème, directement sur la carte, et il est montré complet et fixe : aucune animation
(décision du propriétaire du 2026-10-26, après essai d'un dessin progressif et d'un dessin en
boucle). Budget : au plus 12 ko de données par dessin et 120 ko pour tout le module, vérifiés par
`mobile/src/__checks__/dmh-drawings.test.ts`. Le lecteur d'écran lit le « Texte du dessin » de la
fiche du groupe (section 6).

Registre des dessins. La colonne « Relu (exactitude) » a été remplie au plan 32-09 : le propriétaire a
regardé chacun des quinze dessins avec le libellé de son groupe et ses textes le 2026-10-27, sans
expert ; aucun dessin n'a été corrigé. Un dessin faux découvert plus tard passe par la procédure
ci-dessous.

<!-- prettier-ignore-start -->

| Fichier | Groupe | Ce que montre le dessin | Relu (exactitude) |
| --- | --- | --- | --- |
| `dmh_01-loges-de-pic.svg` | 1. Loges de pic | Un tronc avec une grande loge ovale et deux petites loges rondes plus bas | exact, lu par le propriétaire le 2026-10-27, sans expert |
| `dmh_02-cavites-a-terreau.svg` | 2. Cavités à terreau | Un pied de tronc vu de l'extérieur, puis en coupe, avec la voûte et le terreau au fond | exact, lu par le propriétaire le 2026-10-27, sans expert |
| `dmh_03-orifices-et-galeries-d-insectes.svg` | 3. Orifices et galeries d'insectes | Des trous ronds et une plaque d'écorce tombée qui montre des galeries | exact, lu par le propriétaire le 2026-10-27, sans expert |
| `dmh_04-concavites.svg` | 4. Concavités | Une cuvette dans une fourche et un tronc au pied ouvert en arche | exact, lu par le propriétaire le 2026-10-27, sans expert |
| `dmh_05-aubier-apparent.svg` | 5. Aubier apparent | Une plage de bois nu sur un tronc et une plaque d'écorce décollée sur le côté | exact, lu par le propriétaire le 2026-10-27, sans expert |
| `dmh_06-aubier-et-bois-de-coeur-apparents.svg` | 6. Aubier et bois de cœur apparents | Une cassure déchiquetée sur le côté d'un tronc et une longue fente en zigzag | exact, lu par le propriétaire le 2026-10-27, sans expert |
| `dmh_07-bois-mort-dans-le-houppier.svg` | 7. Bois mort dans le houppier | Un houppier vivant à gauche, de grosses branches mortes et une pointe morte à droite | exact, lu par le propriétaire le 2026-10-27, sans expert |
| `dmh_08-agglomerations-de-gourmands-ou-de-rameaux.svg` | 8. Agglomérations de gourmands ou de rameaux | Une touffe de pousses sur un tronc et une boule de rameaux au bout d'une branche | exact, lu par le propriétaire le 2026-10-27, sans expert |
| `dmh_09-loupes-et-chancres.svg` | 9. Loupes et chancres | Une bosse arrondie vue de profil et une plaie à bourrelets emboîtés | exact, lu par le propriétaire le 2026-10-27, sans expert |
| `dmh_10-champignons-perennes.svg` | 10. Champignons pérennes | Trois champignons durs en console sur un tronc, aux bourrelets concentriques | exact, lu par le propriétaire le 2026-10-27, sans expert |
| `dmh_11-champignons-ephemeres.svg` | 11. Champignons éphémères | Une souche avec trois petites consoles d'un côté et un champignon à chapeau de l'autre | exact, lu par le propriétaire le 2026-10-27, sans expert |
| `dmh_12-plantes-et-lichens-epiphytiques-ou-parasites.svg` | 12. Plantes et lichens épiphytiques ou parasites | Mousse, lierre, lichens, fougère et une touffe de gui sur un tronc | exact, lu par le propriétaire le 2026-10-27, sans expert |
| `dmh_13-nids.svg` | 13. Nids | Un gros nid de branchages avec deux œufs au sommet d'un tronc qui s'évase | exact, lu par le propriétaire le 2026-10-27, sans expert |
| `dmh_14-microsols.svg` | 14. Microsols | Une fourche de deux grosses branches avec un tas de terre et de la mousse dans l'angle | exact, lu par le propriétaire le 2026-10-27, sans expert |
| `dmh_15-coulees-de-seve-et-de-resine.svg` | 15. Coulées de sève et de résine | Une coulée de sève longue sous une blessure et une coulée de résine épaisse sur un conifère | exact, lu par le propriétaire le 2026-10-27, sans expert |

<!-- prettier-ignore-end -->

Corriger un dessin : modifier son fichier source dans le dossier ci-dessus (même cadre, mêmes
épaisseurs de 4 à 12, seuls un trait, une ellipse et un cercle, bouts arrondis, aucun remplissage),
lancer `node mobile/scripts/build-dmh-drawings.mjs .planning/phases/32-detailed-dmh-information-inserted-v1/drawings`,
passer Prettier sur `mobile/src/app/dmh-guide/drawings.ts`, lancer la barrière
`npm --workspace mobile run test:unit -- src/__checks__/dmh-drawings.test.ts`, puis mettre à jour le
« Texte du dessin » de la fiche si ce que le dessin montre a changé.

Question O-32-6 : résolue. L'assistant dessine, l'expert relit l'exactitude de chaque dessin (plan
32-09), les quinze sont livrés et montrés fixes.

## 10. Décisions du propriétaire

Chaque ligne a un défaut conseillé. Les cellules « Décision validée » ont été remplies au plan 32-09
le 2026-10-27 : le propriétaire a validé le document tel qu'écrit, tous les défauts gardés, aucune
décision n'est donnée autrement.

<!-- prettier-ignore-start -->

| Id | Question | Défaut conseillé | Décision validée | Effet si différent |
| --- | --- | --- | --- | --- |
| O-32-1 | Taille des boutons du compteur sur le terrain avec des gants | 48 points (une seule constante) ; 56 si le propriétaire le demande ici (boutons plus grands pour les gants, lignes plus hautes) | 48 | Seule la constante de taille du compteur change |
| O-32-2 | Noms des formes sur la liste du facteur F | Noms courts sur la liste, noms officiels du guide de poche sur la page du groupe (section 4) | Défaut gardé : noms courts sur la liste, noms officiels sur la page du groupe | Les titres de section de la liste deviennent les noms officiels |
| O-32-3 | Un groupe compté peut-il être décoché | Non : verrouillé tant que le nombre n'est pas revenu à 0, avec une ligne d'explication | Défaut gardé : verrouillé tant que le nombre n'est pas revenu à 0 | Décocher garde le compte et la ligne, comme avant la phase |
| O-32-4 | Sections ouvertes à l'arrivée sur la page | Toutes ouvertes si rien n'est coché ; sinon seules les sections qui ont un groupe coché ou compté | Défaut gardé : toutes ouvertes si rien n'est coché, sinon seules les sections avec un groupe coché ou compté (amendé par le propriétaire le 2026-10-28 : sections fermées par défaut, sauf celles qui contiennent un groupe coché ou compté) | Une autre règle d'ouverture, sans effet sur les données |
| O-32-5 | Recherche sur la liste du facteur F elle-même | Non : recherche dans le catalogue du guide seulement ; à revoir si le propriétaire la demande après son essai de la liste en fin de phase | Défaut gardé : pas de recherche sur la liste du facteur F | Un champ de recherche s'ajoute en tête de liste |
| O-32-6 | Dessins originaux : qui dessine, quel style | Résolu : l'assistant dessine les quinze dessins pour l'association (style approuvé sur trois essais le 2026-10-24), l'expert relit chacun pour l'exactitude au plan 32-09 (section 9), ils sont livrés fixes (2026-10-26) | Défaut gardé : quinze dessins de l'assistant, tous lus par le propriétaire le 2026-10-27, aucune correction demandée | Un dessin à corriger passe par sa source et le script de la section 9 |
| O-32-7 | Montrer les seuils du guide de poche à côté de ceux de l'IBP (bloc d'écart) | Oui, avec un libellé, seulement où ils diffèrent, la valeur de l'IBP en premier | Défaut gardé : bloc d'écart montré, avec libellé, la valeur de l'IBP en premier | Le bloc d'écart disparaît des pages |
| O-32-8 | Raccourci « cocher ce groupe » depuis la page d'un groupe | Non : guide en lecture seule | Défaut gardé : pas de raccourci depuis la page d'un groupe | Un bouton s'ajoute : deuxième chemin d'écriture sur le relevé, à tester |
| O-32-9 | Texte de la page « Sources et licence » | Texte propre actuel (section 8) ; remplacé par le texte exigé par l'Institut fédéral si une autorisation écrite est obtenue | Défaut gardé : texte propre de la section 8, pas d'autorisation écrite de l'Institut fédéral | La variante de licence est écrite et activée |
| O-32-10 | Relecture de chaque texte de fiche (définition, reconnaissance, confusions, seuils) par le propriétaire et un expert | Point bloquant de ce document avant tout écran (section 12) | Fait : validation écrite du propriétaire le 2026-10-27, sans expert (section 12) | Aucun écran ne se construit avant cette relecture |
| O-32-11 | Ligne de résumé sur la page F (« 3 groupes, 14 arbres ») | Oui : affichage dérivé seulement, rien n'est stocké | Défaut gardé : ligne de résumé montrée, rien n'est stocké | La ligne est retirée |
| O-32-12 | Ordre « groupes fréquents d'abord » dans la liste | Option (a) de la section 7 : cochés ou comptés d'abord, puis ordre IBP, faute de source de fréquence fiable | Option (a) : cochés ou comptés d'abord, puis l'ordre IBP de 1 à 15 | Option (b) : un ordre écrit dans « Ordre validé » ; option (c) : idée reportée |
| P-01 | Édition du guide de poche sur laquelle repose la table | Édition française de 2024, empreinte donnée en tête de ce document (plan 32-02) | Édition française de 2024, empreinte donnée en tête de ce document | Une autre édition change les numéros de type : la section 5 est à refaire |
| P-02 | Expert qui relit les fiches et les dessins | Nom et date obligatoires dans la section 12 | Aucun expert : le propriétaire valide seul le 2026-10-27 (section 12) | Pas de validation sans expert |
| P-03 | Règle de réussite du chronométrage de la saisie | Sans objet : le propriétaire a abandonné le chronométrage le 2026-10-27 ; la simplicité est montrée par le décompte automatique des appuis et confirmée par écrit par le propriétaire après un essai sur son téléphone (voir `docs/user-tests/dmh-entry-timing.md`) | Sans objet, décision du propriétaire du 2026-10-27 | Aucun |
| P-04 | Leviers gardés après le chronométrage de départ | Sans objet depuis le 2026-10-27 (pas de chronométrage) : les trois leviers restent tels qu'ils sont construits, (a) compteur sur la ligne, (b) groupes par forme, (c) cochés d'abord ; le propriétaire peut en faire retirer un après son essai de fin de phase | Sans objet, décision du propriétaire du 2026-10-27 | Un levier retiré ici demande une nouvelle planification, sans effet sur les données enregistrées |

<!-- prettier-ignore-end -->

## 11. Exigences proposées

Cinq exigences, avec la formulation de la recherche de la phase. Le plan d'ensemble les ajoute à
`.planning/REQUIREMENTS.md` à la fin de la phase : ce plan ne touche pas ce fichier.

- `REQ-DOC-dmh-sources` : les sources, auteurs, état de licence, date de consultation et empreinte de
  chaque document dont le guide s'inspire sont notés dans `docs/references/README.md` ; le croisement
  entre la typologie de l'IBP et celle du guide de poche est écrit dans cette spécification et
  validé par écrit par le propriétaire avant tout écran.
- `REQ-C-dmh-guide` : depuis la page du facteur F, l'observateur ouvre, sans réseau, une fiche par
  groupe (ce qui compte pour l'IBP, comment le reconnaître, confusions fréquentes, types du guide de
  poche) et un catalogue des quinze groupes avec recherche ; les sources sont montrées sur les pages.
- `REQ-C-dmh-illustrations` : chaque groupe montre, sans réseau, son dessin original de l'association,
  fixe, relu pour l'exactitude par un expert ; un groupe sans dessin n'affiche rien.
- `REQ-C-dmh-fast-entry` : saisir le facteur F avec beaucoup de groupes est plus simple qu'avant et
  demande moins d'appuis ; les données enregistrées (`dmh_groups`, `dmh_counts`, `trees_per_ha`) et
  tous les scores restent identiques (cas de parité inchangés).
- `REQ-FT-dmh-speed` : la simplicité est montrée par le décompte automatique des appuis (ancien flux
  contre nouveau, mêmes données enregistrées) et confirmée par écrit par le propriétaire après un
  essai de la nouvelle liste sur son téléphone (décision du propriétaire du 2026-10-27 : pas de
  chronométrage).

## 12. Validation

Validé par le propriétaire le 2026-10-27

Relu par (expert) : aucun, le propriétaire valide sans expert (déclaration du propriétaire, citée
ci-dessous), le 2026-10-27. Les seuils de la section 5 et des fiches, et l'exactitude des quinze
dessins, n'ont été lus que par le propriétaire, pas par un expert : les essais sur le terrain peuvent
encore y trouver des erreurs. Les points de la section « Points à faire vérifier par l'expert » (fin
de la section 6) restent donc non confirmés par un expert et sont gardés tels qu'écrits.

Réponse du propriétaire (2026-10-27, citée telle quelle) :

- « je peux valider sans [expert], mais j'ai pas vu les textes et tous les dessins »
- Une page montrant chacun des quinze dessins à côté de ses textes lui a ensuite été envoyée.
- « c'est bon ! »

Lecture de la réponse : validation du document tel qu'écrit, tous les défauts de la section 10 gardés
(O-32-1 : 48 points ; O-32-12 : option (a) ; P-01 : édition française de 2024 ; P-03 et P-04 sans
objet). Le propriétaire ne change aucun texte, aucun dessin et aucun seuil.

Les trois lignes ci-dessus sont remplies, le statut en tête de document est « validée », et chaque
cellule « Décision validée » de la section 10 et chaque cellule « Relu (exactitude) » de la section 9
est remplie : les textes du catalogue et les écrans peuvent être écrits à partir de cette
spécification.
