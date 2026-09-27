# Audit UX/UI — application mobile Cortege (septembre 2026)

Audit en lecture seule de `mobile/` : simplicité d'usage, qualité visuelle, modernité (iOS 26 / Liquid Glass, Material 3 Expressive) et animations. Les références `fichier:ligne` sont relatives à `mobile/src/` sauf mention contraire. Aucun rapport de test utilisateur ne couvre encore les épics B à H (`docs/user-tests/` ne contient que l'épic A) : les constats reposent sur la lecture du code, des specs et de la charte (`docs/design/charte-graphique-etats-sauvages-spec.md`).

Sévérités : **Critique** (donnée fausse, blocage, non-conformité), **Majeur** (friction forte ou écart net aux standards), **Mineur** (finition). Effort : XS < ½ j · S ≈ 1 j · M ≈ 2–4 j · L ≈ 1 sem · XL > 1 sem.

---

## 1. Synthèse

**Ce qui est déjà bien** : barre d'onglets native iOS (`react-native-bottom-tabs`, SF Symbols, `minimizeBehavior`), en-têtes flous natifs, recherche native dans Mes Relevés, regroupement des marqueurs (supercluster), autosave local (900 ms), score calculé en direct, splash animé soigné et respect partiel de « Réduire les animations ».

**Les cinq chantiers qui changeront la perception de l'app** :

1. **Fiabilité de ce qui est affiché**. Le score IBP est présenté sur 10 alors qu'il va de 0 à 50, et un relevé soumis mais non synchronisé apparaît en vert « Soumis ». À corriger avant tout travail esthétique (§2).
2. **Saisie terrain sans clavier**. Aujourd'hui, les 17 champs A–J sont des champs texte numériques, les erreurs rouges s'affichent dès l'ouverture et on ne peut pas passer d'un facteur au suivant. Il faut des compteurs, des segments et des chips, un pager A→J et un CTA fixé en bas. Objectif : passer d'environ 80 à environ 40 interactions par relevé (§3.1).
3. **Identité visuelle réelle**. Les polices de la charte (Mazzard H) ne sont pas chargées, on compte 125 couleurs codées en dur hors tokens, les marqueurs de marque (fougère, bump, rectangle noir) sont inutilisés et plusieurs contrastes échouent au WCAG (§3.4).
4. **Système de mouvement**. L'animation repose aujourd'hui sur l'API `Animated` legacy, sur le thread JS, avec des durées ad hoc. Il manque les animations d'entrée, les squelettes de chargement, l'haptique systématique et les transitions porteuses de sens. Proposition : Reanimated 4, avec des tokens `brandMotion` (§4).
5. **Architecture de l'information**. Accueil et Mes Relevés font doublon, aucun indicateur hors ligne ou de file d'envoi n'est visible (exigence US-D1), Explorer ressemble à un prototype (filtres en texte libre, pas de feuille coulissante) et le premier lancement n'a pas d'onboarding (§3.2, §3.3).

---

## 2. Défauts fonctionnels à corriger en priorité

Ces points ont été vérifiés dans le code. Ce ne sont pas des questions de goût : l'app affiche aujourd'hui une information fausse ou trompeuse.

| ID         | Constat                                                                                                                                                                                                                      | Référence                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **BUG-01** | Le badge IBP affiche « /10 » avec des seuils 7 et 5, alors que `latest_ibp_total` = A…J va de 0 à 50. Presque toute parcelle notée apparaît « haute » en vert.                                                               | `ui/IbpScoreBadge.tsx`, `app/brand-tokens.ts:150`, `i18n/fr/components.ts:46`, `app/ibp-scoring.ts:279-284`           |
| **BUG-02** | Le score moyen du secteur affiche « 18 / 10 » et allume les 10 pastilles (`filledCount = Math.round(score)`).                                                                                                                | `screens/home/SectorScoreCard.tsx:20`, `i18n/fr/home.ts:34`                                                           |
| **BUG-03** | `resolveSurveyUiStatus` teste `status === "submitted"` avant `sync_state`. Un relevé soumis dont l'envoi a échoué ou est bloqué s'affiche « Soumis » en vert et sort de « À faire ».                                         | `app/survey-logic.ts:93-100`                                                                                          |
| **BUG-04** | La virgule décimale est refusée : `Number("2,5")` vaut `NaN`, ce qui affiche « doit être un nombre ». Or le pavé numérique français propose « , ».                                                                           | `hooks/useSurveyForm.ts:82`                                                                                           |
| **BUG-05** | L'alerte de suppression de compte annonce la suppression « y compris vos relevés », alors que la spec US-A7 prévoit leur anonymisation et leur conservation. De plus, la zone danger est la première section des Paramètres. | `i18n/fr/settings.ts:28-29`, `screens/SettingsScreen.tsx:123-139`, `docs/specs/epic-a-access-and-security.md:135-152` |
| **BUG-06** | Barre d'état iOS forcée en `light-content` sur des fonds clairs (canvas, carte) : l'heure et la batterie sont illisibles.                                                                                                    | `navigation/AppNavigation.tsx:46`                                                                                     |
| **BUG-07** | Onglet Accueil Android avec l'icône de Mes Relevés.                                                                                                                                                                          | `navigation/tab-config.tsx:34`                                                                                        |
| **BUG-08** | Le pull-to-refresh de l'Accueil passe `refreshing={false}` en dur : aucun retour, et le geste ne pousse pas la file locale.                                                                                                  | `screens/HomeScreen.tsx:77`                                                                                           |

