# Application de mosquée : modèle « 360° »

Une application web installable (PWA), **la même pour toutes les mosquées**. Chaque mosquée reçoit sa propre copie de ce dépôt, configurée par un seul fichier : `mosquee.json`.

- **Côté public, sans compte :** barre du bas Prières (reliées à Mawaqit) · Questions à l’imam · Cours (fiche d’un élève, enfant ou adulte) · Mosquée (infos, itinéraire, dons, contacts) ; bouton Contact en haut de chaque page.
- **Bilingue français / arabe** partout (bouton langue), avec mise en page de droite à gauche en arabe.
- **Côté équipe, avec identifiant :** méga administrateur, administrateurs, comptabilité, professeurs.

## Déployer l’app pour une nouvelle mosquée (procédure pour Claude)

1. **Copier ce dépôt** dans un nouveau dépôt GitHub au nom de la mosquée.
2. **Poser ces questions** à l’équipe, puis remplir `mosquee.json` :

| Question | Champ de `mosquee.json` | Exemple |
|---|---|---|
| Lien de la page **Mawaqit officielle** de la mosquée ? | `mawaqit` | `https://mawaqit.net/fr/mosquee-st-jean-de-braye` |
| Nom à afficher (laisser vide = nom Mawaqit) ? | `nom` | `Mosquée Al-Mouhsinine` |
| Quel **style** ? (voir `css/styles/`) | `style` | `pastille` ou `sobre` |
| Couleur de la barre du téléphone ? | `couleurTheme` | `#1F4FFF` |
| Adresse de connexion de l’équipe ? (le public ne voit alors aucun bouton de connexion) | `domaineEquipe` | `connexion.ma-mosquee.fr` |

3. **Lancer la synchronisation Mawaqit :** onglet *Actions* → « Horaires Mawaqit » → *Run workflow*. Elle crée `data/mawaqit.json`, puis tourne seule chaque nuit.
4. **Déployer sur Cloudflare Pages** (relier aussi le sous-domaine de `domaineEquipe` au même projet) : relier le dépôt, sans commande de build, dossier de sortie `/`. Chaque mise à jour des horaires redéploie automatiquement. GitHub Pages fonctionne aussi.
5. **Première connexion :** compte `admin` (méga administrateur). Il crée ensuite les administrateurs, la comptabilité et les professeurs, avec téléphone et e-mail obligatoires. Dans Direction → *Mosquée & espace public*, il ajoute les destinataires de la page Contact (direction, imam, trésorier…).

## Horaires de prière : reliés à Mawaqit, sans serveur

Le navigateur ne peut pas lire directement une page Mawaqit depuis un autre site : c’est une protection standard des navigateurs, appelée CORS. On passe donc par une **GitHub Action quotidienne** (`.github/workflows/mawaqit.yml` → `scripts/mawaqit.mjs`) :

- elle ouvre la page officielle donnée dans `mosquee.json` ;
- elle reprend telle quelle la variable `confData` de Mawaqit : horaires de l’année, iqama, Jumu’a, Aïd, services, annonces ;
- elle écrit le petit fichier `data/mawaqit.json`.

L’app lit ce fichier à chaque ouverture et ne stocke rien sur l’appareil. Comme le calendrier de toute l’année est inclus, les horaires restent justes même si une synchronisation échoue.

## Styles

- Chaque style est un fichier `css/styles/<nom>.css` qui ne change que les couleurs, les contours et les arrondis. La structure de l’app reste identique.
- **Ajouter un style :** créer `css/styles/mon-style.css`, puis mettre `"style": "mon-style"` dans `mosquee.json`.
- Styles disponibles : `pastille` (vif, par défaut) et `sobre` (vert et or, contours fins).

## Les rôles

| Compte | Ce qu’il voit |
|---|---|
| **Méga administrateur** | Tout. Crée les administrateurs, la comptabilité et les professeurs. |
| **Administrateur** | Toute l’école et la direction. Crée des professeurs. |
| **Comptabilité** | Uniquement l’espace comptabilité : tableau de bord, journal, recettes, dépenses, cotisations, enseignants, rapports. |
| **Professeur** | Ses classes et ses élèves. |
| **Public** | Prières, Imam, Cours (avec un code), Contact. Aucun compte. |

---

## Module école : suivi pédagogique

