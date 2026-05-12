
-- 1) Pending hospital submissions (public can insert; only admin reads/updates via service role)
CREATE TABLE IF NOT EXISTS public.pending_hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID,
  submitter_email TEXT,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  specialties TEXT[] DEFAULT '{}',
  emergency_24x7 BOOLEAN DEFAULT false,
  has_icu BOOLEAN DEFAULT false,
  has_mri BOOLEAN DEFAULT false,
  has_ambulance BOOLEAN DEFAULT false,
  is_government BOOLEAN DEFAULT false,
  ayushman BOOLEAN DEFAULT false,
  lat NUMERIC,
  lng NUMERIC,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
ALTER TABLE public.pending_hospitals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can submit hospital" ON public.pending_hospitals;
CREATE POLICY "anyone can submit hospital" ON public.pending_hospitals
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "submitter can read own" ON public.pending_hospitals;
CREATE POLICY "submitter can read own" ON public.pending_hospitals
  FOR SELECT TO public USING (auth.uid() = submitted_by);

-- 2) Contact / help messages
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT DEFAULT 'general', -- general | help | bug | feature | other
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved BOOLEAN DEFAULT false
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can send message" ON public.contact_messages;
CREATE POLICY "anyone can send message" ON public.contact_messages
  FOR INSERT TO public WITH CHECK (true);

