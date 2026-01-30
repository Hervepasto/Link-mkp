# Link - Marketplace Locale

**Slogan :** « Chaque lien nous renforce. »

Link est une plateforme web de mise en relation locale permettant aux utilisateurs de trouver des vendeurs proches de leur localisation géographique (pays, ville, quartier).

## 🚀 Technologies

- **Backend:** Node.js + Express + PostgreSQL
- **Frontend:** React + Vite + Tailwind CSS
- **Base de données:** PostgreSQL

## 📋 Prérequis

- Node.js (v18 ou supérieur)
- PostgreSQL (v14 ou supérieur)
- npm ou yarn

## 🛠️ Installation

1. **Cloner le projet**
```bash
git clone <repository-url>
cd Link
```

2. **Installer les dépendances**
```bash
npm run install:all
```

3. **Configurer la base de données**

Créer une base de données PostgreSQL :
```sql
CREATE DATABASE link_marketplace;
```

4. **Configurer les variables d'environnement**

Créer `backend/.env` :
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=link_marketplace
DB_USER=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET=your_jwt_secret_key
```

5. **Initialiser la base de données**

**Option 1 : Script automatique (recommandé)**
```bash
cd backend
npm run db:init
```

**Option 2 : Migration manuelle**
```bash
cd backend
npm run db:migrate
```

Le script `db:init` crée automatiquement la base de données si elle n'existe pas, puis exécute le schéma complet.

6. **Lancer l'application**
```bash
# Depuis la racine du projet
npm run dev
```

L'application sera accessible sur :
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## 📁 Structure du projet

```
Link/
├── backend/          # API REST (Express + PostgreSQL)
├── frontend/         # Interface React
└── README.md
```

## 🎨 Identité visuelle

- **Couleur principale:** Violet (#7B2CBF)
- **Design:** Moderne, minimaliste, inspiré des réseaux sociaux

## 📝 Fonctionnalités

- ✅ Inscription/Connexion (Vendeurs et Utilisateurs)
- ✅ Publication de produits avec images
- ✅ Fil d'actualité avec prioritisation géographique
- ✅ Système de vues et intéressés
- ✅ Commentaires et notifications
- ✅ Recherche par localisation
- ✅ Intégration WhatsApp
- ✅ Tableau de bord vendeur
- ✅ Gestion complète des produits (CRUD)

## 🗂️ Structure du Projet

```
Link/
├── backend/                 # API REST (Express + PostgreSQL)
│   ├── config/             # Configuration (database)
│   ├── middleware/         # Middlewares (auth, upload, error)
│   ├── routes/             # Routes API
│   ├── scripts/            # Scripts (migration, schema)
│   ├── uploads/            # Images uploadées
│   └── server.js           # Point d'entrée
├── frontend/               # Interface React
│   ├── src/
│   │   ├── components/     # Composants réutilisables
│   │   ├── context/        # Context API (Auth)
│   │   ├── pages/          # Pages de l'application
│   │   └── App.jsx         # Composant principal
│   └── package.json
└── README.md
```

## 🗄️ Schéma de Base de Données

L'application utilise PostgreSQL avec les tables suivantes :

- **users** : Utilisateurs (vendeurs et acheteurs)
- **products** : Produits publiés
- **product_images** : Images des produits
- **product_views** : Suivi des vues
- **product_interests** : Intérêts des utilisateurs
- **comments** : Commentaires sur les produits
- **notifications** : Notifications aux utilisateurs

Voir `backend/scripts/schema.sql` pour le schéma complet.

## 📄 Licence

Propriétaire