Application web installable (PWA) qui remplace les feuilles de suivi papier : **Coran**, **Langue & Religion**, **assiduité** et **notes de l’imam** (texte ou message vocal).

## Les 3 rôles

| Rôle | Accès | Ce qu’il fait |
|---|---|---|
| **Administrateur** | identifiant + mot de passe | « Super-prof » : voit et gère **tout** (toutes les classes, tous les élèves, appel, Coran, objectifs, notes). Crée les comptes des professeurs et publie les **messages de la direction**. |
| **Professeur** | identifiants créés par l’admin | Gère tout : classes, élèves, appel, Coran, objectifs, notes. |
| **Parent / élève** | un simple **code de suivi** | Consulte la fiche en lecture seule. Aucun compte. |

## Fonctionnalités

- **Téléphone et e-mail du parent** : obligatoires à la création de l’élève (ou importés). Visible **uniquement** par les profs et l’admin, avec les boutons Appeler / SMS / WhatsApp sur la fiche élève, dans les listes et sur le récapitulatif de l’appel (absents). Jamais affiché aux parents.
- **Horaires des classes** : à la création d’une classe, on indique le nombre de cours par semaine puis le jour et l’heure de chacun (ex. mardi 10h, jeudi 17h30). « Prochain cours » s’affiche sur le tableau de bord, la page de la classe, la fiche élève (prof) et la fiche parent.
- **Classes** : nom, jours, heures de début et de fin, couleur, niveau de départ.
- **Locaux** (admin, Direction → Locaux) : liste des locaux, bouton « Local utilisé » sur chaque classe (local, jour, début, fin), planning de la semaine en rouge (utilisé) / vert (libre) avec uniquement les jours utilisés, signalement des conflits, et recherche d’un local libre sur un créneau.
- **Compteur d’heures** (admin) : chaque appel terminé ajoute la durée du cours au compteur de la personne qui a fait l’appel (prof, ou admin qui remplace). L’admin peut corriger « Cours donné par » sur l’appel. Détail par personne : date, classe, heure de l’appel, remplacement. Remis à zéro le 1er de chaque mois. Visible sur la Direction et la vue d’ensemble.
- **Familles & cotisations** (admin, Élèves → Familles) : regrouper les frères et sœurs déjà inscrits (sans compte), ① montant de la cotisation, ② paiement (pas payé / partiel / payé). Regroupement automatique par nom + parent.
- **Finances** (admin, Direction → Finances) : trésorerie de l’association qui gère la mosquée, mois par mois. Recettes par catégorie (quête du vendredi, dons, Ramadan, zakat al-Fitr / al-Mal, sadaqa, cotisations des membres, location de salle, subventions, événements…) + cotisations de l’école. Dépenses par catégorie (loyer/prêt, électricité, gaz, eau, assurances, entretien, nettoyage, internet, imam/personnel, fournitures, événements, aide sociale, frais bancaires, taxes…), lignes mensuelles automatiques, puis les enseignants de l’école (heures × taux). Solde et historique.
- **Import Excel** (.xlsx ou .csv), modèle .xlsx téléchargeable dans l’app. Colonnes dans l’ordre, toutes obligatoires : Classe, Nom, Prénom, Âge, Parent, Téléphone, E-mail. Les classes manquantes sont créées, les doublons ignorés, et la liste des codes est téléchargeable à la fin.
- **Coordonnées de l’équipe** : téléphone et e-mail obligatoires à la création d’un prof, modifiables dans Réglages → Mes coordonnées. **Annuaire de l’équipe** (Réglages) visible seulement par les profs et l’admin.
- **Page Contact** (publique, bouton sur l’accueil et sur la fiche élève) : on choisit la direction ou un prof, un sujet, un objet et un message ; l’application e-mail s’ouvre avec tout pré-rempli. Les numéros et e-mails de l’équipe ne sont jamais affichés.
- **Messages de la direction** (admin) : texte et/ou vocal, visibles entre deux dates en haut des fiches et des tableaux de bord.
- **Français / arabe** : bouton de langue partout. En arabe, la mise en page passe de droite à gauche et les noms des sourates s’affichent en arabe. Les notes saisies par les utilisateurs ne sont pas traduites.
- **Âge** à la place de la date de naissance : il se met à jour tout seul chaque année. Une date de naissance précise reste possible (facultatif).
- **Élèves** : rattachés à une classe via une liste déroulante. Le **code de suivi** est généré automatiquement : `CLASSE-INITIALES-PARENT-ÂGE-XXXX` (ex. `CL2-YIB-KARIM-10ANS-AB12`). Les 4 derniers caractères sont aléatoires pour qu’on ne puisse pas deviner le code. Le code peut être copié, partagé (lien direct vers la fiche) ou régénéré.
- **Appel** : en un clic. La date du jour est enregistrée automatiquement (pas d’heure, pas d’horaire fixe par classe). Si l’appel a déjà été fait ce jour-là, on peut le modifier ou faire un 2e appel (2e cours). Pas d’appel = pas de cours : rien n’apparaît. 3 états (Présent / Absent / Absent prévenu), historique modifiable.
- **Coran (moushaf)** : les 114 sourates en cases numérotées, dans l’ordre. Chaque sourate a 3 états : non connue / en cours / validée.
  - Passer une sourate « en cours » enregistre sa **date de début d’apprentissage**. Elle reste modifiable, pour savoir avec certitude depuis quand l’élève a commencé.
  - Sur une sourate en cours, l’imam laisse des **notes datées** (ce qu’il faut réviser, jusqu’où…), en **texte** et/ou en **message vocal**. C’est le cahier de l’élève.
  - À la validation : date de fin enregistrée, notes effacées.
