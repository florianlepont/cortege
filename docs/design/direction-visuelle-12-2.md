# Direction visuelle, phase 12.2

Statut : approuvée par le propriétaire le 2026-10-08, après la confirmation sur téléphone de la version 39b4f005 (variante I de la maquette `.planning/sketches/008-visual-direction/index.html`, appliquée en phase 12.2).

Historique : choisie par le propriétaire le 2026-10-07 (variante I), alignée le 2026-10-07 sur les arbitrages de mise en œuvre ci-dessous, puis corrigée à chacune des quatre vérifications sur téléphone (2026-10-07 et 2026-10-08) et pendant la confirmation finale (plan 12.2-23, 2026-10-08). Le propriétaire a lu ce texte avant toute modification d'écran (critère 1 de la phase 12.2).

Elle prolonge la charte (`charte-graphique-etats-sauvages-spec.md`, section 13 pour ce qui a été livré) et ne la remplace pas : couleurs de marque, Sora et Jost, mouvement `brandMotion` et mode sombre Graphite restent ceux des phases 4 et 12.

## En une phrase

Moderne et calme comme Linear, vivante grâce à des cartes forêt lumineuses où passent une brume et des courbes de niveau parcourues de lumière, et du verre : le terrain est la signature de l'app.

## Principes

1. **Surfaces** : plates, avec un aspect verre sans flou sur les cartes (fond translucide, filet fin, léger reflet intérieur) et pas d'ombre lourde. Le vrai flou (`GlassSurface`) reste réservé aux commandes flottantes : barre d'onglets, feuilles, boutons de la carte (D-04, D-12). Au-dessus d'une carte, ces commandes prennent un verre dense, car les fonds de carte restent clairs en mode sombre. La seule ombre colorée est celle des cartes forêt et des boutons d'action. Cartes de rayon 22 px, cartes forêt de rayon 26 à 28 px, coins circulaires partout (D-29).
2. **Signature** : dans chaque carte forêt, une brume de trois nappes douces (mousse, sarcelle, ocre) dérive lentement, et quatre courbes de niveau en diagonale traversent la carte avec un trait de lumière qui les parcourt (réglages du propriétaire dans la maquette 010, `round4.html` et `round5.html`). Les courbes s'effacent derrière le texte et un voile doux garde chaque bloc lisible. Les courbes fixes restent sur la vignette de la carte du relevé tant que la vraie carte n'a pas dessiné (chargement, hors ligne) et derrière la carte « Nouveau relevé » de l'Accueil ; jamais par-dessus la carte réelle (D-13). Au plus deux couches animées par écran, une seule aujourd'hui. La fougère reste un motif secondaire (auth, états vides).
3. **Cartes forêt lumineuses** : dégradé forêt (`#1D3418` vers `#334E2B` vers `#0E2210`) avec un halo vert en haut à droite, filet clair intérieur, ombre diffuse verte. Une seule par écran : carte « Reprendre » de l'Accueil, carte de synthèse de Mes Relevés (D-22), carte du score du relevé.
4. **Action principale** : les gros boutons d'action sont le bouton verre natif d'iOS 26, teinté du vert forêt de la charte `#334E2B` avec un texte blanc, dans une barre transparente qui laisse voir le contenu (D-27c, D-28) ; ailleurs, un aplat translucide du même vert. La pilule moss à halo ne reste que sur la carte « Reprendre ». Pas de terracotta en CTA ; le terracotta reste réservé aux alertes et à la bande basse du score.
5. **Score** : très gros chiffre fin à dégradé clair (gardé en dégradé après la vérification du lot 2), jauge fine lumineuse, deux tuiles de verre (peuplement /35, contexte /15). Sur la synthèse, la carte du score est un peu plus petite et n'a plus le graphique des facteurs (D-24) ; les dix barres A à J vivent sur la page Score, non tactiles, avec les lignes de facteurs de 44 pt pour la navigation. Leurs couleurs suivent une convention d'affichage, pas une règle IBP : terracotta de 0 à 2, ochre pour 3, moss de 4 à 5 (D-15). Les totaux utilisent les bandes de `@cortege/ibp-domain` (`bandTone(totalBand(n))`), pas un découpage tiré de la maquette.
6. **Listes** : le score est un anneau de progression à droite de la ligne, centré verticalement (D-27a), couleur par bande, tireté s'il n'y a pas de score. Une vague verte part du doigt quand on appuie sur une ligne (D-21). Pas de photo dans les lignes. Les lignes Communauté ont la taille des lignes Mes relevés (D-23).
7. **Puces et segments** : verre, actif en couleur de texte inversée (pastille pleine neutre), pas d'arc-en-ciel.
8. **Barre d'onglets** : sur iPhone, la barre système garde son aspect Liquid Glass natif et ne prend que la teinte de la marque ; le point lumineux sous l'onglet actif n'existe que sur la barre Android et Expo Go.
9. **Fond et en-têtes** : léger halo moss en haut à gauche et sage en haut à droite (clair), halo forêt (sombre), sur tous les écrans, avec un en-tête transparent pour qu'aucune bande de couleur n'apparaisse en haut (D-19) ; le contenu ne passe jamais sous l'en-tête. Les pages dont le titre défilait prennent le grand titre natif d'iOS, qui se réduit dans la barre au défilement avec un flou derrière (D-30). L'assistant de relevé prend l'en-tête natif et son bouton retour ; l'Accueil garde son bonjour dans la barre (D-29).
10. **Densité** : Accueil, Compte et Paramètres plus compacts ; le formulaire A à J et les cibles tactiles ne changent pas (≥ 44 pt). Sur l'Accueil, la carte « Reprendre » ne fait que reprendre le brouillon ; « Nouveau relevé » est une carte de verre à part, juste en dessous ; « Mes relevés récents » montre les trois derniers relevés ; Outils tient sur une ligne ; la note « À jour » a disparu (la ligne de synchronisation n'apparaît que s'il y a quelque chose à dire) ; un bout de la carte « Autour de vous » se voit au lancement (D-20).
11. **Icônes** : `@expo/vector-icons`, un seul style de contour (`-outline`) dans toute l'app (D-07).
12. **Explorer** : toucher un relevé l'ouvre directement, sans carte intermédiaire. Les parcelles sans score sont en gris chaud ; le vert ne veut dire qu'un score haut. Un relevé noté garde son marqueur tant qu'aucune parcelle notée ne le montre. En mode téléchargement, tout le bord de l'écran pulse en vert (pulsation seule, sans lumière qui tourne), au-dessus du panneau et de la barre d'onglets ; le panneau montre une barre de progression, puis la fin ou l'échec, avec un bouton de 46 pt.

