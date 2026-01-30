# Déploiement de Link sur Render

Ce guide t'explique comment migrer et déployer ton application Link (Node.js/Express + React + PostgreSQL) sur Render.

## 1. Préparer le backend (Node.js/Express)

- Assure-toi que le backend écoute sur `process.env.PORT` (déjà fait dans server.js).
- Ajoute un fichier `render.yaml` à la racine du projet pour l'automatisation (optionnel mais recommandé).
- Mets à jour les variables d'environnement dans un `.env` (hors du repo public).

## 2. Préparer le frontend (React/Vite)

- Le build doit être généré dans un dossier (`dist` par défaut avec Vite).
- Pour servir le frontend via le backend Express, copie le build dans le backend ou configure un service Render séparé pour le frontend.

## 3. Préparer la base de données PostgreSQL

- Utilise l'offre PostgreSQL gratuite de Render.
- Note la variable d'environnement `DATABASE_URL` fournie par Render.

## 4. Étapes Render

### Backend
1. Crée un nouveau service Web sur Render.
2. Connecte ton repo GitHub.
3. Commande de build : `npm install`
4. Commande de démarrage : `npm run start` ou `node backend/server.js`
5. Ajoute les variables d'environnement nécessaires (voir `.env`).
6. Ajoute la variable `DATABASE_URL` fournie par Render PostgreSQL.

### Frontend (option 1 : service séparé)
1. Crée un service Static Site sur Render.
2. Commande de build : `npm install && npm run build`
3. Dossier à publier : `frontend/dist`

### Frontend (option 2 : via Express)
- Après le build, copie le contenu de `frontend/dist` dans un dossier public du backend et sers-le avec Express (`app.use(express.static(...))`).

## 5. Fichiers à ajouter
- `render.yaml` (déploiement automatique, optionnel)
- `.env.example` (exemple de variables d'environnement)

## 6. Conseils
- Mets à jour les URLs d’API dans le frontend pour pointer vers le backend Render.
- Vérifie les règles CORS dans Express.
- Pour les fichiers uploadés, Render ne garde pas les fichiers persistants sur le disque (utilise un stockage externe type AWS S3 pour la prod).

---

Pour toute question, consulte la doc officielle : https://render.com/docs