---

## 3. Constats par zone

### 3.1 Parcours de saisie d'un relevé (parcelle → formulaire → facteurs)

Aujourd'hui, un relevé complet demande **75 à 90 interactions, dont environ 34 frappes au clavier**. La surface (ha) est saisie trois fois, pour C, D et E.

| ID      | Sév.     | Constat                                                                                                                                                                                                                                                             | Recommandation                                                                                                                                                                                                                       |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FLOW-01 | Critique | Tous les champs sont des `AppField` avec `keyboardType="numeric"` (`screens/FactorDetailScreen.tsx:592-607`), alors que la spec prévoit multi-sélections, cases à cocher et compteurs (`docs/specs/ibp-form-spec.md`). Le facteur H demande de taper « 0, 2 ou 5 ». | Composant `FactorInput` en 4 variantes. **Compteur** −/+ de 56 pt (C/D/E, appui long accéléré). **Segmented control** 0·2·5 (H). **Chips cochables** avec compteur dérivé (B, I, J, A). **Slider** par pas de 5 % (B, G).            |
| FLOW-02 | Critique | Les erreurs « requis » s'affichent avant toute saisie. Les 10 tuiles de facteurs sont en terracotta avec `alert-circle` dès le départ (`hooks/useSurveyForm.ts:81`, `screens/survey-form/FactorsList.tsx:24,53-66`).                                                | Trois états distincts. **Vide** : neutre. **Erreur** : après sortie du champ ou tentative de soumission. **Complet** : moss avec coche.                                                                                              |
| FLOW-03 | Critique | Virgule décimale refusée (BUG-04). Pas de touche « OK » sur le pavé, pas de `keyboardDismissMode` (`navigation/routes/FactorDetailRoute.tsx:16`).                                                                                                                   | Accepter « , ». Barre d'accessoires « Préc. / Suiv. / OK » (`InputAccessoryView`). `keyboardDismissMode="interactive"`.                                                                                                              |
| FLOW-04 | Majeur   | Pas de navigation entre facteurs : 20 allers-retours à la grille pour 10 facteurs.                                                                                                                                                                                  | Pager horizontal A→J, pied fixe « ← D · E · F → », indicateur de pages, raccourci « Facteur suivant incomplet ».                                                                                                                     |
| FLOW-05 | Majeur   | Le CTA est en fin de défilement, sous une carte de 408 pt qui capte le geste. L'en-tête héro mesure 248–292 pt (`screens/survey-form/useWizardScroll.ts:45-48`, `parcels.styles.ts:54`).                                                                            | Barre d'action fixe en bas (CTA plein écran de 56 pt). Titre large natif et barre de progression compacte à la place du héro. Carte en ligne de 220 pt max, qui s'ouvre en plein écran au toucher.                                   |
| FLOW-06 | Majeur   | Tuiles en 3 colonnes, titres en 11 pt, méta en 10 pt. Le total (52 pt) n'est visible qu'à l'étape 3, sans « /50 » ni jauge.                                                                                                                                         | Grille 2×5 avec **anneau de progression** par facteur qui se transforme en coche animée. **Jauge segmentée** en 10 dans l'en-tête, rappelée sur chaque écran facteur.                                                                |
| FLOW-07 | Majeur   | L'autosave fonctionne (`hooks/useEditingDraft.ts:92-120`) mais reste invisible. Le libellé « Enregistrer le brouillon » laisse croire qu'une sauvegarde manuelle est nécessaire.                                                                                    | Indicateur « Enregistré · 14:32 » dans l'en-tête, qui passe en terracotta en cas d'échec. Renommer le CTA en « Vérifier et soumettre ».                                                                                              |
| FLOW-08 | Majeur   | `surface_ha` est saisie dans C, D et E (`hooks/useSurveyForm.ts:373,396,419`).                                                                                                                                                                                      | Saisie unique à l'étape Parcelles, pré-remplie depuis le cadastre, surchargeable par facteur. Impact données à valider avec le métier.                                                                                               |
| FLOW-09 | Majeur   | Parcelle sélectionnée en bleu `#1d5fa2`, fond navy `#132434`, parcelles non sélectionnées à 12 % d'opacité, invisibles au soleil (`components/ParcelOverlayPolygons.tsx:255-258`).                                                                                  | Sélection en terracotta avec contour de 3 px. Étudiée en moss, libre en sage avec contour de 2 px. Tokens `map.*`.                                                                                                                   |
| FLOW-10 | Majeur   | La sélection se fait uniquement en tapant sur un polygone à zoom 15 ou plus. Le bouton de localisation fait 36 pt. Rien ne signale que le cadastre est indisponible hors ligne.                                                                                     | Feuille native « Parcelles autour de vous » (lignes de 56 pt à cocher, via `useNearbyParcelsState`). Bouton de localisation de 48 pt. Message « Cadastre indisponible hors ligne, liez plus tard » (US-C4). Haptique à la sélection. |
| FLOW-11 | Mineur   | `ParcelMapModal` est du code mort : `setIsParcelMapFullscreenVisible(true)` n'est jamais appelé (`screens/survey-form/useParcelMap.ts:55`). La carte est dupliquée entre `SurveyParcelSelectionScreen` et `ParcelsSection`.                                         | Composant unique `ParcelPickerMap`. Supprimer la modale morte.                                                                                                                                                                       |
| FLOW-12 | Mineur   | Indications redondantes (« Toucher pour ouvrir », 10 pt). L'aide « Que relever » est repliée par défaut et son libellé dissuade de l'ouvrir.                                                                                                                        | Texte courant à 15 pt minimum. Bouton « i » qui ouvre une feuille d'aide (US-C6).                                                                                                                                                    |

