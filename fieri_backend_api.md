# Spécifications de l'API REST de Production — FIERI Research

Ce document détaille la totalité des endpoints implémentés sur le serveur backend de production pour s'interfacer avec l'application web cliente de **FIERI Research**.

---

## 🌐 Spécifications Générales

* **Base URL** : `https://backend-fieri.vercel.app`
* **Content-Type** : `application/json`
* **Sécurité & Authentification** : Les routes protégées nécessitent la transmission du jeton JWT dans l'en-tête d'autorisation :
  ```http
  Authorization: Bearer <access_token>
  ```

---

## 🔑 1. Authentification & Session (`/auth`, `/members`)

### 1.1 Inscription d'un membre
* **Méthode / Route** : `POST /auth/register`
* **Authentification** : Aucune
* **Corps de la requête (JSON)** :
  ```json
  {
    "email": "candidat@fieri.com",
    "password": "SecurePassword123!",
    "firstName": "Alexandre",
    "lastName": "Vidal",
    "branchId": 1,
    "role": "CHERCHEUR"
  }
  ```
* **Réponse attendue (201 Created)** :
  ```json
  {
    "success": true,
    "message": "Inscription réussie",
    "data": {
      "access_token": "eyJhbGciOi...",
      "member": {
        "id": 4120,
        "email": "candidat@fieri.com",
        "firstName": "Alexandre",
        "lastName": "Vidal",
        "role": "CHERCHEUR"
      }
    }
  }
  ```

### 1.2 Connexion d'un membre
* **Méthode / Route** : `POST /auth/login`
* **Authentification** : Aucune
* **Corps de la requête (JSON)** :
  ```json
  {
    "email": "chercheur@fieri.dev",
    "password": "MyPassword1!"
  }
  ```
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "message": "Connexion réussie",
    "data": {
      "access_token": "eyJhbGciOiJIUzI1Ni...",
      "member": {
        "id": 101,
        "email": "chercheur@fieri.dev",
        "firstName": "chercheur",
        "lastName": "FIERI",
        "role": "CHERCHEUR"
      }
    }
  }
  ```

### 1.3 Consulter la session connectée
* **Méthode / Route** : `GET /members/me`
* **Authentification** : Requise (`Bearer JWT`)
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "message": "Profil récupéré",
    "data": {
      "id": 101,
      "email": "chercheur@fieri.dev",
      "firstName": "chercheur",
      "lastName": "FIERI",
      "role": "CHERCHEUR"
    }
  }
  ```

---

## 🏛️ 2. Structure Institutionnelle & Métadonnées

### 2.1 Lister tous les pays
* **Méthode / Route** : `GET /countries`
* **Authentification** : Aucune
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": [
      { "id": 1, "name": "Bénin" },
      { "id": 2, "name": "Togo" }
    ]
  }
  ```

### 2.2 Détail d'un pays
* **Méthode / Route** : `GET /countries/:id`
* **Authentification** : Aucune
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": { "id": 1, "name": "Bénin" }
  }
  ```

### 2.3 Lister les universités d'un pays
* **Méthode / Route** : `GET /countries/:countryId/universities`
* **Authentification** : Aucune
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": [
      { "id": 1, "name": "Université d'Abomey-Calavi (UAC)", "countryId": 1 }
    ]
  }
  ```

### 2.4 Lister globalement toutes les universités (sans filtre pays)
* **Méthode / Route** : `GET /universities`
* **Authentification** : Aucune
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": [
      { "id": 1, "name": "Université d'Abomey-Calavi (UAC)", "countryId": 1 }
    ]
  }
  ```

### 2.5 Lister les branches d'une université
* **Méthode / Route** : `GET /universities/:universityId/branches`
* **Authentification** : Aucune
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": [
      { "id": 1, "name": "Génie Logiciel & IA", "universityId": 1 }
    ]
  }
  ```

### 2.6 Lister globalement toutes les branches (sans filtre université)
* **Méthode / Route** : `GET /branches`
* **Authentification** : Aucune
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": [
      { "id": 1, "name": "Génie Logiciel & IA", "universityId": 1 }
    ]
  }
  ```

