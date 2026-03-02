-- Add NE_PRITJE (pending approval) status for courier confirmation workflow
ALTER TABLE porosite DROP CONSTRAINT IF EXISTS porosite_statusi_check;
ALTER TABLE porosite ADD CONSTRAINT porosite_statusi_check
  CHECK (statusi IN ('E_RE', 'NE_PRITJE', 'CAKTUAR', 'MARRE', 'DOREZUAR', 'ANULUAR'));
