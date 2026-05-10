-- Create the product-images storage bucket for artisan product uploads
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,  -- 5MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Allow public read access to product images
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Allow owners to delete their own images
CREATE POLICY "Allow owner deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- Also allow service_role to manage (for backend uploads)
-- The backend uses the service_role key, which bypasses RLS by default.
-- So the above policies are mainly for direct client uploads.