### 2.7 Détail d'une université
* **Méthode / Route** : `GET /universities/:id`
* **Authentification** : Aucune

### 2.8 Détail d'une branche
* **Méthode / Route** : `GET /branches/:id`
* **Authentification** : Aucune

---

## 🔬 3. Projets de Recherche R&D (`/projects`)

### 3.1 Lister les projets
* **Méthode / Route** : `GET /projects`
* **Paramètres de requête acceptés (Optionnels)** :
  * `clubId` (string) : filtrer par ID de club
  * `status` (string) : filtrer par statut (`Actif`, `Terminé`, etc.)
  * `search` (string) : recherche textuelle sur titre ou résumé
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "proj-101",
        "title": "Rover Autonome d'Exploration SLAM",
        "summary": "Robot d'exploration autonome...",
        "status": "Actif",
        "clubId": "club-1",
        "stars": 48,
        "starred": false,
        "budgetRaised": 4200,
        "technologies": ["ROS2", "LiDAR", "C++"]
      }
    ]
  }
  ```

### 3.2 Détails d'un projet
* **Méthode / Route** : `GET /projects/:id`
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": {
      "id": "proj-101",
      "title": "Rover Autonome...",
      "description": "Description longue...",
      "status": "Actif",
      "team": [
        { "name": "Tisto Dev", "role": "Chef de projet" }
      ],
      "stars": 48,
      "budgetRaised": 4200
    }
  }
  ```

### 3.3 Créer un projet
* **Méthode / Route** : `POST /projects`
* **Authentification** : Requise (`Bearer JWT`, Rôle : `CHERCHEUR` ou `ADMIN`)
* **Corps de la requête (JSON)** :
  ```json
  {
    "title": "Nouveau Projet Robotique",
    "summary": "Résumé du projet...",
    "description": "Description longue...",
    "clubId": "club-1",
    "technologies": ["C++", "ROS"]
  }
  ```

### 3.4 Modifier un projet
* **Méthode / Route** : `PUT /projects/:id`
* **Authentification** : Requise (`Bearer JWT`, Rôle : Propriétaire du projet ou `ADMIN`)

### 3.5 Supprimer un projet
* **Méthode / Route** : `DELETE /projects/:id`
* **Authentification** : Requise (`Bearer JWT`, Rôle : Propriétaire du projet ou `ADMIN`)

### 3.6 Suivre / Mettre en favori un projet
* **Méthode / Route** : `POST /projects/:id/follow`
* **Authentification** : Requise (`Bearer JWT`)
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "starred": true,
    "message": "Projet ajouté aux favoris."
  }
  ```

### 3.7 Ne plus suivre un projet (Désabonnement explicite)
* **Méthode / Route** : `DELETE /projects/:id/follow`
* **Authentification** : Requise (`Bearer JWT`)
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "starred": false,
    "message": "Projet retiré de vos favoris."
  }
  ```

### 3.8 Contribuer financièrement à un projet
* **Méthode / Route** : `POST /projects/:id/support`
* **Authentification** : Requise (`Bearer JWT`)
* **Corps de la requête (JSON)** :
  ```json
  {
    "amount": 150,
    "message": "Félicitations pour ces recherches !"
  }
  ```
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "message": "Contribution enregistrée.",
    "newBudget": 4350
  }
  ```

---

## 🏛️ 4. Clubs & Pôles de Recherche (`/clubs`)

### 4.1 Lister tous les clubs
* **Méthode / Route** : `GET /clubs`
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "club-1",
        "name": "Pôle Robotique & Systèmes Embarqués",
        "discipline": "Ingénierie",
        "memberCount": 14
      }
    ]
  }
  ```

