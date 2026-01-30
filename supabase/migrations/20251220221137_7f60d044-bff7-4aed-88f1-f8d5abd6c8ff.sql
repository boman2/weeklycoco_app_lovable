-- Add RLS policy for admins to update stores (for closing_dates management)
CREATE POLICY "Admins can update stores"
ON public.stores
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));