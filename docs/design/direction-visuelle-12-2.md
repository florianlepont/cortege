# Direction visuelle, phase 12.2

Statut : choisie par le propriétaire le 2026-10-07 (variante I de la maquette `.planning/sketches/008-visual-direction/index.html`), puis alignée le 2026-10-07 sur les arbitrages de mise en œuvre ci-dessous. Le propriétaire lit ce texte avant toute modification d'écran (critère 1 de la phase 12.2) ; le statut final est écrit à la clôture de la phase.

Elle prolonge la charte (`charte-graphique-etats-sauvages-spec.md`) et ne la remplace pas : couleurs de marque, Sora et Jost, mouvement `brandMotion` et mode sombre Graphite restent ceux de la phase 4 et 12.

## En une phrase

Moderne et calme comme Linear, vivante grâce à des cartes forêt lumineuses, du verre et des courbes de niveau qui dérivent lentement : le terrain est la signature de l'app.

## Principes

1. **Surfaces** : plates, avec un aspect verre sans flou sur les cartes (fond translucide, filet fin, léger reflet intérieur) et pas d'ombre lourde. Le vrai flou (`GlassSurface`) reste réservé aux commandes flottantes : barre d'onglets, feuilles, boutons de la carte (D-04, D-12). La seule ombre colorée est celle des cartes forêt et de la pilule moss. Cartes de rayon 22 px, cartes forêt de rayon 26 à 28 px.
2. **Signature** : courbes de niveau ton sur ton (sage, une ligne sur quatre en moss) dans les cartes forêt et en fond de la carte de contexte du relevé là où la vraie carte n'a pas encore dessiné (chargement, hors ligne) ; jamais dessinées par-dessus la carte réelle (D-13). Au plus deux instances animées par écran. Elles remplacent la fougère comme motif principal ; la fougère reste un motif secondaire (auth, états vides).
3. **Cartes forêt lumineuses** : dégradé forêt (`#1D3418` vers `#334E2B` vers `#0E2210`) avec un halo vert en haut à droite, filet clair intérieur, ombre diffuse verte.
4. **Action principale** : bouton moss en pilule avec halo, texte forêt très sombre. Pas de terracotta en CTA ; le terracotta reste réservé aux alertes et à la bande basse du score.
5. **Score** : très gros chiffre fin à dégradé clair, jauge fine lumineuse, deux tuiles de verre (peuplement /35, contexte /15). Les dix facteurs A à J sont dix barres de hauteur proportionnelle au score, au lieu de la grille de tuiles. Leurs couleurs suivent une convention d'affichage, pas une règle IBP : terracotta de 0 à 2, ochre pour 3, moss de 4 à 5 (D-15). Les dix barres ne sont pas tactiles ; la page Score garde ses lignes de facteurs (44 pt) pour la navigation. Les totaux utilisent les bandes de `@cortege/ibp-domain` (`bandTone(totalBand(n))`), pas un découpage tiré de la maquette.
6. **Listes** : le score est un anneau de progression (couleur par bande, tireté s'il n'y a pas de score) ; plus de pastille chiffrée rectangulaire.
7. **Puces et segments** : verre, actif en couleur de texte inversée (pastille pleine neutre), pas d'arc-en-ciel.
8. **Barre d'onglets** : sur iPhone, la barre système garde son aspect Liquid Glass natif et ne prend que la teinte de la marque ; le point lumineux sous l'onglet actif n'existe que sur la barre Android et Expo Go.
9. **Fond** : léger halo moss en haut à gauche et sage en haut à droite (clair), halo forêt (sombre) ; le reste uni.
10. **Densité** : Accueil, Compte et Paramètres plus compacts (carte « Reprendre » sur deux lignes, bouton à droite) ; le formulaire A à J et les cibles tactiles ne changent pas (≥ 44 pt).

## Typographie

Sora et Jost restent. Titres d'écran en Sora SemiBold (600), pas ExtraBold, avec interlettrage resserré (-0,02 à -0,03 em). Le gros chiffre du score est en Sora Light (300) : **cette graisse n'est pas chargée aujourd'hui**, à ajouter (fichier OFL à vendorer comme les autres, `mobile/src/__checks__/fonts.test.ts` garde la correspondance nom/fichier).

## Mouvement

Les courbes dérivent en boucle lente (26 s, translation et échelle légères) ; désactivées si « réduire les animations » est actif. Le reste suit `brandMotion` : jauges et anneaux qui se remplissent, entrée décalée des listes, transitions natives, halo du bouton au retour d'action. Toujours `ReduceMotion.System`.

## Arbitrages de mise en œuvre (2026-10-07)

- Verre sans flou sur les cartes : fond translucide et filet fin, le flou réel reste sur les commandes flottantes (D-12).
- Cartes forêt en mode sombre : le dégradé de la variante I est gardé, avec un halo plus discret tenu dans un seul jeton par schéma de couleurs, pour pouvoir réduire le vert sans toucher au code (D-14).
- Mode clair : anneaux et barres en moss plus foncé `#728A2D` (contraste 3,6:1), et texte atténué sur le forêt de base, car trois couleurs de la maquette échouent le seuil AA (le `text3` de la maquette, le moss sur surfaces claires, le texte de la puce de succès) et ne sont pas utilisées (D-16).
- Aucune courbe de niveau sur la carte réelle (D-13).
- Android reçoit des replis propres (aplat translucide), avec un passage sur appareil en phase 13 (D-17).
- Contraintes reportées : Linear comme référence, palette sombre Graphite inchangée (D-03), Sora et Jost conservées avec Sora Light (300) comme seul nouveau fichier de police (D-06), `@expo/vector-icons` conservé avec un seul style de contour (D-07), aucune nouvelle dépendance.

## Points à vérifier à l'implémentation

- Contraste du texte sur les dégradés (chiffre du score, étiquettes sur halo) : mesurer, AA minimum.
- Coût des halos sur Android milieu de gamme ; repli en aplat si le rendu saccade.
- Texte à dégradé : le chiffre du score est dessiné en texte SVG avec un dégradé (blanc vers `#C8DDA0`), avec un repli en aplat `#C8DDA0` commuté par une seule constante si le rendu échoue sur l'appareil.
- Android : aplat translucide sur les cartes et les commandes flottantes (pas de flou), vérifié sur un appareil en phase 13 (D-17).
- Maquette en HTML : les rayons et les ombres sont à traduire en tokens (`brand-tokens.ts`, `theme.ts`), pas copiés.

## Hors périmètre, retenu pour plus tard

- **Animaux** (variante J) : les illustrations de `mobile/assets/animals/` (martre, mésange, pic noir, sittelle, rosalie, salamandre, grenouille, bousier) et une bande « Qui vit ici ? » liant espèces et facteurs. Le propriétaire a retenu I sans les animaux pour la 12.2 ; l'idée est notée comme graine. Les liens espèce-facteur n'ont pas été validés avec la méthode IBP.
- Variantes écartées : A sobre, B expressif, E charte et couleur, G rosette IBP, H carnet de terrain.