**Parcours cible** (environ 35 à 45 interactions, sans clavier dans 80 % des cas) :

1. **Nouveau relevé**. La localisation démarre aussitôt. Le nom du site est pré-rempli par géocodage inverse, sans étape Identité bloquante.
2. **Parcelles**. Carte centrée sur l'utilisateur, avec une feuille « Parcelles autour de vous » à cocher. La surface est dérivée. Hors ligne, on peut « lier plus tard ».
3. **Contexte**. Segmented control pour la région, chips pour le stade, valeurs mémorisées d'un relevé à l'autre. CTA fixe « Commencer les facteurs ».
4. **Facteurs A→J**. Pager avec contrôles adaptés, jauge du total et compteur animé, aide en feuille.
5. **Sommaire**. Grille 2×5 avec anneaux ; les facteurs manquants sont mis en évidence.
6. **Vérifier et soumettre**. Checklist des points bloquants (US-C5), score final révélé en animation, puis état de la synchronisation.

Références : Merlin (pas à pas avec chips), iNaturalist/Seek (lieu capturé automatiquement), Strava (un gros CTA fixe), Apple Santé (anneaux).

### 3.2 Accueil, Mes Relevés, Détail, synchronisation

| ID      | Sév.        | Constat                                                                                                                                                                                                                                   | Recommandation                                                                                                                                                                                               |
| ------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HOME-01 | Majeur      | Accueil et Mes Relevés ont le même rôle. Le héro de Mes Relevés porte l'eyebrow « ACCUEIL » (`i18n/fr/survey-list.ts:25`). On trouve deux cartes brouillon différentes (`DraftCard`, `ContinueDraftCard`) et deux CTA « Nouveau relevé ». | **Accueil** = tableau de bord : action, reprise, alertes, progression. **Mes Relevés** = liste pure avec titre large, recherche, filtres et un « + » dans l'en-tête. Fusion en `SurveyProgressCard`.         |
| HOME-02 | Majeur      | Le CTA reste figé sur « Démarrer un relevé » même quand un brouillon est avancé. Les brouillons sont dans un carrousel horizontal dont la 3e carte est coupée.                                                                            | Si un brouillon a été modifié dans les 48 h, le héro devient « Reprendre _Parcelle X_ · 7/10 », avec « Nouveau relevé » en secondaire.                                                                       |
| HOME-03 | Critique    | Score secteur faux (BUG-02).                                                                                                                                                                                                              | Échelle /50 et jauge unique, ou mini-barres A–J.                                                                                                                                                             |
| HOME-04 | Majeur      | Le pull-to-refresh ne donne aucun retour (BUG-08). Le résultat de la synchro n'est visible que dans Réglages.                                                                                                                             | Reprendre le motif de `SurveyListScreen.tsx:173-181`. Synchronisation complète (envoi puis récupération) et toast de résultat.                                                                               |
| HOME-05 | Mineur      | Toucher une parcelle proche ouvre la carte générale, pas la parcelle. Le séparateur « · » est quasi invisible.                                                                                                                            | Naviguer vers la carte centrée sur la parcelle, fiche ouverte.                                                                                                                                               |
| HOME-06 | Mineur      | L'avatar disparaît quand une photo existe (`HomeScreen.tsx:88-92`) et n'est pas cliquable.                                                                                                                                                | Afficher la photo avec `expo-image`, toucher → Compte.                                                                                                                                                       |
| HOME-07 | Mineur (V1) | Aucune progression ni gamification (épic F).                                                                                                                                                                                              | Rangée « Ma saison » : relevés soumis, parcelles couvertes, prochain badge.                                                                                                                                  |
| LIST-01 | Majeur      | La ligne de liste n'affiche ni score ni avancement (`screens/survey-list/SurveyRow.tsx:158-189`).                                                                                                                                         | En tête de ligne : `IbpScoreBadge` pour un relevé soumis, anneau « x/10 » pour un brouillon.                                                                                                                 |
| LIST-02 | Majeur      | La suppression est révélée par un balayage vers la droite (`renderLeftActions`), contraire à la convention iOS. Aucune action d'accessibilité ni menu contextuel.                                                                         | Suppression à droite avec confirmation. Action non destructive à gauche. Menu contextuel par appui long. `accessibilityActions`.                                                                             |
| LIST-03 | Critique    | « Soumis » masque l'échec de synchro (BUG-03).                                                                                                                                                                                            | Deux axes visuels séparés : workflow (Brouillon/Soumis) et synchro (nuage : attente, erreur, OK). L'erreur l'emporte toujours.                                                                               |
| LIST-04 | Majeur      | Carte de filtres collante et permanente, 5 sections de chips, dates tapées au clavier en « AAAA-MM-JJ ». Les filtres « Erreur » et « Bloqués » se recoupent.                                                                              | Rangée de chips défilants (Tous · Brouillons · À synchroniser · Soumis) et feuille « Filtres et tri » avec DatePicker natif. Fusion en « Problème de synchro ».                                              |
| LIST-05 | Mineur      | Liste plate.                                                                                                                                                                                                                              | Sections collantes « Cette semaine / Ce mois-ci / Plus ancien ».                                                                                                                                             |
| LIST-06 | Mineur      | Tuiles de stats d'environ 26 pt de haut, icône de 9 px, `rgba` codés en dur, héro animé sur le thread JS.                                                                                                                                 | Titre large natif. Compteurs déplacés dans les chips.                                                                                                                                                        |
| LIST-07 | Mineur      | « +N autres » n'est pas cliquable. Le même relevé peut afficher deux messages d'erreur différents, car le code d'erreur n'est pas transmis (`AttentionSection.tsx:148,158`).                                                              | Lien vers la liste filtrée. Passer `last_sync_error_code` partout.                                                                                                                                           |
| LIST-08 | Mineur      | État vide sans action, aucun squelette de chargement, squelette statique sur l'Accueil.                                                                                                                                                   | Bouton « Démarrer mon premier relevé ». `SkeletonRow` pulsé.                                                                                                                                                 |
| DET-01  | Majeur      | Score affiché trois fois, sans dénominateur ni visualisation. Les points par facteur ne sont pas montrés.                                                                                                                                 | Un seul « 23 / 50 » avec jauge « Peuplement 17/35 · Contexte 6/15 ». **Barres horizontales A–J** plutôt qu'un radar à 10 axes, illisible sur mobile : composant `IbpFactorBars`.                             |
| DET-02  | Majeur      | Page longue, héro collant volumineux, temps restant affiché deux fois, onglets en chips.                                                                                                                                                  | Segmented control natif. En-tête compact. Bouton « Soumettre » dans une barre fixe en bas.                                                                                                                   |
| DET-03  | Mineur      | Le renommage se déclenche en touchant le titre, sans indice visuel. La compression du héro saute (`setState` à 56 px).                                                                                                                    | Menu « … » natif : Renommer, Partager, Visibilité, Supprimer.                                                                                                                                                |
| DET-04  | Majeur      | « Supprimer » a le même poids que « Rendre public ». « Abandonner la modification » est à côté de « Réessayer ». Aucun partage.                                                                                                           | Supprimer dans le menu « … ». Notice de synchro avec « Réessayer » intégré. Feuille de partage native.                                                                                                       |
| DET-05  | Mineur      | Historique en texte brut, sans timeline.                                                                                                                                                                                                  | Timeline avec icônes, pull-to-refresh, squelette.                                                                                                                                                            |
| SYNC-01 | Critique    | Échelle du score incohérente (BUG-01).                                                                                                                                                                                                    | `ibpScoreTokens.max = 50`, seuils recalés sur la grille CNPF, tests unitaires.                                                                                                                               |
| SYNC-02 | Critique    | Aucun indicateur hors ligne ni de file d'envoi sur les écrans principaux (US-D1). Les messages de statut ne sont visibles que dans Réglages.                                                                                              | `SyncStatusPill` à 4 états (hors ligne · N à envoyer · en cours · à jour) dans les en-têtes Accueil et Mes Relevés, avec une feuille de détail. L'icône passe du spinner à la coche avec un retour haptique. |
| SYNC-03 | Majeur      | Un relevé _bloqué_ affiche « Vérifiez votre connexion » (`i18n/fr/home.ts:9`) alors qu'il s'agit d'un conflit. `AppNotice` n'a pas d'action.                                                                                              | Ajouter une prop `action` à `AppNotice`. Messages distincts : conflit → « Voir », erreur → « Réessayer ».                                                                                                    |

