-- Add image columns to products table
ALTER TABLE public.products
ADD COLUMN image_url TEXT,
ADD COLUMN product_image_url TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.products.image_url IS '가격표 이미지';
COMMENT ON COLUMN public.products.product_image_url IS '상품 이미지';