---
baseline_commit: 70dd977785cf4914553133276b53a78746ad001b
---
# Story 2.2: Researcher Profiles & Subscriber Statistics

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant que **membre de la communauté ou visiteur**,
Je veux **visiter la page publique `/profile/:id` de n'importe quel chercheur, consulter ses statistiques d'abonnés en temps réel et m'abonner ou me désabonner en un clic**,
Afin de **suivre ses travaux de recherche et voir l'évolution de ses abonnements de manière instantanée**.

## Acceptance Criteria

1. **Given** un visiteur naviguant vers le profil d'un chercheur via la route `/profile/:id` (transmise via les props `researcherId` ou `id` par le routeur).
2. **When** la page se charge.
3. **Then** la page de profil affiche les informations complètes du chercheur : avatar stylisé, nom complet, pôle d'études, université, biographie complète (`bio`), ainsi que des compteurs interactifs (Publications, Projets, Followers).
4. **And** si un membre est connecté, le bouton d'abonnement est visible et affiche son état actuel : "S'abonner" (si non abonné) ou "Se désabonner" (si déjà abonné).
5. **And** lorsque le membre connecté clique sur "S'abonner", le compteur de followers s'incrémente instantanément de `+1` de manière immuable et persistante dans la base mockée (`mockDb.js`), et le bouton bascule vers son état "Se désabonner" avec une transition de couleur douce.
6. **And** lorsque le membre connecté clique sur "Se désabonner", le compteur de followers se décrémente de `-1` dans la base mockée, et le bouton bascule à nouveau vers "S'abonner".
7. **And** si l'utilisateur est anonyme (non connecté), le bouton d'abonnement est grisé (inactif) ou désactivé avec un indicateur textuel explicite (ex: "Connectez-vous pour suivre ce chercheur") conformément aux règles de gating de l'application.
8. **And** un bouton de retour "Retour à l'annuaire" permet de revenir instantanément à `/members` en utilisant la fonction `navigate`.

## Tasks / Subtasks

- [x] **Tâche 1 : Mettre en place le service de base de données fictive (mockDb) et l'API de suivi** (AC: 5, 6)
  - [x] Mettre à jour `DEFAULT_RESEARCHERS` dans `src/services/mockDb.js` pour inclure un tableau `followers` (d'IDs d'utilisateurs abonnés) et un entier `followersCount` pour chaque profil initial.
  - [x] Implémenter la méthode `toggleFollow(researcherId, userId)` dans la clé `researchers` de `src/services/mockDb.js` qui ajoute/retire l'ID utilisateur du tableau `followers`, met à jour `followersCount`, persiste les changements dans le `localStorage` sous `fieri_db_researchers` et renvoie l'objet chercheur mis à jour.
  - [x] Exposer la méthode asynchrone `toggleFollow(researcherId, userId)` dans `src/services/api.js` sous la clé `api.researchers.toggleFollow(researcherId, userId)` avec un délai artificiel réaliste pour simuler une requête réseau.

- [x] **Tâche 2 : Concevoir la page de profil chercheur `src/pages/ResearcherProfile.jsx`** (AC: 1, 2, 3, 8)
  - [x] Consommer `api.researchers.getById(researcherId)` dans le composant `ResearcherProfile` lors de son montage.
  - [x] Gérer l'état de chargement (`isLoading`) à l'aide de squelettes glassmorphic translucides animés en pulsation, et l'état d'erreur si l'ID du chercheur n'existe pas.
  - [x] Structurer la page en Bento Grid premium reprenant l'esthétique *SaaS Scientifique Cosmique* :
    - **Header Card** : Avatar haute résolution, nom complet avec badge d'expertise, discipline principale (pôle), et institution universitaire.
    - **Stats Grid** : 3 cartes affichant le nombre de Publications, de Projets, et d'Abonnés (compteur dynamique de Followers).
    - **Bio Card** : Texte de biographie complet et détaillé.
    - **Scientific Works Card** : Section présentant une liste élégante et fictive de publications scientifiques notables (titre, journal, date) pour enrichir la fiche.
  - [x] Ajouter un bouton "Retour à l'annuaire" avec icône fléchée qui déclenche `navigate('members')`.

