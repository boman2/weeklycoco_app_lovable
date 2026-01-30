-- Add location terms consent field to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS location_terms_agreed BOOLEAN DEFAULT NULL;

-- Add timestamp for when they agreed
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS location_terms_agreed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;