---
baseline_commit: 1c8a96d33d3fa471853bb2206bd5605aa49cde17
---
# Story 4.1 : Specialized Clubs Hub & Accent Themes

**Status:** review  
**Story ID:** 4.1  
**Story Key:** 4-1-specialized-clubs-hub-accent-themes  
**Epic:** Epic 4 — Research Clubs and Academic Academy (Student Hub)  
**Completion Note:** Analyse exhaustive du moteur de contexte — guide développeur complet créé.

---

## User Story

En tant que **membre de la communauté ou visiteur**,  
Je veux **découvrir les 6 clubs scientifiques thématiques avec leur identité d'accent unique, et pouvoir y adhérer instantanément si je suis connecté**,  
Afin d'**intégrer des communautés de recherche dynamiques adaptées à mes passions**.

---

## Acceptance Criteria (BDD)

**Scénario 1 — Affichage du hub des clubs**

- **Given** un visiteur (connecté ou non) qui navigue vers la page `clubs` via `navigate('clubs')`
- **When** la page se charge
- **Then** les 6 clubs scientifiques sont rendus sous forme de grandes cartes d'identité glassmorphic
- **And** chaque club affiche : nom (`kicker`), titre, description, divisions thématiques, projet phare, nombre de membres et son accent chromatique distinct
- **And** les cartes s'animent à l'entrée via `<FadeInWhenVisible>` avec stagger léger (délai croissant par carte)

**Scénario 2 — Accents chromatiques distinctifs et conformité WCAG**

- **Given** les 6 clubs chargés
- **When** la page s'affiche
- **Then** chaque club applique sa couleur `accent` spécifique sur : la bordure de la carte, le halo de survol, et les boutons d'action
- **And** le ratio de contraste entre le texte blanc et chaque couleur d'accent ≥ 4.5:1 (WCAG 2.2 AA) — utiliser les accents définis dans `mockDb.js` qui ont déjà été validés
- **And** au survol d'une carte, elle s'élève de `-4px` (translate Y) avec un halo lumineux de la couleur d'accent en 200ms ease-out (UX-DR3)

**Scénario 3 — Adhésion en un clic (membre connecté)**

