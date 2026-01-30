# 🗄️ Scripts de Base de Données

Ce dossier contient les scripts pour initialiser et gérer la base de données PostgreSQL.

## 📁 Fichiers

- **`schema.sql`** : Schéma complet de la base de données (tables, index, triggers, fonctions)
- **`migrate.js`** : Script de migration qui exécute le schéma SQL
- **`init-db.js`** : Script d'initialisation complète (crée la DB + exécute le schéma)

## 🚀 Utilisation

### Option 1 : Initialisation Complète (Recommandé)

Crée automatiquement la base de données et exécute le schéma :

```bash
cd backend
npm run db:init
```

**Ce script :**
1. ✅ Se connecte à PostgreSQL
2. ✅ Crée la base de données `link_marketplace` si elle n'existe pas
3. ✅ Exécute le schéma complet
4. ✅ Affiche un résumé des tables, index et fonctions créés

### Option 2 : Migration Simple

Exécute uniquement le schéma SQL (la base de données doit déjà exister) :

```bash
cd backend
npm run db:migrate
```

**Ce script :**
1. ✅ Lit le fichier `schema.sql`
2. ✅ Exécute toutes les commandes SQL
3. ✅ Gère les erreurs "already exists" gracieusement

## ⚙️ Configuration Requise

Assurez-vous que le fichier `backend/.env` contient :

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=link_marketplace
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe
```

## 📊 Structure Créée

Après l'exécution, vous aurez :

- **7 tables** :
  - `users` - Utilisateurs
  - `products` - Produits
  - `product_images` - Images
  - `product_views` - Vues
  - `product_interests` - Intérêts
  - `comments` - Commentaires
  - `notifications` - Notifications

- **11 index** pour optimiser les performances

- **3 fonctions PostgreSQL** :
  - `update_updated_at_column()`
  - `update_product_views_count()`
  - `update_product_interests_count()`

- **6 triggers** pour l'automatisation

## 🔍 Vérification

Pour vérifier que tout est bien créé :

```sql
-- Se connecter à PostgreSQL
psql -U postgres -d link_marketplace

-- Lister les tables
\dt

-- Voir la structure d'une table
\d users
\d products

-- Vérifier les index
\di

-- Vérifier les fonctions
\df
```

## 🐛 Résolution de Problèmes

### Erreur : "database does not exist"

Utilisez `npm run db:init` au lieu de `npm run db:migrate` pour créer automatiquement la base.

### Erreur : "relation already exists"

C'est normal si vous exécutez le script plusieurs fois. Les commandes `CREATE IF NOT EXISTS` évitent les erreurs.

### Erreur de connexion

Vérifiez :
1. PostgreSQL est démarré
2. Les identifiants dans `.env` sont corrects
3. L'utilisateur a les permissions nécessaires

## 📝 Notes

- Les scripts utilisent `CREATE IF NOT EXISTS` pour être idempotents
- Les erreurs "already exists" sont ignorées gracieusement
- Le schéma peut être exécuté plusieurs fois sans problème
