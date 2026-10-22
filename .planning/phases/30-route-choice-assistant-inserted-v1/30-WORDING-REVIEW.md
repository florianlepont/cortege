# Phase 30 : relecture des phrases françaises

Régénérée le 2026-10-22 depuis le catalogue (`mobile/src/i18n/fr/`), après toutes les modifications de la phase (une question par écran, textes courts, page « Parcelles »).

**Comment relire.** Chaque ligne donne la clé entre apostrophes inversées, puis le texte. Pour changer une phrase, répondre « clé : nouveau texte ». Les phrases qui contiennent un nombre sont montrées avec un exemple. Les mots de la méthode (parcours en plein, parcours partiel, relevé plafonné, relevé déplafonné, peuplement) sont ceux de la méthode officielle de l'IBP et sont expliqués en une phrase.

**À relire en priorité** : les sections 2, 4, 10, 11 et 12 (ce que l'observateur lit le plus).

## 1. Étape 5 : écran et boutons

- `routeGuide.screen.edit` : Modifier
- `routeGuide.screen.know` : Je connais déjà mon parcours
- `routeGuide.screen.next` : Continuer
- `routeGuide.screen.result.chosenLead` : Vous l'avez choisi vous-même. Vous pouvez encore le changer.
- `routeGuide.screen.result.chosenTitle` : Voici votre parcours
- `routeGuide.screen.result.suggestedLead` : Il découle de vos réponses. Vous pouvez en changer.
- `routeGuide.screen.result.suggestedTitle` : Voici le parcours conseillé
- `routeGuide.screen.retry` : Réessayer
- `routeGuide.screen.saveError` : Le parcours n'a pas pu être enregistré.
- `routeGuide.screen.title` : Choix du parcours
- `routeGuide.screen.use` : Utiliser ce parcours

## 2. Étape 5 : les questions (titres, aides, réponses)

- `routeGuide.questions.difficulty.answers.easy` : Facile à observer
- `routeGuide.questions.difficulty.answers.hard` : Difficile à observer
- `routeGuide.questions.difficulty.options.easy.caption` : On voit loin et on marche sans peine.
- `routeGuide.questions.difficulty.options.easy.title` : Non, c'est facile
- `routeGuide.questions.difficulty.options.hard.caption` : On voit à moins de 10 à 15 mètres, on avance mal dans la végétation, ou le relief est accidenté.
- `routeGuide.questions.difficulty.options.hard.title` : Oui, c'est difficile
- `routeGuide.questions.difficulty.short` : Observation
- `routeGuide.questions.difficulty.title` : Est-il difficile à observer ?
- `routeGuide.questions.difficulty.why` : Quand on voit mal ou qu'on avance mal, décrire une partie bien choisie fait gagner du temps.
- `routeGuide.questions.homogeneity.answers.heterogeneous` : Varié
- `routeGuide.questions.homogeneity.answers.homogeneous` : Homogène
- `routeGuide.questions.homogeneity.options.heterogeneous.caption` : Plusieurs essences, plusieurs âges, des trouées. Par exemple : futaie irrégulière mélangée.
- `routeGuide.questions.homogeneity.options.heterogeneous.title` : Non, il est varié
- `routeGuide.questions.homogeneity.options.homogeneous.caption` : Mêmes arbres, même âge, même aspect partout. Par exemple : plantation, taillis de châtaignier, jeune peuplement.
- `routeGuide.questions.homogeneity.options.homogeneous.title` : Oui, plutôt homogène
- `routeGuide.questions.homogeneity.short` : Aspect
- `routeGuide.questions.homogeneity.title` : Le peuplement est-il homogène ?
- `routeGuide.questions.homogeneity.why` : Un peuplement homogène se décrit bien par une partie. Un peuplement varié demande de tout voir.
- `routeGuide.questions.narrow.answers.narrow` : Étroit
- `routeGuide.questions.narrow.answers.wide` : Large
- `routeGuide.questions.narrow.options.no.caption` : Assez large pour y placer un grand cercle.
- `routeGuide.questions.narrow.options.no.title` : Non, il est large
- `routeGuide.questions.narrow.options.yes.caption` : Moins de 100 mètres d'un bord à l'autre.
- `routeGuide.questions.narrow.options.yes.title` : Oui, il est étroit
- `routeGuide.questions.narrow.short` : Largeur
- `routeGuide.questions.narrow.title` : Le peuplement fait-il moins de 100 mètres de large ?
- `routeGuide.questions.narrow.why` : Un peuplement étroit se décrit mieux en bande qu'en placette.
- `routeGuide.questions.refine.experienceBeginner` : Non, c'est nouveau pour moi
- `routeGuide.questions.refine.experienceLabel` : Connaissez-vous déjà l'IBP ?
- `routeGuide.questions.refine.experienceRegular` : Oui, j'en ai déjà fait
- `routeGuide.questions.refine.experienceShort` : Expérience
- `routeGuide.questions.refine.hoursInvalid` : Indiquez un nombre d'heures supérieur à 0 et au plus 24, ou laissez vide.
- `routeGuide.questions.refine.hoursLabel` : Temps disponible, en heures
- `routeGuide.questions.refine.hoursShort` : Temps disponible
- `routeGuide.questions.refine.hoursSuffix` : heures
- `routeGuide.questions.refine.hoursValue` : 1 heure|3 heures  (exemple)
- `routeGuide.questions.refine.lead` : Ces réponses ne changent pas le parcours conseillé. Elles servent seulement à vous donner des repères sur la durée. Vous pouvez les laisser vides.
- `routeGuide.questions.refine.title` : Pour affiner
- `routeGuide.questions.surface.aid` : Un hectare, c'est un carré de 100 mètres de côté.
- `routeGuide.questions.surface.estimated` : Estimée d'après les parcelles que vous avez choisies. Corrigez-la si votre peuplement est plus petit ou plus grand.
- `routeGuide.questions.surface.label` : Surface en hectares
- `routeGuide.questions.surface.linearHelp` : Les haies et les alignements d'arbres de moins de 15 mètres de large ne sont pas pris en charge : les seuils de l'IBP sont calculés par hectare.
- `routeGuide.questions.surface.short` : Surface
- `routeGuide.questions.surface.subStand` : Quelle est la surface d'un des morceaux ?
- `routeGuide.questions.surface.subStandWhy` : Faites un relevé par morceau homogène. Indiquez la surface du premier morceau, vous ferez les autres ensuite.
- `routeGuide.questions.surface.suffix` : ha
- `routeGuide.questions.surface.title` : Quelle est la surface du peuplement ?
- `routeGuide.questions.surface.unknown` : La surface n'a pas pu être calculée. Indiquez-la : le calcul se fait aussi sans connexion.
- `routeGuide.questions.surface.value` : 2,4 ha  (exemple)
- `routeGuide.questions.surface.valueEstimated` : 2,4 ha, estimée  (exemple)
- `routeGuide.questions.surface.why` : La surface décide si vous pouvez tout parcourir ou seulement une partie.

## 3. Étape 5 : peuplement trop grand (deux options)

- `routeGuide.largeStand.partial.caption` : Vous décrivez une partie du peuplement entier.
- `routeGuide.largeStand.partial.title` : Parcours partiel, sans découper
- `routeGuide.largeStand.recommended` : Conseillé
- `routeGuide.largeStand.short` : Grand peuplement
- `routeGuide.largeStand.subdivide.caption` : Le plus fidèle à la méthode officielle de l'IBP : vous faites un relevé par morceau homogène.
- `routeGuide.largeStand.subdivide.title` : Découper en sous-peuplements
- `routeGuide.largeStand.subdivideCta` : Indiquer la surface d'un morceau
- `routeGuide.largeStand.subdivideNotice` : Faites un relevé par morceau : indiquez la surface du premier morceau.
- `routeGuide.largeStand.title` : Votre peuplement est grand. Deux façons de faire

## 4. Résultat : carte de suggestion

- `routeGuide.suggestion.adviceTitle` : Conseil
- `routeGuide.suggestion.change` : Changer de parcours
- `routeGuide.suggestion.countedLead` : Facteurs comptés en entier
- `routeGuide.suggestion.eyebrowChosen` : Parcours choisi par vous
- `routeGuide.suggestion.eyebrowSuggested` : Parcours conseillé
- `routeGuide.suggestion.reasonsTitle` : Pourquoi ce conseil ?
- `routeGuide.suggestion.restore` : Revenir au parcours conseillé
- `routeGuide.suggestion.surfaceLine` : Surface décrite : 1,2 ha  (exemple)

## 5. Résultat : les raisons

- `routeGuide.reasons.cappedDefault` : Relevé plafonné : on arrête de compter un élément dès que son score est sûr. C'est le plus rapide et le plus courant.
- `routeGuide.reasons.complementAdvised` : Un coup d'œil au reste du peuplement améliore la précision pour quelques facteurs faciles à repérer : genres d'arbres, milieux ouverts et lisières, milieux aquatiques et rocheux.
- `routeGuide.reasons.largeStand` : Au-dessus de 10 hectares pour un peuplement varié, ou de 20 hectares pour un peuplement homogène, la méthode officielle de l'IBP conseille de le découper en morceaux homogènes, ou d'en décrire seulement une partie.
- `routeGuide.reasons.partialHardToObserve` : Le peuplement est difficile à observer : décrire seulement une partie, en bande, vous fera gagner du temps.
- `routeGuide.reasons.partialHomogeneous` : Le peuplement est homogène : une partie bien choisie le représente, inutile de le parcourir en entier.
- `routeGuide.reasons.partialMediumStand` : Au-delà de 5 hectares, la méthode officielle de l'IBP recommande de décrire seulement une partie du peuplement.
- `routeGuide.reasons.partialPlotWhy` : Les placettes conviennent aux peuplements homogènes, larges et faciles à parcourir.
- `routeGuide.reasons.partialStripWhy` : Les bandes conviennent aux peuplements variés, étroits ou difficiles à parcourir.
- `routeGuide.reasons.wholeStandHeterogeneous` : Le peuplement est varié et facile à observer : il vaut mieux le parcourir en entier pour ne rien manquer.
- `routeGuide.reasons.wholeStandSmall` : Votre peuplement fait un hectare ou moins : le plus simple est de le parcourir en entier.

## 6. Résultat : avertissements

- `routeGuide.warnings.partialOverHalf` : Vous décrivez plus de la moitié du peuplement : le parcourir en entier serait plus simple.
- `routeGuide.warnings.smallStand` : Sous 0,5 hectare, l'IBP est moins pertinent.

## 7. Résultat : conseils (durée, expérience, temps)

- `routeGuide.advice.beginner` : L'IBP est nouveau pour vous : prévoyez plus de temps, car un débutant en a besoin de plus.
- `routeGuide.advice.duration` : Pour cette surface, comptez 25 à 30 minutes pour une personne habituée à l'IBP.  (exemple)
- `routeGuide.advice.durationHours` : environ 2 à 3 heures|environ 2 heures  (exemple)
- `routeGuide.advice.durationMinutes` : 25 à 30 minutes|1 minute|30 minutes  (exemple)
- `routeGuide.advice.durationNote` : Ces durées sont des repères de la méthode officielle de l'IBP, pas une règle : elles ne changent pas le parcours conseillé.
- `routeGuide.advice.durationUnderMinute` : moins d'une minute
- `routeGuide.advice.timeShort` : Vous avez prévu moins de temps que ce parcours n'en demande. Prévoyez plus de temps, ou décrivez une partie du peuplement seulement.
- `routeGuide.advice.uncappedLonger` : Le relevé déplafonné demande plus de temps.

## 8. Résultat : détails du parcours (surface, complément)

- `routeGuide.details.complementHint` : Un coup d'œil rapide à ce que vous n'avez pas parcouru : genres d'arbres, milieux ouverts et lisières, milieux aquatiques et rocheux. Cela améliore la précision.
- `routeGuide.details.complementLabel` : Regarder aussi le reste du peuplement
- `routeGuide.details.countedLead` : Facteurs comptés en entier
- `routeGuide.details.countedLine` : Facteurs comptés en entier : A, B  (exemple)
- `routeGuide.details.editCountingA11y` : Modifier les facteurs comptés en entier
- `routeGuide.details.fullLine` : Vous décrivez tout le peuplement : 2,4 ha.  (exemple)
- `routeGuide.details.issues.complementBelowZone` : La surface totale évaluée ne peut pas être plus petite que la surface décrite.
- `routeGuide.details.issues.partialBelowMinimum` : Un parcours partiel décrit au moins 1 hectare : cette surface est plus petite.
- `routeGuide.details.issues.partialOverHalf` : Vous décrivez plus de la moitié du peuplement : le parcourir en entier serait plus simple.
- `routeGuide.details.issues.zoneAboveStand` : La surface décrite ne peut pas dépasser celle du peuplement.
- `routeGuide.details.issues.zoneNotPositive` : Indiquez une surface supérieure à 0.
- `routeGuide.details.issues.zoneTooLarge` : Cette surface semble trop grande. Vérifiez-la.
- `routeGuide.details.plotAdvice` : Une placette d'un hectare est un cercle de 56,4 mètres de rayon. Une placette de 0,5 hectare a un rayon de 39,9 mètres, une de 0,33 hectare un rayon de 32,6 mètres.
- `routeGuide.details.plotsAdded` : Si vous parcourez plusieurs placettes, additionnez leurs surfaces : tout reste sur une seule fiche.
- `routeGuide.details.stripAdvice` : Une bande fait 20 à 50 mètres de large : comptez 10 à 15 mètres de chaque côté si l'on voit mal, 15 à 20 mètres si la visibilité est moyenne, 20 à 25 mètres si l'on voit loin.
- `routeGuide.details.title` : Détails du parcours
- `routeGuide.details.totalLabel` : Surface totale évaluée
- `routeGuide.details.zoneHelperFull` : Indiquez la surface du peuplement que vous décrivez.
- `routeGuide.details.zoneHelperPartial` : Au moins 1 hectare, et entre 10 % (peuplement homogène) et 20 % (peuplement varié) de la surface du peuplement.
- `routeGuide.details.zoneLabel` : Surface que vous allez décrire

## 9. Erreurs sur la surface

- `routeGuide.surfaceErrors.invalid` : Cette surface n'est pas possible : indiquez un nombre d'hectares supérieur à 0, pas trop grand. Vérifiez-la.
- `routeGuide.surfaceErrors.missing` : Indiquez la surface du peuplement.

## 10. Les parcours : titre, ligne courte, texte complet (icône i)

- `routeGuide.routes.full.does` : Vous décrivez la surface entière du peuplement : la surface décrite est celle du peuplement.
- `routeGuide.routes.full.explanation` : Vous marchez dans tout le peuplement, par bandes régulières, et vous notez tout ce que vous voyez.
- `routeGuide.routes.full.name` : Parcours en plein
- `routeGuide.routes.full.short` : Tout le peuplement, par bandes régulières.
- `routeGuide.routes.full.suits` : Convient aux petits peuplements (jusqu'à 1 hectare) et aux peuplements variés et faciles à observer, jusqu'à 5 hectares.
- `routeGuide.routes.partialPlot.does` : Vous relevez tout dans une surface de forme simple et de taille connue, un cercle par exemple. Une placette d'un hectare est un cercle de 56,4 mètres de rayon. Une placette de 0,5 hectare a un rayon de 39,9 mètres, une de 0,33 hectare un rayon de 32,6 mètres.
- `routeGuide.routes.partialPlot.explanation` : Vous ne décrivez qu'une partie du peuplement, bien choisie (au moins 1 hectare et 10 à 20 % du peuplement), et vous jetez un coup d'œil rapide au reste.
- `routeGuide.routes.partialPlot.name` : Parcours partiel par placette
- `routeGuide.routes.partialPlot.short` : Une partie du peuplement, en placette de 1 ha.
- `routeGuide.routes.partialPlot.suits` : Convient aux peuplements homogènes, faciles à observer et assez larges.
- `routeGuide.routes.partialStrip.does` : Vous suivez à pied une large allée de 20 à 50 mètres de large. Une bande fait 20 à 50 mètres de large : comptez 10 à 15 mètres de chaque côté si l'on voit mal, 15 à 20 mètres si la visibilité est moyenne, 20 à 25 mètres si l'on voit loin.
- `routeGuide.routes.partialStrip.explanation` : Vous ne décrivez qu'une partie du peuplement, bien choisie (au moins 1 hectare et 10 à 20 % du peuplement), et vous jetez un coup d'œil rapide au reste.
- `routeGuide.routes.partialStrip.name` : Parcours partiel par bande
- `routeGuide.routes.partialStrip.short` : Une partie du peuplement, en bande.
- `routeGuide.routes.partialStrip.suits` : Convient aux peuplements variés, difficiles à observer ou étroits.

## 11. Le mode de relevé : plafonné, déplafonné, préréglages

- `routeGuide.counting.atLeastOne` : Choisissez au moins un facteur.
- `routeGuide.counting.capped.explanation` : On arrête de compter un élément dès que son score est sûr. C'est le plus rapide et le plus courant.
- `routeGuide.counting.capped.name` : Relevé plafonné
- `routeGuide.counting.capped.short` : On arrête de compter quand le score est sûr.
- `routeGuide.counting.caption` : Mode de relevé
- `routeGuide.counting.factorH` : Le facteur H n'est jamais compté en entier : c'est une classe, pas un comptage.
- `routeGuide.counting.factorsLead` : Quels facteurs comptez-vous en entier ? Plus il y en a, plus le relevé est long.
- `routeGuide.counting.keptValues` : Les valeurs déjà saisies en relevé déplafonné sont conservées, mais elles ne seront plus affichées.
- `routeGuide.counting.presetCaptions.allFactors` : Tout compter, pour le détail ou la recherche.
- `routeGuide.counting.presetCaptions.alwaysMax` : Pour un peuplement dont certains scores sont toujours au maximum.
- `routeGuide.counting.presetCaptions.custom` : Vous choisissez les facteurs un par un.
- `routeGuide.counting.presetCaptions.mature` : Pour un peuplement à forte maturité.
- `routeGuide.counting.presetCaptions.minimum` : Pour un peuplement dont certains scores sont toujours nuls, comme une jeune plantation.
- `routeGuide.counting.presetNote` : Pour les bois morts de dimension moyenne et les gros bois, gardez le plafond de 1 arbre par hectare, sauf besoin particulier.
- `routeGuide.counting.presets.allFactors` : Tous les facteurs
- `routeGuide.counting.presets.alwaysMax` : Scores toujours au maximum
- `routeGuide.counting.presets.custom` : Choisir moi-même
- `routeGuide.counting.presets.mature` : Peuplement mature
- `routeGuide.counting.presets.minimum` : Scores minimum
- `routeGuide.counting.presetsTitle` : Préréglages
- `routeGuide.counting.uncapped.explanation` : On compte tout, sans s'arrêter, pour les facteurs choisis. C'est plus long, mais cela donne le détail.
- `routeGuide.counting.uncapped.name` : Relevé déplafonné
- `routeGuide.counting.uncapped.short` : On compte tout, facteur par facteur.

## 12. Fenêtre « Choisir le parcours »

- `routeGuide.chooser.advise` : Être conseillé
- `routeGuide.chooser.adviseLead` : Pas sûr ?
- `routeGuide.chooser.cancel` : Annuler
- `routeGuide.chooser.counting` : Mode de relevé
- `routeGuide.chooser.details` : Détails
- `routeGuide.chooser.lead` : Choisissez le parcours, le mode de relevé et la surface que vous décrivez. Vous pourrez le modifier depuis Parcelles tant que le relevé est un brouillon.
- `routeGuide.chooser.parcours` : Parcours
- `routeGuide.chooser.recommended` : Conseillé
- `routeGuide.chooser.title` : Choisir le parcours
- `routeGuide.chooser.titleEdit` : Modifier le parcours
- `routeGuide.chooser.useDisabledA11y` : Utiliser ce parcours. Choisissez d'abord un parcours et vérifiez les détails.

## 13. Mots expliqués (icône i)

- `routeGuide.glossary.close` : Fermer
- `routeGuide.glossary.terms.dendromicrohabitat.term` : Dendromicrohabitat
- `routeGuide.glossary.terms.dendromicrohabitat.text` : Un petit abri sur un arbre vivant ou mort : loge de pic, cavité, écorce décollée, champignon, nid.
- `routeGuide.glossary.terms.parBande.term` : Parcours partiel par bande
- `routeGuide.glossary.terms.parBande.text` : Vous suivez à pied une large allée de 20 à 50 mètres de large.
- `routeGuide.glossary.terms.parcoursEnPlein.term` : Parcours en plein
- `routeGuide.glossary.terms.parcoursEnPlein.text` : Vous marchez dans tout le peuplement, par bandes régulières, et vous notez tout ce que vous voyez.
- `routeGuide.glossary.terms.parcoursPartiel.term` : Parcours partiel
- `routeGuide.glossary.terms.parcoursPartiel.text` : Vous ne décrivez qu'une partie du peuplement, bien choisie (au moins 1 hectare et 10 à 20 % du peuplement), et vous jetez un coup d'œil rapide au reste.
- `routeGuide.glossary.terms.parPlacette.term` : Parcours partiel par placette
- `routeGuide.glossary.terms.parPlacette.text` : Vous relevez tout dans une surface de forme simple et de taille connue, un cercle par exemple.
- `routeGuide.glossary.terms.peuplement.term` : Peuplement
- `routeGuide.glossary.terms.peuplement.text` : Un morceau de forêt homogène : mêmes arbres, même âge, même aspect.
- `routeGuide.glossary.terms.releveDeplafonne.term` : Relevé déplafonné
- `routeGuide.glossary.terms.releveDeplafonne.text` : On compte tout, sans s'arrêter, pour les facteurs choisis. C'est plus long, mais cela donne le détail.
- `routeGuide.glossary.terms.relevePlafonne.term` : Relevé plafonné
- `routeGuide.glossary.terms.relevePlafonne.text` : On arrête de compter un élément dès que son score est sûr. C'est le plus rapide et le plus courant.
- `routeGuide.glossary.terms.resteDuPeuplement.term` : Reste du peuplement
- `routeGuide.glossary.terms.resteDuPeuplement.text` : La partie non parcourue : vous notez seulement ce que vous voyez sans effort, comme une mare, un rocher ou une lisière.
- `routeGuide.glossary.terms.surfaceDecrite.term` : Surface décrite
- `routeGuide.glossary.terms.surfaceDecrite.text` : La surface que vous décrivez réellement, appelée zone de relevé IBP sur la fiche officielle.

## 14. Lecteur d'écran (VoiceOver, TalkBack)

- `routeGuide.a11y.glossaryInfo` : Comprendre : Peuplement  (exemple)
- `routeGuide.a11y.hoursField` : Temps disponible en heures
- `routeGuide.a11y.optionLabel` : Oui. Une légende  (exemple)
- `routeGuide.a11y.optionLabelTagged` : Découper, Conseillé. Une légende  (exemple)
- `routeGuide.a11y.questionInfo` : Aide : La surface ?  (exemple)
- `routeGuide.a11y.suggestionCard` : Parcours conseillé : Parcours en plein. Relevé plafonné. Surface décrite 2,4 hectares.  (exemple)
- `routeGuide.a11y.suggestionCardNoZone` : Parcours choisi par vous : Parcours en plein. Relevé plafonné.  (exemple)
- `routeGuide.a11y.suggestionChanged` : Parcours conseillé : Parcours en plein. Relevé plafonné.  (exemple)
- `routeGuide.a11y.surfaceField` : Surface du peuplement en hectares
- `routeGuide.a11y.totalField` : Surface totale évaluée en hectares
- `routeGuide.a11y.zoneField` : Surface que vous allez décrire en hectares

## 15. Page « Parcelles » : carte « Parcours utilisé »

- `surveyDetailRoute.answerParts.beginner` : IBP nouveau pour vous
- `surveyDetailRoute.answerParts.easy` : facile à observer
- `surveyDetailRoute.answerParts.hard` : difficile à observer
- `surveyDetailRoute.answerParts.heterogeneous` : varié
- `surveyDetailRoute.answerParts.homogeneous` : homogène
- `surveyDetailRoute.answerParts.hoursAvailable` : 1 heure disponible|3 heures disponibles  (exemple)
- `surveyDetailRoute.answerParts.narrow` : étroit
- `surveyDetailRoute.answerParts.pieceSurface` : Morceau de 8 ha  (exemple)
- `surveyDetailRoute.answerParts.standSurface` : Peuplement de 8 ha  (exemple)
- `surveyDetailRoute.answerParts.subdivided` : peuplement découpé en sous-peuplements
- `surveyDetailRoute.answerParts.wide` : large
- `surveyDetailRoute.answers` : Vos réponses
- `surveyDetailRoute.choice` : Choix
- `surveyDetailRoute.choiceGuide` : Conseillé par l'app d'après vos réponses
- `surveyDetailRoute.choiceObserver` : Choisi par vous
- `surveyDetailRoute.choose` : Choisir le parcours
- `surveyDetailRoute.chooseA11y` : Choisir le parcours de ce relevé
- `surveyDetailRoute.complement` : Reste du peuplement
- `surveyDetailRoute.complementDone` : Regardé rapidement, surface totale évaluée 8 ha  (exemple)
- `surveyDetailRoute.complementNo` : Non regardé
- `surveyDetailRoute.countedFactors` : Facteurs comptés en entier
- `surveyDetailRoute.counting` : Mode de relevé
- `surveyDetailRoute.edit` : Modifier le parcours
- `surveyDetailRoute.editA11y` : Modifier le parcours de ce relevé
- `surveyDetailRoute.factorItem` : B Structure verticale  (exemple)
- `surveyDetailRoute.legacyBody` : Ce relevé a été fait avant l'assistant de choix du parcours.
- `surveyDetailRoute.legacyRow` : Parcours : non renseigné
- `surveyDetailRoute.none` : Parcours à choisir
- `surveyDetailRoute.noneBody` : Choisissez le parcours pour pouvoir terminer ce relevé.
- `surveyDetailRoute.parcours` : Parcours
- `surveyDetailRoute.title` : Parcours utilisé
- `surveyDetailRoute.zone` : Surface décrite
- `surveyDetailRoute.zoneValue` : 1,2 ha  (exemple)

## 16. Pages de facteurs : relevé déplafonné

- `factorDetailCountingMode.A` : Relevé déplafonné : notez tous les genres d'arbres et le couvert des essences autochtones en pourcentage.
- `factorDetailCountingMode.B` : Relevé déplafonné : notez le couvert de chaque strate en pourcentage de la surface décrite.
- `factorDetailCountingMode.C` : Relevé déplafonné : comptez tous les bois morts sur pied, sans vous arrêter à un maximum par hectare.
- `factorDetailCountingMode.chip` : Relevé déplafonné
- `factorDetailCountingMode.D` : Relevé déplafonné : comptez tous les bois morts au sol, sans vous arrêter à un maximum par hectare.
- `factorDetailCountingMode.dmhHelper` : Pour le score, l'app garde au plus 2 arbres par hectare et par groupe.
- `factorDetailCountingMode.dmhSurfaceLabel` : Surface décrite pour ce comptage (ha)
- `factorDetailCountingMode.dmhTitle` : Arbres par groupe de dendromicrohabitats
- `factorDetailCountingMode.E` : Relevé déplafonné : comptez tous les très gros bois et les gros bois vivants, sans vous arrêter à un maximum par hectare.
- `factorDetailCountingMode.F` : Relevé déplafonné : comptez les arbres porteurs de dendromicrohabitats, groupe par groupe. Pour le score, l'app garde au plus 2 arbres par hectare et par groupe.
- `factorDetailCountingMode.fromRoute` : D'après le parcours
- `factorDetailCountingMode.G` : Relevé déplafonné : notez le pourcentage de milieux ouverts fleuris, sans vous arrêter à 5 %.
- `factorDetailCountingMode.I` : Relevé déplafonné : notez tous les types observés, sans vous arrêter à deux.
- `factorDetailCountingMode.J` : Relevé déplafonné : notez tous les types observés, sans vous arrêter à deux.
- `factorDetailCountingMode.strataCounted` : 1 strate comptée|3 strates comptées  (exemple)
- `factorDetailCountingMode.strataCoverPlaceholder` : 0
- `factorDetailCountingMode.strataCoverUnit` : %
- `factorDetailCountingMode.strataFieldA11y` : Couvert de la strate Très basse, en pourcentage  (exemple)
- `factorDetailCountingMode.strataHelper` : Une strate compte à partir de 20 % de couvert. Les strates se superposent : le total peut dépasser 100 %.
- `factorDetailCountingMode.strataTitle` : Couvert de chaque strate
- `factorDetailCountingMode.zoneLine` : Surface décrite : 1,2 ha  (exemple)

## 17. Aide du facteur F

- `factorInputHintF.0` : Compter les arbres vivants porteurs de dendromicrohabitats (typologie IBP, groupes de dendromicrohabitats).
- `factorInputHintF.1` : Renseignez le nombre d'arbres par hectare. Pour le score, l'app garde au plus 2 arbres par hectare et par groupe de dendromicrohabitats.
- `factorInputHintF.2` : Seuils IBP : < 2 = 0 ; [2,3[ = 1 ; [3,8[ = 2 ; >= 8 = 5.

## 18. Bouton quand le parcours manque

- `surveyDetailRouteRequired` : Choisissez le parcours pour terminer

## 19. PDF : bloc « Parcours utilisé »

- `surveyExportRoute.choice` : Choix
- `surveyExportRoute.choiceGuide` : Conseillé par l'application d'après vos réponses : peuplement de 8 ha.|Conseillé par l'application.  (exemple)
- `surveyExportRoute.choiceObserver` : Choisi directement par l'observateur.
- `surveyExportRoute.complement` : Reste du peuplement
- `surveyExportRoute.countedFactors` : Facteurs comptés en entier
- `surveyExportRoute.counting` : Mode de relevé
- `surveyExportRoute.heading` : Parcours utilisé
- `surveyExportRoute.parcours` : Parcours
- `surveyExportRoute.zone` : Surface décrite

## 20. Messages de validation

- `validationRoute.atLeastOneFactor` : Choisissez au moins un facteur.
- `validationRoute.surfaceNotPositive` : Indiquez une surface supérieure à 0.
- `validationRoute.surfaceTooLarge` : Cette surface semble trop grande. Vérifiez-la.
- `validationRoute.zoneAboveStand` : La surface décrite ne peut pas dépasser celle du peuplement.

## 21. Erreur de synchronisation

- `syncErrorRouteRequired` : Parcours non choisi : ouvrez le relevé pour le choisir
