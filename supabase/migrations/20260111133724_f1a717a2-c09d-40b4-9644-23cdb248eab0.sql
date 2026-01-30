-- Create customer requests table for the bulletin board
CREATE TABLE public.customer_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comments table for customer requests
CREATE TABLE public.customer_request_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.customer_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_request_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_requests
CREATE POLICY "Anyone can view customer requests" 
ON public.customer_requests 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create requests" 
ON public.customer_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own requests" 
ON public.customer_requests 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own requests" 
ON public.customer_requests 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for comments (using correct has_role signature: user_id, role)
CREATE POLICY "Request owner can view comments" 
ON public.customer_request_comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.customer_requests 
    WHERE id = request_id AND user_id = auth.uid()
  )
  OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can create comments" 
ON public.customer_request_comments 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete comments" 
ON public.customer_request_comments 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_customer_requests_updated_at
BEFORE UPDATE ON public.customer_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();