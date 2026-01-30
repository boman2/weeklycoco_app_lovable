-- Fix the SECURITY DEFINER view issue by recreating as SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;

-- Create a regular view (SECURITY INVOKER is default) 
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  nickname,
  avatar_url,
  badges,
  confirmed_points,
  created_at
FROM public.user_profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Drop the unused function
DROP FUNCTION IF EXISTS public.is_public_profile_query();