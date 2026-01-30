-- Add linked_product_id column to discussions table
ALTER TABLE public.discussions 
ADD COLUMN linked_product_id text REFERENCES public.products(product_id);

-- Create index for faster lookups
CREATE INDEX idx_discussions_linked_product ON public.discussions(linked_product_id);