# Guide d'Installation - Link Marketplace

Guide détaillé pour installer et configurer Link en local.

## 📋 Prérequis

Assurez-vous d'avoir installé :

- **Node.js** (v18 ou supérieur) : [Télécharger](https://nodejs.org/)
- **PostgreSQL** (v14 ou supérieur) : [Télécharger](https://www.postgresql.org/download/)
- **npm** ou **yarn** (inclus avec Node.js)
- **Git** (optionnel)

## 🚀 Installation Étape par Étape

### 1. Cloner ou Télécharger le Projet

Si vous utilisez Git :
```bash
git clone <repository-url>
cd Link
```

Sinon, décompressez l'archive du projet.

### 2. Installer les Dépendances

Depuis la racine du projet :
```bash
npm run install:all
```

Cette commande installera les dépendances pour :
- Le projet racine
- Le backend
- Le frontend

### 3. Configuration de PostgreSQL

#### 3.1 Créer la Base de Données

Ouvrez un terminal et connectez-vous à PostgreSQL :

**Sur Windows :**
```bash
psql -U postgres
```

**Sur Linux/Mac :**
```bash
sudo -u postgres psql
```

Puis exécutez :
```sql
CREATE DATABASE link_marketplace;
\q
```

#### 3.2 (Optionnel) Créer un Utilisateur Dédié

```sql
CREATE USER link_user WITH PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE link_marketplace TO link_user;
\q
```

### 4. Configuration Backend

#### 4.1 Créer le Fichier .env

Copiez le fichier d'exemple :
```bash
cd backend
cp .env.example .env
```

#### 4.2 Modifier le Fichier .env

Ouvrez `backend/.env` et modifiez les valeurs :

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=link_marketplace
DB_USER=postgres          # Ou link_user si vous l'avez créé
DB_PASSWORD=votre_mot_de_passe_postgres
JWT_SECRET=changez_cette_valeur_par_une_cle_secrete_longue_et_aleatoire
NODE_ENV=development
```

**Important :** Changez `JWT_SECRET` par une chaîne aléatoire longue et sécurisée.

#### 4.3 Initialiser la Base de Données

```bash
cd backend
npm run db:migrate
```

Cette commande créera toutes les tables nécessaires.

#### 4.4 Créer le Dossier uploads

```bash
mkdir uploads
```

Sur Windows, créez le dossier manuellement dans `backend/`.

### 5. Configuration Frontend

Le frontend n'a pas besoin de configuration supplémentaire pour le développement local.

Si vous voulez changer l'URL de l'API, créez `frontend/.env.local` :

```env
VITE_API_URL=http://localhost:5000
```

### 6. Lancer l'Application

Depuis la racine du projet :

```bash
npm run dev
```

Cette commande lancera :
- Le backend sur http://localhost:5000
- Le frontend sur http://localhost:5173

### 7. Accéder à l'Application

Ouvrez votre navigateur et allez sur :
```
http://localhost:5173
```

## ✅ Vérification de l'Installation

### Tester le Backend

Ouvrez un navigateur ou utilisez curl :
```bash
curl http://localhost:5000/api/health
```

Vous devriez voir :
```json
{"status":"OK","message":"Link API is running"}
```

### Tester le Frontend

1. Allez sur http://localhost:5173
2. Vous devriez voir la page d'accueil de Link
3. Cliquez sur "Inscription" pour créer un compte

## 🐛 Résolution de Problèmes

### Erreur de Connexion à PostgreSQL

**Problème :** `Error: connect ECONNREFUSED`

**Solutions :**
1. Vérifiez que PostgreSQL est démarré
2. Vérifiez les identifiants dans `backend/.env`
3. Sur Linux, vérifiez que PostgreSQL écoute sur localhost :
   ```bash
   sudo netstat -tulpn | grep 5432
   ```

### Erreur lors de la Migration

**Problème :** `relation "users" already exists`

**Solution :** La base de données existe déjà. Supprimez-la et recréez-la :
```sql
DROP DATABASE link_marketplace;
CREATE DATABASE link_marketplace;
```

Puis relancez la migration.

### Erreur "Module not found"

**Problème :** `Cannot find module 'xxx'`

**Solution :** Réinstallez les dépendances :
```bash
cd backend
rm -rf node_modules package-lock.json
npm install

cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

### Port déjà utilisé

**Problème :** `Port 5000 is already in use`

**Solutions :**
1. Changez le port dans `backend/.env` :
   ```env
   PORT=5001
   ```
2. Ou arrêtez le processus utilisant le port :
   ```bash
   # Sur Windows
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F
   
   # Sur Linux/Mac
   lsof -ti:5000 | xargs kill
   ```

### Images ne s'affichent pas

**Problème :** Les images uploadées ne s'affichent pas

**Solutions :**
1. Vérifiez que le dossier `backend/uploads` existe
2. Vérifiez les permissions du dossier
3. Vérifiez que l'URL dans le frontend pointe vers `http://localhost:5000/uploads/...`

## 📝 Prochaines Étapes

1. **Créer un compte vendeur** : Inscrivez-vous avec le type "Vendeur"
2. **Créer un produit** : Allez dans votre tableau de bord et ajoutez un produit
3. **Explorer** : Parcourez les produits et testez les fonctionnalités

## 🔧 Commandes Utiles

```bash
# Lancer uniquement le backend
npm run dev:backend

# Lancer uniquement le frontend
npm run dev:frontend

# Lancer les deux (depuis la racine)
npm run dev

# Réinitialiser la base de données
cd backend
npm run db:migrate
```

## 📚 Documentation

- [README.md](README.md) - Vue d'ensemble du projet
- [DEPLOYMENT.md](DEPLOYMENT.md) - Guide de déploiement en production

## 💡 Astuces

- Utilisez un outil comme **Postman** ou **Insomnia** pour tester l'API
- Les logs du backend s'affichent dans le terminal
- Les erreurs du frontend s'affichent dans la console du navigateur (F12)
