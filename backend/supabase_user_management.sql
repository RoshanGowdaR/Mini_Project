-- Add is_banned column to users table to support the Ban/Unban feature
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
