DROP POLICY IF EXISTS "donors readable by signed-in users" ON public.blood_donors;

CREATE POLICY "donors own read"
  ON public.blood_donors FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.search_blood_donors(_blood_group text, _city text DEFAULT NULL)
RETURNS TABLE (id uuid, name text, blood_group text, city text, phone text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF _blood_group IS NULL OR btrim(_blood_group) = '' THEN
    RAISE EXCEPTION 'A blood group is required to search donors';
  END IF;

  RETURN QUERY
  SELECT d.id, d.name, d.blood_group, d.city, d.phone
  FROM public.blood_donors d
  WHERE d.available = true
    AND d.blood_group = btrim(_blood_group)
    AND (_city IS NULL OR btrim(_city) = '' OR d.city ILIKE '%' || btrim(_city) || '%')
  ORDER BY d.created_at DESC
  LIMIT 50;
END;
$$;

REVOKE ALL ON FUNCTION public.search_blood_donors(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_blood_donors(text, text) TO authenticated;