### 4.2 Détail d'un club
* **Méthode / Route** : `GET /clubs/:id`
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": {
      "id": "club-1",
      "name": "Pôle Robotique...",
      "description": "Description...",
      "members": [
        { "id": 101, "firstName": "Alexandre", "lastName": "Vidal" }
      ]
    }
  }
  ```

### 4.3 Créer un club
* **Méthode / Route** : `POST /clubs`
* **Authentification** : Requise (`Bearer JWT`, Rôle : `ADMIN` uniquement)
* **Corps de la requête (JSON)** :
  ```json
  {
    "id": "club-3",
    "name": "Pôle Aérospatiale",
    "discipline": "Aéronautique",
    "description": "Description du pôle..."
  }
  ```

### 4.4 Modifier un club
* **Méthode / Route** : `PUT /clubs/:id`
* **Authentification** : Requise (`Bearer JWT`, Rôle : Responsable du club ou `ADMIN`)

### 4.5 Rejoindre un club en direct (Auto-accepté)
* **Méthode / Route** : `POST /clubs/:id/join`
* **Authentification** : Requise (`Bearer JWT`)
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "message": "Vous avez rejoint le club."
  }
  ```

### 4.6 Quitter un club
* **Méthode / Route** : `DELETE /clubs/:id/join`
* **Authentification** : Requise (`Bearer JWT`)
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "message": "Vous avez quitté le club."
  }
  ```

---

## 🎓 5. Ateliers & Académie (`/workshops`, `/formations`)

*Les deux préfixes de route `/workshops` et `/formations` sont acceptés et renvoient vers le même contrôleur.*

### 5.1 Lister les ateliers/formations
* **Méthode / Route** : `GET /workshops` ou `GET /formations`
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "work-101",
        "title": "Introduction à ROS2 et SLAM",
        "instructor": "Dr. Kane",
        "capacity": 20,
        "registeredCount": 18,
        "waitlistCount": 0
      }
    ]
  }
  ```

### 5.2 Détails d'un atelier/formation
* **Méthode / Route** : `GET /workshops/:id` ou `GET /formations/:id`
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": {
      "id": "work-101",
      "title": "Introduction à ROS2...",
      "instructor": "Dr. Kane",
      "capacity": 20,
      "registeredCount": 18,
      "waitlistCount": 0
    }
  }
  ```

### 5.3 Créer un atelier/formation
* **Méthode / Route** : `POST /workshops` ou `POST /formations`
* **Authentification** : Requise (`Bearer JWT`, Rôle : `CHERCHEUR` ou `ADMIN`)

### 5.4 Modifier un atelier/formation
* **Méthode / Route** : `PUT /workshops/:id` ou `PUT /formations/:id`
* **Authentification** : Requise (`Bearer JWT`, Rôle : Enseignant/Créateur de la formation ou `ADMIN`)

### 5.5 S'inscrire à un atelier/formation (Avec bascule automatique sur file d'attente si complet)
* **Méthode / Route** : `POST /workshops/:id/register` ou `POST /formations/:id/register`
* **Authentification** : Requise (`Bearer JWT`)
* **Corps de la requête (JSON)** :
  ```json
  {
    "userFullName": "Alexandre Vidal"
  }
  ```
* **Réponse en cas d'inscription confirmée (200 OK)** :
  ```json
  {
    "success": true,
    "action": "registered",
    "message": "Inscription confirmée pour l'atelier."
  }
  ```
* **Réponse en cas de placement en liste d'attente (200 OK)** :
  ```json
  {
    "success": true,
    "action": "waitlisted",
    "position": 1,
    "message": "Placé sur la file d'attente (Position #1)."
  }
  ```

### 5.6 S'inscrire explicitement en file d'attente
* **Méthode / Route** : `POST /workshops/:id/waitlist` ou `POST /formations/:id/waitlist`
* **Authentification** : Requise (`Bearer JWT`)
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "action": "waitlisted",
    "position": 2,
    "message": "Ajouté à la liste d'attente (Position #2)."
  }
  ```