### 3.3 Premier lancement, navigation, Explorer, Compte

| ID     | Sév.     | Constat                                                                                                                                                                                                 | Recommandation                                                                                                                                                                        |
| ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ONB-01 | Critique | Aucune proposition de valeur ni préparation aux permissions. La localisation est demandée à froid dans Explorer. En cas de refus, aucun lien vers les Réglages (`screens/PublicMapScreen.tsx:121-123`). | Carrousel de 3 écrans avant la connexion (10 facteurs · hors ligne · carte publique). Écran de préparation GPS et appareil photo. `Linking.openSettings()`. Mémoriser le « déjà vu ». |
| ONB-02 | Majeur   | Pas de clé `splash` ni d'`adaptiveIcon` dans `mobile/app.json`. Le splash Expo par défaut s'affiche, puis `TypewriterSplash` sur fond forest : saut visuel.                                             | Splash natif forest, logo à la même position que dans `TypewriterSplash`. Icône adaptative.                                                                                           |
| ONB-03 | Mineur   | Les overlays (auth, profil) apparaissent et disparaissent sans transition (`App.tsx:45-85`).                                                                                                            | Fondu de 250 ms avec zoom 0,98 → 1. Transition partagée du logo en effet signature.                                                                                                   |
| ONB-04 | Majeur   | Trois actions de même poids sur l'écran de connexion, « Mot de passe oublié » intercalé, pas de « Se connecter avec Apple » (US-A4, règle App Store 4.8).                                               | Hiérarchie primaire / secondaire / lien. `expo-apple-authentication`.                                                                                                                 |
| ONB-05 | Mineur   | L'écran de profil est redondant. « Plus tard » n'est pas mémorisé (`App.tsx:21`) : l'écran revient à chaque lancement.                                                                                  | Une seule carte. Persister le report dans `app_metadata`.                                                                                                                             |
| ONB-06 | Mineur   | Le choix « Supprimer ces données » dans l'écran de conflit n'a pas de confirmation.                                                                                                                     | Alerte destructive. Layout partagé `OnboardingHeroLayout`.                                                                                                                            |
| NAV-01 | Critique | Barre d'état illisible (BUG-06).                                                                                                                                                                        | `dark-content` par défaut, texte clair déclaré seulement sur les écrans sombres.                                                                                                      |
| NAV-02 | Majeur   | Mauvaise icône Accueil sur Android (BUG-07).                                                                                                                                                            | Asset `home.png` ou Material Symbols.                                                                                                                                                 |
| NAV-03 | Mineur   | `headerLargeTitle: false` partout. Bouton réglages de 34 pt.                                                                                                                                            | Grands titres sur les racines. Cible de 44 pt, SF Symbol `gearshape`.                                                                                                                 |
| MAP-01 | Majeur   | Cartes flottantes en position absolue : pas de poignée, pas de paliers, pas de geste. Le signalement s'ouvre dans la carte.                                                                             | Feuille à 2–3 paliers façon Apple Maps (`presentation: "formSheet"` et `sheetAllowedDetents`, ou `@gorhom/bottom-sheet`).                                                             |
| MAP-02 | Majeur   | Filtres en texte libre (`2026-03-01`, code région `ACA`), bouton « Appliquer », aucun indicateur de filtre actif.                                                                                       | Chips Période / Région / Mes relevés appliqués immédiatement, pastille de compteur, « Réinitialiser ».                                                                                |
| MAP-03 | Majeur   | Marqueurs système `pinColor` d'une seule couleur hors charte, sans légende.                                                                                                                             | Marqueur pastille qui affiche le score (moss/ochre/terracotta) avec `tracksViewChanges={false}`. Légende repliable.                                                                   |
| MAP-04 | Mineur   | Position de l'utilisateur dessinée par un `Marker` maison bleu hors charte.                                                                                                                             | `showsUserLocation` (halo de précision), bouton qui bascule entre centrer et suivre.                                                                                                  |
| MAP-05 | Mineur   | Badge « Explorer » redondant, décalage `insets.top + 40` arbitraire, vue initiale sur toute la France.                                                                                                  | Centrer sur la dernière position connue. Bouton « Couches » séparé. Barre de chargement fine.                                                                                         |
| ACC-01 | Critique | Texte de suppression contraire à US-A7, zone danger en tête (BUG-05).                                                                                                                                   | Zone danger en bas, texte « identité supprimée, relevés anonymisés », confirmation forte.                                                                                             |
| ACC-02 | Majeur   | Déconnexion sans avertissement quand des données ne sont pas synchronisées.                                                                                                                             | « 3 relevés non synchronisés » → « Synchroniser d'abord » / « Se déconnecter quand même ».                                                                                            |
| ACC-03 | Majeur   | Compte mélange un formulaire en ligne, des lignes et des pastilles, avec des actions techniques de rafraîchissement.                                                                                    | Liste groupée iOS (`AppGroupedList`) : Profil ›, Connexion, Données, À propos, puis « Se déconnecter » en rouge.                                                                      |
| ACC-04 | Mineur   | Placeholder avec un vrai nom (« Florian / Lepont », `i18n/fr/account.ts:13-17`).                                                                                                                        | « ex. Marie Dupont ».                                                                                                                                                                 |

