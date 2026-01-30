-- Migration: Supprimer la contrainte UNIQUE sur product_interests
-- Date: 2026-01-25
-- Description: Permet à un utilisateur de cliquer plusieurs fois sur "intéressé" pour incrémenter le compteur

-- Supprimer la contrainte UNIQUE sur (product_id, user_id)
ALTER TABLE product_interests DROP CONSTRAINT IF EXISTS product_interests_product_id_user_id_key;

-- Vérification
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'product_interests'::regclass
AND contype = 'u';
