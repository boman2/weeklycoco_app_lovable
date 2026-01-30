-- Add new columns for store details
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS address_detail text,
ADD COLUMN IF NOT EXISTS phone text DEFAULT '1899-9900',
ADD COLUMN IF NOT EXISTS email text DEFAULT 'member@costcokr.com',
ADD COLUMN IF NOT EXISTS business_hours text,
ADD COLUMN IF NOT EXISTS holiday_info text,
ADD COLUMN IF NOT EXISTS has_hearing_aids boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_tire_center boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS special_notice text;