-- 3) Add lat/lng to existing hospitals (already exist) - no-op if already present
-- 4) Seed top hospitals (AIIMS branches + leading private/govt across metros) - skip if name already exists
INSERT INTO public.hospitals (name, city, address, phone, rating, emergency_24x7, has_icu, has_mri, has_ambulance, cost_tier, is_government, ayushman, lat, lng, specialties)
SELECT * FROM (VALUES
  -- AIIMS branches
  ('AIIMS Delhi','New Delhi','Ansari Nagar, New Delhi','011-26588500',4.8,true,true,true,true,'low',true,true,28.5672::numeric,77.2100::numeric,ARRAY['Cardiology','Neurology','Oncology','Orthopedics','Pediatrics','General Medicine']),
  ('AIIMS Bhopal','Bhopal','Saket Nagar, Bhopal','0755-2672000',4.5,true,true,true,true,'low',true,true,23.2090::numeric,77.4630::numeric,ARRAY['Cardiology','Neurology','Oncology','General Medicine']),
  ('AIIMS Bhubaneswar','Bhubaneswar','Sijua, Patrapada','0674-2476789',4.5,true,true,true,true,'low',true,true,20.1840::numeric,85.7780::numeric,ARRAY['Cardiology','Neurology','Pediatrics']),
  ('AIIMS Jodhpur','Jodhpur','Basni Industrial Area Phase-2','0291-2740741',4.5,true,true,true,true,'low',true,true,26.2470::numeric,73.0240::numeric,ARRAY['Cardiology','Orthopedics','General Medicine']),
  ('AIIMS Patna','Patna','Phulwari Sharif','0612-2451070',4.4,true,true,true,true,'low',true,true,25.5460::numeric,84.9930::numeric,ARRAY['Neurology','Pediatrics','Oncology']),
  ('AIIMS Raipur','Raipur','Tatibandh, GE Road','0771-2572000',4.4,true,true,true,true,'low',true,true,21.2480::numeric,81.6010::numeric,ARRAY['Cardiology','General Medicine']),
  ('AIIMS Rishikesh','Rishikesh','Virbhadra Marg','0135-2462928',4.6,true,true,true,true,'low',true,true,30.0860::numeric,78.2810::numeric,ARRAY['Cardiology','Neurology','Orthopedics']),
  ('AIIMS Nagpur','Nagpur','MIHAN','0712-2980011',4.4,true,true,true,true,'low',true,true,21.0840::numeric,79.0480::numeric,ARRAY['Cardiology','Pediatrics']),
  ('AIIMS Mangalagiri','Mangalagiri','Guntur, Andhra Pradesh','0863-2293111',4.3,true,true,true,true,'low',true,true,16.4310::numeric,80.5640::numeric,ARRAY['General Medicine','Pediatrics']),
  ('AIIMS Gorakhpur','Gorakhpur','Kunraghat','0551-2205650',4.3,true,true,true,true,'low',true,true,26.7370::numeric,83.3320::numeric,ARRAY['General Medicine','Orthopedics']),
  ('AIIMS Bibinagar','Hyderabad','Bibinagar, Yadadri','08685-220460',4.3,true,true,true,true,'low',true,true,17.5470::numeric,78.8190::numeric,ARRAY['General Medicine']),
  ('AIIMS Kalyani','Kalyani','NH-34 Connector','033-29651054',4.2,true,true,true,true,'low',true,true,22.9750::numeric,88.4340::numeric,ARRAY['General Medicine','Pediatrics']),
  ('AIIMS Deoghar','Deoghar','Devipur','06432-356000',4.2,true,true,true,true,'low',true,true,24.5610::numeric,86.6970::numeric,ARRAY['General Medicine']),
  ('AIIMS Bilaspur','Bilaspur (HP)','Kothipura','01978-228777',4.2,true,true,true,true,'low',true,true,31.4030::numeric,76.7700::numeric,ARRAY['General Medicine']),
  ('AIIMS Rajkot','Rajkot','Khanderi','0281-2980000',4.2,true,true,true,true,'low',true,true,22.2830::numeric,70.7720::numeric,ARRAY['General Medicine']),
  ('AIIMS Guwahati','Guwahati','Changsari','0361-7110234',4.3,true,true,true,true,'low',true,true,26.2840::numeric,91.6370::numeric,ARRAY['General Medicine','Pediatrics']),

  -- SMS + other top govt
  ('SMS Hospital Jaipur','Jaipur','J.L.N. Marg','0141-2518452',4.3,true,true,true,true,'low',true,true,26.9070::numeric,75.8050::numeric,ARRAY['Cardiology','Neurology','Oncology','Orthopedics']),
  ('Safdarjung Hospital','New Delhi','Ansari Nagar West','011-26165060',4.2,true,true,true,true,'low',true,true,28.5680::numeric,77.2050::numeric,ARRAY['General Medicine','Pediatrics','Orthopedics']),
  ('Lok Nayak Hospital','New Delhi','Jawaharlal Nehru Marg','011-23234242',4.0,true,true,false,true,'low',true,true,28.6390::numeric,77.2410::numeric,ARRAY['General Medicine','Pediatrics']),
  ('KEM Hospital Mumbai','Mumbai','Acharya Donde Marg, Parel','022-24107000',4.3,true,true,true,true,'low',true,true,18.9990::numeric,72.8410::numeric,ARRAY['Cardiology','Neurology','Oncology']),
  ('JJ Hospital Mumbai','Mumbai','Byculla','022-23735555',4.1,true,true,false,true,'low',true,true,18.9700::numeric,72.8330::numeric,ARRAY['General Medicine','Surgery']),
  ('Victoria Hospital','Bengaluru','Fort Road, K.R. Market','080-26703294',4.0,true,true,false,true,'low',true,true,12.9620::numeric,77.5740::numeric,ARRAY['General Medicine','Orthopedics']),
  ('Rajiv Gandhi Govt General Hospital','Chennai','Park Town','044-25305000',4.1,true,true,true,true,'low',true,true,13.0820::numeric,80.2740::numeric,ARRAY['General Medicine','Cardiology']),
  ('PGIMER Chandigarh','Chandigarh','Sector 12','0172-2746018',4.7,true,true,true,true,'low',true,true,30.7650::numeric,76.7750::numeric,ARRAY['Cardiology','Neurology','Oncology','Nephrology']),
  ('NIMHANS Bengaluru','Bengaluru','Hosur Road','080-26995001',4.7,true,true,true,true,'low',true,true,12.9430::numeric,77.5970::numeric,ARRAY['Neurology','Psychiatry']),
  ('CMC Vellore','Vellore','Ida Scudder Road','0416-2281000',4.8,true,true,true,true,'medium',false,true,12.9230::numeric,79.1340::numeric,ARRAY['Cardiology','Neurology','Oncology','Orthopedics']),
  ('Sree Chitra Tirunal Institute','Thiruvananthapuram','Medical College Campus','0471-2524266',4.6,true,true,true,true,'low',true,true,8.5460::numeric,76.9090::numeric,ARRAY['Cardiology','Neurology']),
  ('Tata Memorial Hospital','Mumbai','Dr E Borges Road, Parel','022-24177000',4.8,true,true,true,true,'low',true,true,18.9980::numeric,72.8420::numeric,ARRAY['Oncology']),

  -- Top private chains
  ('Apollo Hospitals Chennai','Chennai','Greams Road','044-28293333',4.7,true,true,true,true,'high',false,false,13.0640::numeric,80.2530::numeric,ARRAY['Cardiology','Neurology','Oncology','Orthopedics','Pediatrics']),
  ('Apollo Indraprastha Delhi','New Delhi','Sarita Vihar','011-71791090',4.6,true,true,true,true,'high',false,false,28.5380::numeric,77.2860::numeric,ARRAY['Cardiology','Neurology','Oncology']),
  ('Apollo Hospitals Bengaluru','Bengaluru','Bannerghatta Road','080-26304050',4.5,true,true,true,true,'high',false,false,12.8930::numeric,77.5990::numeric,ARRAY['Cardiology','Orthopedics']),
  ('Apollo Hospitals Hyderabad','Hyderabad','Jubilee Hills','040-23607777',4.5,true,true,true,true,'high',false,false,17.4310::numeric,78.4090::numeric,ARRAY['Cardiology','Oncology']),
  ('Fortis Escorts Heart Institute','New Delhi','Okhla Road','011-47135000',4.6,true,true,true,true,'high',false,false,28.5660::numeric,77.2780::numeric,ARRAY['Cardiology']),
  ('Fortis Memorial Research Institute','Gurugram','Sector 44','0124-4962200',4.6,true,true,true,true,'high',false,false,28.4470::numeric,77.0820::numeric,ARRAY['Cardiology','Neurology','Oncology','Orthopedics']),
  ('Fortis Hospital Mulund','Mumbai','Mulund Goregaon Link Rd','022-67994444',4.4,true,true,true,true,'high',false,false,19.1720::numeric,72.9420::numeric,ARRAY['Cardiology','Orthopedics']),
  ('Fortis Hospital Bannerghatta','Bengaluru','Bannerghatta Road','080-66214444',4.4,true,true,true,true,'high',false,false,12.8950::numeric,77.5980::numeric,ARRAY['Cardiology','Pediatrics']),
  ('Max Super Specialty Saket','New Delhi','Press Enclave Road','011-26515050',4.5,true,true,true,true,'high',false,false,28.5280::numeric,77.2150::numeric,ARRAY['Cardiology','Oncology','Orthopedics']),
  ('Max Smart Super Specialty','New Delhi','Mandir Marg, Saket','011-40554055',4.4,true,true,true,true,'high',false,false,28.5260::numeric,77.2120::numeric,ARRAY['Cardiology','Neurology']),
  ('Medanta The Medicity','Gurugram','Sector 38','0124-4141414',4.7,true,true,true,true,'high',false,false,28.4380::numeric,77.0420::numeric,ARRAY['Cardiology','Neurology','Oncology','Orthopedics']),
  ('Manipal Hospital Old Airport Rd','Bengaluru','98 Rustom Bagh','080-25024444',4.4,true,true,true,true,'high',false,false,12.9590::numeric,77.6480::numeric,ARRAY['Cardiology','Neurology']),
  ('Narayana Health City','Bengaluru','Bommasandra','080-71222222',4.6,true,true,true,true,'medium',false,true,12.8050::numeric,77.6930::numeric,ARRAY['Cardiology','Oncology','Pediatrics']),
  ('Narayana Multispeciality Jaipur','Jaipur','Sector 28, Kumbha Marg','0141-7166666',4.3,true,true,true,true,'medium',false,true,26.8210::numeric,75.8090::numeric,ARRAY['Cardiology','Orthopedics']),
  ('Lilavati Hospital','Mumbai','Bandra Reclamation','022-26751000',4.5,true,true,true,true,'high',false,false,19.0540::numeric,72.8260::numeric,ARRAY['Cardiology','Neurology','Oncology']),
  ('Hinduja Hospital','Mumbai','Veer Savarkar Marg, Mahim','022-24447000',4.5,true,true,true,true,'high',false,false,19.0420::numeric,72.8410::numeric,ARRAY['Cardiology','Neurology']),
  ('Kokilaben Dhirubhai Ambani','Mumbai','Four Bunglows, Andheri W','022-30916767',4.6,true,true,true,true,'high',false,false,19.1340::numeric,72.8210::numeric,ARRAY['Cardiology','Oncology']),
  ('Jaslok Hospital','Mumbai','Pedder Road','022-66573333',4.4,true,true,true,true,'high',false,false,18.9710::numeric,72.8080::numeric,ARRAY['Cardiology','Neurology']),
  ('Wockhardt Hospital Mumbai','Mumbai','Mumbai Central','022-61784444',4.3,true,true,true,true,'high',false,false,18.9720::numeric,72.8200::numeric,ARRAY['Cardiology']),
  ('BLK-Max Super Specialty','New Delhi','Pusa Road','011-30403040',4.5,true,true,true,true,'high',false,false,28.6450::numeric,77.1810::numeric,ARRAY['Cardiology','Oncology','Orthopedics']),
  ('Sir Ganga Ram Hospital','New Delhi','Rajinder Nagar','011-25750000',4.5,true,true,true,true,'high',false,false,28.6460::numeric,77.1880::numeric,ARRAY['Cardiology','Neurology','Pediatrics']),
  ('Indraprastha Apollo (East Delhi)','New Delhi','Mathura Road','011-26925858',4.5,true,true,true,true,'high',false,false,28.5390::numeric,77.2870::numeric,ARRAY['Cardiology','Neurology']),
  ('Yashoda Hospitals Hyderabad','Hyderabad','Somajiguda','040-23319999',4.4,true,true,true,true,'medium',false,false,17.4220::numeric,78.4570::numeric,ARRAY['Cardiology','Oncology']),
  ('KIMS Hospital Hyderabad','Hyderabad','Minister Road, Secunderabad','040-44885000',4.4,true,true,true,true,'medium',false,false,17.4400::numeric,78.4980::numeric,ARRAY['Cardiology','Orthopedics']),
  ('Continental Hospital','Hyderabad','Gachibowli','040-67000000',4.4,true,true,true,true,'high',false,false,17.4200::numeric,78.3380::numeric,ARRAY['Cardiology','Neurology']),
  ('MIOT International','Chennai','Manapakkam','044-42002288',4.5,true,true,true,true,'high',false,false,13.0210::numeric,80.1750::numeric,ARRAY['Orthopedics','Cardiology']),
  ('Fortis Malar','Chennai','Adyar','044-42892222',4.3,true,true,true,true,'high',false,false,13.0080::numeric,80.2570::numeric,ARRAY['Cardiology']),
  ('Ruby Hall Clinic','Pune','Sassoon Road','020-66455100',4.4,true,true,true,true,'medium',false,false,18.5300::numeric,73.8770::numeric,ARRAY['Cardiology','Oncology']),
  ('Jehangir Hospital','Pune','Sassoon Road','020-66819999',4.3,true,true,true,true,'medium',false,false,18.5290::numeric,73.8780::numeric,ARRAY['Cardiology','Orthopedics']),
  ('Sahyadri Super Specialty','Pune','Karve Road','020-67213000',4.3,true,true,true,true,'medium',false,false,18.5060::numeric,73.8230::numeric,ARRAY['Orthopedics']),
  ('Apollo Gleneagles Kolkata','Kolkata','EM Bypass','033-23203040',4.5,true,true,true,true,'high',false,false,22.5470::numeric,88.3990::numeric,ARRAY['Cardiology','Neurology']),
  ('AMRI Hospital Salt Lake','Kolkata','JC-16, Sector 3','033-66800000',4.3,true,true,true,true,'medium',false,false,22.5870::numeric,88.4170::numeric,ARRAY['Cardiology']),
  ('Rabindranath Tagore Intl Inst','Kolkata','Mukundapur','033-71222222',4.5,true,true,true,true,'high',false,false,22.4940::numeric,88.4030::numeric,ARRAY['Cardiology']),
  ('CARE Hospitals Banjara Hills','Hyderabad','Road No 1, Banjara Hills','040-30418888',4.3,true,true,true,true,'medium',false,false,17.4180::numeric,78.4360::numeric,ARRAY['Cardiology','Orthopedics']),
  ('Aster Medcity Kochi','Kochi','Kuttisahib Road','0484-6699999',4.5,true,true,true,true,'high',false,false,9.9690::numeric,76.2870::numeric,ARRAY['Cardiology','Neurology']),
  ('Amrita Hospital Faridabad','Faridabad','Sector 88','0129-2851234',4.5,true,true,true,true,'high',false,false,28.4360::numeric,77.3170::numeric,ARRAY['Cardiology','Oncology','Neurology'])
) AS v(name,city,address,phone,rating,emergency_24x7,has_icu,has_mri,has_ambulance,cost_tier,is_government,ayushman,lat,lng,specialties)
WHERE NOT EXISTS (SELECT 1 FROM public.hospitals h WHERE h.name = v.name);
