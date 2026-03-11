-- ============================================================
-- Migration 023: Identity Layer
-- Links auth.users to employees and provides a helper function
-- for RLS policies to resolve the current employee ID.
-- ============================================================

-- 1. Add user_id to employees (nullable — not all employees have logins)
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE
  REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employees_user_id
  ON public.employees(user_id)
  WHERE user_id IS NOT NULL;

-- 2. Helper: resolve the current auth user → employee row id
--    Used in RLS policies: "caregiver can only see their own visits"
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.employees
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.current_employee_id() IS
  'Returns the employees.id for the currently authenticated user, or NULL if the user has no employee record.';
