-- Add preferred_store_id column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN preferred_store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL;