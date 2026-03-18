-- =====================================================
-- Add Stock Column to Products Table
-- =====================================================
-- Purpose: Add nullable 'stock' VARCHAR column to products table
-- Date: 2024-12-30
-- =====================================================

-- Step 1: Add stock column (nullable VARCHAR)
ALTER TABLE products 
  ADD COLUMN stock VARCHAR(255) NULL 
  COMMENT 'Stock information for the product' 
  AFTER product_code;

-- =====================================================
-- Verification Query
-- =====================================================
-- Check if column was added successfully
DESCRIBE products;

-- View sample data with stock column
SELECT 
  id,
  product_name,
  cas_number,
  product_code,
  stock,
  status,
  createdAt
FROM products
LIMIT 5;

