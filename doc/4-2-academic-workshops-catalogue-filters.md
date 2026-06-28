# Story 4.2 : Academic Workshops Catalogue & Filters

**Status:** review  
**Story ID:** 4.2  
**Story Key:** 4-2-academic-workshops-catalogue-filters  
**Epic:** Epic 4 — Research Clubs and Academic Academy (Student Hub)  
**Completion Note:** Implémenté avec succès ! Le catalogue d'ateliers intègre une recherche en temps réel et des filtres croisés par niveau et par club scientifique, avec des accents de couleurs dynamiques et une esthétique glassmorphic "Dark Cosmique" haut de gamme.

---

## User Story

En tant que **étudiant ou passionné de sciences**,  
Je veux **naviguer dans le catalogue d'ateliers scientifiques de l'Académie et les filtrer par discipline ou niveau**,  
Afin de **trouver rapidement des ateliers pertinents pour monter en compétences**.

---

## Acceptance Criteria (BDD)

**Scénario 1 — Affichage du catalogue des ateliers**

- **Given** un utilisateur naviguant vers la page `/workshops`
- **When** la page se charge
- **Then** les ateliers scientifiques sont affichés sous forme de cartes élégantes et interactives
- **And** chaque carte d'atelier affiche :
  - Le titre de l'atelier
  - L'instructeur (associé à un chercheur)
  - Le niveau de difficulté (Débutant, Intermédiaire, Avancé) avec un badge coloré
  - La date, la durée et une description claire
  - Le nombre de places total et le nombre de places restantes (placesLeft)
  - Le club de rattachement thématique

**Scénario 2 — Filtrage en temps réel par Club / Discipline**

- **Given** le catalogue d'ateliers chargé sur la page
- **When** l'utilisateur clique sur le filtre d'un club spécifique (ex. Robotique, Intelligence Artificielle)
- **Then** la grille se met à jour instantanément pour n'afficher que les ateliers rattachés à ce club
- **And** le filtre actif est visuellement mis en valeur avec sa couleur d'accent distincte

**Scénario 3 — Filtrage en temps réel par Niveau**

- **Given** le catalogue d'ateliers chargé sur la page
- **When** l'utilisateur sélectionne un niveau de difficulté (ex. "Débutant" ou "Avancé")
- **Then** le catalogue affiche uniquement les ateliers correspondant au niveau sélectionné
- **And** les filtres peuvent se cumuler (Club + Niveau) de manière logique et fluide

---

## Context & Business Value

Cette story implémente la partie catalogue de **FR9** : l'Académie Académique. Elle permet de structurer la transmission de connaissances entre chercheurs certifiés et étudiants de la communauté. L'expérience doit être fluide et encourager la découverte par filtres croisés.

---

## Technical Requirements

### 📁 Fichiers à créer / modifier

| Fichier | Action | Description |
|---|---|---|
| `src/pages/Workshops.jsx` | **RÉÉCRITURE COMPLÈTE** | Actuellement un stub vide (`return null`), à implémenter entièrement. |

### Stack technique
- **React 19**
- **Tailwind CSS v4**
- **Framer Motion 12**
- **Lucide Icons**

---

## 🛠️ Notes d'implémentation & Livrables

### 1. Page Principale des Ateliers (`src/pages/Workshops.jsx`)
- **Structure UI Premium** : Intégration de l'identité visuelle "Dark Cosmique" avec halos lumineux progressifs et cartes en verre semi-transparent (glassmorphism).
- **Filtres Croisés Fluides** : Recherche floue (titre, instructeur, description) + Filtres par Niveau + Filtres par Clubs thématiques. Les boutons des clubs adoptent dynamiquement les couleurs d'accent définies dans la base de données.
- **Remplissage Dynamique** : Une barre de progression élégante affiche le taux d'occupation de l'atelier avec transition de couleur (du vert au rouge/orange de la waitlist).

### 2. Validation
- **Interactivité** : Transition instantanée et micro-animations lors du changement de filtre.
- **Accessibilité** : Structure sémantique HTML5 et attributs `aria-label` descriptifs sur tous les contrôles interactifs.
