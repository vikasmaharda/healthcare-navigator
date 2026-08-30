CREATE OR REPLACE FUNCTION public.calculate_age(_dob date)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN _dob IS NULL THEN NULL ELSE date_part('year', age(current_date, _dob))::int END
$$;