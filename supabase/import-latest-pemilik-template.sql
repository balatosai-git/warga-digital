-- Paste the JSON contents of supabase/latest_pemilik_dan_rumah.json
-- into the $json$...$json$ block below, then run in Supabase SQL Editor.

SELECT import_system_preregistered_residents(
  $json$
  {
    "metadata": {},
    "residents": []
  }
  $json$::jsonb,
  'a0000000-0000-7000-8000-000000000001'::uuid, -- default tenant
  'b0000000-0000-7000-8000-000000000002'::uuid  -- default community (RT03)
);
