-- Fix: User Profiles Public Data Exposure
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;

-- Create a policy that allows users to view their own full profile
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Create a policy that allows users to see public info of other users (for community features)
-- This uses a function to only return non-sensitive columns
CREATE OR REPLACE FUNCTION public.is_public_profile_query()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- This is a placeholder function. The real security comes from 
  -- using a view that only exposes non-sensitive columns
  SELECT true
$$;

-- Create a secure view for public profile information (non-sensitive only)
CREATE OR REPLACE VIEW public.public_profiles AS
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

-- Add policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.user_profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));