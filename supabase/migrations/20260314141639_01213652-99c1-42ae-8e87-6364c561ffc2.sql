
-- Allow teachers to upload files to presentation-slides bucket
CREATE POLICY "Teachers can upload to presentation-slides"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'presentation-slides'
  AND public.has_role(auth.uid(), 'teacher')
);

-- Allow teachers to update files in presentation-slides bucket
CREATE POLICY "Teachers can update presentation-slides"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'presentation-slides'
  AND public.has_role(auth.uid(), 'teacher')
)
WITH CHECK (
  bucket_id = 'presentation-slides'
  AND public.has_role(auth.uid(), 'teacher')
);

-- Allow teachers to delete files from presentation-slides bucket
CREATE POLICY "Teachers can delete from presentation-slides"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'presentation-slides'
  AND public.has_role(auth.uid(), 'teacher')
);

-- Allow anyone to read from presentation-slides (it's a public bucket)
CREATE POLICY "Public read access to presentation-slides"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'presentation-slides');
