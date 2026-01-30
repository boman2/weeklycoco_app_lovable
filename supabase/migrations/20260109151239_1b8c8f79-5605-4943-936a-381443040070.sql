-- Fix 1: Discussion Reports - Replace overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view report counts" ON public.discussion_reports;

-- Users can only see their own reports
CREATE POLICY "Users can view their own reports" 
ON public.discussion_reports 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all reports for moderation
CREATE POLICY "Admins can view all reports" 
ON public.discussion_reports 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Fix 2: Point Management RPC Functions - Add authorization checks

-- Update confirm_pending_points to require admin OR owner
CREATE OR REPLACE FUNCTION public.confirm_pending_points(p_transaction_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_amount integer;
  v_status text;
BEGIN
  -- Get transaction details
  SELECT user_id, amount, status INTO v_user_id, v_amount, v_status
  FROM public.point_transactions
  WHERE id = p_transaction_id;
  
  -- Check if transaction exists
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  
  -- Authorization check: must be admin OR the transaction owner
  IF v_user_id != auth.uid() AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: can only confirm own transactions or must be admin';
  END IF;
  
  -- Only confirm if currently pending
  IF v_status != 'pending' THEN
    RETURN false;
  END IF;
  
  -- Update transaction status
  UPDATE public.point_transactions
  SET status = 'confirmed'
  WHERE id = p_transaction_id;
  
  -- Move points from pending to confirmed
  UPDATE public.user_profiles
  SET 
    pending_points = GREATEST(COALESCE(pending_points, 0) - v_amount, 0),
    confirmed_points = COALESCE(confirmed_points, 0) + v_amount
  WHERE id = v_user_id;
  
  RETURN true;
END;
$$;

-- Update cancel_pending_points to require admin only
CREATE OR REPLACE FUNCTION public.cancel_pending_points(p_transaction_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_amount integer;
  v_status text;
BEGIN
  -- Get transaction details
  SELECT user_id, amount, status INTO v_user_id, v_amount, v_status
  FROM public.point_transactions
  WHERE id = p_transaction_id;
  
  -- Check if transaction exists
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  
  -- Authorization check: only admins can cancel points
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: only admins can cancel points';
  END IF;
  
  -- Only cancel if currently pending
  IF v_status != 'pending' THEN
    RETURN false;
  END IF;
  
  -- Update transaction status
  UPDATE public.point_transactions
  SET status = 'cancelled'
  WHERE id = p_transaction_id;
  
  -- Subtract from pending_points
  UPDATE public.user_profiles
  SET pending_points = GREATEST(COALESCE(pending_points, 0) - v_amount, 0)
  WHERE id = v_user_id;
  
  RETURN true;
END;
$$;

-- Fix 3: Storage bucket policies - Restrict UPDATE/DELETE to admins only
-- Remove the unsafe policies
DROP POLICY IF EXISTS "Users can update their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON storage.objects;

-- Create admin-only policies for price-tags bucket
CREATE POLICY "Admins can update price-tag files" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'price-tags' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete price-tag files" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'price-tags' AND has_role(auth.uid(), 'admin'));