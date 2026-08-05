-- 1) Reviews: stop exposing reviewer user_id via the Data API
REVOKE SELECT ON public.reviews FROM anon, authenticated;
GRANT SELECT (id, hospital_id, rating, cleanliness, doctor_behavior, waiting_time, treatment_quality, comment, created_at)
  ON public.reviews TO anon, authenticated;

-- 2) SECURITY DEFINER functions should not be directly callable via the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

-- RLS policies reference has_role(); policy expressions are evaluated with the
-- privileges of the policy owner path, but to be safe keep it callable by the
-- internal roles only.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;