-- Make actor/corrector fields nullable so corrections work without an auth session.
-- In production these will be populated from the logged-in user's employee record.
ALTER TABLE evv_corrections ALTER COLUMN corrected_by DROP NOT NULL;
