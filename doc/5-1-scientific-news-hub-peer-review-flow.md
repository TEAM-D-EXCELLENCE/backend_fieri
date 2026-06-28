---
baseline_commit: 1c8a96d33d3fa471853bb2206bd5605aa49cde17
---
# Story 5.1 : Scientific News Hub & Peer-Review Flow

**Status:** done  
**Story ID:** 5.1  
**Story Key:** 5-1-scientific-news-hub-peer-review-flow  
**Epic:** Epic 5 — Live Events, Editorial News, and Dashboard Notifications  
**Completion Note:** Implémentation du flux de publication scientifique et relecture par les pairs terminée avec succès.

---

## User Story

En tant que **chercheur connecté ou administrateur**,  
Je veux **soumettre des publications scientifiques qui passent par un circuit de relecture strict avant d'être validées par un administrateur et publiées**,  
Afin de **garantir la rigueur scientifique et l'excellence éditoriale du portail FIERI**.

---

## Acceptance Criteria (BDD)

**Scénario 1 — Soumission d'un article par un chercheur**

- **Given** un membre connecté avec le rôle `CHERCHEUR` ou `ADMIN` visitant `/news`
- **When** il clique sur "Rédiger un article" et soumet le formulaire d'écriture
- **Then** un nouvel article est créé dans le stockage persistant local (`mockDb.js`)
- **And** l'état de validation initial de cet article est défini de manière stricte à `PENDING`
- **And** l'article est invisible pour les utilisateurs normaux (visiteurs/membres) sur le flux `/news`
- **And** une notification Toast de confirmation est affichée à l'écrivain : "Article soumis avec succès au comité de lecture !"

**Scénario 2 — Visualisation des articles approuvés uniquement**

- **Given** un visiteur public ou un membre régulier naviguant vers `/news`
- **When** le flux des actualités se charge
- **Then** le système récupère la liste des actualités via `api.news.getAll()`
- **And** seuls les articles dont le statut est `APPROVED` sont affichés dans l'interface utilisateur

**Scénario 3 — Modération et approbation par un administrateur**

- **Given** un administrateur connecté sur `/admin`
- **When** la page se charge
- **Then** le panneau de contrôle affiche la liste en temps réel des articles en attente d'approbation (`status === 'PENDING'`)
- **And** pour chaque article, l'administrateur peut cliquer sur "Approuver" (`PATCH /news/:id/approve`) ou "Rejeter" (suppression immuable)
- **And** après approbation, le statut de l'article bascule en `APPROVED`
- **And** l'article apparaît instantanément dans le flux public des actualités `/news`

---

## Context & Business Value

Cette story implémente le circuit de validation scientifique par les pairs (peer-review) indispensable pour asseoir la crédibilité du FIERI Research Hub. Sur le plan de l'expérience utilisateur, elle enrichit l'espace d'administration et crée un flux d'écriture haut de gamme pour les chercheurs de la plateforme.

---

## Technical Requirements

### 📁 Fichiers à créer / modifier

| Fichier | Action | Description |
|---|---|---|
| `src/services/mockDb.js` | **MODIFICATION** | Mettre à jour `DEFAULT_NEWS` avec un attribut `status: 'APPROVED'` par défaut. Ajouter les méthodes `add()`, `approve()`, `delete()` et enrichir `getAll()` pour gérer le filtrage par statut. |
| `src/services/api.js` | **MODIFICATION** | Étendre la clé `api.news` avec les fonctions d'écriture, d'approbation et de rejet d'articles avec simulation de délai réseau. |
| `src/pages/News.jsx` | **CRÉATION COMPLÈTE** | Remplacer le stub par une interface premium "Dark Cosmique" affichant le flux public des actualités et le formulaire d'écriture pour les chercheurs. |
| `src/pages/Admin.jsx` | **MODIFICATION** | Remplacer le bloc temporaire du comité de lecture par une véritable table de validation interactive et réactive pour les administrateurs. |

### 🛠️ Architecture & Modèle de Données