### 3.4 Design system, accessibilité, identité

Chiffres clés :

- 125 couleurs codées en dur hors `brand-tokens.ts`, dont `#D7E3C0` ×21 et `#132434` ×10 (hors charte) ;
- 70 `fontSize` littéraux répartis sur 21 tailles ;
- 0 police custom et 0 dark mode ;
- `Animated` legacy ×7, `LayoutAnimation` ×3, aucune dépendance Reanimated.

**Contrastes (WCAG 2.1)** :

| Paire                                             | Ratio    | Verdict                        |
| ------------------------------------------------- | -------- | ------------------------------ |
| forest / canvas                                   | 8,11     | AAA                            |
| textSecondary / canvas                            | 5,88     | AA                             |
| **blanc / moss** (badge IBP « haut »)             | **2,85** | Échec                          |
| blanc / ochre (badge « moyen »)                   | 3,56     | Grand texte seulement          |
| blanc / terracotta (badge « bas », bouton danger) | 4,17     | Échec en texte normal          |
| **ochre / warningSoft** (notice warning)          | **2,90** | Échec                          |
| **terracotta / errorSoft** (notice danger)        | **2,97** | Échec                          |
| inputBorder / inputFill (contour de champ)        | 1,34     | Échec (non-texte, minimum 3:1) |

