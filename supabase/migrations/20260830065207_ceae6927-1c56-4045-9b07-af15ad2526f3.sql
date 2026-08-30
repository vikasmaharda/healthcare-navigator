-- ============ helpers ============
CREATE OR REPLACE FUNCTION public.calculate_age(_dob date)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN _dob IS NULL THEN NULL ELSE date_part('year', age(current_date, _dob))::int END
$$;
REVOKE EXECUTE ON FUNCTION public.calculate_age(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_age(date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ hospitals: richer, scalable columns ============
ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS pincode text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS maps_link text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS emergency_phone text,
  ADD COLUMN IF NOT EXISTS has_blood_bank boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_pharmacy boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_lab boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS hospitals_touch ON public.hospitals;
CREATE TRIGGER hospitals_touch BEFORE UPDATE ON public.hospitals
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS doctors_touch ON public.doctors;
CREATE TRIGGER doctors_touch BEFORE UPDATE ON public.doctors
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS departments_touch ON public.departments;
CREATE TRIGGER departments_touch BEFORE UPDATE ON public.departments
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS facilities_touch ON public.facilities;
CREATE TRIGGER facilities_touch BEFORE UPDATE ON public.facilities
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS beds_touch ON public.beds;
CREATE TRIGGER beds_touch BEFORE UPDATE ON public.beds
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.pending_hospitals
  ADD COLUMN IF NOT EXISTS manager_email text,
  ADD COLUMN IF NOT EXISTS claim_hospital_id uuid REFERENCES public.hospitals(id) ON DELETE SET NULL;

-- ============ hospital administrators ============
CREATE TABLE IF NOT EXISTS public.hospital_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, hospital_id)
);
GRANT SELECT ON public.hospital_admins TO authenticated;
GRANT ALL ON public.hospital_admins TO service_role;
ALTER TABLE public.hospital_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hospital admin reads own link" ON public.hospital_admins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR lower(email) = lower(coalesce(auth.jwt() ->> 'email','')));
CREATE POLICY "super admin manages hospital admins" ON public.hospital_admins
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS hospital_admins_touch ON public.hospital_admins;
CREATE TRIGGER hospital_admins_touch BEFORE UPDATE ON public.hospital_admins
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.is_hospital_admin(_user_id uuid, _hospital_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hospital_admins ha
    JOIN auth.users u ON u.id = _user_id
    WHERE ha.hospital_id = _hospital_id
      AND ha.approved
      AND (ha.user_id = _user_id OR lower(ha.email) = lower(u.email))
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_hospital_admin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_hospital_admin(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.my_hospital_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ha.hospital_id FROM public.hospital_admins ha
  JOIN auth.users u ON u.id = auth.uid()
  WHERE ha.approved AND (ha.user_id = auth.uid() OR lower(ha.email) = lower(u.email))
  ORDER BY ha.created_at LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.my_hospital_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_hospital_id() TO authenticated, service_role;

-- hospital-admin write access, scoped to their own hospital
CREATE POLICY "hospital admin updates own hospital" ON public.hospitals
  FOR UPDATE TO authenticated
  USING (public.is_hospital_admin(auth.uid(), id))
  WITH CHECK (public.is_hospital_admin(auth.uid(), id));

CREATE POLICY "hospital admin manages own doctors" ON public.doctors
  FOR ALL TO authenticated
  USING (hospital_id IS NOT NULL AND public.is_hospital_admin(auth.uid(), hospital_id))
  WITH CHECK (hospital_id IS NOT NULL AND public.is_hospital_admin(auth.uid(), hospital_id));

CREATE POLICY "hospital admin manages own departments" ON public.departments
  FOR ALL TO authenticated
  USING (hospital_id IS NOT NULL AND public.is_hospital_admin(auth.uid(), hospital_id))
  WITH CHECK (hospital_id IS NOT NULL AND public.is_hospital_admin(auth.uid(), hospital_id));

CREATE POLICY "hospital admin manages own facilities" ON public.facilities
  FOR ALL TO authenticated
  USING (hospital_id IS NOT NULL AND public.is_hospital_admin(auth.uid(), hospital_id))
  WITH CHECK (hospital_id IS NOT NULL AND public.is_hospital_admin(auth.uid(), hospital_id));

GRANT INSERT, UPDATE, DELETE ON public.beds TO authenticated;
CREATE POLICY "hospital admin manages own beds" ON public.beds
  FOR ALL TO authenticated
  USING (public.is_hospital_admin(auth.uid(), hospital_id))
  WITH CHECK (public.is_hospital_admin(auth.uid(), hospital_id));
CREATE POLICY "super admin manages beds" ON public.beds
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ update history ============
CREATE TABLE IF NOT EXISTS public.hospital_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  entity text NOT NULL,
  summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hospital_updates TO anon, authenticated;
GRANT INSERT ON public.hospital_updates TO authenticated;
GRANT ALL ON public.hospital_updates TO service_role;
ALTER TABLE public.hospital_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "updates public read" ON public.hospital_updates FOR SELECT USING (true);
CREATE POLICY "hospital admin logs own updates" ON public.hospital_updates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hospital_admin(auth.uid(), hospital_id) OR public.has_role(auth.uid(), 'admin'));

-- ============ personal emergency contacts ============
CREATE TABLE IF NOT EXISTS public.user_emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  relationship text,
  custom_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_emergency_contacts TO authenticated;
GRANT ALL ON public.user_emergency_contacts TO service_role;
ALTER TABLE public.user_emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own emergency contacts" ON public.user_emergency_contacts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS uec_touch ON public.user_emergency_contacts;
CREATE TRIGGER uec_touch BEFORE UPDATE ON public.user_emergency_contacts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ user settings ============
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'en',
  emergency_message text NOT NULL DEFAULT 'Emergency! I may need immediate assistance. Please contact me and check my location.',
  share_location boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.user_settings
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS user_settings_touch ON public.user_settings;
CREATE TRIGGER user_settings_touch BEFORE UPDATE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ activity history ============
CREATE TABLE IF NOT EXISTS public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  title text NOT NULL,
  detail text,
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_activity_user_time ON public.user_activity (user_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.user_activity TO authenticated;
GRANT ALL ON public.user_activity TO service_role;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activity" ON public.user_activity
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT ALL ON public.ai_conversations TO service_role;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conversations" ON public.ai_conversations
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS ai_conv_touch ON public.ai_conversations;
CREATE TRIGGER ai_conv_touch BEFORE UPDATE ON public.ai_conversations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_messages_conv ON public.ai_messages (conversation_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai messages" ON public.ai_messages
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ emergency alerts log ============
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  location_url text,
  channels text[] NOT NULL DEFAULT '{}',
  recipients_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.emergency_alerts TO authenticated;
GRANT ALL ON public.emergency_alerts TO service_role;
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own alerts" ON public.emergency_alerts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);