-- Migration pour ajouter la fonctionnalité de repartage (repost)

-- Ajouter une colonne pour référencer le produit original (NULL = produit original, UUID = produit republié)
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_product_id UUID REFERENCES products(id) ON DELETE CASCADE;

-- Supprimer l'ancienne table si elle existe et la recréer avec la bonne structure
DROP TABLE IF EXISTS product_reposts CASCADE;

-- Table pour tracker qui a republié quoi (optionnel, pour statistiques)
CREATE TABLE product_reposts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    reposted_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reposted_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reposted_product_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_products_original ON products(original_product_id);
CREATE INDEX IF NOT EXISTS idx_product_reposts_original ON product_reposts(original_product_id);
CREATE INDEX IF NOT EXISTS idx_product_reposts_user ON product_reposts(reposted_by_user_id);
CREATE INDEX IF NOT EXISTS idx_product_reposts_reposted ON product_reposts(reposted_product_id);