| ID    | Sév.     | Constat                                                                                                                                                                     | Recommandation                                                                                                                                                  |
| ----- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DS-01 | Critique | Badge IBP illisible (blanc sur moss). « /20 » en 12 pt (`ui/IbpScoreBadge.tsx:57`).                                                                                         | Texte forest sur fond sage (5,03:1). Couleur saturée réservée à l'anneau ou à la pastille. Libellé de niveau, pour ne pas s'appuyer sur la couleur seule.       |
| DS-02 | Critique | Texte des notices warning et danger sous le seuil de contraste. Même problème pour `AppButton` `dangerSoft` et le texte de 10 pt de `DraftCard`.                            | Tokens `onWarningSurface` et `onDangerSurface`, dérivés assombris de la charte, ou texte `textPrimary` avec une icône colorée.                                  |
| DS-03 | Critique | Mazzard H, Futura et HeadTurn sont documentées (`app/brand-tokens.ts:25-45`) mais pas chargées. L'app tourne en SF Pro ou Roboto et paraît générique.                       | Plugin config `expo-font` (polices embarquées au build) et `fontFamily` dans `brandTypography`. En attendant la licence, utiliser explicitement Avenir Next.    |
| DS-04 | Critique | Couleurs hors charte non tokenisées : `#132434`, `#1d5fa2`, `#245f96`, `#2a7a52`, `#D7E3C0`…                                                                                | Groupes `onDark.*`, `map.*`, `media.backdrop`. Règle ESLint `no-restricted-syntax` sur les littéraux `#hex` et `rgba(` hors tokens.                             |
| DS-05 | Majeur   | 15 textes en 10–11 pt, une icône de 9 pt, `lineHeight` fixes, aucun `maxFontSizeMultiplier`.                                                                                | Échelle typographique calquée sur iOS avec un plancher à 12 pt. Multiplicateur par rôle. Tests en taille AX3.                                                   |
| DS-06 | Majeur   | `DraftCard`, `ParcelNearbyCard` et `AppButton` n'ont pas d'état pressé. Opacité pressée incohérente : 0,7, 0,4 ou 0,76 selon le composant.                                  | Primitive `AppPressable` : scale 0,97 en spring, `android_ripple`, haptique optionnelle, label d'accessibilité obligatoire.                                     |
| DS-07 | Majeur   | Headers repliables avec `useNativeDriver: false` qui animent `height` (`screens/survey-form/useWizardScroll.ts:147`, `SurveyListScreen.tsx:199`, `FormHeader.tsx:117-119`). | Reanimated 4 (`useAnimatedScrollHandler`) sur `translateY` et `opacity`, ou titre large natif.                                                                  |
| DS-08 | Majeur   | Aucun système de mouvement. `LayoutAnimation` ignore « Réduire les animations ». Aucun squelette ni animation d'entrée.                                                     | Voir §4.                                                                                                                                                        |
| DS-09 | Majeur   | Haptique seulement sur AuthGate et la liste (iOS uniquement).                                                                                                               | `ui/feedback.ts` sémantique (`selection`, `impact.light`, `notify.*`), avec Android.                                                                            |
| DS-10 | Majeur   | `brandSpacing` passe de 10 à 16, d'où des calculs `sm - 2` et `md - 2`. Une seule ombre tokenisée. Rayon du badge non tokenisé.                                             | Voir §5.                                                                                                                                                        |
| DS-11 | Majeur   | `BrandFern` n'est jamais importé, `BrandBump` n'est utilisé qu'une fois. « Rectangle noir » et décalage typographique ne sont pas implémentés.                              | `BrandHighlight` pour les badges éditoriaux. Bump sous les héros. Fougère en ton sur ton dans les états vides.                                                  |
| DS-12 | Majeur   | `userInterfaceStyle: "light"`, tokens statiques.                                                                                                                            | Thèmes `light` et `dark` sur les mêmes clés sémantiques via `useBrandTheme()`, puis `automatic`. Le forest et `#D7E3C0` existants donnent déjà une base sombre. |
| DS-13 | Mineur   | `JS_TAB_BAR_STYLE` avec hauteur et padding en dur.                                                                                                                          | Laisser la safe area calculer.                                                                                                                                  |
| DS-14 | Mineur   | Contour de champ à 1,34:1.                                                                                                                                                  | Bordure au repos à 3:1 minimum.                                                                                                                                 |
| DS-15 | Mineur   | Liquid Glass partiellement exploité : panneaux de carte en `rgba(…, 0.96)` sans flou, modale parcelle `fullScreen`.                                                         | `expo-blur` (déjà installé) ou `expo-glass-effect` pour les contrôles flottants. `formSheet` à paliers. `expo-symbols` sur iOS.                                 |
| DS-16 | Mineur   | Boutons `sm` de 34–36 pt, seulement 6 `hitSlop` dans le code.                                                                                                               | `hitSlop` automatique jusqu'à 44 pt.                                                                                                                            |