### 5.7 Se désinscrire d'un atelier/formation
* **Méthode / Route** : `DELETE /workshops/:id/register` ou `DELETE /formations/:id/register`
* **Authentification** : Requise (`Bearer JWT`)
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "message": "Désinscription prise en compte."
  }
  ```

---

## 📅 6. Événements & Live Streams (`/events`)

### 6.1 Lister les événements
* **Méthode / Route** : `GET /events`
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "event-101",
        "title": "Symposium Africain sur l'IA 2026",
        "date": "2026-07-15T09:00:00Z",
        "isLive": false,
        "streamUrl": "https://live.fieri.org/symposium2026"
      }
    ]
  }
  ```

### 6.2 Détails d'un événement
* **Méthode / Route** : `GET /events/:id`
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": {
      "id": "event-101",
      "title": "Symposium Africain sur l'IA 2026",
      "description": "Description complète de l'événement...",
      "date": "2026-07-15T09:00:00Z",
      "isLive": false
    }
  }
  ```

### 6.3 Créer un événement
* **Méthode / Route** : `POST /events`
* **Authentification** : Requise (`Bearer JWT`, Rôle : `ADMIN` uniquement)

### 6.4 Modifier un événement
* **Méthode / Route** : `PUT /events/:id`
* **Authentification** : Requise (`Bearer JWT`, Rôle : `ADMIN` uniquement)

### 6.5 S'inscrire à un événement
* **Méthode / Route** : `POST /events/:id/register`
* **Authentification** : Requise (`Bearer JWT`)
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "message": "Inscription validée. Votre ticket d'accès a été généré."
  }
  ```

### 6.6 Se désinscrire d'un événement
* **Méthode / Route** : `DELETE /events/:id/register`
* **Authentification** : Requise (`Bearer JWT`)
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "message": "Désinscription de l'événement validée."
  }
  ```

### 6.7 Obtenir le lien de diffusion en direct (Stream)
* **Méthode / Route** : `GET /events/:id/stream`
* **Authentification** : Requise (`Bearer JWT` - L'utilisateur doit être inscrit à l'événement)
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "streamUrl": "https://live.fieri.org/symposium2026"
  }
  ```

---

## 👤 7. Annuaire des Chercheurs (`/researchers`)

### 7.1 Consulter la liste publique des chercheurs
* **Méthode / Route** : `GET /researchers`
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 101,
        "firstName": "Alexandre",
        "lastName": "Vidal",
        "bio": "Expert en vision artificielle...",
        "skills": ["Python", "OpenCV"],
        "followers": 12
      }
    ]
  }
  ```

### 7.2 Détails d'un chercheur
* **Méthode / Route** : `GET /researchers/:id`
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": {
      "id": 101,
      "firstName": "Alexandre",
      "lastName": "Vidal",
      "bio": "Expert...",
      "skills": ["Python", "OpenCV"],
      "projects": ["proj-101"],
      "distinctions": ["Prix de l'Innovation 2025"]
    }
  }
  ```

### 7.3 Consulter ses propres informations complémentaires
* **Méthode / Route** : `GET /researchers/me`
* **Authentification** : Requise (`Bearer JWT`)
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": {
      "id": 101,
      "bio": "...",
      "skills": ["Python"],
      "avatarUrl": "https://..."
    }
  }
  ```

### 7.4 Mettre à jour sa fiche chercheur
* **Méthode / Route** : `PUT /researchers/me`
* **Authentification** : Requise (`Bearer JWT`)
* **Corps de la requête (JSON)** :
  ```json
  {
    "bio": "Expert en vision artificielle.",
    "skills": ["Python", "OpenCV", "TensorFlow"],
    "avatarUrl": "https://..."
  }
  ```
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "message": "Fiche de chercheur mise à jour."
  }
  ```