## Typographie

Sora et Jost restent. Titres d'écran en Sora SemiBold (600), pas ExtraBold, avec interlettrage resserré (-0,02 à -0,03 em). Le gros chiffre du score est en Sora Light (300), le seul nouveau fichier de police (`Sora-Light.ttf`, vérifié par `mobile/src/__checks__/fonts.test.ts`) : 68 pt sur la page Score, 56 pt sur la carte de la synthèse.

## Mouvement

Dans les cartes forêt, la brume dérive en boucle sans jamais se répéter à l'identique (allers de 7 s, 9 s et 11,5 s) et un trait de lumière parcourt chaque courbe (7 à 13 s) ; tout reste immobile si « réduire les animations » est actif, et rien ne tourne quand l'écran n'est pas visible. Le reste suit `brandMotion` : jauges et anneaux qui se remplissent, entrée des sections qui glissent vers le haut à chaque retour sur l'écran, vague verte sur les lignes, transitions natives, halo et vibration à la fin d'un relevé. Quand les dix facteurs et les informations sont remplis, le dernier bouton du formulaire devient « Terminer le relevé » : le relevé est terminé et synchronisé sans étape manuelle (D-25, D-26). Toujours `ReduceMotion.System`.

## Arbitrages de mise en œuvre (2026-10-07)

- Verre sans flou sur les cartes : fond translucide et filet fin, le flou réel reste sur les commandes flottantes (D-12).
- Cartes forêt en mode sombre : le dégradé de la variante I est gardé, avec un halo plus discret tenu dans un seul jeton par schéma de couleurs, pour pouvoir réduire le vert sans toucher au code (D-14).
- Mode clair : anneaux et barres en moss plus foncé `#728A2D` (contraste 3,6:1), et texte atténué sur le forêt de base, car trois couleurs de la maquette échouent le seuil AA (le `text3` de la maquette, le moss sur surfaces claires, le texte de la puce de succès) et ne sont pas utilisées (D-16).
- Aucune courbe de niveau sur la carte réelle (D-13).
- Android reçoit des replis propres (aplat translucide), avec un passage sur appareil en phase 28 (validation terrain, ancienne phase 13 ; D-17).
- Contraintes reportées : Linear comme référence, palette sombre Graphite inchangée (D-03), Sora et Jost conservées avec Sora Light (300) comme seul nouveau fichier de police (D-06), `@expo/vector-icons` conservé avec un seul style de contour (D-07). Une seule nouvelle dépendance, `@expo/ui`, pour le bouton verre natif d'iOS 26, à la demande du propriétaire (D-28) ; elle est exclue d'Android.

