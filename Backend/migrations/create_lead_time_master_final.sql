-- =====================================================
-- Lead Time Master Table - Complete Creation Script
-- =====================================================
-- Purpose: Create lead_time_master table from scratch with all 15 week values
-- Date: 2024-12-30
-- =====================================================

-- Drop table if exists (use with caution in production)
DROP TABLE IF EXISTS lead_time_master;

-- Create lead_time_master table
CREATE TABLE lead_time_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_time VARCHAR(100) NOT NULL UNIQUE COMMENT 'Lead time text (e.g., 1 week, 2-3 week, 8 week)',
  created_by VARCHAR(255) NULL COMMENT 'User who created this entry',
  updated_by VARCHAR(255) NULL COMMENT 'User who last updated this entry',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_lead_time (lead_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert all 15 lead time values
INSERT INTO lead_time_master (lead_time, created_by) VALUES
('1 week', 'System'),
('1-2 week', 'System'),
('2 week', 'System'),
('2-3 week', 'System'),
('3 week', 'System'),
('3-4 week', 'System'),
('4 week', 'System'),
('4-5 week', 'System'),
('5 week', 'System'),
('5-6 week', 'System'),
('6 week', 'System'),
('6-7 week', 'System'),
('7 week', 'System'),
('7-8 week', 'System'),
('8 week', 'System');

-- =====================================================
-- Verification Query
-- =====================================================
SELECT 
  COUNT(*) as total_records
FROM lead_time_master;

-- View all lead time options
SELECT 
  id,
  lead_time,
  created_by,
  createdAt
FROM lead_time_master
ORDER BY lead_time;

