-- Create function to add points on product review
CREATE OR REPLACE FUNCTION public.add_points_on_product_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Add 1 point for product review
  UPDATE public.user_profiles
  SET points = COALESCE(points, 0) + 1
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic point addition on product review
CREATE TRIGGER add_points_on_product_review_trigger
AFTER INSERT ON public.product_reviews
FOR EACH ROW
EXECUTE FUNCTION public.add_points_on_product_review();