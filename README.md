# InnoFaso — Plateforme de Surveillance Microbiologique

Architecture : **Backend Express.js** + **Frontend React/Vite** + **Carte Next.js**

Normes appliquées : NF EN ISO 18593 / EC 2073/2005 (seuils UFC/cm² par type de surface)

## ⚡ Prérequis

- Node.js v18+
- XAMPP (Apache + MySQL) — **démarrer MySQL avant de continuer**

## 🚀 Installation en 4 étapes

### 1. Démarrer XAMPP → MySQL

Ouvrir XAMPP Control Panel → cliquer **Start** sur **MySQL**.

### 2. Installer les dépendances

```bash
npm install
```

> Installe automatiquement les dépendances des 3 sous-projets.

### 3. Créer la base de données

```bash
npm run setup
```

Crée la base `innofaso`, toutes les tables, les 14 zones, les données de démonstration.

> **Config XAMPP standard (root sans mot de passe) → aucun fichier à modifier.**
>
> Si ton MySQL a un mot de passe :
> - Ouvrir `innofaso-backend/backend/.env`
> - Renseigner `DB_PASSWORD=ton_mot_de_passe`

### 4. Lancer le projet

```bash
npm run dev
```

Les 3 services démarrent dans le même terminal :

| Service  | URL                     | Description               |
| -------- | ----------------------- | ------------------------- |
| API      | http://localhost:4000   | Backend Express.js        |
| Frontend | http://localhost:5173   | Dashboard React principal |
| Map      | http://localhost:3000   | Carte interactive d'usine |

Ouvrir **http://localhost:5173** dans le navigateur.

## 🔐 Connexion admin

| Utilisateur | Mot de passe  | Rôle           |
| ----------- | ------------- | -------------- |
| `admin`     | `Admin2026!`  | Administrateur |
| `qualite`   | `Qualite123!` | Éditeur        |

## 🌡️ Module IoT (ESP32 + DHT11)

Le widget IoT est connecté à Firebase Realtime Database.  
La config Firebase est déjà dans `innofaso-frontend/src/lib/firebase.js`.  
Pour envoyer des données depuis le capteur, allumer le hotspot iPhone et téléverser le code Arduino.

## ❗ Corrections appliquées dans cette version

1. **Fichier `.env` backend** créé avec un JWT_SECRET valide (le serveur refusait de démarrer avec la valeur par défaut `change_this_secret`)
2. **Package `xlsx`** : dépendance corrigée (ancien lien vers CDN SheetJS privé → version npm officielle)

## Structure du projet

```
innofaso-new/
├── innofaso-backend/backend/   # API Express.js (port 4000)
├── innofaso-frontend/          # Dashboard React/Vite (port 5173)
├── map/                        # Carte Next.js (port 3000)
└── package.json                # Lancement unifié (npm run dev)
```
