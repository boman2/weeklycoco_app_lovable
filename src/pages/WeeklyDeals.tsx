import { useEffect, useState } from 'react';
import { ChevronLeft, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import { products as mockProducts, Product, formatPrice } from '@/data/mockData';

interface DBProduct {
  product_id: string;
  name: string;
  category: string;
  image_url: string | null;
  product_image_url: string | null;
}

interface PriceHistory {
  product_id: string;
  current_price: number;
  selling_price: number;
  discount_price: number | null;
  discount_period: string | null;
  recorded_at: string;
}

const WeeklyDeals = () => {
  const navigate = useNavigate();
  const [weeklyDeals, setWeeklyDeals] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWeeklyDeals = async () => {
      try {
        // Get this week's start date (Monday)
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() + mondayOffset);
        weekStart.setHours(0, 0, 0, 0);

        // Fetch products with discount this week
        const { data: priceData, error: priceError } = await supabase
          .from('price_history')
          .select('*')
          .not('discount_price', 'is', null)
          .gte('recorded_at', weekStart.toISOString())
          .order('recorded_at', { ascending: false });

        if (priceError) throw priceError;

        if (priceData && priceData.length > 0) {
          // Get unique product IDs
          const productIds = [...new Set(priceData.map((p: PriceHistory) => p.product_id))];
          
          // Fetch product details
          const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('*')
            .in('product_id', productIds);

          if (productsError) throw productsError;

          // Sort by most recent price record (newest first)
          const sortedProductIds = [...productIds].sort((a, b) => {
            const priceA = priceData.find((p: PriceHistory) => p.product_id === a);
            const priceB = priceData.find((p: PriceHistory) => p.product_id === b);
            const dateA = priceA?.recorded_at ? new Date(priceA.recorded_at).getTime() : 0;
            const dateB = priceB?.recorded_at ? new Date(priceB.recorded_at).getTime() : 0;
            return dateB - dateA;
          });

          // Combine data
          const combinedProducts: Product[] = sortedProductIds.map((productId) => {
            const productInfo = productsData?.find((p: DBProduct) => p.product_id === productId);
            const latestPrice = priceData.find((p: PriceHistory) => p.product_id === productId);
            
            // discount_price is discount AMOUNT, current_price is the discounted price
            const hasActiveDiscount = !!(latestPrice?.discount_price && latestPrice.discount_price > 0);
            
            return {
              id: productId,
              productId: productId,
              name: productInfo?.name || productId,
              nameKo: productInfo?.name || productId,
              category: productInfo?.category || '',
              image: productInfo?.product_image_url || productInfo?.image_url || '/placeholder.svg',
              currentPrice: hasActiveDiscount ? latestPrice?.current_price || 0 : latestPrice?.selling_price || 0,
              originalPrice: hasActiveDiscount ? latestPrice?.selling_price : undefined,
              discountPrice: hasActiveDiscount ? latestPrice?.discount_price : undefined,
              discountPeriod: latestPrice?.discount_period || undefined,
              unit: '1개',
              hasDiscount: hasActiveDiscount,
            } as Product & { hasDiscount: boolean; discountPrice?: number };
          });

          setWeeklyDeals(combinedProducts);
        } else {
          // Fallback to mock data with discounts
          const mockDeals = mockProducts.filter(p => p.originalPrice && p.originalPrice > p.currentPrice);
          setWeeklyDeals(mockDeals);
        }
      } catch (error) {
        console.error('Error fetching weekly deals:', error);
        // Fallback to mock data
        const mockDeals = mockProducts.filter(p => p.originalPrice && p.originalPrice > p.currentPrice);
        setWeeklyDeals(mockDeals);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeeklyDeals();
  }, []);

  return (
    <div className="min-h-screen bg-background safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button 
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-success" />
            <h1 className="text-lg font-bold text-foreground">금주 할인 상품</h1>
          </div>
        </div>
      </header>

      {/* Description */}
      <div className="px-4 py-4 border-b border-border">
        <p className="text-sm text-muted-foreground">
          이번 주 할인 중인 상품들을 확인하세요. 매주 월요일~목요일 매장별 할인정보가 업데이트됩니다.
        </p>
      </div>

      <main className="px-4 py-4">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : weeklyDeals.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {weeklyDeals.map((product) => (
              <ProductCard key={product.productId} product={product} variant="compact" />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <TrendingDown className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">이번 주 할인 상품이 없습니다</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default WeeklyDeals;
