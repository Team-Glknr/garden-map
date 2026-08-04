-- Signed-in users (gated client-side by the Google OAuth allowlist) can edit
-- plant data and manage plant photos.

-- Note: "authenticated update plants" (UPDATE) already exists on this table,
-- created outside of migrations (via dashboard). Its USING clause is
-- equivalent to `TO authenticated USING (true)`, so it's left as-is here.
CREATE POLICY "authenticated insert plants"
  ON plants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated delete plants"
  ON plants FOR DELETE TO authenticated USING (true);

CREATE POLICY "authenticated insert plant_media"
  ON plant_media FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated update plant_media"
  ON plant_media FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated delete plant_media"
  ON plant_media FOR DELETE TO authenticated USING (true);

CREATE POLICY "authenticated insert plant_common_names"
  ON plant_common_names FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated update plant_common_names"
  ON plant_common_names FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated delete plant_common_names"
  ON plant_common_names FOR DELETE TO authenticated USING (true);

-- Storage: let signed-in users upload/replace/delete plant photos.
-- Public read already works via the bucket's public URL route (bucket is public),
-- so no SELECT policy is needed here.
CREATE POLICY "authenticated insert plant-photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'plant-photos');
CREATE POLICY "authenticated update plant-photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'plant-photos') WITH CHECK (bucket_id = 'plant-photos');
CREATE POLICY "authenticated delete plant-photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'plant-photos');
