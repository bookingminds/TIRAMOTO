-- Add 'aktiv' column to perdoruesit for admin control over couriers
ALTER TABLE perdoruesit ADD COLUMN IF NOT EXISTS aktiv BOOLEAN DEFAULT true;
