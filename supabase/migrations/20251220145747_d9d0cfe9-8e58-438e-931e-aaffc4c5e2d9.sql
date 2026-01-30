-- 1. Create stores table
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Create products table with category enum
CREATE TABLE public.products (
  product_id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN (
    '신선식품,빵', '냉장,냉동', '가공식품', '음료,주류', '커피,차', '과자,간식',
    '디지털,가전', '주방,욕실', '의류,잡화', '생활용품', '건강,미용', '공구,문구'
  )),
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Create price_history table
CREATE TABLE public.price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES public.products(product_id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selling_price numeric NOT NULL,
  discount_price numeric,
  discount_period text,
  current_price numeric NOT NULL,
  image_url text,
  recorded_at timestamp with time zone DEFAULT now()
);

-- 4. Create community_posts table
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES public.products(product_id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Create user_profiles table
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text,
  bakery_purchase_count integer DEFAULT 0,
  unique_stores_visited jsonb DEFAULT '[]'::jsonb,
  badges jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- 6. Create likes table with unique constraint
CREATE TABLE public.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(product_id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- 7. Enable RLS on all tables
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for stores (public read)
CREATE POLICY "Anyone can view stores" ON public.stores FOR SELECT USING (true);

-- 9. RLS Policies for products (public read)
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);

-- 10. RLS Policies for price_history
CREATE POLICY "Anyone can view price history" ON public.price_history FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert price history" ON public.price_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own price history" ON public.price_history FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own price history" ON public.price_history FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 11. RLS Policies for community_posts
CREATE POLICY "Anyone can view community posts" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert posts" ON public.community_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON public.community_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts" ON public.community_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 12. RLS Policies for user_profiles
CREATE POLICY "Users can view all profiles" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 13. RLS Policies for likes
CREATE POLICY "Users can view their own likes" ON public.likes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can insert likes" ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own likes" ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 14. Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, nickname)
  VALUES (new.id, new.raw_user_meta_data ->> 'nickname');
  RETURN new;
END;
$$;

-- 15. Create trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 16. Create storage bucket for price tag images
INSERT INTO storage.buckets (id, name, public) VALUES ('price-tags', 'price-tags', true);

-- 17. Storage policies for price-tags bucket
CREATE POLICY "Anyone can view price tag images" ON storage.objects FOR SELECT USING (bucket_id = 'price-tags');
CREATE POLICY "Authenticated users can upload price tags" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'price-tags');
CREATE POLICY "Users can update their own uploads" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'price-tags');
CREATE POLICY "Users can delete their own uploads" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'price-tags');

-- 18. Insert initial store data (20 Korean Costco locations)
INSERT INTO public.stores (name, region, latitude, longitude) VALUES
('양평점', '서울', 37.5270, 126.8869),
('양재점', '서울', 37.4641, 127.0393),
('상봉점', '서울', 37.5968, 127.0855),
('고척점', '서울', 37.4985, 126.8663),
('광명점', '경기', 37.4259, 126.8827),
('의정부점', '경기', 37.7377, 127.0337),
('일산점', '경기', 37.6711, 126.7669),
('하남점', '경기', 37.5456, 127.2147),
('송도점', '인천', 37.3920, 126.6372),
('대전점', '대전', 36.3752, 127.3877),
('대구점', '대구', 35.8714, 128.5561),
('혁신도시점', '대구', 35.8297, 128.7481),
('울산점', '울산', 35.5384, 129.3114),
('대연점', '부산', 35.1379, 129.0986),
('동래점', '부산', 35.2100, 129.0756),
('창원점', '경남', 35.2270, 128.6811),
('광주점', '광주', 35.1595, 126.8526),
('세종점', '세종', 36.4800, 127.2890),
('공세점', '충남', 36.9167, 127.0056),
('제주점', '제주', 33.4890, 126.4983);