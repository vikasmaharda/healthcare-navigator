
DROP POLICY IF EXISTS "anyone can submit hospital" ON public.pending_hospitals;
CREATE POLICY "auth users submit hospital" ON public.pending_hospitals
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = submitted_by
    AND length(name) BETWEEN 2 AND 200
    AND length(city) BETWEEN 2 AND 100
  );

DROP POLICY IF EXISTS "anyone can send message" ON public.contact_messages;
CREATE POLICY "auth users send message" ON public.contact_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND length(message) BETWEEN 5 AND 5000
    AND length(name) BETWEEN 1 AND 100
  );