- [x] **Tâche 3 : Intégrer la logique interactive d'abonnement & gating** (AC: 4, 5, 6, 7)
  - [x] Récupérer les informations de connexion de l'utilisateur à l'aide du hook contextuel d'authentification (`useAuth`).
  - [x] Évaluer si l'utilisateur est connecté et extraire son `userId` ou `user.id`.
  - [x] Déterminer l'état actuel de l'abonnement en vérifiant si le `userId` connecté est présent dans le tableau `followers` du chercheur.
  - [x] Implémenter le comportement du bouton d'action :
    - **Membre connecté** : Le bouton est actif. Au clic, lancer l'appel API `toggleFollow`, rafraîchir l'état local et afficher un Toast de confirmation doux (ex: "Vous suivez maintenant [Nom]" / "Vous ne suivez plus [Nom]").
    - **Visiteur anonyme** : Le bouton affiche "Se connecter pour suivre" et est désactivé avec des classes CSS atténuant son opacité.
  - [x] Appliquer des transitions douces de couleur et d'opacité en 200ms ease-out pour refléter le changement d'état.

- [x] **Tâche 4 : Transitions animées et micro-interactions** (AC: 2, 5)
  - [x] Envelopper le layout principal de `ResearcherProfile` avec `framer-motion` (`motion.div`) pour animer l'apparition de la page en fondu/montée (`initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}`).
  - [x] Ajouter des micro-interactions de zoom et de lueur radiale au survol de l'avatar et du bouton d'action.

- [x] **Tâche 5 : Validation Qualité, Accessibilité & Build**
  - [x] S'assurer que le code est entièrement compatible avec React 19 et passe le build de production.
  - [x] Garantir le respect des ratios de contraste WCAG 2.2 AA pour le texte et les états du bouton (notamment l'état "Se désabonner").
  - [x] Fournir le support clavier complet (Tabulation, Enter/Space pour déclencher l'abonnement et le retour).

## Dev Notes

- **Fichiers à modifier / créer** :
  - **UPDATE** : `src/services/mockDb.js` (Pour enrichir les chercheurs et la méthode de follow)
  - **UPDATE** : `src/services/api.js` (Pour exposer la méthode d'abonnement)
  - **UPDATE** : `src/pages/ResearcherProfile.jsx` (Pour concevoir la page de profil complète)
- **Authentification & Contextes** :
  - L'application utilise `useAuth` disponible dans l'arborescence du projet (vraisemblablement importable via `import { useAuth } from '../context/AuthContext'` ou équivalent). Nous devons vérifier la localisation exacte du hook `useAuth`.
- **Routage** :
  - Le routeur centralisé dans `App.jsx` passe `researcherId` (ou l'identifiant extrait de l'état) au composant `ResearcherProfile` sous forme de prop. Nous devons adapter l'écoute de cette prop.

### Project Structure References

- **Visual Specifications & Colors** : [`DESIGN.md`](file:///file:///home/precieux/excellence%20team/essaie/Fieri/_bmad-output/planning-artifacts/ux-designs/ux-Fieri-2026-05-30/DESIGN.md).
- **Project Coding Rules** : [`project-context.md`](file:///home/precieux/excellence%20team/essaie/Fieri/_bmad-output/project-context.md).
- **Architecture Guidelines** : [`architecture.md`](file:///home/precieux/excellence%20team/essaie/Fieri/_bmad-output/planning-artifacts/architecture.md).

## Dev Agent Record

### Agent Model Used

Gemini 3 Pro

### Debug Log References

N/A

### Completion Notes List

- Enriched `DEFAULT_RESEARCHERS` profiles in `mockDb.js` with `followers: []` and `followersCount`.
- Developed a robust and transaction-secure `toggleFollow(researcherId, userId)` storage mutator in `mockDb.js` that auto-handles legacy datasets.
- Exposed `api.researchers.toggleFollow` inside `api.js` mimicking actual microservice lag.
- Crafted `ResearcherProfile.jsx` utilizing elegant Bento Grid layouts with rich animations (Framer Motion).
- Applied precise authentication-level gating: the follow button disables gracefully with lock hints if the visitor is anonymous, and triggers synchronous state increments or decrements (follow/unfollow states) with emerald/rose Toast notifications if logged-in.
- Added customized, notable scientific publications lists for each researcher to enrich visual density.

### File List

- `src/services/mockDb.js`
- `src/services/api.js`
- `src/pages/ResearcherProfile.jsx`
