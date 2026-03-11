-- =============================================================================
-- Drop legacy patient tables (if they exist)
-- Run this after confirming the clients tables have all your data.
-- =============================================================================

-- Drop child tables first (due to foreign key constraints)
DROP TABLE IF EXISTS public.patient_documents CASCADE;
DROP TABLE IF EXISTS public.patient_guardians CASCADE;
DROP TABLE IF EXISTS public.patient_onboarding_items CASCADE;

-- Drop parent table
DROP TABLE IF EXISTS public.patients CASCADE;