### 7.5 S'abonner à un chercheur
* **Méthode / Route** : `POST /researchers/:id/follow`
* **Authentification** : Requise (`Bearer JWT`)
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "following": true,
    "message": "Vous suivez désormais ce chercheur."
  }
  ```

### 7.6 Se désabonner d'un chercheur (Désabonnement explicite)
* **Méthode / Route** : `DELETE /researchers/:id/follow`
* **Authentification** : Requise (`Bearer JWT`)
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "following": false,
    "message": "Vous ne suivez plus ce chercheur."
  }
  ```

---

## 📰 8. Actualités & Journal Scientifique (`/news`)

### 8.1 Lister les actualités approuvées
* **Méthode / Route** : `GET /news`
* **Paramètres de requête acceptés** :
  * `includePending` (boolean) : si `true`, liste aussi les articles en attente (réservé aux modérateurs).
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "news-101",
        "title": "Optimisation des micro-grids",
        "content": "Description...",
        "status": "APPROVED",
        "category": "Énergie"
      }
    ]
  }
  ```

### 8.2 Consulter le détail d'un article
* **Méthode / Route** : `GET /news/:id`
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": {
      "id": "news-101",
      "title": "Optimisation...",
      "content": "Texte intégral...",
      "status": "APPROVED"
    }
  }
  ```

### 8.3 Soumettre un article (État par défaut : PENDING)
* **Méthode / Route** : `POST /news`
* **Authentification** : Requise (`Bearer JWT`)
* **Corps de la requête (JSON)** :
  ```json
  {
    "title": "Avancées en Fusion Nucléaire",
    "content": "Corps de l'article...",
    "category": "Physique"
  }
  ```

### 8.4 Modifier un article
* **Méthode / Route** : `PUT /news/:id`
* **Authentification** : Requise (`Bearer JWT`, Rôle : Auteur de l'article ou `ADMIN`)

### 8.5 Approuver un article (Admin uniquement)
* **Méthode / Route** : `PATCH /news/:id/approve`
* **Authentification** : Requise (`Bearer JWT`, Rôle ADMIN)

### 8.6 Rejeter / Supprimer un article
* **Méthode / Route** : `DELETE /news/:id`
* **Authentification** : Requise (`Bearer JWT`)

---

## 📊 9. Tableau de Bord & Alertes (`/dashboard`, `/notifications`)

### 9.1 Obtenir mes statistiques d'activité connectée
* **Méthode / Route** : `GET /dashboard/me`
* **Authentification** : Requise (`Bearer JWT`)
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": {
      "joinedClubsCount": 3,
      "starredProjectsCount": 8,
      "registeredWorkshopsCount": 2
    }
  }
  ```

### 9.2 Récupérer mes notifications
* **Méthode / Route** : `GET /notifications`
* **Authentification** : Requise (`Bearer JWT`)
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "notif-101",
        "title": "Inscription Validée",
        "message": "Votre place pour l'atelier ROS2 est confirmée.",
        "read": false,
        "createdAt": "2026-06-04T12:00:00Z"
      }
    ]
  }
  ```

### 9.3 Marquer une notification comme lue
* **Méthode / Route** : `PUT /notifications/:id/read`
* **Authentification** : Requise (`Bearer JWT`)

### 9.4 Supprimer toutes ses notifications
* **Méthode / Route** : `DELETE /notifications`
* **Authentification** : Requise (`Bearer JWT`)
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "message": "Toutes les notifications ont été supprimées."
  }
  ```

---

## 📬 10. Formulaire de Contact (`/contact`)

### 10.1 Soumettre un message de support
* **Méthode / Route** : `POST /contact`
* **Corps de la requête (JSON)** :
  ```json
  {
    "name": "Professeur Dupont",
    "email": "dupont@sorbonne.fr",
    "subject": "Partenariat R&D",
    "message": "Texte du message..."
  }
  ```

---

## 💼 11. Tâches de Projet Kanban (`/tasks`)

### 11.1 Récupérer les tâches d'un projet
* **Méthode / Route** : `GET /tasks/project/:projectId`
* **Authentification** : Requise (`Bearer JWT`)
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "task-101",
        "projectId": "proj-101",
        "title": "Intégration du LiDAR",
        "status": "TODO",
        "priority": "HIGH",
        "assignedTo": "Alexandre Vidal"
      }
    ]
  }
  ```

