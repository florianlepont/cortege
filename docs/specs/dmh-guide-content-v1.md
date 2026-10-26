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
