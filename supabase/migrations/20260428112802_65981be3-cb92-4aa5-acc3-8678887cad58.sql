-- Ajout colonne image_url aux produits
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url text;

-- Bucket public pour les images de produits
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies storage (mono-utilisateur, accès public)
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_public_write" ON storage.objects;
CREATE POLICY "product_images_public_write" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_public_update" ON storage.objects;
CREATE POLICY "product_images_public_update" ON storage.objects
FOR UPDATE USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_public_delete" ON storage.objects;
CREATE POLICY "product_images_public_delete" ON storage.objects
FOR DELETE USING (bucket_id = 'product-images');