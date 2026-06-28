---
baseline_commit: 70dd977785cf4914553133276b53a78746ad001b
---
# Story 2.3: Scientific Carousel & Micro-Animations

Status: review

## Story

En tant que **visiteur sur mobile ou desktop**,
Je veux **faire défiler les profils des chercheurs vedettes via un carrousel fluide par glissement (swipe) tactile ou clics sur des flèches**,
Afin de **parcourir rapidement les membres clés de la communauté**.

## Acceptance Criteria

1. **Given** le composant carrousel de profils présent sur la page d'accueil ou de l'annuaire (ici au sommet de l'annuaire communautaire `/members`).
2. **When** un utilisateur mobile glisse son doigt (swipe) vers la gauche ou la droite, ou un utilisateur desktop clique sur les boutons de navigation (flèches gauche/droite).
3. **Then** le carrousel fait défiler les cartes de membres de manière fluide avec des effets de transition optimisés.
4. **And** chaque carte dispose d'une micro-animation de zoom/survol d'avatar au focus ou hover en 200ms ease-out, avec halo de lueur radiale.
5. **And** l'ensemble du carrousel est entièrement navigable au clavier via les touches fléchées (`Gauche` / `Droite`) lorsque le carrousel a le focus.
6. **And** le clic sur le profil d'un chercheur vedette navigue de manière fluide vers son profil académique.

## Tasks / Subtasks

- [x] **Tâche 1 : Concevoir le composant réutilisable `ResearchersCarousel`** (AC: 1, 3, 4)
  - [x] Créer le composant `src/components/ResearchersCarousel.jsx`.
  - [x] Consommer la liste des chercheurs vedettes (provenant de `api.researchers.getAll()` filtrée ou triée pour ne conserver que les plus populaires ou clés).
  - [x] Concevoir le design des cartes du carrousel au format "Bento horizontal compact" avec glassmorphism, avatar rond illuminé, statistiques abrégées et lien de consultation direct.
  - [x] Intégrer les micro-animations au survol (`hover`) et au focus (`focus-within`) avec Framer Motion.

- [x] **Tâche 2 : Implémenter le défilement tactile (Swipe) et les contrôles de navigation** (AC: 2, 3)
  - [x] Utiliser les fonctionnalités de défilement horizontal CSS avec support tactile natif (`snap-x snap-mandatory overflow-x-auto`) ou utiliser un hook de glissement personnalisé ou Framer Motion `drag`.
  - [x] Ajouter deux boutons de contrôle Flèche Gauche / Flèche Droite élégamment positionnés pour les utilisateurs de bureau.
  - [x] Gérer l'état d'affichage des boutons (masquer le bouton gauche au début du carrousel, masquer le bouton droit à la fin).

- [x] **Tâche 3 : Support de l'Accessibilité & Navigation Clavier** (AC: 5)
  - [x] Implémenter l'écouteur d'événements clavier (`onKeyDown`) pour intercepter les touches fléchées `ArrowLeft` et `ArrowRight` afin de faire défiler le carrousel.
  - [x] S'assurer que tous les éléments interactifs (boutons fléchés, liens vers les profils) sont accessibles par tabulation (`tabIndex={0}`) et disposent de rôles ARIA adéquats (`role="region"`, `aria-label`, etc.).

- [x] **Tâche 4 : Intégration dans la page de l'annuaire `src/pages/Members.jsx`** (AC: 1, 6)
  - [x] Importer et instancier `ResearchersCarousel` dans `src/pages/Members.jsx` juste sous l'en-tête de la page.
  - [x] Passer la fonction `navigate` en prop pour permettre la transition transparente vers `/profile/:id`.

- [x] **Tâche 5 : Validation & Compilation**
  - [x] Vérifier que le build de production passe sans erreur et que la navigation au clavier ne déclenche aucun comportement indésirable.

## Dev Notes

- **Intégration Tactile & Snapping** :
  - Pour un rendu haut de gamme et performant, nous utiliserons le défilement horizontal CSS natif combiné avec le snapping Tailwind/CSS (`snap-x snap-mandatory scroll-smooth`) qui garantit un défilement à 60 FPS fluide sur mobile, couplé à une navigation programmatique par référence React (`useRef` et `scrollTo`) pour les boutons fléchés et touches clavier.
- **Micro-animations** :
  - Utilisation de `framer-motion` pour des transitions de cartes élégantes et fluides de 200ms.

## Dev Agent Record

### Agent Model Used

Gemini 3 Pro

### Debug Log References

N/A

### Completion Notes List

- Designed and coded `src/components/ResearchersCarousel.jsx` implementing high-quality, high-performance horizontal swipe scroll container.
- Applied CSS-native horizontal snapping alongside custom arrow navigation using React references and smooth scrolls.
- Integrated sleek micro-animations for card hovers and focus transitions using `framer-motion` (including custom scale shifts and radial backglow transitions).
- Structured custom keyboard events (`ArrowLeft`/`ArrowRight` key handlers) and fully accessible ARIA roles and tab indices for ultimate WCAG compliance.
- Integrated the carousel into the header of `src/pages/Members.jsx` with correct routing parameter mappings matching `App.jsx`.

### File List

- `src/components/ResearchersCarousel.jsx`
- `src/pages/Members.jsx`
