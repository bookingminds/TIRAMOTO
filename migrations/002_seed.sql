-- TIRAMOTO: Seed data
-- Run after 001_schema.sql
-- Passwords are bcrypt hashes (admin123 / korrier123)

INSERT INTO perdoruesit (emri, email, telefoni, fjalekalimi, roli)
VALUES (
  'Admin TIRAMOTO',
  'admin@tiramoto.al',
  '+355 69 000 0000',
  '$2a$10$8K1p/a0dL1LXMc4sRz0zHOQK0.p1fY3MHarHMqOfqKqlm/6WGQ.Ti',
  'admin'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO perdoruesit (emri, email, telefoni, fjalekalimi, roli)
VALUES (
  'Korrier Test',
  'korrier@tiramoto.al',
  '+355 69 111 1111',
  '$2a$10$YgHHMfg5xT3UOwi.m5sCxupaBQ3LOhBkEPhUm4JGOKfPi9FKmB3ay',
  'korrier'
) ON CONFLICT (email) DO NOTHING;
