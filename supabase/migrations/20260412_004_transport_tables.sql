-- FASE 2: Migration 004 — Transport Schema (16 tables)
-- Shared: ports, routes
-- Speed: operators, queue_entries, seat_claims, charters, departures
-- Ferry: ferry_schedules, ferry_bookings
-- Ship: ship_vessels, ship_routes, ship_schedules, ship_bookings, ship_departures
-- Pelni: pelni_schedules, pelni_bookings

-- ============================================================
-- SHARED: 1. PORTS (9+ pelabuhan)
-- ============================================================
CREATE TABLE transport.ports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  city_id UUID NOT NULL REFERENCES public.cities(id),
  port_type TEXT[] NOT NULL DEFAULT '{speed}',
  -- port_type: speed, ferry, ship, pelni (bisa multiple)
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  facilities JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed 9 pelabuhan
INSERT INTO transport.ports (name, slug, city_id, port_type) VALUES
  ('Bastiong', 'bastiong', (SELECT id FROM public.cities WHERE slug = 'ternate'), '{speed,ship}'),
  ('Mangga Dua', 'mangga-dua', (SELECT id FROM public.cities WHERE slug = 'ternate'), '{speed}'),
  ('Kota Baru', 'kota-baru', (SELECT id FROM public.cities WHERE slug = 'ternate'), '{speed}'),
  ('Revolusi', 'revolusi', (SELECT id FROM public.cities WHERE slug = 'ternate'), '{speed}'),
  ('Dufa-Dufa', 'dufa-dufa', (SELECT id FROM public.cities WHERE slug = 'ternate'), '{speed,ship}'),
  ('Rum', 'rum', (SELECT id FROM public.cities WHERE slug = 'tidore'), '{speed}'),
  ('Sofifi', 'sofifi', (SELECT id FROM public.cities WHERE slug = 'sofifi'), '{speed,ferry}'),
  ('Jailolo', 'jailolo', (SELECT id FROM public.cities WHERE slug = 'jailolo'), '{speed}'),
  ('Sidangoli', 'sidangoli', (SELECT id FROM public.cities WHERE slug = 'sidangoli'), '{speed}');

-- ============================================================
-- SHARED: 2. ROUTES
-- ============================================================
CREATE TABLE transport.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_port_id UUID NOT NULL REFERENCES transport.ports(id),
  destination_port_id UUID NOT NULL REFERENCES transport.ports(id),
  transport_type TEXT NOT NULL CHECK (transport_type IN ('speed', 'ferry', 'ship', 'pelni')),
  distance_km NUMERIC(6,1),
  estimated_duration_minutes INT,
  base_price NUMERIC(10,0) NOT NULL,
  commission_type TEXT NOT NULL CHECK (commission_type IN ('flat', 'percentage')),
  commission_value NUMERIC(10,4) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(origin_port_id, destination_port_id, transport_type)
);

-- Seed 10 speed routes (5 bidirectional pairs)
-- Tidore routes: Rp 15.000, flat Rp 2.000
-- Long routes: Rp 100.000, 10%
INSERT INTO transport.routes (origin_port_id, destination_port_id, transport_type, base_price, commission_type, commission_value) VALUES
  -- Ternate → Tidore (Bastiong → Rum)
  ((SELECT id FROM transport.ports WHERE slug = 'bastiong'), (SELECT id FROM transport.ports WHERE slug = 'rum'), 'speed', 15000, 'flat', 2000),
  ((SELECT id FROM transport.ports WHERE slug = 'rum'), (SELECT id FROM transport.ports WHERE slug = 'bastiong'), 'speed', 15000, 'flat', 2000),
  -- Ternate → Sofifi (Bastiong → Sofifi)
  ((SELECT id FROM transport.ports WHERE slug = 'bastiong'), (SELECT id FROM transport.ports WHERE slug = 'sofifi'), 'speed', 100000, 'percentage', 0.10),
  ((SELECT id FROM transport.ports WHERE slug = 'sofifi'), (SELECT id FROM transport.ports WHERE slug = 'bastiong'), 'speed', 100000, 'percentage', 0.10),
  -- Ternate → Jailolo (Mangga Dua → Jailolo)
  ((SELECT id FROM transport.ports WHERE slug = 'mangga-dua'), (SELECT id FROM transport.ports WHERE slug = 'jailolo'), 'speed', 100000, 'percentage', 0.10),
  ((SELECT id FROM transport.ports WHERE slug = 'jailolo'), (SELECT id FROM transport.ports WHERE slug = 'mangga-dua'), 'speed', 100000, 'percentage', 0.10),
  -- Ternate → Sidangoli (Kota Baru → Sidangoli)
  ((SELECT id FROM transport.ports WHERE slug = 'kota-baru'), (SELECT id FROM transport.ports WHERE slug = 'sidangoli'), 'speed', 100000, 'percentage', 0.10),
  ((SELECT id FROM transport.ports WHERE slug = 'sidangoli'), (SELECT id FROM transport.ports WHERE slug = 'kota-baru'), 'speed', 100000, 'percentage', 0.10),
  -- Tidore (Rum → Sofifi)
  ((SELECT id FROM transport.ports WHERE slug = 'rum'), (SELECT id FROM transport.ports WHERE slug = 'sofifi'), 'speed', 15000, 'flat', 2000),
  ((SELECT id FROM transport.ports WHERE slug = 'sofifi'), (SELECT id FROM transport.ports WHERE slug = 'rum'), 'speed', 15000, 'flat', 2000);

