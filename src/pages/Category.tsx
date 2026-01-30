import { useState, useEffect } from 'react';
import { ArrowLeft, SlidersHorizontal, Grid3X3, List, TrendingDown, Loader2, Heart, MessageSquare } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ProductCard from '@/components/ProductCard';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import InquiryDialog from '@/components/InquiryDialog';
// Categories matching database constraint
const categoryMap: Record<string, { name: string; icon: string }> = {
  '신선식품,빵': { name: '신선식품/빵', icon: '🥖' },
  '냉장,냉동': { name: '냉장/냉동', icon: '❄️' },
  '가공식품': { name: '가공식품', icon: '🥫' },
  '음료,주류': { name: '음료/주류', icon: '🍷' },
  '커피,차': { name: '커피/차', icon: '☕' },
  '과자,간식': { name: '과자/간식', icon: '🍪' },
  '디지털,가전': { name: '디지털/가전', icon: '📱' },
  '주방,욕실': { name: '주방/욕실', icon: '🍳' },
  '의류,잡화': { name: '의류/잡화', icon: '👕' },
  '생활용품': { name: '생활용품', icon: '🧴' },
  '건강,미용': { name: '건강/미용', icon: '💊' },
  '공구,문구': { name: '공구/문구', icon: '🔧' },
};

const allCategories = Object.entries(categoryMap).map(([id, data]) => ({
  id,
  ...data,
}));

interface ProductWithPrice {
  product_id: string;
  name: string;
  category: string;
  currentPrice: number;
  originalPrice?: number;
  discountPeriod?: string;
  storeName?: string;
  imageUrl?: string;
  recordedAt?: string;
  reviewCount?: number;
}

type SortOption = 'latest' | 'price_low' | 'price_high' | 'discount';

