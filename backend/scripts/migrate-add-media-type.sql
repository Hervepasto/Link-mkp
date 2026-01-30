-- Migration: Ajouter le type de média (image/video) dans product_images
-- Date: 2026-01-25

-- Ajouter la colonne media_type si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_images' 
        AND column_name = 'media_type'
    ) THEN
        ALTER TABLE product_images 
        ADD COLUMN media_type VARCHAR(10) DEFAULT 'image' CHECK (media_type IN ('image', 'video'));
        
        -- Mettre à jour les enregistrements existants
        UPDATE product_images SET media_type = 'image' WHERE media_type IS NULL;
    END IF;
END $$;