-- ============================================================
-- SPEED: 3. OPERATORS
-- ============================================================
CREATE TABLE transport.operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  boat_name TEXT,
  capacity INT NOT NULL DEFAULT 12,
  home_port_id UUID NOT NULL REFERENCES transport.ports(id),
  current_port_id UUID REFERENCES transport.ports(id),
  license_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_operators_user ON transport.operators(user_id);
CREATE INDEX idx_operators_port ON transport.operators(current_port_id);
CREATE INDEX idx_operators_active ON transport.operators(is_active, is_online);

-- ============================================================
-- SPEED: 4. QUEUE_ENTRIES (antrian di pelabuhan)
-- ============================================================
CREATE TABLE transport.queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES transport.operators(id),
  route_id UUID NOT NULL REFERENCES transport.routes(id),
  port_id UUID NOT NULL REFERENCES transport.ports(id),
  queue_position INT NOT NULL,
  passenger_count INT NOT NULL DEFAULT 0,
  -- passenger_count = walk-in manual count by operator
  status TEXT NOT NULL DEFAULT 'queuing' CHECK (status IN ('queuing', 'boarding', 'departed', 'cancelled')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  boarding_started_at TIMESTAMPTZ,
  departed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_queue_port_status ON transport.queue_entries(port_id, status, queue_position);
CREATE INDEX idx_queue_operator ON transport.queue_entries(operator_id);
CREATE INDEX idx_queue_route ON transport.queue_entries(route_id);

-- ============================================================
-- SPEED: 5. SEAT_CLAIMS
-- NO expires_at, NO cancelled status — per PRD
-- State: active → boarded | expired
-- ============================================================
CREATE TABLE transport.seat_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_entry_id UUID NOT NULL REFERENCES transport.queue_entries(id),
  passenger_id UUID NOT NULL REFERENCES auth.users(id),
  passenger_name TEXT NOT NULL,
  passenger_phone TEXT NOT NULL,
  seat_number INT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'boarded', 'expired')),
  -- active = claim berlaku
  -- boarded = operator confirm naik (✅ NAIK)
  -- expired = speed lepas tali / operator release (❌ TIDAK ADA)
  boarded_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  expired_reason TEXT CHECK (expired_reason IN ('departed', 'operator_release', 'no_show')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_claims_queue ON transport.seat_claims(queue_entry_id, status);
CREATE INDEX idx_claims_passenger ON transport.seat_claims(passenger_id);

-- ============================================================
-- SPEED: 6. CHARTERS
-- ============================================================
CREATE TABLE transport.charters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id),
  route_id UUID NOT NULL REFERENCES transport.routes(id),
  operator_id UUID REFERENCES transport.operators(id),
  passenger_count INT NOT NULL,
  requested_price NUMERIC(10,0),
  agreed_price NUMERIC(10,0),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested', 'matched', 'confirmed', 'completed', 'cancelled'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SPEED: 7. DEPARTURES
-- ============================================================
CREATE TABLE transport.departures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_entry_id UUID NOT NULL REFERENCES transport.queue_entries(id),
  operator_id UUID NOT NULL REFERENCES transport.operators(id),
  route_id UUID NOT NULL REFERENCES transport.routes(id),
  total_passengers INT NOT NULL,
  digital_passengers INT NOT NULL DEFAULT 0,
  walk_in_passengers INT NOT NULL DEFAULT 0,
  manifest JSONB NOT NULL DEFAULT '[]',
  -- manifest: [{ name, phone, seat, type: 'digital'|'walk_in' }]
  is_emergency_skip BOOLEAN NOT NULL DEFAULT false,
  emergency_reason TEXT,
  commission_amount NUMERIC(10,0),
  departed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_departures_operator ON transport.departures(operator_id);
CREATE INDEX idx_departures_route ON transport.departures(route_id);
CREATE INDEX idx_departures_date ON transport.departures(departed_at);

