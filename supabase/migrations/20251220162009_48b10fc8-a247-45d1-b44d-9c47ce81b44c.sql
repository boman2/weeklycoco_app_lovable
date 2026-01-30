-- Add INSERT policy for products table so authenticated users can upsert products
CREATE POLICY "Authenticated users can insert products" 
ON public.products 
FOR INSERT 
WITH CHECK (true);

-- Add UPDATE policy for products table so name/category can be updated
CREATE POLICY "Authenticated users can update products" 
ON public.products 
FOR UPDATE 
USING (true);