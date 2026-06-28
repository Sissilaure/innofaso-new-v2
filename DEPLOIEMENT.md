# Guide de déploiement — InnoFaso (Vercel + Render)

## Vue d'ensemble

| Service  | Outil      | Ce qui tourne                     |
|----------|------------|-----------------------------------|
| Frontend | **Vercel** | `innofaso-frontend/` (React/Vite) |
| Backend  | **Render** | `innofaso-backend/backend/` (Express + MySQL) |
| Map      | **Vercel** | `map/` (Next.js) — même projet ou projet séparé |

---

## ÉTAPE 1 — Créer la base de données MySQL en ligne (Render)

1. Aller sur [render.com](https://render.com) → créer un compte gratuit
2. **New → MySQL** → remplir :
   - Name : `innofaso-db`
   - Database : `innofaso`
   - User : `innofaso_user`
   - Region : choisir la plus proche (Frankfurt pour l'Europe)
3. Cliquer **Create Database**
4. Copier les infos affichées (Host, Port, Database, Username, Password, Internal URL)

> Le plan gratuit Render MySQL donne 1 Go de stockage, suffisant pour ce projet.

---

## ÉTAPE 2 — Importer le schéma SQL

1. Depuis les infos de connexion Render, se connecter avec un client MySQL :
   ```bash
   mysql -h HOST -P PORT -u innofaso_user -p innofaso < innofaso-backend/backend/database.sql
   ```
   Ou depuis **phpMyAdmin** :  
   Ouvrir phpMyAdmin → Nouvelle connexion avec les credentials Render → onglet **Import** → sélectionner `innofaso-backend/backend/database.sql`

---

## ÉTAPE 3 — Déployer le backend Express sur Render (Web Service)

1. Pousser le projet sur GitHub (si pas déjà fait)
2. Sur Render : **New → Web Service**
3. Connecter votre dépôt GitHub → sélectionner **INNOFASO**
4. Configurer :
   - **Name** : `innofaso-api`
   - **Root directory** : `innofaso-backend/backend`
   - **Runtime** : Node
   - **Build command** : `npm install`
   - **Start command** : `node src/server.js`
   - **Plan** : Free
5. Aller dans **Environment** → ajouter ces variables :

   | Variable       | Valeur                             |
   |----------------|------------------------------------|
   | `DB_HOST`      | (External Host de votre MySQL Render) |
   | `DB_PORT`      | (Port de votre MySQL Render)       |
   | `DB_USER`      | `innofaso_user`                    |
   | `DB_PASSWORD`  | (Mot de passe MySQL Render)        |
   | `DB_NAME`      | `innofaso`                         |
   | `JWT_SECRET`   | `une_chaine_tres_longue_et_aleatoire_2026` |
   | `FRONTEND_URL` | `https://innofaso.vercel.app` (à remplir après étape 4) |
   | `NODE_ENV`     | `production`                       |

6. Cliquer **Create Web Service** → Render va builder et démarrer automatiquement
7. Copier l'URL générée (ex: `https://innofaso-api.onrender.com`) → elle servira au frontend

> ⚠️ Sur le plan gratuit Render, le service "dort" après 15 min d'inactivité.
> Premier chargement = 30-60s. Pour éviter ça, utiliser [cron-job.org](https://cron-job.org) 
> pour pinger `https://innofaso-api.onrender.com/api/health` toutes les 10 min.

---

## ÉTAPE 4 — Déployer le frontend sur Vercel

1. Aller sur [vercel.com](https://vercel.com) → créer un compte (avec GitHub)
2. **Add New → Project** → sélectionner votre dépôt
3. Configurer :
   - **Framework preset** : Vite
   - **Root directory** : `innofaso-frontend`
   - **Build command** : `npm run build`
   - **Output directory** : `dist`
4. Aller dans **Environment Variables** → ajouter :

   | Variable           | Valeur                                      |
   |--------------------|---------------------------------------------|
   | `VITE_API_URL`     | `https://innofaso-api.onrender.com/api`    |

5. Cliquer **Deploy**
6. Copier l'URL Vercel générée (ex: `https://innofaso.vercel.app`)
7. Retourner sur Render → mettre à jour `FRONTEND_URL` avec cette URL → **Save**

### Important — mettre à jour `api.js` pour pointer vers le backend en production

Dans `innofaso-frontend/src/services/api.js`, vérifier que l'URL de base utilise la variable d'environnement :

```js
const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
```

Si la variable n'existe pas encore dans le code, ajouter cette ligne tout en haut de `api.js`.

---

## ÉTAPE 5 — Déployer la carte Next.js sur Vercel

1. Sur Vercel : **Add New → Project** (nouveau projet)
2. Même dépôt GitHub, mais cette fois :
   - **Root directory** : `map`
   - **Framework preset** : Next.js
3. Environment Variables :

   | Variable       | Valeur                                   |
   |----------------|------------------------------------------|
   | `NEXT_PUBLIC_API_URL` | `https://innofaso-api.onrender.com/api` |

4. **Deploy** → copier l'URL (ex: `https://innofaso-map.vercel.app`)

---

## ÉTAPE 6 — Firebase (module IoT) — rien à changer

La config Firebase est déjà dans `innofaso-frontend/src/lib/firebase.js` avec les vraies clés.
Elle fonctionnera identiquement en production.

---

## Résumé des URLs finales

| Composant     | URL                                        |
|---------------|--------------------------------------------|
| Dashboard     | `https://innofaso.vercel.app`              |
| API Backend   | `https://innofaso-api.onrender.com`        |
| Carte         | `https://innofaso-map.vercel.app`          |
| Firebase IoT  | `https://innofaso-iot-default-rtdb.firebaseio.com` |

---

## ❓ Différences avec XAMPP local

| Local (XAMPP)                         | Production (Render + Vercel)                |
|---------------------------------------|---------------------------------------------|
| MySQL sur votre PC                    | MySQL géré sur Render (cloud)               |
| Lancer `npm run dev` à la main        | Déploiement automatique à chaque `git push` |
| `localhost:4000` pour l'API           | URL Render publique                         |
| `localhost:5173` pour le frontend     | URL Vercel publique                         |
| `.env` sur votre PC                   | Variables d'env configurées dans Render/Vercel |

---

## En cas d'erreur CORS après déploiement

Si le frontend affiche une erreur "CORS" ou "Network Error" :
1. Vérifier que `FRONTEND_URL` dans Render correspond exactement à l'URL Vercel (avec `https://`, sans `/` final)
2. Dans `innofaso-backend/backend/src/server.js`, s'assurer que `app.use(cors(...))` autorise l'origine Vercel
