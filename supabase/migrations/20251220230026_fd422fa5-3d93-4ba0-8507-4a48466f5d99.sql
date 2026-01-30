-- Create discussion_reports table for tracking reports
CREATE TABLE public.discussion_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id uuid NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (discussion_id, user_id)
);

-- Enable RLS
ALTER TABLE public.discussion_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view report counts" 
ON public.discussion_reports 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can report" 
ON public.discussion_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports" 
ON public.discussion_reports 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add is_blinded column to discussions table
ALTER TABLE public.discussions ADD COLUMN is_blinded boolean DEFAULT false;

-- Create function to auto-blind discussions with 10+ reports
CREATE OR REPLACE FUNCTION public.check_discussion_reports()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report_count integer;
BEGIN
  SELECT COUNT(*) INTO report_count
  FROM public.discussion_reports
  WHERE discussion_id = NEW.discussion_id;
  
  IF report_count >= 10 THEN
    UPDATE public.discussions
    SET is_blinded = true
    WHERE id = NEW.discussion_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to check reports after insert
CREATE TRIGGER on_discussion_report_insert
  AFTER INSERT ON public.discussion_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.check_discussion_reports();