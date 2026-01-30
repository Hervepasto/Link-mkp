# 🚀 Démarrage Rapide - Link Marketplace

Guide ultra-rapide pour démarrer l'application en 5 minutes.

## ⚡ Installation Express

### 1. Installer les dépendances
```bash
npm run install:all
```

### 2. Configurer PostgreSQL

Créer la base de données :
```sql
CREATE DATABASE link_marketplace;
```

### 3. Configurer le backend

Créer `backend/.env` :
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=link_marketplace
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe
JWT_SECRET=changez_cette_cle_secrete
NODE_ENV=development
```

### 4. Initialiser la base de données
```bash
cd backend
npm run db:migrate
```

### 5. Lancer l'application
```bash
# Depuis la racine
npm run dev
```

### 6. Accéder à l'application
Ouvrez http://localhost:5173 dans votre navigateur.

## ✅ C'est prêt !

- **Frontend** : http://localhost:5173
- **Backend API** : http://localhost:5000
- **Health Check** : http://localhost:5000/api/health

## 📝 Premiers Pas

1. **Créer un compte vendeur** : Inscription → Type "Vendeur"
2. **Ajouter un produit** : Dashboard → "Ajouter un produit"
3. **Explorer** : Page d'accueil pour voir les produits

## 🆘 Besoin d'aide ?

- [INSTALLATION.md](INSTALLATION.md) - Guide d'installation détaillé
- [DEPLOYMENT.md](DEPLOYMENT.md) - Guide de déploiement
- [README.md](README.md) - Documentation complète
