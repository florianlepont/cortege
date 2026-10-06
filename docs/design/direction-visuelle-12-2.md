# Direction visuelle, phase 12.2

Statut : choisie par le propriétaire le 2026-10-07 (variante I de la maquette `.planning/sketches/008-visual-direction/index.html`). En attente de son approbation de ce texte avant toute modification d'écran (critère 1 de la phase 12.2).

Elle prolonge la charte (`charte-graphique-etats-sauvages-spec.md`) et ne la remplace pas : couleurs de marque, Sora et Jost, mouvement `brandMotion` et mode sombre Graphite restent ceux de la phase 4 et 12.

## En une phrase

Moderne et calme comme Linear, vivante grâce à des cartes forêt lumineuses, du verre et des courbes de niveau qui dérivent lentement : le terrain est la signature de l'app.

## Principes

1. **Surfaces** : plates et en verre léger (`GlassSurface`), filets fins, pas d'ombre lourde. Cartes de rayon 22 px, cartes forêt de rayon 26 à 28 px.
2. **Signature** : courbes de niveau ton sur ton (sage, une ligne sur quatre en moss) dans les cartes forêt et la carte de contexte. Elles remplacent la fougère comme motif principal ; la fougère reste un motif secondaire (auth, états vides).
3. **Cartes forêt lumineuses** : dégradé forêt (`#1D3418` vers `#334E2B` vers `#0E2210`) avec un halo vert en haut à droite, filet clair intérieur, ombre diffuse verte.
4. **Action principale** : bouton moss en pilule avec halo, texte forêt très sombre. Pas de terracotta en CTA ; le terracotta reste réservé aux alertes et à la bande basse du score.
5. **Score** : très gros chiffre fin à dégradé clair, jauge fine lumineuse, deux tuiles de verre (peuplement /35, contexte /15). Les dix facteurs A à J sont dix barres de hauteur proportionnelle au score, colorées par niveau (terracotta 1 à 2, ochre 3, moss 4 à 5), au lieu de la grille de tuiles.
6. **Listes** : le score est un anneau de progression (couleur par bande, tireté s'il n'y a pas de score) ; plus de pastille chiffrée rectangulaire.
7. **Puces et segments** : verre, actif en couleur de texte inversée (pastille pleine neutre), pas d'arc-en-ciel.
8. **Barre d'onglets** : verre renforcé avec un point lumineux sous l'onglet actif.
9. **Fond** : léger halo moss en haut à gauche et sage en haut à droite (clair), halo forêt (sombre) ; le reste uni.
10. **Densité** : Accueil, Compte et Paramètres plus compacts (carte « Reprendre » sur deux lignes, bouton à droite) ; le formulaire A à J et les cibles tactiles ne changent pas (≥ 44 pt).

## Typographie

Sora et Jost restent. Titres d'écran en Sora SemiBold (600), pas ExtraBold, avec interlettrage resserré (-0,02 à -0,03 em). Le gros chiffre du score est en Sora Light (300) : **cette graisse n'est pas chargée aujourd'hui**, à ajouter (fichier OFL à vendorer comme les autres, `mobile/src/__checks__/fonts.test.ts` garde la correspondance nom/fichier).

## Mouvement

Les courbes dérivent en boucle lente (26 s, translation et échelle légères) ; désactivées si « réduire les animations » est actif. Le reste suit `brandMotion` : jauges et anneaux qui se remplissent, entrée décalée des listes, transitions natives, halo du bouton au retour d'action. Toujours `ReduceMotion.System`.

## Points à vérifier à l'implémentation

- Contraste du texte sur les dégradés (chiffre du score, étiquettes sur halo) : mesurer, AA minimum.
- Coût du flou et des halos sur Android milieu de gamme ; repli en aplat si le rendu saccade.
- Texte à dégradé : pas natif en React Native, prévoir un masque (`MaskedView`) ou, à défaut, un aplat sage clair.
- Maquette en HTML : les rayons et les ombres sont à traduire en tokens (`brand-tokens.ts`, `theme.ts`), pas copiés.

## Hors périmètre, retenu pour plus tard

- **Animaux** (variante J) : les illustrations de `mobile/assets/animals/` (martre, mésange, pic noir, sittelle, rosalie, salamandre, grenouille, bousier) et une bande « Qui vit ici ? » liant espèces et facteurs. Le propriétaire a retenu I sans les animaux pour la 12.2 ; l'idée est notée comme graine. Les liens espèce-facteur n'ont pas été validés avec la méthode IBP.
- Variantes écartées : A sobre, B expressif, E charte et couleur, G rosette IBP, H carnet de terrain.
