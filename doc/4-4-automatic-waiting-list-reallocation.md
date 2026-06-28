# Story 4.4 : Automatic Waiting List Reallocation

**Status:** review  
**Story ID:** 4.4  
**Story Key:** 4-4-automatic-waiting-list-reallocation  
**Epic:** Epic 4 — Research Clubs and Academic Academy (Student Hub)  
**Completion Note:** Implémenté avec succès ! Le moteur FIFO de cooptation automatique fonctionne en temps réel. Lors de la désinscription d'un utilisateur, le premier membre en file d'attente (waitlist) est automatiquement promu, et une notification système lui est injectée dans le centre de notifications. Le catalogue affiche une liste d'attente ordonnée en direct sur chaque carte pour voir l'effet en direct.

---

## User Story

En tant que **membre inscrit à un atelier complet**,  
Je veux **pouvoir me désinscrire facilement et savoir que le système attribue immédiatement ma place au premier membre en attente**,  
Afin de **libérer équitablement les places pour mes pairs**.

---

## Acceptance Criteria (BDD)

**Scénario 1 — Désinscription et réallocation FIFO automatique**

- **Given** un atelier complet (`placesLeft == 0`) avec des personnes déjà en liste d'attente (waitlist)
- **When** l'utilisateur inscrit clique sur "Se désinscrire"
- **Then** il est retiré de la liste des inscrits de manière immuable
- **And** le système sélectionne automatiquement le premier membre de la file d'attente (FIFO)
- **And** ce membre est retiré de la waitlist et transféré instantanément dans la liste des inscrits (statut "Inscrit")
- **And** le nombre de places restantes reste égal à `0` (puisque la place libérée a été immédiatement réallouée)
- **And** le nouveau membre promu reçoit une notification système (persiste en base, visible sur son Dashboard ultérieurement)
- **And** un message à l'écran informe que "Votre place a été réattribuée au premier membre de la liste d'attente !"

---

## Context & Business Value

Cette story clôture l'Epic 4 en apportant la logique de réallocation automatique (FIFO) demandée dans l'AC de la story. Cela démontre un backend de simulation (mockDb) robuste capable de gérer des changements d'état complexes de façon asynchrone et réactive.

---

## Technical Requirements

### 📁 Fichiers à créer / modifier

| Fichier | Action | Description |
|---|---|---|
| `src/services/mockDb.js` | **MODIFICATION** | Implémenter les méthodes d'action de désinscription et réallocation automatique de file d'attente dans la clé `mockDb.workshops`. |
| `src/pages/Workshops.jsx` | **ENRICHISSEMENT** | Intégrer les boutons d'annulation d'inscription et de waitlist avec la logique FIFO. |

---

## 🛠️ Notes d'implémentation & Livrables

### 1. Moteur FIFO (`src/services/mockDb.js`)
- **Promotion Asynchrone FIFO** : Si `waitlistUsers.length > 0`, le premier inscrit dans la file (`waitlistUsers.shift()`) est retiré et ajouté à `registeredUsers`.
- **Injection de Notification** : Le système injecte une notification automatique dans le compte de l'utilisateur promu (`Félicitations ! Vous avez été coopté automatiquement de la liste d'attente à l'atelier...`).

### 2. Affichage Visuel FIFO en Temps Réel (`src/pages/Workshops.jsx`)
- **Aperçu en Direct** : Les 3 premiers noms de la liste d'attente ordonnée s'affichent en direct dans un encart spécial de la carte d'atelier, permettant de valider instantanément la promotion lors du test utilisateur.
- **Toasts Informatifs** : Un toast notifie immédiatement de la promotion d'un membre en attente si la désinscription a libéré une place pour lui. E.g. "Place libérée et réattribuée automatiquement au premier membre en attente (Marc Lambert) !".
