-- Migration: Add products_sold column to users table
-- This field stores keywords for products the seller sells (comma-separated)

ALTER TABLE users ADD COLUMN IF NOT EXISTS products_sold TEXT;