---

## 4. Système de mouvement proposé

**Socle technique** : `react-native-reanimated` 4 (thread UI, layout animations, `useReducedMotion`) et `expo-haptics`, déjà installé. On garde les transitions natives de `native-stack`.

**Tokens `brandMotion`** :

- **Durées** : `instant 100` · `fast 160` · `base 240` · `slow 360` · `emphasis 500` (ms).
- **Easings** : `standard` = bezier(0.2, 0, 0, 1) · `decelerate` = (0, 0, 0, 1) · `accelerate` = (0.3, 0, 1, 1).
- **Springs** :
  - `press` = { damping 18, stiffness 420, mass 0.6 } ;
  - `snappy` = { damping 20, stiffness 260 } ;
  - `gentle` = { damping 22, stiffness 140 }, un rendu « organique » cohérent avec la charte.
- **Stagger** de liste : 40 ms, plafonné à 8 éléments.

| Interaction                          | Animation                                                                                                                    | Haptique                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Appui sur bouton, carte ou chip      | scale 0,97, spring `press`                                                                                                   | —                                 |
| Choix d'une valeur de facteur        | Remplissage du chip (`base`) et rebond de la coche                                                                           | `selection`                       |
| Facteur complété                     | Anneau qui se ferme, puis morph en coche                                                                                     | `notify.success` (léger)          |
| Total IBP                            | Compteur qui roule jusqu'à N, jauge segmentée en spring `gentle`                                                             | —                                 |
| Changement de facteur (pager)        | Glissement horizontal suivi du doigt                                                                                         | `impact.light`                    |
| Entrée de liste (relevés, parcelles) | `FadeInDown` de 12 px, stagger, au premier affichage seulement                                                               | —                                 |
| Suppression                          | `FadeOut` et `LinearTransition` des lignes restantes                                                                         | `notify.warning`                  |
| Section repliable                    | `LinearTransition` et rotation de 180° du chevron                                                                            | —                                 |
| Chargement                           | Squelette pulsé (opacité de 0,5 à 1, 900 ms)                                                                                 | —                                 |
| Synchronisation                      | Nuage qui tourne → coche, ou nuage barré → toast                                                                             | `notify.success` / `notify.error` |
| Feuille de carte                     | Geste avec paliers, spring `snappy`                                                                                          | `selection` au palier             |
| Soumission d'un relevé               | Révélation du score : compteur et barres A–J qui se remplissent l'une après l'autre (moment gratifiant, façon Apple Fitness) | `notify.success`                  |
| Splash → accueil                     | Fondu et zoom 0,98 → 1, logo en transition partagée                                                                          | —                                 |

**Règle transversale** : quand « Réduire les animations » est actif, toute animation devient un fondu `fast` ou disparaît, et les boucles décoratives (blobs, curseur) s'arrêtent. Les boucles sont aussi suspendues quand l'app passe en arrière-plan. Pas d'animation au défilement d'une liste déjà affichée.

---

## 5. Tokens à ajouter (`mobile/src/app/brand-tokens.ts`)