### 11.2 Créer une tâche
* **Méthode / Route** : `POST /tasks`
* **Authentification** : Requise (`Bearer JWT`, Rôle : `CHEF_DE_PROJET` / `ADMIN`)

### 11.3 Modifier l'état d'une tâche
* **Méthode / Route** : `PUT /tasks/:id`
* **Authentification** : Requise (`Bearer JWT`)
* **Corps de la requête (JSON)** :
  ```json
  {
    "status": "IN_PROGRESS"
  }
  ```

### 11.4 Assigner une tâche
* **Méthode / Route** : `PATCH /tasks/:id/assign`
* **Authentification** : Requise (`Bearer JWT`)
* **Corps de la requête (JSON)** :
  ```json
  {
    "assignedTo": "Tisto Dev"
  }
  ```

### 11.5 Modifier la priorité
* **Méthode / Route** : `PATCH /tasks/:id/priority`
* **Authentification** : Requise (`Bearer JWT`)
* **Corps de la requête (JSON)** :
  ```json
  {
    "priority": "MEDIUM"
  }
  ```

### 11.6 Supprimer une tâche
* **Méthode / Route** : `DELETE /tasks/:id`
* **Authentification** : Requise (`Bearer JWT`)

---

## 🏅 12. Système de Badges d'Honneur (`/badges`)

### 12.1 Récupérer les distinctions d'un utilisateur
* **Méthode / Route** : `GET /badges/user/:userId`
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "badge-101",
        "badgeType": "CONTRIBUTOR_GOLD",
        "userName": "Alexandre Vidal",
        "awardedBy": "Conseil Scientifique"
      }
    ]
  }
  ```

### 12.2 Attribuer un badge
* **Méthode / Route** : `POST /badges/award`
* **Authentification** : Requise (`Bearer JWT`, Rôle : `MENTOR` / `ADMIN`)
* **Corps de la requête (JSON)** :
  ```json
  {
    "userId": 101,
    "userName": "Alexandre Vidal",
    "badgeType": "CONTRIBUTOR_GOLD",
    "awardedBy": "Conseil"
  }
  ```

### 12.3 Révoquer un badge
* **Méthode / Route** : `DELETE /badges/:id`
* **Authentification** : Requise (`Bearer JWT`, Rôle : `MENTOR` / `ADMIN`)

---

## 🤝 13. Adhésions de Clubs avec Validation (`/memberships`)

### 13.1 Soumettre une demande d'adhésion (Statut initial : PENDING)
* **Méthode / Route** : `POST /memberships/requests`
* **Authentification** : Requise (`Bearer JWT`)
* **Corps de la requête (JSON)** :
  ```json
  {
    "clubId": "club-1"
  }
  ```
* **Réponse attendue (201 Created)** :
  ```json
  {
    "success": true,
    "message": "Votre demande d'adhésion a été soumise au responsable du pôle.",
    "data": {
      "id": "req-4589",
      "clubId": "club-1",
      "status": "PENDING"
    }
  }
  ```

### 13.2 Consulter les demandes d'adhésion en attente pour un club (Responsable/Admin)
* **Méthode / Route** : `GET /memberships/requests/pending/:clubId`
* **Authentification** : Requise (`Bearer JWT`)

### 13.3 Consulter l'historique complet d'un club
* **Méthode / Route** : `GET /memberships/requests/club/:clubId`
* **Authentification** : Requise (`Bearer JWT`)

### 13.4 Consulter ses propres demandes d'adhésion
* **Méthode / Route** : `GET /memberships/requests/user/:userId`
* **Authentification** : Requise (`Bearer JWT`)

### 13.5 Approuver une demande (Ajoute le membre au club)
* **Méthode / Route** : `PATCH /memberships/requests/:requestId/approve`
* **Authentification** : Requise (`Bearer JWT`, Rôle : `RESPONSABLE` / `ADMIN`)

### 13.6 Refuser une demande
* **Méthode / Route** : `PATCH /memberships/requests/:requestId/reject`
* **Authentification** : Requise (`Bearer JWT`, Rôle : `RESPONSABLE` / `ADMIN`)

### 13.7 Quitter un club
* **Méthode / Route** : `DELETE /memberships/:clubId/user/:userId`
* **Authentification** : Requise (`Bearer JWT`)

---

## 💼 14. Candidatures & Opportunités (`/opportunities`, `/applications`)

### 14.1 Lister les opportunités
* **Méthode / Route** : `GET /opportunities`
* **Paramètres de requête acceptés (Optionnels)** :
  * `type` (string) : filtrer par type (`Doctorat`, `Stage`, etc.)
  * `discipline` (string) : filtrer par discipline
  * `status` (string) : filtrer par statut (`Active`, `Closed`)
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "opp-201",
        "title": "Postdoctorat en IA & SLAM",
        "description": "...",
        "type": "Doctorat",
        "discipline": "IA",
        "salary": 2500,
        "status": "Active"
      }
    ]
  }
  ```

