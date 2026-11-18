# Suivi : suivi pédagogique (PWA)

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
- **Compteur d’heures des profs** (admin) : chaque appel terminé ajoute la durée du cours au compteur du prof. Remis à zéro le 1er de chaque mois. Visible sur la Direction et la vue d’ensemble.
- **Familles & cotisations** (admin, Élèves → Familles) : regrouper les frères et sœurs déjà inscrits (sans compte), ① montant de la cotisation, ② paiement (pas payé / partiel / payé). Regroupement automatique par nom + parent.
- **Finances** (admin, Direction → Finances) : récap du solde ; Recettes (cotisations théoriques et réelles, dons ponctuels ou mensuels) ; Dépenses par mois (heures × taux horaire par prof, montant modifiable, autres dépenses) avec historique.
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
