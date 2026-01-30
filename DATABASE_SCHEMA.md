# 🗄️ Structure de la Base de Données - Link Marketplace

Documentation complète de la structure de la base de données PostgreSQL pour Link.

## 📋 Vue d'Ensemble

La base de données utilise **PostgreSQL** avec :
- **7 tables principales**
- **11 index** pour optimiser les performances
- **3 fonctions** PostgreSQL
- **6 triggers** pour l'automatisation
- **UUID** comme identifiants primaires

## 📊 Schéma Entité-Relation

```
┌─────────────┐
│   users     │
│─────────────│
│ id (PK)     │
│ email       │
│ password    │
│ user_type   │
│ location    │
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼──────────┐      ┌──────────────┐
│    products     │      │ product_     │
│─────────────────│      │   images     │
│ id (PK)         │◄─────┤──────────────│
│ seller_id (FK)  │ 1:N  │ product_id   │
│ name            │      │ image_url    │
│ location        │      └──────────────┘
└──────┬──────────┘
       │
       │ 1:N
       │
┌──────▼──────────┐      ┌──────────────┐      ┌──────────────┐
│ product_views   │      │ product_     │      │  comments    │
│─────────────────│      │ interests    │      │──────────────│
│ product_id (FK) │      │──────────────│      │ product_id   │
│ user_id (FK)    │      │ product_id   │      │ user_id (FK) │
│ ip_address      │      │ user_id (FK) │      │ content      │
└─────────────────┘      └──────────────┘      └──────┬───────┘
                                                        │
                                                        │ 1:N
                                                        │
                                                ┌───────▼────────┐
                                                │ notifications │
                                                │───────────────│
                                                │ user_id (FK)  │
                                                │ message       │
                                                └───────────────┘
```

## 📑 Tables Détaillées

### 1. `users` - Utilisateurs

Stocke les informations des vendeurs et acheteurs.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Identifiant unique |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Email de l'utilisateur |
| `password_hash` | VARCHAR(255) | NOT NULL | Mot de passe hashé (bcrypt) |
| `first_name` | VARCHAR(100) | NOT NULL | Prénom |
| `last_name` | VARCHAR(100) | NOT NULL | Nom |
| `user_type` | VARCHAR(20) | NOT NULL, CHECK | 'seller' ou 'buyer' |
| `account_type` | VARCHAR(20) | CHECK | 'business' ou 'individual' (vendeurs) |
| `country` | VARCHAR(100) | | Pays |
| `city` | VARCHAR(100) | | Ville |
| `neighborhood` | VARCHAR(100) | | Quartier |
| `whatsapp_number` | VARCHAR(20) | | Numéro WhatsApp |
| `gender` | VARCHAR(20) | | Sexe (optionnel) |
| `age` | INTEGER | | Âge (optionnel) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Date de mise à jour |

**Index :**
- `idx_users_user_type` sur `user_type`
- `idx_users_location` sur `(country, city, neighborhood)`

---

### 2. `products` - Produits

Stocke les produits publiés par les vendeurs.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Identifiant unique |
| `seller_id` | UUID | FOREIGN KEY → users(id) | Vendeur propriétaire |
| `name` | VARCHAR(255) | NOT NULL | Nom du produit |
| `description` | TEXT | | Description détaillée |
| `country` | VARCHAR(100) | NOT NULL | Pays |
| `city` | VARCHAR(100) | NOT NULL | Ville |
| `neighborhood` | VARCHAR(100) | NOT NULL | Quartier |
| `whatsapp_number` | VARCHAR(20) | NOT NULL | Contact WhatsApp |
| `views_count` | INTEGER | DEFAULT 0 | Nombre de vues |
| `interested_count` | INTEGER | DEFAULT 0 | Nombre d'intéressés |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Date de publication |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Date de mise à jour |

**Index :**
- `idx_products_seller` sur `seller_id`
- `idx_products_location` sur `(country, city, neighborhood)`
- `idx_products_created` sur `created_at DESC`

**Relations :**
- `seller_id` → `users.id` (CASCADE DELETE)

---

### 3. `product_images` - Images des Produits

Stocke les images associées aux produits.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Identifiant unique |
| `product_id` | UUID | FOREIGN KEY → products(id) | Produit associé |
| `image_url` | VARCHAR(500) | NOT NULL | URL/chemin de l'image |
| `image_order` | INTEGER | DEFAULT 0 | Ordre d'affichage |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Date d'ajout |

**Index :**
- `idx_product_images_product` sur `product_id`

**Relations :**
- `product_id` → `products.id` (CASCADE DELETE)

---

### 4. `product_views` - Suivi des Vues

Enregistre chaque vue d'un produit (par utilisateur ou IP).

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Identifiant unique |
| `product_id` | UUID | FOREIGN KEY → products(id) | Produit visualisé |
| `user_id` | UUID | FOREIGN KEY → users(id) | Utilisateur (NULL si anonyme) |
| `ip_address` | VARCHAR(45) | | Adresse IP (pour anonymes) |
| `viewed_at` | TIMESTAMP | DEFAULT NOW() | Date de la vue |

**Contraintes :**
- `UNIQUE(product_id, user_id, ip_address)` - Évite les doublons

**Index :**
- `idx_product_views_product` sur `product_id`

**Relations :**
- `product_id` → `products.id` (CASCADE DELETE)
- `user_id` → `users.id` (SET NULL on DELETE)

**Trigger :**
- Met à jour automatiquement `products.views_count`

---

### 5. `product_interests` - Intérêts des Utilisateurs

