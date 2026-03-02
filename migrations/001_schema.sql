-- TIRAMOTO: Initial PostgreSQL schema
-- Run this in Supabase SQL Editor or via psql

CREATE TABLE IF NOT EXISTS perdoruesit (
  id SERIAL PRIMARY KEY,
  emri TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telefoni TEXT,
  fjalekalimi TEXT NOT NULL DEFAULT '',
  google_id TEXT UNIQUE,
  roli TEXT NOT NULL CHECK (roli IN ('klient', 'korrier', 'admin')),
  krijuar_me TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS porosite (
  id SERIAL PRIMARY KEY,
  klient_id INTEGER NOT NULL REFERENCES perdoruesit(id),
  korrier_id INTEGER REFERENCES perdoruesit(id),
  adresa_marrjes TEXT NOT NULL,
  adresa_dorezimit TEXT NOT NULL,
  telefoni_marrjes TEXT NOT NULL,
  telefoni_dorezimit TEXT NOT NULL,
  pershkrimi TEXT NOT NULL,
  shenime TEXT,
  cmimi REAL DEFAULT 300,
  statusi TEXT DEFAULT 'E_RE' CHECK (statusi IN ('E_RE', 'NE_PRITJE', 'CAKTUAR', 'MARRE', 'DOREZUAR', 'ANULUAR')),
  krijuar_me TIMESTAMPTZ DEFAULT NOW(),
  caktuar_me TIMESTAMPTZ,
  marre_me TIMESTAMPTZ,
  dorezuar_me TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS historiku (
  id SERIAL PRIMARY KEY,
  porosi_id INTEGER NOT NULL REFERENCES porosite(id),
  veprimi TEXT NOT NULL,
  perdoruesi_id INTEGER REFERENCES perdoruesit(id),
  krijuar_me TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_porosite_statusi ON porosite(statusi);
CREATE INDEX IF NOT EXISTS idx_porosite_klient ON porosite(klient_id);
CREATE INDEX IF NOT EXISTS idx_porosite_korrier ON porosite(korrier_id);
CREATE INDEX IF NOT EXISTS idx_historiku_porosi ON historiku(porosi_id);
CREATE INDEX IF NOT EXISTS idx_perdoruesit_roli ON perdoruesit(roli);
CREATE INDEX IF NOT EXISTS idx_perdoruesit_google ON perdoruesit(google_id);
