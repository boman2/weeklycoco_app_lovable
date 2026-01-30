-- Add pending_points and confirmed_points to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS pending_points integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS confirmed_points integer DEFAULT 0;

-- Add status column to point_transactions
ALTER TABLE public.point_transactions 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled'));

-- Create function to add pending points
CREATE OR REPLACE FUNCTION public.add_pending_points(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_reference_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id uuid;
BEGIN
  -- Create pending transaction
  INSERT INTO public.point_transactions (user_id, amount, status, reason, reference_id)
  VALUES (p_user_id, p_amount, 'pending', p_reason, p_reference_id)
  RETURNING id INTO v_transaction_id;
  
  -- Update pending_points in user_profiles
  UPDATE public.user_profiles
  SET pending_points = COALESCE(pending_points, 0) + p_amount
  WHERE id = p_user_id;
  
  RETURN v_transaction_id;
END;
$$;

-- Create function to confirm pending points
CREATE OR REPLACE FUNCTION public.confirm_pending_points(
  p_transaction_id uuid
)
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

-- Create function to cancel pending points
CREATE OR REPLACE FUNCTION public.cancel_pending_points(
  p_transaction_id uuid
)
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