## Corrections du propriétaire aux vérifications sur téléphone

- **Lot 1 (Accueil, Compte, Paramètres, 2026-10-07)** : pastille « REPRENDRE » supprimée ; bouton bien séparé de la barre d'avancement ; en-tête transparent ; glissement d'entrée visible. Les choix par défaut (D-12, D-13, D-14, D-16, barre d'onglets système) n'ont soulevé aucune objection.
- **Lot 2 (Mes Relevés, recherche, relevé, 2026-10-07)** : halo sur tous les écrans (D-19) ; Accueil plus compact avec les relevés récents et un bout de carte (D-20) ; vague verte (D-21) ; carte forêt de synthèse sur Mes Relevés (D-22) ; lignes de même taille (D-23) ; carte du score plus petite, sans graphique des facteurs (D-24) ; fin de relevé sans bouton « synchroniser » (D-25) ; anneaux à droite et bloc photos refait (D-27) ; bouton verre natif en vert forêt (D-28). Le chiffre du score reste en dégradé.
- **Lot 3 (formulaire et assistant, 2026-10-07)** : plus de couche plate qui dépasse sous le verre ni de filet vert de la mauvaise taille ; en-tête natif de l'assistant (D-29) ; grands titres natifs avec flou (D-30) ; coins circulaires acceptés.
- **Thème (2026-10-08)** : le choix Apparence (Automatique, Clair, Sombre) disparaît de Paramètres, à la demande du propriétaire ; l'application suit seulement le mode clair ou sombre du téléphone, en direct.
- **Lot 4 (Explorer, 2026-10-07 et 2026-10-08)** : ouverture directe des relevés ; panneau de téléchargement refait avec barre de progression et bouton de 46 pt ; pulsation verte du bord de l'écran ; commandes de carte et feuilles lisibles en mode sombre ; feuilles de l'Explorer en verre natif d'iOS 26, en sombre puis en clair (2026-10-08) ; parcelles sans score en gris chaud ; « Nouveau relevé » en carte de verre à part ; brume et courbes diagonales lumineuses dans toutes les cartes forêt, réglées par le propriétaire dans la maquette 010.

## Points vérifiés à l'implémentation

- Contraste du texte sur les dégradés et sur la brume animée : mesuré par des tests, au pire cas de chaque couche, AA minimum (marges faibles, à remesurer à tout réglage).
- Texte à dégradé : le chiffre du score est dessiné en texte SVG avec un dégradé (blanc vers `#C8DDA0`) ; le repli en aplat `#C8DDA0` reste commuté par une seule constante, non utilisé.
- Maquette en HTML : les rayons, les ombres et les couleurs sont traduits en jetons (`brand-tokens.ts`, `theme.ts`, `visual-tokens.ts`, `theme-visual.ts`, `forest-aurora-tokens.ts`), pas copiés.
- Android : aplat translucide sur les cartes et les commandes flottantes (pas de flou), coût de la brume et des courbes animées sur un téléphone milieu de gamme, vérifiés sur un appareil en phase 28 (ancienne phase 13, D-17).

## Points ouverts pour la confirmation finale (plan 12.2-23)

- Couleur des parcelles selon le score sur le relevé du propriétaire : dépend de la correction serveur des identifiants IGN (migration 020), en production seulement après la fusion dans `main`.
- Titre fixe du formulaire page par page ; éléments de la maquette 009 (pilule lumineuse sur le bouton suivant et le plus des compteurs, anneau d'avancement dans l'en-tête) ; confirmation que rien n'est plus petit ni plus difficile à toucher dans le formulaire.
- Bouton verre natif dans `GenusTargetSheet` et verre sur `CasPicker` ; balayage depuis le bord dans l'assistant ; ligne de coupe sous les en-têtes transparents au défilement.

## Hors périmètre, retenu pour plus tard

- **Animaux** (variante J) : les illustrations de `mobile/assets/animals/` (martre, mésange, pic noir, sittelle, rosalie, salamandre, grenouille, bousier) et une bande « Qui vit ici ? » liant espèces et facteurs. Le propriétaire a retenu I sans les animaux pour la 12.2 ; l'idée est notée comme graine (`.planning/seeds/SEED-005-animaux-qui-vit-ici.md`). Les liens espèce-facteur n'ont pas été validés avec la méthode IBP.
- Variantes écartées : A sobre, B expressif, E charte et couleur, G rosette IBP, H carnet de terrain.
- Glisser de la feuille de l'Explorer sur le fil JS et contraste de l'indicateur de chargement de Compte en mode sombre : phase 26 (ancienne 12.3).
