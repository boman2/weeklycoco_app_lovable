-- Fix customer_requests public exposure
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view customer requests" ON public.customer_requests;

-- Create policy for users to view their own requests
CREATE POLICY "Users can view their own requests"
ON public.customer_requests FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for admins to view all requests
CREATE POLICY "Admins can view all requests"
ON public.customer_requests FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Also fix customer_request_comments table if needed
DROP POLICY IF EXISTS "Anyone can view customer request comments" ON public.customer_request_comments;

-- Users can view comments on their own requests
CREATE POLICY "Users can view comments on their requests"
ON public.customer_request_comments FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.customer_requests 
    WHERE id = customer_request_comments.request_id 
    AND user_id = auth.uid()
  )
);

-- Admins can view all comments
CREATE POLICY "Admins can view all request comments"
ON public.customer_request_comments FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));