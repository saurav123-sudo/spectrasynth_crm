-- =====================================================
-- Migration: Add Company Price Mapping Columns
-- Table: inquiry_products
-- Date: 2025-12-30
-- Description: Adds 5 columns for storing selected company price information
-- =====================================================

-- USE YOUR_DATABASE_NAME;  -- Uncomment and set your database name

-- =====================================================
-- STEP 1: Check existing columns (OPTIONAL - for verification before running)
-- =====================================================
-- Run this first to see current structure
-- SHOW COLUMNS FROM inquiry_products;


-- =====================================================
-- STEP 2: Add the 5 company price mapping columns
-- =====================================================

-- Column 1: Selected Company Name
ALTER TABLE inquiry_products 
ADD COLUMN selected_company VARCHAR(255) NULL 
COMMENT 'Selected company for this product';

-- Column 2: Selected Company Price
ALTER TABLE inquiry_products 
ADD COLUMN selected_company_price FLOAT NULL 
COMMENT 'Price from selected company';

-- Column 3: Selected Price Quantity Tier
ALTER TABLE inquiry_products 
ADD COLUMN selected_price_quantity INT NULL 
COMMENT 'Quantity tier for selected price';

-- Column 4: Selected Price Unit (with ENUM including mt)
ALTER TABLE inquiry_products 
ADD COLUMN selected_price_unit ENUM('mg', 'gm', 'ml', 'kg', 'mt', 'ltr') NULL 
COMMENT 'Unit for selected price';

-- Column 5: Price Source
ALTER TABLE inquiry_products 
ADD COLUMN price_source VARCHAR(255) NULL 
COMMENT 'Source of price (company_name or po_price)';


-- =====================================================
-- STEP 3: Verify columns were added (OPTIONAL - for verification after running)
-- =====================================================
-- Run this to verify all columns were added successfully
-- SELECT 
--     COLUMN_NAME, 
--     COLUMN_TYPE, 
--     IS_NULLABLE, 
--     COLUMN_DEFAULT, 
--     COLUMN_COMMENT 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'inquiry_products' 
--   AND COLUMN_NAME IN (
--       'selected_company', 
--       'selected_company_price', 
--       'selected_price_quantity', 
--       'selected_price_unit', 
--       'price_source'
--   );


-- =====================================================
-- STEP 4: Check table structure (OPTIONAL)
-- =====================================================
-- DESCRIBE inquiry_products;


-- =====================================================
-- ROLLBACK (Only if needed - removes the columns)
-- =====================================================
-- ⚠️ WARNING: Only run these if you need to rollback the migration!
-- ⚠️ This will DELETE all data in these columns!

-- ALTER TABLE inquiry_products DROP COLUMN selected_company;
-- ALTER TABLE inquiry_products DROP COLUMN selected_company_price;
-- ALTER TABLE inquiry_products DROP COLUMN selected_price_quantity;
-- ALTER TABLE inquiry_products DROP COLUMN selected_price_unit;
-- ALTER TABLE inquiry_products DROP COLUMN price_source;


-- =====================================================
-- NOTES:
-- =====================================================
-- 1. All columns are NULL-able (optional fields)
-- 2. selected_price_unit uses ENUM to restrict values
-- 3. These columns store the company price selection made during inquiry creation
-- 4. Only the /dashboard/Inquiry/new-email-inquiry page uses these fields
-- 5. Regular inquiry creation does NOT use these columns
-- =====================================================