### 14.2 Détail d'une opportunité
* **Méthode / Route** : `GET /opportunities/:id`

### 14.3 Créer une opportunité
* **Méthode / Route** : `POST /opportunities`
* **Authentification** : Requise (`Bearer JWT`, Rôle : `CHERCHEUR` ou `ADMIN`)

### 14.4 Modifier une opportunité
* **Méthode / Route** : `PUT /opportunities/:id`
* **Authentification** : Requise (`Bearer JWT`, Rôle : Auteur de l'offre ou `ADMIN`)

### 14.5 Supprimer une opportunité
* **Méthode / Route** : `DELETE /opportunities/:id`
* **Authentification** : Requise (`Bearer JWT`, Rôle : Auteur de l'offre ou `ADMIN`)

### 14.6 Postuler à une opportunité
* **Méthode / Route** : `POST /applications`
* **Authentification** : Requise (`Bearer JWT`)
* **Corps de la requête (JSON)** :
  ```json
  {
    "opportunityId": "opp-201",
    "coverLetter": "Lettre de motivation...",
    "cvUrl": "https://..."
  }
  ```
* **Réponse attendue (201 Created)** :
  ```json
  {
    "success": true,
    "message": "Votre candidature a été transmise.",
    "data": {
      "id": "app-101",
      "status": "PENDING"
    }
  }
  ```

### 14.7 Voir mes candidatures soumises
* **Méthode / Route** : `GET /applications/me`
* **Authentification** : Requise (`Bearer JWT`)

### 14.8 Vérifier si j'ai déjà postulé à une opportunité
* **Méthode / Route** : `GET /applications/check/:opportunityId`
* **Authentification** : Requise (`Bearer JWT`)
* **Réponse attendue (200 OK)** :
  ```json
  {
    "success": true,
    "hasApplied": true,
    "application": {
      "id": "app-101",
      "status": "PENDING"
    }
  }
  ```

### 14.9 Récupérer toutes les candidatures sur une opportunité
* **Méthode / Route** : `GET /applications/opportunity/:opportunityId`
* **Authentification** : Requise (`Bearer JWT`, Rôle : `CHEF_DE_PROJET` / `ADMIN`)

### 14.10 Mettre à jour le statut d'une candidature
* **Méthode / Route** : `PATCH /applications/:id/status`
* **Authentification** : Requise (`Bearer JWT`, Rôle : `CHEF_DE_PROJET` / `ADMIN`)
* **Corps de la requête (JSON)** :
  ```json
  {
    "status": "APPROVED"
  }
  ```
