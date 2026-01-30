-- Add bio column to user_profiles table
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN public.user_profiles.bio IS 'User bio/introduction text';