
-- 1. Roles infrastructure
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins read all roles" ON public.user_roles;
CREATE POLICY "admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed admin role for the configured admin email if that user exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE lower(email) = 'mediroutehealth@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  head_doctor text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments public read" ON public.departments;
CREATE POLICY "departments public read" ON public.departments FOR SELECT USING (true);

DROP POLICY IF EXISTS "admins manage departments" ON public.departments;
CREATE POLICY "admins manage departments" ON public.departments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Facilities
CREATE TABLE IF NOT EXISTS public.facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text DEFAULT 'general',
  available boolean DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facilities public read" ON public.facilities;
CREATE POLICY "facilities public read" ON public.facilities FOR SELECT USING (true);

DROP POLICY IF EXISTS "admins manage facilities" ON public.facilities;
CREATE POLICY "admins manage facilities" ON public.facilities
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Admin CRUD on hospitals & doctors (existing tables had no INSERT/UPDATE/DELETE policies)
DROP POLICY IF EXISTS "admins manage hospitals" ON public.hospitals;
CREATE POLICY "admins manage hospitals" ON public.hospitals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins manage doctors" ON public.doctors;
CREATE POLICY "admins manage doctors" ON public.doctors
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin visibility into pending submissions and contact messages
DROP POLICY IF EXISTS "admins read pending" ON public.pending_hospitals;
CREATE POLICY "admins read pending" ON public.pending_hospitals
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins update pending" ON public.pending_hospitals;
CREATE POLICY "admins update pending" ON public.pending_hospitals
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins read messages" ON public.contact_messages;
CREATE POLICY "admins read messages" ON public.contact_messages
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins update messages" ON public.contact_messages;
CREATE POLICY "admins update messages" ON public.contact_messages
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. Storage bucket for hospital images (public read, admin write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('hospital-images', 'hospital-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "hospital-images public read" ON storage.objects;
CREATE POLICY "hospital-images public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'hospital-images');

DROP POLICY IF EXISTS "hospital-images admin write" ON storage.objects;
CREATE POLICY "hospital-images admin write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hospital-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "hospital-images admin update" ON storage.objects;
CREATE POLICY "hospital-images admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'hospital-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "hospital-images admin delete" ON storage.objects;
CREATE POLICY "hospital-images admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'hospital-images' AND public.has_role(auth.uid(), 'admin'));
