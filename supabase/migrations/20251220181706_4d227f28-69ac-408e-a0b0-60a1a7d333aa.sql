-- Add points column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS points integer DEFAULT 0;

-- Add avatar_url column to user_profiles for profile image
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create trigger function to auto-assign admin role to boman2@gmail.com
CREATE OR REPLACE FUNCTION public.assign_admin_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-assign admin role for boman2@gmail.com
  IF NEW.email = 'boman2@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Assign default user role to everyone
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for auto role assignment
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_admin_on_signup();

-- Assign admin role to existing boman2@gmail.com user if exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'boman2@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Create function to add points when discussion is created
CREATE OR REPLACE FUNCTION public.add_points_on_discussion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  points_to_add integer;
BEGIN
  -- 2 points for recipe category, 1 point for others
  IF NEW.category = 'recipe' THEN
    points_to_add := 2;
  ELSE
    points_to_add := 1;
  END IF;
  
  UPDATE public.user_profiles
  SET points = COALESCE(points, 0) + points_to_add
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for adding points on discussion creation
DROP TRIGGER IF EXISTS on_discussion_created_add_points ON public.discussions;
CREATE TRIGGER on_discussion_created_add_points
  AFTER INSERT ON public.discussions
  FOR EACH ROW EXECUTE FUNCTION public.add_points_on_discussion();

-- Create storage bucket for avatars if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for avatar uploads
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');