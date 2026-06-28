# Story 4.3 : Interactive Workshop Registration & Waitlist Engine

**Status:** review  
**Story ID:** 4.3  
**Story Key:** 4-3-interactive-workshop-registration-waitlist-engine  
**Epic:** Epic 4 — Research Clubs and Academic Academy (Student Hub)  
**Completion Note:** Entièrement développé et vérifié ! Le moteur d'inscription gère l'état utilisateur (inscrit / en file d'attente) avec persistance locale dans mockDb.js. Le bouton de la carte s'adapte en temps réel en affichant la position exacte de l'utilisateur dans la file d'attente s'il y est placé.

---

## User Story

En tant que **membre connecté**,  
Je veux **m'inscrire en un clic à un atelier ou être placé en liste d'attente interactive si l'atelier est complet**,  
Afin de **réserver ma place ou d'être notifié dès qu'une place se libère**.

---

## Acceptance Criteria (BDD)

**Scénario 1 — Inscription réussie sur place disponible**

- **Given** un membre connecté visitant `/workshops`
- **When** il clique sur le bouton "S'inscrire" d'un atelier ayant des places libres (`placesLeft > 0`)
- **Then** sa réservation est validée
- **And** le nombre de places restantes est décrémenté de `-1` dans le stockage persistant local (`mockDb.js`)
- **And** le bouton de la carte bascule en "Inscrit" (avec style actif)
- **And** une notification Toast de succès est déclenchée

**Scénario 2 — Placement automatique en liste d'attente (Waitlist)**

- **Given** un membre connecté visitant `/workshops`
- **When** il clique sur "S'inscrire" sur un atelier complet (`placesLeft == 0`)
- **Then** il est automatiquement placé dans la file d'attente fictive de cet atelier
- **And** son statut passe à "Sur liste d'attente"
- **And** son rang exact dans la waitlist (FIFO) est calculé et affiché (ex. "File d'attente — Position #3")
- **And** cet état est stocké de façon persistante dans `localStorage`

---

## Context & Business Value

Cette story est essentielle pour simuler un véritable moteur d'allocation de places en temps réel. Elle renforce le sentiment de communauté vivante en introduisant une gestion dynamique des places restantes et un affichage clair des statuts de file d'attente.

---

## Technical Requirements

### 📁 Fichiers à créer / modifier

| Fichier | Action | Description |
|---|---|---|
| `src/services/mockDb.js` | **MODIFICATION** | Ajouter ou enrichir le schéma de données `workshops` pour supporter `registeredUsers` (tableau) et `waitlistUsers` (tableau). |
| `src/pages/Workshops.jsx` | **ENRICHISSEMENT** | Intégrer l'état de connexion, la gestion des boutons d'inscription/waitlist et le feedback utilisateur. |

---

## 🛠️ Notes d'implémentation & Livrables

### 1. Moteur de Base de Données (`src/services/mockDb.js`)
- **Structure Waitlist Intégrée** : `registeredUsers` et `waitlistUsers` stockent des listes d'utilisateurs par nom complet.
- **Calculs de Session à la Volée** : Les fonctions `getAll()` et `getById()` lisent dynamiquement `fieri_user` dans `localStorage` pour injecter `.registered`, `.inWaitlist` et `.waitlistPosition` sans dépendance circulaire.

### 2. Validation
- **Feedback Haptique Visuel** : Effet de vibration doux de l'état du bouton avec une latence simulée de 350 ms pour donner une sensation d'interaction réelle avec le serveur.
- **Toasts Informatifs** : Des toasts colorés signalent clairement le succès de l'action ou la position sur la liste d'attente.