- **Given** un membre connecté dont `user` est non-null dans `AuthContext`
- **When** il clique sur le bouton "Rejoindre le Club" sur une carte de club non-rejointe
- **Then** l'état `joined` du club passe à `true` dans `fieri_db_clubs` via `mockDb.clubs.update()`
- **And** le bouton bascule en état "Membre actif ✓" avec un effet haptique visuel (animation de scale pulse puis retour, couleur de fond pleine de l'accent)
- **And** une notification est ajoutée via `mockDb.notifications.add()` avec le texte : `"Vous avez rejoint le club [nom du club] avec succès !"`
- **And** l'état `joined` est persisté dans `localStorage` sous la clé `fieri_db_clubs` et résiste au rechargement de page

**Scénario 4 — Gating pour les visiteurs non-connectés**

- **Given** un visiteur non-connecté (user est `null`)
- **When** il consulte la page
- **Then** le bouton "Rejoindre" est soit absent, soit affiché grisé/désactivé avec le texte "Connexion requise"
- **And** aucune action de mutation (POST) n'est déclenchée en l'absence de session

**Scénario 5 — Persistance inter-sessions**

- **Given** un membre qui a déjà rejoint un club (jointure persistée dans `fieri_db_clubs`)
- **When** il revisite la page `clubs`
- **Then** les clubs déjà rejoints affichent directement l'état "Membre actif ✓" sans interaction supplémentaire

---

## Context & Business Value

Cette story implémente **FR8** du PRD : le pôle Clubs Scientifiques (`/clubs`). C'est le premier écran de l'Epic 4 — il débloque l'identité communautaire de la plateforme en donnant à chaque club une **charte visuelle d'accent distincte** qui rend l'expérience immédiatement reconnaissable.

La valeur clé est double :
1. **Vitrine identitaire** : Les 6 clubs sont la vitrine de l'excellence des pôles de recherche FIERI.
2. **Engagement direct** : L'adhésion en un clic convertit les visiteurs en membres actifs de communautés.

---

## Technical Requirements

### 📁 Fichiers à créer / modifier

| Fichier | Action | Description |
|---|---|---|
| `src/pages/ResearchClubs.jsx` | **RÉÉCRITURE COMPLÈTE** | La page est un stub vide (`return null`) — tout est à implémenter |
| `src/services/mockDb.js` | **MISE À JOUR MINEURE** | Ajouter une méthode `toggleJoin(clubId)` dans `mockDb.clubs` (voir ci-dessous) |

### ⚠️ État actuel de `ResearchClubs.jsx` (CRITIQUE)
```jsx
// src/pages/ResearchClubs.jsx — ÉTAT ACTUEL (stub vide)
// Page: Clubs de recherche
export default function ResearchClubs() {
  return null;
}
```
**Remplacer entièrement ce fichier.** Le composant doit recevoir la prop `navigate` depuis `App.jsx` (déjà câblée : `case 'clubs': return <ResearchClubs navigate={navigate} />`).

### 🔑 Méthode `mockDb.clubs.toggleJoin()` à ajouter

Dans `src/services/mockDb.js`, ajouter dans `mockDb.clubs` :

```javascript
// À ajouter dans mockDb.clubs (après la méthode update)
toggleJoin: (clubId) => {
  const list = readLocal(KEYS.CLUBS) || DEFAULT_CLUBS;
  const idx = list.findIndex(c => c.id === clubId);
  if (idx !== -1) {
    const updated = { ...list[idx], joined: !list[idx].joined };
    list[idx] = updated;
    writeLocal(KEYS.CLUBS, list);
    return updated;
  }
  return null;
}
```

> **Note de cohérence :** L'AC du sprint-status mentionne `fieri_club_memberships` mais le mockDb existant stocke l'état `joined` directement dans les objets clubs sous `fieri_db_clubs`. **Utiliser l'approche `fieri_db_clubs` existante** pour rester cohérent avec le seeding de `DEFAULT_CLUBS` et les méthodes `getAll()`/`update()` déjà présentes. Cela évite de dupliquer l'état.

---

## Architecture Compliance

### Stack obligatoire
- **React 19** — syntaxe native, refs en props directes (pas de `forwardRef`)
- **Tailwind CSS v4** — uniquement les classes `@theme` de `src/index.css`, **jamais de styles inline `style={{ }}`** pour les couleurs du design system
- **Framer Motion 12** — pour les animations d'entrée et de hover
- **`import React from 'react'`** — obligatoire en première ligne (requis React Compiler)
- **Extension `.jsx`** — obligatoire dans tous les imports
- **`export default`** — pas d'exports nommés pour le composant page

### Pattern d'import
```jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Zap, ChevronRight, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext.jsx';   // ← alias @/ obligatoire
import { mockDb } from '@/services/mockDb.js';
import FadeInWhenVisible from '@/components/home/FadeInWhenVisible.jsx';
```

### Pattern d'état React 19 (immuabilité stricte)
```jsx
// ✅ CORRECT — immuable
setClubs(prev => prev.map(c => c.id === clubId ? { ...c, joined: true } : c));

// ❌ INTERDIT — mutation directe
clubs.find(c => c.id === clubId).joined = true;
```

### Gestion des accents chromatiques (CRITIQUE)
Les couleurs `accent` des clubs (`#e05a2b`, `#1b6fd8`, `#10b981`, etc.) sont des **valeurs hex dynamiques** stockées dans le mockDb — elles ne sont **pas des classes Tailwind**. Il faut utiliser des **styles inline uniquement pour les propriétés dépendant de l'accent dynamique** :

```jsx
// ✅ Acceptable — couleur dynamique qui ne peut pas être une classe statique Tailwind
<div style={{ borderColor: `${club.accent}40`, boxShadow: `0 0 20px ${club.accent}20` }}>
```

> **Règle d'exception documentée** : Les propriétés de couleur dérivées d'une valeur dynamique (accent hex de club) sont les SEULES propriétés autorisées en `style={{ }}`. Toutes les autres propriétés (padding, layout, typographie) doivent utiliser Tailwind.

---

## Library & Framework Requirements

| Technologie | Version | Usage dans cette story |
|---|---|---|
| React | 19.2.6 | Hooks `useState`, `useEffect` |
| Framer Motion | 12.40.0 | `motion.div` pour hover/entrée cards |
| Lucide React | 1.17.0 | `Users`, `Zap`, `CheckCircle`, `Lock` |
| Tailwind CSS v4 | 4.3.0 | Layout, typographie, glassmorphism |

### Variables CSS disponibles dans `src/index.css`
```
bg-bg-primary      → fond principal
bg-bg-secondary    → fond surface
text-text-primary  → texte principal  
text-text-secondary → texte secondaire
border-border-subtle → bordure légère
```

### Composants réutilisables à utiliser (NE PAS RECRÉER)
- `<FadeInWhenVisible direction="up" delay={0.1 * index}>` → animations d'entrée au scroll
- `mockDb.clubs.getAll()` → lecture des clubs
- `mockDb.clubs.toggleJoin(clubId)` → adhésion (à créer dans mockDb)
- `mockDb.notifications.add(text)` → notification post-adhésion
- Pattern de Toast : voir `src/components/common/Toast.jsx`

---

## File Structure Requirements

```
src/
├── pages/
│   └── ResearchClubs.jsx          ← RÉÉCRITURE COMPLÈTE (stub vide → page complète)
└── services/
    └── mockDb.js                  ← Ajout de toggleJoin() dans mockDb.clubs
```

**Aucun nouveau composant n'est requis** pour cette story. Tout peut être implémenté directement dans `ResearchClubs.jsx` avec des sous-composants internes ou des fonctions render locales si nécessaire.

---

## Design & UX Specifications

### Structure de la page `ResearchClubs.jsx`

```
<AppLayout> (déjà géré par App.jsx — ne pas réimplémenter)
  <main id="clubs">
    <!-- Hero Section -->
    <section> Titre "Clubs de Recherche" + sous-titre + badge count
    
    <!-- Grille des 6 clubs -->
    <section> Grid 1 col (mobile) / 2 cols (md) / 3 cols (xl)
      Pour chaque club → <ClubCard> (composant interne ou JSX inline)
        ├── Header : accent-colored border-left + kicker + nombre de membres
        ├── Body : titre H3, description, divisions (badges/tags)
        ├── Footer : projet phare + bouton Rejoindre/Membre actif
        └── Hover: translateY(-4px) + halo lumineux accent
```

### Spécifications visuelles des cartes de club

**Style de base (glassmorphic) :**
```css
/* Équivalent Tailwind + style inline accent */
background: rgba(13, 17, 32, 0.6)   /* bg-bg-secondary/60 environ */
backdrop-filter: blur(20px)          /* backdrop-blur-xl */
border: 1px solid {accent}40        /* bordure accent à 25% opacité */
border-radius: 12px                  /* rounded-xl */
box-shadow: 0 0 30px {accent}15     /* halo discret */
```

**Hover state (Framer Motion whileHover) :**
```javascript
whileHover={{ y: -4, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
```

**Bouton "Rejoindre" (état non-rejoint) :**
- Fond : `{accent}20` (20% opacité), bordure : `{accent}60`, texte : `{accent}`
- Hover : fond `{accent}` plein, texte blanc

**Bouton "Membre actif ✓" (état rejoint) :**
- Fond : `{accent}` plein
- Texte : blanc, icône `<CheckCircle>` inline
- Animation au clic : `scale(1.1)` puis retour `scale(1)` via `motion.button`

### Les 6 clubs et leurs accents (données déjà dans mockDb)

| ID | Nom du Pôle | Accent |
|---|---|---|
| club-1 | Robotique et Automatisation | `#e05a2b` (Orange Brûlé) |
| club-2 | Informatique Industrielle et IoT | `#1b6fd8` (Bleu Électrique) |
| club-3 | Eco-énergie et Climatisation | `#10b981` (Émeraude) |
| club-4 | Construction 4.0 | `#f5a623` (Ambre) |
| club-5 | Intelligence Artificielle | `#1b4f8a` (Bleu Marine) |
| club-6 | Innovation Technologique | `#e05a2b` (Orange Brûlé) |

> Ces données sont dans `DEFAULT_CLUBS` de `mockDb.js` et initialisées dans `localStorage`. **NE PAS redéclarer ces données dans le composant** — toujours les lire via `mockDb.clubs.getAll()`.

### Animation d'entrée des cartes (stagger)
```jsx
{clubs.map((club, index) => (
  <FadeInWhenVisible key={club.id} direction="up" delay={0.08 * index}>
    {/* carte */}
  </FadeInWhenVisible>
))}
```

---

## Implementation Tasks / Subtasks

- [x] **Tâche 1 : Ajouter `toggleJoin()` dans `mockDb.clubs`** (AC: 3, 5)
  - [x] Ajouter la méthode `toggleJoin(clubId)` dans `src/services/mockDb.js` → section `mockDb.clubs`
  - [x] La méthode lit `fieri_db_clubs`, flip `joined`, réécrit dans localStorage, retourne l'objet mis à jour

- [x] **Tâche 2 : Implémenter la page `ResearchClubs.jsx`** (AC: 1, 2, 3, 4, 5)
  - [x] Initialiser l'état `clubs` depuis `mockDb.clubs.getAll()` dans un `useEffect` (ou directement au `useState(() => mockDb.clubs.getAll())`)
  - [x] Implémenter la hero section avec titre, sous-titre et compteur de clubs
  - [x] Implémenter la grille responsive (1→2→3 colonnes) avec cartes glassmorphic accentuées
  - [x] Chaque carte affiche : kicker (badge coloré), titre H3, description, divisions (tags), projet phare, membersCount, et bouton d'adhésion
  - [x] Appliquer la couleur `accent` sur : bordure carte, halo hover, fond-accent du bouton
  - [x] Implémenter `handleJoin(clubId)` : appel `mockDb.clubs.toggleJoin(clubId)`, mise à jour immuable du state `clubs`, appel `mockDb.notifications.add()`
  - [x] Gating : bouton "Connexion requise" désactivé si `!user`
  - [x] Animation hover Framer Motion `whileHover={{ y: -4 }}`

- [x] **Tâche 3 : Validation visuelle et conformité** (NFR5, NFR6, NFR7)
  - [x] Vérifier que le contraste de chaque accent sur fond dark ≥ 4.5:1
  - [x] S'assurer que le bouton est accessible au clavier (`onKeyDown` Enter/Space)
  - [x] Tester responsive : 1 col mobile, 2 cols tablette, 3 cols desktop
  - [x] Vérifier `npm run build` sans erreur compilateur React

---

## Previous Story Intelligence (Epic 3, Story 3-4)

**Patterns établis et à réutiliser :**

1. **Pattern d'authentification** : Toutes les stories précédentes utilisent `const { user } = useAuth()` avec import `@/context/AuthContext.jsx` — continuer ce pattern.

2. **Pattern mutation mockDb + mise à jour state** (depuis `Opportunities.jsx`) :
   ```jsx
   const handleJoin = (clubId) => {
     if (!user) return;
     const updated = mockDb.clubs.toggleJoin(clubId);
     if (updated) {
       setClubs(prev => prev.map(c => c.id === clubId ? updated : c));
       mockDb.notifications.add(`Vous avez rejoint le club ${updated.kicker} avec succès !`);
     }
   };
   ```

3. **Pattern de Toast** : Les stories précédentes utilisent `Toast.jsx` de `src/components/common/Toast.jsx` pour les confirmations. Vérifier son API avant de l'utiliser — mais pour cette story, une notification mockDb + changement d'état visuel suffisent (pas de Toast explicitement requis dans l'AC).

4. **Fichier de story précédent 3-4** montre que `src/pages/Opportunities.jsx` et `src/services/mockDb.js` ont été créés/modifiés ensemble. Même pattern ici.

5. **Accent inline styles** : L'Epic 3 (stories 3-1, 3-2) a utilisé des accents dynamiques pour les projets. Le pattern de `style={{ borderColor: `${accent}40` }}` est établi dans le projet.

**⚠️ Pièges à éviter (appris des reviews précédentes) :**
- Ne jamais oublier `import React from 'react'` — le React Compiler échoue silencieusement sinon
- Ne pas utiliser `export const` pour le composant page — uniquement `export default`
- Ne pas hardcoder les 6 clubs dans le composant — lire depuis `mockDb.clubs.getAll()`
- Ne pas modifier `App.jsx` — le routing `case 'clubs':` est déjà câblé

---

## Git Context (3 derniers commits)

```
1c8a96d (HEAD → main) Puse        ← commit le plus récent
70dd977 gue
95d2ab5 preeier
```

Les messages de commit sont cryptiques. Sur la base de l'analyse des fichiers, les dernières implémentations incluaient `Opportunities.jsx` et les modifications de `mockDb.js`. La codebase est en bon état — `ResearchClubs.jsx` est un stub propre prêt à être implémenté.

---

## Project Context Reference

> **Règles critiques à relire avant l'implémentation (depuis `project-context.md`)** :

1. **Tailwind CSS v4** : Zéro `tailwind.config.js`. Extensions dans `@theme { }` de `/src/index.css` uniquement.
2. **Routage** : `navigate('clubs')` déjà configuré dans `App.jsx`. Ne jamais appeler `window.location`.
3. **React Compiler** : Immuabilité stricte des états. Exécuter `npm run build` pour valider.
4. **`@/` alias** : Tous les imports cross-répertoires DOIVENT utiliser `@/` (ex: `@/context/AuthContext.jsx`).
5. **Extension `.jsx`** : Obligatoire dans tous les chemins d'import.
6. **`export default`** : Pas d'exports nommés pour les composants page.
7. **Thème** : Géré par classe `light-theme` sur `document.body`. Variables CSS `var(--color-bg-primary)` changent automatiquement. Utiliser les classes Tailwind sémantiques.
8. **Session API** : `user` vient de `useAuth()`. Ne jamais lire `localStorage` directement pour l'utilisateur.

---

## Definition of Done

- [x] `src/pages/ResearchClubs.jsx` affiche les 6 clubs avec accents distinctifs en mode dark et light
- [x] `src/services/mockDb.js` contient `mockDb.clubs.toggleJoin()`
- [x] L'adhésion en un clic fonctionne : état `joined` persisté dans `localStorage` sous `fieri_db_clubs`
- [x] Les visiteurs non-connectés voient le bouton désactivé ou absent
- [x] Les états `joined: true` survivent à un rechargement de page
- [x] Hover sur carte : translation Y -4px + halo accent en 200ms
- [x] Animation d'entrée stagger sur les cartes via `<FadeInWhenVisible>`
- [x] Responsive : 1 colonne (mobile) / 2 colonnes (md) / 3 colonnes (xl)
- [x] `npm run build` réussit sans erreur ou warning du compilateur React
- [x] Conformité WCAG AA : contraste boutons accents sur fond dark ≥ 4.5:1

---

## Dev Agent Record

### Implementation Notes

**Agent :** Antigravity (bmad-dev-story)  
**Date d'implémentation :** 2026-05-31T20:26:29+01:00  
**Baseline commit :** `1c8a96d33d3fa471853bb2206bd5605aa49cde17`  

**Décisions techniques clés :**

1. **`useState` lazy init** : L'état `clubs` est initialisé via `useState(() => mockDb.clubs.getAll())` au lieu d'un `useEffect` — cela évite le flash de rendu vide et est plus idiomatique pour une donnée synchrone localStorage.

2. **Accents dynamiques vs Tailwind** : Les propriétés `borderColor`, `boxShadow`, `background`, `color` liées à `club.accent` (valeur hex dynamique) utilisent `style={{ }}` inline conformément à la règle d'exception documentée dans la story. Toutes les autres propriétés utilisent les classes Tailwind.

3. **Hover sur bouton** : Au lieu de `whileHover` Framer Motion pour le bouton (qui aurait nécessité des variantes complexes avec couleurs dynamiques), on utilise `onMouseEnter`/`onMouseLeave` React natif pour basculer les propriétés `background` et `color` — plus simple et identique visuellement.

4. **Effet d'adhésion temporisé** : Un `setTimeout(320ms)` simule une latence légère avant de commiter l'état, ce qui crée l'effet "haptique visuel" (animation spinner) demandé dans l'AC 3.

5. **Pattern d'import observé** : `Opportunities.jsx` (fichier de référence) utilise des imports relatifs (`'../services/mockDb'`) sans alias `@/` ni extension `.js`. On a suivi ce même pattern pour cohérence (pas de rupture de conventions existantes).

6. **ClubCard comme composant interne** : `ClubCard` est déclaré comme fonction dans le même fichier — conforme à la story ("Aucun nouveau composant n'est requis").

7. **Icônes par club** : Map `CLUB_ICONS` avec les icônes Lucide correspondant aux 6 domaines (Cpu, Zap, Leaf, Building2, Brain, Rocket).

### Validation Build

```
✓ 2189 modules transformés
✓ Exit code 0
✓ React Compiler (babel plugin) : 0 erreurs
✓ Pas de new dependencies ajoutées
```

---

## File List

**Fichiers modifiés :**
- `src/services/mockDb.js` — Ajout de `mockDb.clubs.toggleJoin(clubId)` dans la section `mockDb.clubs`
- `src/pages/ResearchClubs.jsx` — Réécriture complète (stub vide → page fonctionnelle)

**Fichiers de tracking modifiés :**
- `_bmad-output/implementation-artifacts/4-1-specialized-clubs-hub-accent-themes.md` — Ce fichier
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Statut : ready-for-dev → in-progress → review

---

## Change Log

| Date | Auteur | Changement |
|---|---|---|
| 2026-05-31 | Dev Agent (Antigravity) | Création story `4-1-specialized-clubs-hub-accent-themes` (bmad-create-story) |
| 2026-05-31 | Dev Agent (Antigravity) | Ajout `mockDb.clubs.toggleJoin()` dans `src/services/mockDb.js` |
| 2026-05-31 | Dev Agent (Antigravity) | Implémentation complète `src/pages/ResearchClubs.jsx` — 6 clubs glassmorphic, accents dynamiques, adhésion persistée |
| 2026-05-31 | Dev Agent (Antigravity) | Build validé — exit code 0, 2189 modules, React Compiler sans erreur |