const Category = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('category_id') || '';
  
  const [products, setProducts] = useState<ProductWithPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [showDealsOnly, setShowDealsOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(categoryId);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [likedProducts, setLikedProducts] = useState<Set<string>>(new Set());
  const [inquiryProduct, setInquiryProduct] = useState<{ product_id: string; name: string; current_price: number } | null>(null);
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const currentCategory = categoryMap[selectedCategory];

  // Fetch user and likes
  useEffect(() => {
    const checkAuthAndFetchLikes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: likes } = await supabase
          .from('likes')
          .select('product_id')
          .eq('user_id', user.id);
        if (likes) {
          setLikedProducts(new Set(likes.map(l => l.product_id)));
        }
      }
    };
    checkAuthAndFetchLikes();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        // First get products in this category with product_image_url
        let query = supabase
          .from('products')
          .select('product_id, name, category, product_image_url');

        if (selectedCategory) {
          query = query.eq('category', selectedCategory);
        }

        query = query.order('created_at', { ascending: false });

        const { data: productsData, error: productsError } = await query;

        if (productsError) {
          console.error('Error fetching products:', productsError);
          return;
        }

        if (!productsData || productsData.length === 0) {
          setProducts([]);
          return;
        }

        // Get latest prices and review counts for each product
        const productIds = productsData.map(p => p.product_id);
        
        const [pricesRes, reviewsRes] = await Promise.all([
          supabase
            .from('price_history')
            .select(`
              product_id,
              current_price,
              selling_price,
              discount_price,
              discount_period,
              recorded_at,
              image_url,
              store_id,
              stores(name)
            `)
            .in('product_id', productIds)
            .order('recorded_at', { ascending: false }),
          supabase
            .from('product_reviews')
            .select('product_id')
            .in('product_id', productIds)
        ]);

        const pricesData = pricesRes.data;
        const pricesError = pricesRes.error;

        if (pricesError) {
          console.error('Error fetching prices:', pricesError);
        }

        // Count reviews per product
        const reviewCounts: Record<string, number> = {};
        reviewsRes.data?.forEach(r => {
          reviewCounts[r.product_id] = (reviewCounts[r.product_id] || 0) + 1;
        });

        // Get latest price for each product
        const latestPrices = new Map<string, any>();
        pricesData?.forEach(price => {
          if (!latestPrices.has(price.product_id)) {
            latestPrices.set(price.product_id, price);
          }
        });

        // Combine product and price data - use product_image_url for thumbnail
        const combinedProducts: ProductWithPrice[] = productsData.map(product => {
          const price = latestPrices.get(product.product_id);
          return {
            product_id: product.product_id,
            name: product.name,
            category: product.category,
            currentPrice: price?.current_price || 0,
            originalPrice: price?.selling_price || undefined,
            discountPeriod: price?.discount_period || undefined,
            storeName: (price?.stores as any)?.name || undefined,
            imageUrl: product.product_image_url || price?.image_url || undefined,
            recordedAt: price?.recorded_at || undefined,
            reviewCount: reviewCounts[product.product_id] || 0,
          };
        });

        setProducts(combinedProducts);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategory]);

  const handleLikeToggle = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    if (!currentUserId) {
      toast({ title: '로그인이 필요합니다', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    const isLiked = likedProducts.has(productId);
    try {
      if (isLiked) {
        await supabase.from('likes').delete().eq('user_id', currentUserId).eq('product_id', productId);
        setLikedProducts(prev => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      } else {
        await supabase.from('likes').insert({ user_id: currentUserId, product_id: productId });
        setLikedProducts(prev => new Set(prev).add(productId));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleInquiryClick = (e: React.MouseEvent, product: ProductWithPrice) => {
    e.stopPropagation();
    if (!currentUserId) {
      toast({ title: '로그인이 필요합니다', variant: 'destructive' });
      navigate('/auth');
      return;
    }
    setInquiryProduct({
      product_id: product.product_id,
      name: product.name,
      current_price: product.currentPrice,
    });
    setIsInquiryOpen(true);
  };

  // Sort and filter products
  const displayProducts = products
    .filter(p => !showDealsOnly || (p.originalPrice && p.originalPrice > p.currentPrice))
    .sort((a, b) => {
      switch (sortBy) {
        case 'price_low':
          return a.currentPrice - b.currentPrice;
        case 'price_high':
          return b.currentPrice - a.currentPrice;
        case 'discount':
          const discountA = a.originalPrice ? (a.originalPrice - a.currentPrice) / a.originalPrice : 0;
          const discountB = b.originalPrice ? (b.originalPrice - b.currentPrice) / b.originalPrice : 0;
          return discountB - discountA;
        case 'latest':
        default:
          return new Date(b.recordedAt || 0).getTime() - new Date(a.recordedAt || 0).getTime();
      }
    });

  return (
    <div className="min-h-screen bg-background safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">
              {currentCategory ? (
                <>
                  <span className="mr-2">{currentCategory.icon}</span>
                  {currentCategory.name}
                </>
              ) : (
                '전체 상품'
              )}
            </h1>
            <p className="text-xs text-muted-foreground">
              {displayProducts.length}개 상품
            </p>
          </div>
        </div>

        {/* Category Tabs - 2 rows with text */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-6 gap-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={cn(
                'flex flex-col items-center justify-center rounded-xl px-1 py-2 text-xs font-medium transition-colors',
                !selectedCategory
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <span className="text-lg mb-0.5">📦</span>
              <span className="truncate w-full text-center text-[10px]">전체</span>
            </button>
            {allCategories.slice(0, 5).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl px-1 py-2 text-xs font-medium transition-colors',
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <span className="text-lg mb-0.5">{cat.icon}</span>
                <span className="truncate w-full text-center text-[10px]">{cat.name.split('/')[0]}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-6 gap-2 mt-2">
            {allCategories.slice(5, 11).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl px-1 py-2 text-xs font-medium transition-colors',
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <span className="text-lg mb-0.5">{cat.icon}</span>
                <span className="truncate w-full text-center text-[10px]">{cat.name.split('/')[0]}</span>
              </button>
            ))}
            {allCategories.length < 11 && Array.from({ length: 11 - allCategories.length }).map((_, i) => (
              <div key={`empty-${i}`} className="px-1 py-2" />
            ))}
          </div>
        </div>
      </header>

      {/* Filters & Sort */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDealsOnly(!showDealsOnly)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              showDealsOnly
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <TrendingDown className="h-4 w-4" />
            할인
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-foreground focus:outline-none"
          >
            <option value="latest">최신순</option>
            <option value="price_low">낮은가격순</option>
            <option value="price_high">높은가격순</option>
            <option value="discount">할인율순</option>
          </select>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'rounded-md p-1.5 transition-colors',
              viewMode === 'grid' ? 'bg-background shadow-sm' : ''
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'rounded-md p-1.5 transition-colors',
              viewMode === 'list' ? 'bg-background shadow-sm' : ''
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Products */}
      <main className="px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="text-5xl mb-4">📦</span>
            <p className="text-lg font-medium text-foreground">등록된 상품이 없습니다</p>
            <p className="text-sm text-muted-foreground mt-1">
              가격 등록을 통해 첫 번째로 등록해보세요!
            </p>
            <button
              onClick={() => navigate('/register')}
              className="mt-4 rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground"
            >
              가격 등록하기
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {displayProducts.map((product) => {
              const isLiked = likedProducts.has(product.product_id);
              return (
                <div
                  key={product.product_id}
                  onClick={() => navigate(`/product/${product.product_id}`)}
                  className="cursor-pointer rounded-xl bg-card overflow-hidden shadow-card"
                >
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <span className="text-4xl">
                          {categoryMap[product.category]?.icon || '📦'}
                        </span>
                      </div>
                    )}
                    {product.originalPrice && product.originalPrice > product.currentPrice && (
                      <div className="absolute left-0 top-0 rounded-br-lg bg-primary px-1.5 py-0.5">
                        <span className="text-[10px] font-bold text-primary-foreground">
                          {Math.round((1 - product.currentPrice / product.originalPrice) * 100)}%
                        </span>
                      </div>
                    )}
                    <button
                      onClick={(e) => handleLikeToggle(e, product.product_id)}
                      className="absolute right-1.5 top-1.5 transition-all hover:scale-110"
                    >
                      <Heart 
                        className={cn(
                          'h-4 w-4 transition-all',
                          isLiked 
                            ? 'text-pink-500 fill-pink-500' 
                            : 'text-pink-400 stroke-[2.5]'
                        )} 
                      />
                    </button>
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] text-muted-foreground">{product.product_id}</p>
                    <h3 className="font-medium text-foreground line-clamp-2 text-xs mt-0.5">
                      {product.name}
                      {product.reviewCount !== undefined && product.reviewCount > 0 && (
                        <span className="text-muted-foreground font-normal ml-0.5">({product.reviewCount})</span>
                      )}
                    </h3>
                    <div className="mt-1">
                      {product.originalPrice && product.originalPrice > product.currentPrice && (
                        <p className="text-[10px] text-muted-foreground line-through">
                          {product.originalPrice.toLocaleString()}원
                        </p>
                      )}
                      <p className="text-primary font-bold text-sm">{product.currentPrice.toLocaleString()}원</p>
                    </div>
                    {product.discountPeriod && (
                      <p className="text-[10px] text-primary mt-0.5">{product.discountPeriod}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {displayProducts.map((product) => {
              const isLiked = likedProducts.has(product.product_id);
              return (
                <div
                  key={product.product_id}
                  onClick={() => navigate(`/product/${product.product_id}`)}
                  className="flex gap-4 rounded-xl bg-card p-3 shadow-card cursor-pointer"
                >
                  {product.imageUrl ? (
                    <div className="relative">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-16 w-16 md:h-20 md:w-20 rounded-lg object-cover flex-shrink-0"
                      />
                      {product.originalPrice && product.originalPrice > product.currentPrice && (
                        <div className="absolute left-0 top-0 rounded-br-lg bg-primary px-1 py-0.5">
                          <span className="text-[9px] font-bold text-primary-foreground">
                            {Math.round((1 - product.currentPrice / product.originalPrice) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-16 w-16 md:h-20 md:w-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">
                        {categoryMap[product.category]?.icon || '📦'}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground mb-1">
                      {product.name}
                      {product.reviewCount !== undefined && product.reviewCount > 0 && (
                        <span className="text-muted-foreground text-sm font-normal ml-1">({product.reviewCount})</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {product.storeName || '매장 정보 없음'}
                    </p>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-lg font-bold text-primary">
                        {product.currentPrice.toLocaleString()}원
                      </span>
                      {product.originalPrice && product.originalPrice > product.currentPrice && (
                        <>
                          <span className="text-sm text-muted-foreground line-through">
                            {product.originalPrice.toLocaleString()}
                          </span>
                          <span className="text-sm font-semibold text-primary">
                            {Math.round((1 - product.currentPrice / product.originalPrice) * 100)}%
                          </span>
                        </>
                      )}
                    </div>
                    {product.discountPeriod && (
                      <p className="text-sm text-primary mt-1 font-medium">🏷️ {product.discountPeriod}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1 flex-shrink-0 self-center">
                    <button
                      onClick={(e) => handleLikeToggle(e, product.product_id)}
                      className="transition-all hover:scale-110"
                    >
                      <Heart 
                        className={cn(
                          'h-5 w-5 transition-all',
                          isLiked 
                            ? 'text-pink-500 fill-pink-500' 
                            : 'text-pink-400 stroke-[2.5]'
                        )} 
                      />
                    </button>
                    <button
                      onClick={(e) => handleInquiryClick(e, product)}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      문의
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Inquiry Dialog */}
      <InquiryDialog
        open={isInquiryOpen}
        onOpenChange={setIsInquiryOpen}
        linkedProduct={inquiryProduct}
      />
    </div>
  );
};

export default Category;
