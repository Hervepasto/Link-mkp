-- Migration: Remettre la contrainte UNIQUE sur product_interests
-- Date: 2026-01-25
-- Description: Un utilisateur ne peut cliquer qu'une seule fois par produit

-- Ajouter la contrainte UNIQUE sur (product_id, user_id)
ALTER TABLE product_interests ADD CONSTRAINT product_interests_product_id_user_id_key 
UNIQUE (product_id, user_id);

-- Vérification
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'product_interests'::regclass
AND contype = 'u';
