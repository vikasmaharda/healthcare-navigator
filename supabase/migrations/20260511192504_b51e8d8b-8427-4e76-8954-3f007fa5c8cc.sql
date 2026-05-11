
-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  phone text,
  language text default 'en',
  emergency_contact text,
  blood_group text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles self read" on public.profiles for select using (auth.uid() = id);
create policy "profiles self upsert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.raw_user_meta_data->>'phone',''));
  return new;
end;$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- HOSPITALS
create table public.hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  address text,
  phone text,
  rating numeric(2,1) default 4.0,
  emergency_24x7 boolean default true,
  has_icu boolean default false,
  has_mri boolean default false,
  has_ambulance boolean default false,
  cost_tier text default 'medium', -- low/medium/high
  is_government boolean default false,
  ayushman boolean default false,
  lat numeric, lng numeric,
  image_url text,
  specialties text[] default '{}',
  created_at timestamptz default now()
);
alter table public.hospitals enable row level security;
create policy "hospitals public read" on public.hospitals for select using (true);

-- BEDS
create table public.beds (
  hospital_id uuid primary key references public.hospitals on delete cascade,
  icu_available int default 0,
  oxygen_available int default 0,
  emergency_available int default 0,
  general_available int default 0,
  updated_at timestamptz default now()
);
alter table public.beds enable row level security;
create policy "beds public read" on public.beds for select using (true);

-- DOCTORS
create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid references public.hospitals on delete cascade,
  name text not null,
  specialization text not null,
  experience_years int default 5,
  rating numeric(2,1) default 4.5,
  consultation_fee int default 500,
  available_days text[] default '{Mon,Tue,Wed,Thu,Fri}',
  timing text default '10:00 AM - 5:00 PM',
  avg_wait_min int default 20,
  avatar_url text
);
alter table public.doctors enable row level security;
create policy "doctors public read" on public.doctors for select using (true);

-- APPOINTMENTS
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  doctor_id uuid not null references public.doctors on delete cascade,
  hospital_id uuid references public.hospitals on delete set null,
  appointment_date date not null,
  appointment_time text not null,
  patient_name text not null,
  notes text,
  status text default 'confirmed',
  created_at timestamptz default now()
);
alter table public.appointments enable row level security;
create policy "appt own select" on public.appointments for select using (auth.uid() = user_id);
create policy "appt own insert" on public.appointments for insert with check (auth.uid() = user_id);
create policy "appt own update" on public.appointments for update using (auth.uid() = user_id);
create policy "appt own delete" on public.appointments for delete using (auth.uid() = user_id);

-- REVIEWS
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  hospital_id uuid not null references public.hospitals on delete cascade,
  rating int not null check (rating between 1 and 5),
  cleanliness int default 4,
  doctor_behavior int default 4,
  waiting_time int default 4,
  treatment_quality int default 4,
  comment text,
  created_at timestamptz default now()
);
alter table public.reviews enable row level security;
create policy "reviews public read" on public.reviews for select using (true);
create policy "reviews own insert" on public.reviews for insert with check (auth.uid() = user_id);
create policy "reviews own delete" on public.reviews for delete using (auth.uid() = user_id);

-- BLOOD BANKS
create table public.blood_banks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  phone text,
  address text,
  available_groups text[] default '{}'
);
alter table public.blood_banks enable row level security;
create policy "blood banks public read" on public.blood_banks for select using (true);

-- BLOOD DONORS
create table public.blood_donors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  blood_group text not null,
  city text not null,
  phone text not null,
  available boolean default true,
  created_at timestamptz default now()
);
alter table public.blood_donors enable row level security;
create policy "donors public read" on public.blood_donors for select using (true);
create policy "donors own insert" on public.blood_donors for insert with check (auth.uid() = user_id);
create policy "donors own update" on public.blood_donors for update using (auth.uid() = user_id);
create policy "donors own delete" on public.blood_donors for delete using (auth.uid() = user_id);

-- PHARMACIES
create table public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  phone text,
  address text,
  open_24x7 boolean default false,
  home_delivery boolean default false,
  medicines text[] default '{}'
);
alter table public.pharmacies enable row level security;
create policy "pharmacies public read" on public.pharmacies for select using (true);

-- SCHEMES
create table public.schemes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  eligibility text,
  benefits text,
  link text
);
alter table public.schemes enable row level security;
create policy "schemes public read" on public.schemes for select using (true);

-- SOS / EMERGENCY CONTACTS (global directory)
create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  number text not null,
  category text not null -- ambulance/police/fire/women/child/poison
);
alter table public.emergency_contacts enable row level security;
create policy "emergency public read" on public.emergency_contacts for select using (true);

-- USER HEALTH RECORDS (metadata only)
create table public.health_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  record_type text default 'prescription',
  notes text,
  file_url text,
  created_at timestamptz default now()
);
alter table public.health_records enable row level security;
create policy "records own select" on public.health_records for select using (auth.uid() = user_id);
create policy "records own insert" on public.health_records for insert with check (auth.uid() = user_id);
create policy "records own update" on public.health_records for update using (auth.uid() = user_id);
create policy "records own delete" on public.health_records for delete using (auth.uid() = user_id);
