# Contenu du guide des dendromicrohabitats (v1)

Statut : brouillon, à valider par le propriétaire et à relire par un expert

Brouillon, non validé : toutes les cellules de validation de ce document sont vides et le restent
jusqu'au plan 32-09.

Date de rédaction : 2026-10-26

Validation du propriétaire : à remplir par le plan 32-09

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

**Définition** : Du bois mort encore attaché à l'arbre vivant, dans le houppier : grosses branches mortes, cime entièrement morte, ou reste éclaté d'une grosse branche cassée. Ce bois sèche et chauffe au soleil, et abrite d'autres espèces que le bois mort tombé au sol.

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

**Définition** : Un amas dense de jeunes pousses qui sortent d'un même point : soit un balai de sorcière, boule de rameaux serrés sur une branche, soit une brogne, touffe de gourmands sur le tronc. Ces pousses naissent de bourgeons dormants de l'arbre.

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