Les objets actualités scientifiques dans `mockDb.js` doivent adopter le modèle de données enrichi suivant :
```json
{
  "id": "art-1",
  "categorie": "Intelligence Artificielle",
  "title": "Comment l'IA générative transforme l'agriculture locale",
  "date": "28 Mai 2026",
  "author": "Dr. Amadou Kane",
  "image": "https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?w=800&auto=format&fit=crop&q=80",
  "excerpt": "Description courte...",
  "content": "Contenu complet de la publication...",
  "status": "APPROVED"
}
```

---

## Tasks & Subtasks Checklist

- [x] **1. Moteur Backend & Schéma de Données (`mockDb.js`)**
  - [x] Ajouter `status: 'APPROVED'` à tous les éléments de `DEFAULT_NEWS`.
  - [x] Mettre à jour `mockDb.news.getAll(includePending)` pour filtrer les articles selon le paramètre.
  - [x] Ajouter `mockDb.news.getById(id)` pour récupérer un article individuel.
  - [x] Implémenter `mockDb.news.add(articleData)` attribuant par défaut `status: 'PENDING'` et générant un ID unique.
  - [x] Implémenter `mockDb.news.approve(id)` pour modifier le statut à `'APPROVED'`.
  - [x] Implémenter `mockDb.news.delete(id)` pour supprimer un article (rejet administratif ou modération).
- [x] **2. Extension de la couche API cliente (`api.js`)**
  - [x] Mettre à jour `api.news.getAll(includePending)` pour appeler `mockDb.news.getAll(includePending)`.
  - [x] Ajouter `api.news.submit(articleData)` (simule le `POST /news`).
  - [x] Ajouter `api.news.approve(id)` (simule le `PATCH /news/:id/approve`).
  - [x] Ajouter `api.news.reject(id)` (rejet de publication).
- [x] **3. Conception du Hub d'Actualités Scientifiques (`News.jsx`)**
  - [x] Créer une grille d'actualités responsive utilisant les cartes glassmorphic haut de gamme.
  - [x] Intégrer un système de filtrage par catégorie (pôle de recherche).
  - [x] Conditionner le bouton "Rédiger un article" à la détection d'une session active possédant le rôle `CHERCHEUR` ou `ADMIN`.
  - [x] Concevoir le formulaire d'écriture sous forme de modale ou tiroir coulissant ultra-premium avec validation de champs et presets d'images scientifiques.
- [x] **4. Intégration de la Console d'Approbation Administrative (`Admin.jsx`)**
  - [x] Remplacer le placeholder du comité de lecture par une interface dynamique de validation.
  - [x] Afficher tous les articles ayant le statut `PENDING`.
  - [x] Fournir des boutons d'actions interactifs "Approuver" (coche verte) et "Rejeter" (poubelle rouge).
  - [x] Gérer l'actualisation dynamique sans rechargement de page lors d'une action d'administration.
- [x] **5. Revue de Code & Tests d'Intégration**
  - [x] Vérifier la bonne persistance dans le `localStorage` de l'application.
  - [x] S'assurer du respect absolu des règles de gating d'accès.

---

## Change Log

- **31 Mai 2026** : Création de la story technique 5.1 pour implémenter le peer-review et la rédaction scientifique.
- **31 Mai 2026** : Implémentation du CRUD `news`, de la grille réactive `News.jsx` et du panneau de modération dans `Admin.jsx`.

---

## Dev Agent Record

### Implementation Plan
1. Extension de `mockDb.js` avec de nouveaux attributs et des fonctions CRUD.
2. Extension de `api.js` pour créer les passerelles vers le stockage simulé.
3. Implémentation du composant `News.jsx` pour la soumission et la lecture d'articles.
4. Remplacement du placeholder dans `Admin.jsx` par le panneau interactif du comité de lecture.

### Debug Log
*Aucune erreur rencontrée lors de la compilation avec Vite.*

### Completion Notes
Le flux fonctionne parfaitement :
- Un chercheur/administrateur soumet un article sur `/news`, il va directement en statut `PENDING`.
- Un administrateur voit les articles `PENDING` sur la console `/admin`.
- L'approbation fait passer le statut à `APPROVED`, ce qui le rend visible publiquement sur `/news`.
- Le rejet supprime l'article de la base locale de manière pérenne.
