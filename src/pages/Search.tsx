import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Heart, MessageSquare } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SearchBar from '@/components/SearchBar';
import { categories, Product, formatPrice, getDiscountPercent } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import InquiryDialog from '@/components/InquiryDialog';
import { useToast } from '@/hooks/use-toast';

type SortOption = 'discount' | 'likes' | 'name' | 'newest';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'discount', label: '할인율순' },
  { value: 'likes', label: '좋아요순' },
  { value: 'name', label: '상품명순' },
  { value: 'newest', label: '최신순' },
];

const ITEMS_PER_PAGE = 24;

const Search = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialFilter = searchParams.get('filter') || '';

  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showDealsOnly, setShowDealsOnly] = useState(initialFilter === 'deals');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});
  const [discountCategoryStats, setDiscountCategoryStats] = useState<Record<string, number>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [reviewCounts, setReviewCounts] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [likedProducts, setLikedProducts] = useState<Set<string>>(new Set());
  const [inquiryProduct, setInquiryProduct] = useState<{ product_id: string; name: string; current_price: number } | null>(null);
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);

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
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch products from DB (newest first for default sorting)
        const { data: dbProducts } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        // Fetch price history for products
        const productIds = dbProducts?.map(p => p.product_id) || [];
        const { data: priceData } = await supabase
          .from('price_history')
          .select('*')
          .in('product_id', productIds)
          .order('recorded_at', { ascending: false });

        // Fetch category stats (all products)
        const catCounts: Record<string, number> = {};
        dbProducts?.forEach(p => {
          catCounts[p.category] = (catCounts[p.category] || 0) + 1;
        });
        setCategoryStats(catCounts);

        // Fetch discount category stats (products with active discount)
        const discountCatCounts: Record<string, number> = {};
        dbProducts?.forEach(p => {
          const latestPrice = priceData?.find(ph => ph.product_id === p.product_id);
          if (latestPrice?.discount_price && latestPrice.discount_price < latestPrice.selling_price) {
            // Check if discount period is active
            const isDiscountActive = !latestPrice.discount_period || isDiscountPeriodActive(latestPrice.discount_period);
            if (isDiscountActive) {
              discountCatCounts[p.category] = (discountCatCounts[p.category] || 0) + 1;
            }
          }
        });
        setDiscountCategoryStats(discountCatCounts);

        // Fetch likes and reviews
        const [likesRes, reviewsRes] = await Promise.all([
          supabase.from('likes').select('product_id'),
          supabase.from('product_reviews').select('product_id')
        ]);
        
        const counts: Record<string, number> = {};
        likesRes.data?.forEach(l => {
          counts[l.product_id] = (counts[l.product_id] || 0) + 1;
        });
        setLikeCounts(counts);

        const revCounts: Record<string, number> = {};
        reviewsRes.data?.forEach(r => {
          revCounts[r.product_id] = (revCounts[r.product_id] || 0) + 1;
        });
        setReviewCounts(revCounts);

        // Combine products with price data
        if (dbProducts) {
          const combinedProducts: Product[] = dbProducts.map(p => {
            const latestPrice = priceData?.find(ph => ph.product_id === p.product_id);
            return {
              id: p.product_id,
              productId: p.product_id,
              name: p.name,
              nameKo: p.name,
              category: p.category,
              // Use product_image_url first, then fall back to image_url
              image: p.product_image_url || latestPrice?.image_url || p.image_url || '/placeholder.svg',
              currentPrice: latestPrice?.current_price || 0,
              originalPrice: latestPrice?.selling_price,
              discountPrice: latestPrice?.discount_price || undefined,
              discountPeriod: latestPrice?.discount_period || undefined,
              unit: '1개',
              isBakery: p.category?.includes('빵') || p.category?.includes('베이커리'),
            };
          });
          setProducts(combinedProducts);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getCategoryCount = (categoryId: string) => {
    // Show discount category counts when deals filter is active
    if (showDealsOnly) {
      return discountCategoryStats[categoryId] || 0;
    }
    return categoryStats[categoryId] || 0;
  };

  // Helper function to check if discount period is active
  const isDiscountPeriodActive = (discountPeriod: string): boolean => {
    try {
      const match = discountPeriod.match(/(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})/);
      if (!match) return true;
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();
      
      const startMonth = parseInt(match[1]);
      const startDay = parseInt(match[2]);
      const endMonth = parseInt(match[3]);
      const endDay = parseInt(match[4]);
      
      const startDate = new Date(currentYear, startMonth - 1, startDay);
      const endDate = new Date(currentYear, endMonth - 1, endDay, 23, 59, 59);
      
      // Handle year wrap
      if (endMonth < startMonth) {
        if (currentMonth <= endMonth) {
          startDate.setFullYear(currentYear - 1);
        } else {
          endDate.setFullYear(currentYear + 1);
        }
      }
      
      return now >= startDate && now <= endDate;
    } catch {
      return true;
    }
  };

  // Filter products
  const filteredProducts = products.filter((product: Product) => {
    const matchesQuery =
      !query ||
      product.nameKo.toLowerCase().includes(query.toLowerCase()) ||
      product.productId.includes(query);
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    
    // For deals filter, check both discount price and active discount period
    let matchesDeals = true;
    if (showDealsOnly) {
      const hasDiscount = product.originalPrice && product.originalPrice > product.currentPrice;
      const isActive = !product.discountPeriod || isDiscountPeriodActive(product.discountPeriod);
      matchesDeals = hasDiscount && isActive;
    }
    
    return matchesQuery && matchesCategory && matchesDeals;
  });

  // Sort products - default to newest (based on array order from DB which is already sorted by created_at)
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'discount':
        // 할인율 = (할인가 / 판매가) * 100
        const discountAmountA = a.discountPrice ?? (a.originalPrice ? a.originalPrice - a.currentPrice : 0);
        const discountAmountB = b.discountPrice ?? (b.originalPrice ? b.originalPrice - b.currentPrice : 0);
        const discountA = a.originalPrice ? (discountAmountA / a.originalPrice) * 100 : 0;
        const discountB = b.originalPrice ? (discountAmountB / b.originalPrice) * 100 : 0;
        return discountB - discountA;
      case 'likes':
        return (likeCounts[b.productId] || 0) - (likeCounts[a.productId] || 0);
      case 'name':
        return a.nameKo.localeCompare(b.nameKo, 'ko');
      case 'newest':
      default:
        // Keep original order from DB (already sorted by created_at desc)
        return 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, selectedCategory, showDealsOnly, sortBy]);

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

  const handleInquiryClick = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (!currentUserId) {
      toast({ title: '로그인이 필요합니다', variant: 'destructive' });
      navigate('/auth');
      return;
    }
    setInquiryProduct({
      product_id: product.productId,
      name: product.nameKo,
      current_price: product.currentPrice,
    });
    setIsInquiryOpen(true);
  };

  return (
    <div className="min-h-screen bg-background safe-bottom pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <SearchBar
              onSearch={setQuery}
              placeholder="상품명 또는 상품번호 검색"
            />
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="px-4 py-3 border-b border-border">
        {/* Category Grid with Counts - Larger size */}
        <div className="grid grid-cols-4 md:grid-cols-6 gap-3 pb-2">
          {categories.slice(0, 12).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 md:p-4 rounded-xl transition-colors",
                selectedCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
              )}
            >
              <span className="text-2xl md:text-3xl">{cat.icon}</span>
              <span className="text-xs md:text-sm font-medium text-center line-clamp-1">{cat.nameKo}</span>
              <span className={cn(
                "text-[10px] md:text-xs",
                selectedCategory === cat.id ? "text-primary-foreground/80" : "text-muted-foreground"
              )}>
                ({getCategoryCount(cat.id)})
              </span>
            </button>
          ))}
        </div>
        {/* Sort Options */}
        <div className="relative mt-3">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-1 text-sm font-medium text-foreground"
          >
            {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
            <ChevronDown className={cn("h-4 w-4 transition-transform", showSortDropdown && "rotate-180")} />
          </button>
          {showSortDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-card rounded-lg shadow-lg border border-border z-10">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSortBy(option.value);
                    setShowSortDropdown(false);
                  }}
                  className={cn(
                    "block w-full px-4 py-2 text-sm text-left hover:bg-muted transition-colors",
                    sortBy === option.value && "text-primary font-medium"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <main className="px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <p className="text-sm text-muted-foreground">
            검색결과 <span className="font-semibold text-foreground">{sortedProducts.length}</span>개
          </p>
          {selectedCategory && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              {categories.find(c => c.id === selectedCategory)?.nameKo}
            </span>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : paginatedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="text-5xl mb-4">🔍</span>
            <p className="text-lg font-medium text-foreground">검색 결과가 없습니다</p>
            <p className="text-sm text-muted-foreground mt-1">다른 키워드로 검색해보세요</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {paginatedProducts.map((product) => {
                const isLiked = likedProducts.has(product.productId);
                const hasDiscount = product.originalPrice && product.originalPrice > product.currentPrice;
                const discountAmount = product.discountPrice ?? (product.originalPrice ? product.originalPrice - product.currentPrice : 0);
                const discountPercent = hasDiscount 
                  ? getDiscountPercent(product.originalPrice!, discountAmount)
                  : 0;
                
                return (
                  <div
                    key={product.productId}
                    onClick={() => navigate(`/product/${product.productId}`)}
                    className="bg-card rounded-xl shadow-card cursor-pointer transition-all hover:shadow-card-lg overflow-hidden"
                  >
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      <img
                        src={product.image}
                        alt={product.nameKo}
                        className="h-full w-full object-cover"
                      />
                      {hasDiscount && (
                        <div className="absolute left-0 top-0 rounded-br-lg bg-primary px-1.5 py-0.5">
                          <span className="text-[10px] font-bold text-primary-foreground">{discountPercent}%</span>
                        </div>
                      )}
                      <button
                        onClick={(e) => handleLikeToggle(e, product.productId)}
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
                      <p className="text-[10px] text-muted-foreground">{product.productId}</p>
                      <h3 className="font-medium text-foreground line-clamp-2 text-xs mt-0.5">
                        {product.nameKo}
                        {reviewCounts[product.productId] > 0 && (
                          <span className="text-muted-foreground font-normal ml-0.5">({reviewCounts[product.productId]})</span>
                        )}
                      </h3>
                      <div className="mt-1">
                        {hasDiscount && (
                          <p className="text-[10px] text-muted-foreground line-through">{formatPrice(product.originalPrice!)}</p>
                        )}
                        <p className="text-primary font-bold text-sm">{formatPrice(product.currentPrice)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
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

export default Search;
