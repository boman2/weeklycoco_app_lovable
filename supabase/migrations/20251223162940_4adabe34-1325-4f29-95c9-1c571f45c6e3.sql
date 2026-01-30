-- Add daily_budget column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS daily_budget integer DEFAULT 0;

-- Create shopping_memo table
CREATE TABLE public.shopping_memo (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL,
  estimated_price integer NOT NULL DEFAULT 0,
  store_id uuid REFERENCES public.stores(id),
  store_name text,
  is_purchased boolean NOT NULL DEFAULT false,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopping_memo ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own memo items"
ON public.shopping_memo
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memo items"
ON public.shopping_memo
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memo items"
ON public.shopping_memo
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memo items"
ON public.shopping_memo
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_shopping_memo_updated_at
BEFORE UPDATE ON public.shopping_memo
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();