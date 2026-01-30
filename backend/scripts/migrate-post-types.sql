-- Migration: Ajouter les types de posts (produit, annonce, besoin)
-- Date: 2026-01-26

-- Ajouter la colonne post_type si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'post_type'
    ) THEN
        ALTER TABLE products 
        ADD COLUMN post_type VARCHAR(20) DEFAULT 'product' 
        CHECK (post_type IN ('product', 'announcement', 'need'));
    END IF;
END $$;

-- Ajouter la colonne is_urgent pour les besoins urgents
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'is_urgent'
    ) THEN
        ALTER TABLE products 
        ADD COLUMN is_urgent BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Ajouter la colonne category pour les besoins
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE products 
        ADD COLUMN category VARCHAR(50);
    END IF;
END $$;

-- Rendre le prix optionnel (peut être NULL pour annonces et besoins)
ALTER TABLE products ALTER COLUMN price DROP NOT NULL;

-- Mettre à jour les produits existants
UPDATE products SET post_type = 'product' WHERE post_type IS NULL;
UPDATE products SET is_urgent = FALSE WHERE is_urgent IS NULL;