Enregistre les utilisateurs intéressés par un produit.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Identifiant unique |
| `product_id` | UUID | FOREIGN KEY → products(id) | Produit |
| `user_id` | UUID | FOREIGN KEY → users(id) | Utilisateur intéressé |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Date d'intérêt |

**Contraintes :**
- `UNIQUE(product_id, user_id)` - Un utilisateur ne peut être intéressé qu'une fois

**Index :**
- `idx_product_interests_product` sur `product_id`

**Relations :**
- `product_id` → `products.id` (CASCADE DELETE)
- `user_id` → `users.id` (CASCADE DELETE)

**Trigger :**
- Met à jour automatiquement `products.interested_count`

---

### 6. `comments` - Commentaires

Stocke les commentaires sur les produits.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Identifiant unique |
| `product_id` | UUID | FOREIGN KEY → products(id) | Produit commenté |
| `user_id` | UUID | FOREIGN KEY → users(id) | Auteur du commentaire |
| `content` | TEXT | NOT NULL | Contenu du commentaire |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Date de modification |

**Index :**
- `idx_comments_product` sur `product_id`
- `idx_comments_user` sur `user_id`

**Relations :**
- `product_id` → `products.id` (CASCADE DELETE)
- `user_id` → `users.id` (CASCADE DELETE)

**Trigger :**
- Met à jour automatiquement `updated_at`

---

### 7. `notifications` - Notifications

Stocke les notifications pour les utilisateurs.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Identifiant unique |
| `user_id` | UUID | FOREIGN KEY → users(id) | Utilisateur destinataire |
| `type` | VARCHAR(50) | NOT NULL | Type de notification |
| `message` | TEXT | NOT NULL | Message de la notification |
| `related_id` | UUID | | ID de l'entité liée (produit, commentaire, etc.) |
| `is_read` | BOOLEAN | DEFAULT FALSE | Statut de lecture |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Date de création |

**Index :**
- `idx_notifications_user` sur `(user_id, is_read)`

**Relations :**
- `user_id` → `users.id` (CASCADE DELETE)

---

## ⚙️ Fonctions PostgreSQL

### 1. `update_updated_at_column()`

Met à jour automatiquement le champ `updated_at` lors des modifications.

**Utilisée par :**
- Trigger sur `users`
- Trigger sur `products`
- Trigger sur `comments`

---

### 2. `update_product_views_count()`

Recalcule le nombre de vues d'un produit après chaque nouvelle vue.

**Déclenché par :**
- INSERT sur `product_views`

---

### 3. `update_product_interests_count()`

Met à jour le compteur d'intéressés lors de l'ajout/suppression d'un intérêt.

**Déclenché par :**
- INSERT sur `product_interests`
- DELETE sur `product_interests`

---

## 🔄 Triggers

| Trigger | Table | Événement | Fonction |
|---------|-------|-----------|----------|
| `update_users_updated_at` | `users` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_products_updated_at` | `products` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_comments_updated_at` | `comments` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_views_count` | `product_views` | AFTER INSERT | `update_product_views_count()` |
| `update_interests_count_insert` | `product_interests` | AFTER INSERT | `update_product_interests_count()` |
| `update_interests_count_delete` | `product_interests` | AFTER DELETE | `update_product_interests_count()` |

---

## 🔑 Contraintes et Règles Métier

### Contraintes de Données

1. **Users :**
   - `user_type` doit être 'seller' ou 'buyer'
   - `account_type` doit être 'business' ou 'individual' (si défini)
   - `email` doit être unique

2. **Products :**
   - `seller_id` doit référencer un utilisateur de type 'seller'
   - Localisation (country, city, neighborhood) obligatoire

3. **Product Views :**
   - Un utilisateur/IP ne peut voir un produit qu'une fois (UNIQUE)
   - Soit `user_id` soit `ip_address` doit être défini

4. **Product Interests :**
   - Un utilisateur ne peut être intéressé qu'une fois par produit (UNIQUE)

---

## 📈 Optimisations

### Index Stratégiques

1. **Recherche géographique :**
   - Index composite sur `(country, city, neighborhood)` pour les produits et utilisateurs

2. **Requêtes fréquentes :**
   - Index sur `user_type` pour filtrer rapidement les vendeurs
   - Index sur `created_at DESC` pour le tri chronologique
   - Index sur les clés étrangères pour les JOINs

3. **Notifications :**
   - Index composite sur `(user_id, is_read)` pour les requêtes de notifications non lues

---

## 🚀 Initialisation

### Créer la Base de Données

```bash
# Option 1 : Script automatique
cd backend
node scripts/init-db.js

# Option 2 : Migration manuelle
npm run db:migrate
```

### Vérifier la Structure

```sql
-- Lister toutes les tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Vérifier les index
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public';

-- Vérifier les triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

---

## 🔧 Maintenance

### Sauvegardes

```bash
# Backup complet
pg_dump -U postgres link_marketplace > backup.sql

# Restauration
psql -U postgres link_marketplace < backup.sql
```

### Statistiques

```sql
-- Taille de la base de données
SELECT pg_size_pretty(pg_database_size('link_marketplace'));

-- Taille de chaque table
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 📝 Notes Importantes

1. **UUID vs INTEGER :** Utilisation d'UUID pour éviter les problèmes de synchronisation et améliorer la sécurité.

2. **CASCADE DELETE :** Les produits sont supprimés avec leur vendeur, mais les vues anonymes sont conservées (SET NULL).

3. **Compteurs automatiques :** Les compteurs de vues et d'intéressés sont mis à jour automatiquement via des triggers.

4. **Performance :** Les index sont optimisés pour les requêtes de recherche géographique et de fil d'actualité.

---

**Dernière mise à jour :** Janvier 2026
