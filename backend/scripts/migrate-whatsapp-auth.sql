-- Migration: Rendre email optionnel et whatsapp_number obligatoire et unique
-- Date: 2026-01-25
-- Description: Change l'authentification pour utiliser WhatsApp au lieu de l'email

-- Étape 1: Supprimer la contrainte UNIQUE sur email
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- Étape 2: Rendre email nullable (optionnel)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Étape 3: Rendre whatsapp_number obligatoire (NOT NULL)
-- D'abord, mettre à jour les valeurs NULL existantes si nécessaire
UPDATE users SET whatsapp_number = '000000000' WHERE whatsapp_number IS NULL;

-- Maintenant, rendre la colonne NOT NULL
ALTER TABLE users ALTER COLUMN whatsapp_number SET NOT NULL;

-- Étape 4: Ajouter la contrainte UNIQUE sur whatsapp_number
ALTER TABLE users ADD CONSTRAINT users_whatsapp_number_key UNIQUE (whatsapp_number);

-- Étape 5: Créer un index sur whatsapp_number pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_users_whatsapp_number ON users(whatsapp_number);

-- Vérification
SELECT 
    column_name, 
    is_nullable, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('email', 'whatsapp_number')
ORDER BY column_name;