1. **Spacing en grille de 4** : `xxs 2, xs 4, sm 8, smd 12, md 16, lg 24, xl 32, xxl 48`. Les alias actuels restent en place pendant la migration.
2. **Typographie** :
   - échelle `display 34/41`, `title1 28/34`, `title2 22/28`, `title3 20/25`, `headline 17/22`, `body 17/22`, `callout 16/21`, `subhead 15/20`, `footnote 13/18`, `caption 12/16` ;
   - avec `fontFamily` et `maxFontSizeMultiplier` par rôle.
3. **Radius** : `badge`, `badgeSm`, `row`.
4. **Élévation** : `level0` à `level3` (ombre iOS et `elevation` Android), `focusRing`.
5. **Couleurs sémantiques** :
   - surfaces : `onWarningSurface`, `onDangerSurface`, `onSuccessSurface` ;
   - fonds sombres : `onDark.{text, textMuted, surface1-3, border}` ;
   - bordures et superpositions : `border.{default, strong}`, `overlay.scrim`, `media.backdrop` ;
   - carte : `map.{parcelSelected, parcelStudied, parcelNeutral, userLocation}`.
6. **Interaction** : `pressedScale 0.97`, `pressedOpacity 0.9`, `disabledOpacity 0.4`, `hitTarget.min 44`.
7. **Motion** : `brandMotion` (§4).
8. **Score IBP** : `ibpScoreTokens.max = 50` et seuils recalés.

Toute nouvelle couleur doit être validée en PR (gouvernance de la charte, §10).

---

## 6. Composants à créer ou mutualiser

| Composant                                             | Remplace / sert à                                                    |
| ----------------------------------------------------- | -------------------------------------------------------------------- |
| `AppPressable`                                        | Base de tous les éléments tactiles (retour, haptique, accessibilité) |
| `FactorInput` (compteur, segments, chips, slider)     | Champs numériques des facteurs A–J                                   |
| `IbpFactorBars` et `IbpScoreGauge`                    | Détail, Accueil, Explorer, comparaisons futures                      |
| `SyncStatusPill`                                      | Indicateur hors ligne et file d'envoi (US-D1)                        |
| `SurveyProgressCard`                                  | Fusion de `DraftCard` et `ContinueDraftCard`                         |
| `SkeletonRow` / `Skeleton`                            | États de chargement                                                  |
| `AppNotice` avec `action`                             | Alertes actionnables                                                 |
| `AppGroupedList`                                      | Compte et Paramètres façon iOS                                       |
| `ParcelPickerMap` et `AppMapSheet`                    | Sélection de parcelle et Explorer                                    |
| `BrandHighlight`, usage de `BrandBump` et `BrandFern` | Identité États Sauvages                                              |
| `ui/feedback.ts`                                      | Haptique sémantique                                                  |

---

## 7. Feuille de route proposée

**Lot 0 — Correctifs de confiance (1–2 j)**

- BUG-01 à BUG-08 : échelle /50, statut de synchro prioritaire, virgule décimale, texte et position de la suppression de compte, barre d'état, icône Android, pull-to-refresh.
- Contrastes DS-01 et DS-02, contour de champ DS-14.

**Lot 1 — Saisie terrain (≈ 2 sem)**

- Erreurs après sortie du champ (FLOW-02), clavier (FLOW-03).
- `FactorInput` (FLOW-01).
- Pager A→J et barre d'action fixe (FLOW-04, FLOW-05).
- Anneaux et jauge (FLOW-06), autosave visible (FLOW-07).
- Couleurs de la carte et feuille de parcelles (FLOW-09, FLOW-10).

**Lot 2 — Fondations visuelles et mouvement (≈ 2 sem)**

- Polices (DS-03).
- Tokens et règle ESLint (DS-04, DS-10).
- Reanimated 4 et `brandMotion`, `AppPressable`, `feedback.ts`, squelettes (DS-06 à DS-09).
- Migration des headers repliables (DS-07).

**Lot 3 — Architecture de l'information (≈ 2 sem)**

- Clarification Accueil / Mes Relevés (HOME-01, HOME-02).
- `SyncStatusPill` (SYNC-02) et notices actionnables (SYNC-03).
- Ligne de liste avec score, swipe et filtres en feuille (LIST-01, LIST-02, LIST-04).
- Détail avec `IbpFactorBars` et menu « … » (DET-01 à DET-04).
- Compte en liste groupée (ACC-02, ACC-03).

**Lot 4 — Premier lancement et Explorer (≈ 2 sem)**

- Onboarding et préparation des permissions, splash natif, Sign in with Apple (ONB-01, ONB-02, ONB-04).
- Feuille à paliers, filtres en chips, marqueurs de score avec légende, localisation native (MAP-01 à MAP-04).

**Lot 5 — Finitions**

- Dark mode (DS-12), Liquid Glass (DS-15), gamification « Ma saison » (HOME-07), timeline de l'historique (DET-05).

**Recommandation méthode** : chaque lot devrait se conclure par un court test utilisateur terrain (3–5 observateurs, idéalement en forêt, avec gants et en plein soleil), consigné dans `docs/user-tests/`. Seule l'épic A a été testée à ce jour.
