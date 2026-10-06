# Passage téléphone du 6 octobre 2026 (phase 12.1)

Une seule séance pour fermer les 52 points « à vérifier » du journal
([owner-acceptance.md](owner-acceptance.md)). Le parcours suit l'ordre d'usage de l'app. Cochez au fil
de l'eau ; chaque case non cochée devient un point du journal avec une note de ce qui ne va pas.

**Avant de commencer**

- [ ] Build Release depuis `main` après la fusion de la PR #232, installé sur l'iPhone (réinstallation
      propre : la base locale a changé avec OA-41, et la permission caméra a un nouveau texte).
- [ ] Le serveur est à jour (déploiement automatique, 5 minutes après la fusion) et contient les
      données de démo : 100 relevés de la communauté et 11 relevés sur votre compte (6 brouillons,
      5 terminés), voir `infra/vps/README.md`.

## 1. Connexion et premier lancement

- [ ] OA-05 Polices Sora et Jost visibles sur toute l'app, titre de connexion « Indice de
      Biodiversité Potentielle » assez présent (32 pt).
- [ ] OA-21 Les en-têtes se ressemblent d'un écran à l'autre : un seul grand titre, pas de doublon.

## 2. Accueil

- [ ] OA-11 Tirer pour rafraîchir : le spinner iOS apparaît, l'écran ne descend pas trop loin.
- [ ] OA-12 Le rafraîchissement recharge bien les relevés du serveur (les 11 relevés de démo
      apparaissent).
- [ ] OA-14 OA-15 OA-16 « Bonjour, … » aligné avec l'avatar, pas de date, un long prénom ne pousse
      rien hors de l'écran.
- [ ] OA-19 La carte « Autour de vous » a la largeur des autres cartes.
- [ ] OA-107 Section « Outils » : « Identifier un arbre » ouvre la caméra, puis propose de commencer
      un relevé avec le genre trouvé.
- [ ] OA-87 Choisir une photo de profil dans la galerie : la galerie s'ouvre vite.

## 3. Mes Relevés et recherche

- [ ] OA-99 Pas de grand vide entre le titre et les deux chiffres.
- [ ] OA-100 Le bouton de recherche est détaché de la barre d'onglets (déjà vu, à confirmer sur la
      dernière build).
- [ ] OA-90 Dans la recherche, onglet Communauté : les relevés de démo s'ouvrent en lecture seule
      (score, facteurs, parcelles, historique).
- [ ] OA-105 La Communauté a de quoi s'afficher (100 relevés).

## 4. Créer un relevé

- [ ] OA-91 OA-109 Étape parcelles : boutons en verre comme Explorer (bascule du fond de carte en
      haut à droite, localisation en bas à droite), un seul pastille de titre, légende des couleurs
      en bas à gauche.
- [ ] OA-92 OA-106 La proposition de carte hors ligne est en haut de l'écran, pas coupée.
- [ ] OA-97 « Modifier les parcelles » ouvre la même carte plein écran.
- [ ] OA-23 OA-29 OA-30 OA-35 Formulaire : pas de texte qui déborde, pas de défilement parasite, place
      au contenu, accents et mots coupés corrigés.
- [ ] OA-98 OA-110 OA-111 Écrans de facteurs : en-tête et pied transparents, ligne de score qui passe
      à la ligne, navigation A à J en capsule fine : glisser le doigt dessus change de facteur avec un
      léger retour haptique.

## 5. Page d'un relevé

- [ ] OA-41 Plus aucune échéance ni « Délai de soumission » (ni sur les anciens relevés).
- [ ] OA-93 Le bandeau du score n'est pas cliquable ; la ligne « Score IBP » ouvre les facteurs.
- [ ] OA-94 OA-95 OA-50 Titre sans « Détail », en-tête transparent, bouton du bas visible au-dessus
      de la barre ; toucher le titre le renomme.
- [ ] OA-44 OA-96 La carte est zoomée sur les parcelles et un toucher ouvre l'édition des parcelles.
- [ ] OA-59 « Voir sur la carte » ouvre Explorer centré sur le relevé, fiche ouverte. Un brouillon y
      apparaît en pointillés. Le panneau descend derrière la barre d'onglets et se ferme par la croix
      ou en le glissant vers le bas.
- [ ] OA-112 Dans l'historique, les dates sont lisibles (plus d'horodatage brut).

## 6. Explorer

- [ ] OA-101 OA-102 OA-103 Boutons en vrai verre sans contour, pas de « i » MapLibre caché, capsule
      sous la barre d'état. Légende : couleurs des scores et ligne « Brouillon ».
- [ ] OA-104 OA-66 Le bouton de téléchargement ouvre le panneau « Zones hors connexion » : il se
      pose en bas, le clavier ne cache ni le nom ni le bouton, le téléchargement se lance et la zone
      apparaît dans la liste.
- [ ] OA-108 Dans Paramètres, « Cartes hors ligne » liste les zones et permet de les supprimer.

## 7. Compte et Paramètres

- [ ] OA-68 OA-69 OA-70 OA-79 Compte et Paramètres : en-tête cohérent, pages plus modernes.
- [ ] OA-71 OA-74 OA-75 Plus de « Contributeur » ; crédits sous « À propos » ; pas de bloc
      synchronisation dans Compte.
- [ ] OA-72 OA-77 Pas de « Sauvegardé » permanent ; une erreur de photo de profil s'affiche sur
      Compte, pas dans Paramètres.
- [ ] OA-78 Plus de boutons de synchronisation manuelle dans Paramètres.

## Après la séance

- Cases non cochées : une ligne dans le journal avec ce qui ne va pas (capture ou enregistrement
  bienvenus).
- Tout est coché : je ferme les points dans le journal et je prépare la sortie de la phase 12.1
  (confirmation écrite du propriétaire, puis phase 13). Pensez à retirer les données de démo avant
  d'ouvrir l'app au public : `seed-demo-community.js --remove`.