- **Langue & Religion** : objectifs par niveau, définis par le professeur. Tout le monde (parents compris) peut parcourir tous les niveaux (onglets, flèches ou glisser le doigt) pour voir ce qui est à apprendre ; le niveau actuel de l’élève est marqué ★. Validation élève par élève, ou pour **toute la classe d’un coup** (un objectif ou tout un niveau), avec correction possible élève par élève.
- **Messages vocaux** : 1 minute maximum (arrêt automatique), qualité voix (≈ 180 Ko la minute). Notes de classe, notes personnelles et messages de la direction : vocaux **supprimés au bout de 30 jours** (le texte reste). **Notes de sourate** (cahier de l’imam), vocaux compris : gardées **tant que la sourate est en cours**, même pendant les vacances, et effacées à sa validation.
- **Notes** : personnelles (un élève) ou pour toute la classe, en texte ou vocal. Les notes **pour toute la classe** acceptent aussi des **photos et fichiers** (tableau en photo, devoirs en PDF…, 5 max, 15 Mo max, photos compressées), **supprimés automatiquement au bout de 7 jours**.
- **Fiche parent** : aperçu, Coran, Langue & Religion, présence (« absent à ce cours », avec la date), notes.
- PWA installable et utilisable hors connexion. Mise en page mobile et ordinateur.

## ⚠️ Version actuelle : démonstration

Pour l’instant, **toutes les données sont stockées dans le navigateur de l’appareil** (localStorage + IndexedDB pour les vocaux). Conséquences :

- on peut tout tester sur **un même appareil** (admin → prof → parent) ;
- un parent sur **un autre téléphone ne verra pas** les données saisies par le prof.

Pour un usage réel, il faut brancher une base de données en ligne, par exemple [Supabase](https://supabase.com) (offre gratuite). Toute la couche de données est isolée dans `js/data.js` : c’est le seul fichier à adapter.

Comptes de démonstration : `admin` / `admin1234` et `rahman` / `prof1234`.
Le menu Réglages du prof contient « Réinitialiser la démo ».

## Structure

```
index.html            page unique
manifest.webmanifest  installation PWA
sw.js                 cache hors connexion
css/app.css           thème « Pastille Pop »
js/app.js             routes et événements
js/data.js            données, sessions, codes, audio
js/seed.js            données de démonstration
js/ui.js              outils d’interface, enregistrement vocal
js/fiche.js           blocs de la fiche élève
js/public.js          accueil et fiche parent
js/admin.js           connexion et administration
js/prof.js            espace professeur (et admin)
js/import.js          import Excel / CSV (lecteur .xlsx intégré)
js/annonces.js        messages de la direction
js/i18n.js            traduction arabe + noms des sourates
```

Aucune étape de compilation : les fichiers sont servis tels quels (GitHub Pages).

Test en local : `python3 -m http.server 8000`, puis ouvrir http://localhost:8000.
