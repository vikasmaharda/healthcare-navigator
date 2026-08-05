DROP POLICY IF EXISTS "donors public read" ON public.blood_donors;

CREATE POLICY "donors readable by signed-in users"
  ON public.blood_donors FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.blood_donors FROM anon;