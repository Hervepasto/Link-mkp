# Guide de Déploiement - Link Marketplace

Ce guide vous explique comment déployer l'application Link en production.

## 📋 Prérequis

- Node.js (v18 ou supérieur)
- PostgreSQL (v14 ou supérieur)
- Serveur web (Nginx recommandé)
- Certificat SSL (Let's Encrypt recommandé)
- PM2 (pour gérer les processus Node.js)

## 🗄️ Configuration de la Base de Données

### 1. Créer la base de données PostgreSQL

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Créer la base de données
CREATE DATABASE link_marketplace;

# Créer un utilisateur (optionnel mais recommandé)
CREATE USER link_user WITH PASSWORD 'votre_mot_de_passe_securise';
GRANT ALL PRIVILEGES ON DATABASE link_marketplace TO link_user;
\q
```

### 2. Initialiser le schéma

```bash
cd backend
npm run db:migrate
```

## 🔧 Configuration Backend

### 1. Variables d'environnement

Créer le fichier `backend/.env` :

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=link_marketplace
DB_USER=link_user
DB_PASSWORD=votre_mot_de_passe_securise
JWT_SECRET=votre_secret_jwt_tres_long_et_securise_changez_cela
NODE_ENV=production
```

### 2. Installer les dépendances

```bash
cd backend
npm install --production
```

### 3. Créer le dossier uploads

```bash
mkdir -p backend/uploads
chmod 755 backend/uploads
```

### 4. Démarrer avec PM2

```bash
# Installer PM2 globalement
npm install -g pm2

# Démarrer l'application
cd backend
pm2 start server.js --name link-backend

# Sauvegarder la configuration PM2
pm2 save
pm2 startup
```

## 🎨 Configuration Frontend

### 1. Variables d'environnement

Créer le fichier `frontend/.env.production` :

```env
VITE_API_URL=https://api.votre-domaine.com
```

### 2. Modifier l'URL de l'API dans le code

Dans `frontend/src/context/AuthContext.jsx` et autres fichiers utilisant axios, s'assurer que l'URL de base est correcte :

```javascript
// Option 1: Utiliser une variable d'environnement
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
axios.defaults.baseURL = API_URL;
```

### 3. Build de production

```bash
cd frontend
npm install
npm run build
```

Le dossier `dist/` contiendra les fichiers statiques à servir.

## 🌐 Configuration Nginx

### 1. Configuration pour le backend (API)

Créer `/etc/nginx/sites-available/link-api` :

```nginx
server {
    listen 80;
    server_name api.votre-domaine.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Servir les fichiers uploadés
    location /uploads {
        alias /chemin/vers/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 2. Configuration pour le frontend

Créer `/etc/nginx/sites-available/link-frontend` :

```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;
    root /chemin/vers/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache pour les assets statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3. Activer les sites

```bash
sudo ln -s /etc/nginx/sites-available/link-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/link-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 Configuration SSL avec Let's Encrypt

```bash
# Installer Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtenir les certificats
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
sudo certbot --nginx -d api.votre-domaine.com

# Renouvellement automatique
sudo certbot renew --dry-run
```

## 🔄 Mises à jour

### Mettre à jour le code

```bash
# Pull les dernières modifications
git pull origin main

# Backend
cd backend
npm install --production
pm2 restart link-backend

# Frontend
cd ../frontend
npm install
npm run build
# Copier les nouveaux fichiers dans le dossier servi par Nginx
sudo cp -r dist/* /chemin/vers/frontend/dist/
```

## 📊 Monitoring

### PM2 Monitoring

```bash
# Voir les logs
pm2 logs link-backend

# Voir les statistiques
pm2 monit

# Redémarrer
pm2 restart link-backend
```

### Logs Nginx

```bash
# Logs d'accès
sudo tail -f /var/log/nginx/access.log

# Logs d'erreur
sudo tail -f /var/log/nginx/error.log
```

## 🔐 Sécurité

1. **Firewall** : Configurer UFW ou iptables
2. **Rate Limiting** : Ajouter rate limiting dans Nginx
3. **CORS** : Configurer correctement CORS dans le backend
4. **JWT Secret** : Utiliser un secret fort et unique
5. **Mots de passe DB** : Utiliser des mots de passe forts
6. **Backups** : Configurer des backups réguliers de la base de données

## 🐳 Alternative : Déploiement avec Docker

Un fichier `docker-compose.yml` peut être créé pour simplifier le déploiement :

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: link_marketplace
      POSTGRES_USER: link_user
      POSTGRES_PASSWORD: votre_mot_de_passe
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - DB_HOST=postgres
      - DB_NAME=link_marketplace
      - DB_USER=link_user
      - DB_PASSWORD=votre_mot_de_passe
    depends_on:
      - postgres
    volumes:
      - ./backend/uploads:/app/uploads

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

## 📝 Notes importantes

- Toujours tester en environnement de staging avant la production
- Configurer des backups automatiques de la base de données
- Monitorer les performances et les erreurs
- Mettre à jour régulièrement les dépendances pour la sécurité