-- ============================================================
-- FERRY: 8. FERRY_SCHEDULES
-- ============================================================
CREATE TABLE transport.ferry_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES transport.routes(id),
  vessel_name TEXT NOT NULL,
  departure_time TIME NOT NULL,
  arrival_time TIME,
  days_of_week INT[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}',
  -- 1=Monday ... 7=Sunday
  capacity INT NOT NULL,
  price NUMERIC(10,0) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- FERRY: 9. FERRY_BOOKINGS
-- ============================================================
CREATE TABLE transport.ferry_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES transport.ferry_schedules(id),
  passenger_id UUID NOT NULL REFERENCES auth.users(id),
  passenger_name TEXT NOT NULL,
  passenger_phone TEXT NOT NULL,
  travel_date DATE NOT NULL,
  seat_count INT NOT NULL DEFAULT 1,
  total_price NUMERIC(10,0) NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  booking_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ferry_bookings_date ON transport.ferry_bookings(travel_date);
CREATE INDEX idx_ferry_bookings_passenger ON transport.ferry_bookings(passenger_id);

-- ============================================================
-- SHIP: 10. SHIP_VESSELS (Kapal Lokal)
-- ============================================================
CREATE TABLE transport.ship_vessels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  operator_name TEXT,
  operator_phone TEXT,
  capacity_beds INT NOT NULL DEFAULT 100,
  capacity_cabins INT NOT NULL DEFAULT 5,
  -- cabins = kamar ABK yang disewakan
  home_port_id UUID REFERENCES transport.ports(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SHIP: 11. SHIP_ROUTES (multi-stop)
-- ============================================================
CREATE TABLE transport.ship_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- e.g. "Bastiong → Bacan → Obi"
  origin_port_id UUID NOT NULL REFERENCES transport.ports(id),
  stops JSONB NOT NULL DEFAULT '[]',
  -- stops: [{ port_id, port_name, order, estimated_arrival }]
  base_price_bed NUMERIC(10,0) NOT NULL,
  base_price_cabin NUMERIC(10,0),
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  frequency TEXT, -- "hampir tiap hari", "2x seminggu"
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SHIP: 12. SHIP_SCHEDULES
-- ============================================================
CREATE TABLE transport.ship_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ship_route_id UUID NOT NULL REFERENCES transport.ship_routes(id),
  vessel_id UUID NOT NULL REFERENCES transport.ship_vessels(id),
  departure_date DATE NOT NULL,
  departure_time TIME,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'boarding', 'departed', 'arrived', 'cancelled')),
  available_beds INT,
  available_cabins INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ship_schedules_date ON transport.ship_schedules(departure_date);

-- ============================================================
-- SHIP: 13. SHIP_BOOKINGS
-- ============================================================
CREATE TABLE transport.ship_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES transport.ship_schedules(id),
  passenger_id UUID NOT NULL REFERENCES auth.users(id),
  passenger_name TEXT NOT NULL,
  passenger_phone TEXT NOT NULL,
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('bed', 'cabin')),
  destination_stop TEXT NOT NULL, -- nama pelabuhan tujuan turun
  price NUMERIC(10,0) NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'boarded', 'completed', 'cancelled')),
  booking_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ship_bookings_schedule ON transport.ship_bookings(schedule_id);
CREATE INDEX idx_ship_bookings_passenger ON transport.ship_bookings(passenger_id);

-- ============================================================
-- SHIP: 14. SHIP_DEPARTURES
-- ============================================================
CREATE TABLE transport.ship_departures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES transport.ship_schedules(id),
  vessel_id UUID NOT NULL REFERENCES transport.ship_vessels(id),
  total_passengers INT NOT NULL DEFAULT 0,
  manifest JSONB NOT NULL DEFAULT '[]',
  -- manifest: [{ name, phone, ticket_type, destination, booking_code }]
  departed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PELNI: 15. PELNI_SCHEDULES
-- ============================================================
CREATE TABLE transport.pelni_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ship_name TEXT NOT NULL,
  route_description TEXT NOT NULL,
  origin_port TEXT NOT NULL,
  destination_port TEXT NOT NULL,
  stops TEXT[] DEFAULT '{}',
  departure_date DATE,
  departure_time TIME,
  classes JSONB NOT NULL DEFAULT '[]',
  -- classes: [{ name: "Ekonomi", price: 250000 }, { name: "Bisnis", price: 500000 }]
  source_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pelni_date ON transport.pelni_schedules(departure_date);

-- ============================================================
-- PELNI: 16. PELNI_BOOKINGS
-- ============================================================
CREATE TABLE transport.pelni_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES transport.pelni_schedules(id),
  passenger_id UUID NOT NULL REFERENCES auth.users(id),
  passenger_name TEXT NOT NULL,
  passenger_phone TEXT NOT NULL,
  class_name TEXT NOT NULL,
  price NUMERIC(10,0) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  booking_code TEXT NOT NULL UNIQUE,
  affiliate_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
