import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Flame, Loader2, Heart, TrendingUp, ArrowUpDown, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isDiscountPeriodActiveKST, parseDiscountPeriod } from '@/lib/discount';
import { formatPrice, getDiscountPercent, categories } from '@/data/mockData';
import { cn } from '@/lib/utils';

type SortOption = 'score' | 'discount' | 'likes' | 'price_low' | 'price_high';

interface PopularProduct {
  id: string;
  productId: string;
  name: string;
  nameKo: string;
  category: string;
  image: string;
  currentPrice: number;
  originalPrice?: number;
  hasDiscount: boolean;
  discountPeriod?: string;
  discountPercent: number;
  likeCount: number;
  viewScore: number; // Simulated view score based on price history count
  rank: number;
  categoryRank?: number;
  score: number;
}

const PopularProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<PopularProduct[]>([]);
  const [allProducts, setAllProducts] = useState<PopularProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('score');

  // Category list with "all" option
  const categoryOptions = [
    { id: 'all', nameKo: '전체', icon: '🏆' },
    ...categories
  ];

  useEffect(() => {
    const fetchPopularProducts = async () => {
      try {
        setIsLoading(true);

        // Fetch all products
        const { data: productsData } = await supabase
          .from('products')
          .select('*');

        if (!productsData || productsData.length === 0) {
          setProducts([]);
          setAllProducts([]);
          return;
        }

        const productIds = productsData.map(p => p.product_id);

        // Fetch likes, price data, and price history count in parallel
        const [likesRes, priceRes, priceHistoryCountRes] = await Promise.all([
          supabase.from('likes').select('product_id'),
          supabase.from('price_history').select('*').in('product_id', productIds).order('recorded_at', { ascending: false }),
          supabase.from('price_history').select('product_id')
        ]);

        // Count likes per product
        const likeCounts: Record<string, number> = {};
        likesRes.data?.forEach(l => {
          likeCounts[l.product_id] = (likeCounts[l.product_id] || 0) + 1;
        });

        // Count price history entries per product (simulates view/interest score)
        const viewScores: Record<string, number> = {};
        priceHistoryCountRes.data?.forEach(p => {
          viewScores[p.product_id] = (viewScores[p.product_id] || 0) + 1;
        });

        // Map products with price and like data - ONLY include products with active discounts
        const productsWithData = productsData
          .map(productInfo => {
            const latestPrice = priceRes.data?.find((p: any) => p.product_id === productInfo.product_id);
            
            const hasActiveDiscount = !!(
              latestPrice?.discount_price &&
              latestPrice.discount_price > 0 &&
              isDiscountPeriodActiveKST(latestPrice.discount_period || undefined)
            );

            // Only include products that are currently on discount
            if (!hasActiveDiscount) return null;

            const likeCount = likeCounts[productInfo.product_id] || 0;
            const viewScore = viewScores[productInfo.product_id] || 0;

            const currentPrice = latestPrice?.current_price || 0;
            const originalPrice = latestPrice?.selling_price || currentPrice;
            const discountAmount = latestPrice?.discount_price || 0;
            const discountPercent = originalPrice > 0 ? Math.round((discountAmount / originalPrice) * 100) : 0;

            return {
              id: productInfo.product_id,
              productId: productInfo.product_id,
              name: productInfo.name || productInfo.product_id,
              nameKo: productInfo.name || productInfo.product_id,
              category: productInfo.category || '',
              image: productInfo.product_image_url || latestPrice?.image_url || productInfo.image_url || '/placeholder.svg',
              currentPrice,
              originalPrice,
              hasDiscount: true,
              discountPeriod: latestPrice.discount_period,
              discountPercent,
              likeCount,
              viewScore,
              rank: 0,
              categoryRank: 0,
              score: 0
            };
          })
          .filter((p): p is NonNullable<typeof p> => p !== null);

        // Calculate composite score: likes * 3 + viewScore + discount bonus (2)
        const scoredProducts = productsWithData.map(p => ({
          ...p,
          score: p.likeCount * 3 + p.viewScore + 2 // All products have discount bonus since we filter above
        }));

        // Sort by score and assign overall ranks (top 50)
        const sortedProducts = scoredProducts
          .sort((a, b) => b.score - a.score)
          .slice(0, 50)
          .map((p, idx) => ({ ...p, rank: idx + 1 }));

        // Calculate category ranks
        const categoryGroups: Record<string, typeof sortedProducts> = {};
        sortedProducts.forEach(p => {
          if (!categoryGroups[p.category]) {
            categoryGroups[p.category] = [];
          }
          categoryGroups[p.category].push(p);
        });

        // Assign category ranks
        Object.values(categoryGroups).forEach(group => {
          group.forEach((p, idx) => {
            p.categoryRank = idx + 1;
          });
        });

        setAllProducts(sortedProducts);
        setProducts(sortedProducts);
      } catch (error) {
        console.error('Error fetching popular products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPopularProducts();
  }, []);

  // Format discount period to readable format
  const formatDiscountPeriod = (period?: string): string => {
    if (!period) return '';
    const parsed = parseDiscountPeriod(period);
    if (!parsed) return '';
    
    const formatDate = (date: Date) => {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    };
    
    return `${formatDate(parsed.start)} ~ ${formatDate(parsed.end)}`;
  };

  // Sort and filter products
  const sortedAndFilteredProducts = useMemo(() => {
    let filtered = selectedCategory === 'all' 
      ? [...allProducts]
      : allProducts.filter(p => p.category === selectedCategory);

    // Sort based on selected option
    switch (sortOption) {
      case 'discount':
        filtered.sort((a, b) => b.discountPercent - a.discountPercent);
        break;
      case 'likes':
        filtered.sort((a, b) => b.likeCount - a.likeCount);
        break;
      case 'price_low':
        filtered.sort((a, b) => a.currentPrice - b.currentPrice);
        break;
      case 'price_high':
        filtered.sort((a, b) => b.currentPrice - a.currentPrice);
        break;
      case 'score':
      default:
        filtered.sort((a, b) => b.score - a.score);
        break;
    }

    // Re-assign ranks after sorting
    return filtered.map((p, idx) => ({ ...p, rank: idx + 1 }));
  }, [selectedCategory, allProducts, sortOption]);

  // Update products when sort/filter changes
  useEffect(() => {
    setProducts(sortedAndFilteredProducts);
  }, [sortedAndFilteredProducts]);

  // Sort options
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'score', label: '인기순' },
    { value: 'discount', label: '할인율순' },
    { value: 'likes', label: '좋아요순' },
    { value: 'price_low', label: '낮은가격순' },
    { value: 'price_high', label: '높은가격순' },
  ];

  const ProductCardWithRank = ({ product, showCategoryRank }: { product: PopularProduct; showCategoryRank: boolean }) => {
    const [isLiked, setIsLiked] = useState(false);

    const handleLike = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsLiked(!isLiked);
    };

    const displayRank = showCategoryRank ? product.categoryRank : product.rank;
    const formattedPeriod = formatDiscountPeriod(product.discountPeriod);

    // Rank badge color based on position
    const getRankBadgeStyle = (rank: number) => {
      if (rank === 1) return 'bg-amber-500 text-white';
      if (rank === 2) return 'bg-gray-400 text-white';
      if (rank === 3) return 'bg-amber-700 text-white';
      return 'bg-primary text-primary-foreground';
    };

    return (
      <div
        onClick={() => navigate(`/product/${product.productId}`)}
        className="group cursor-pointer"
      >
        <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
          <img
            src={product.image}
            alt={product.nameKo}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
          {/* Rank Badge */}
          <div className={cn(
            "absolute left-1.5 top-1.5 z-10 flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-full font-bold text-[10px] md:text-xs shadow-lg",
            getRankBadgeStyle(displayRank || 0)
          )}>
            {displayRank}
          </div>
          {product.hasDiscount && (
            <div className="absolute right-1.5 top-1.5 rounded-lg bg-primary px-1.5 py-0.5">
              <span className="text-[9px] md:text-[10px] font-bold text-primary-foreground">{product.discountPercent}%</span>
            </div>
          )}
          <button
            onClick={handleLike}
            className="absolute right-1.5 bottom-1.5 transition-all hover:scale-110"
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
        <div className="mt-2">
          <h3 className="text-xs md:text-sm font-medium text-foreground line-clamp-2 leading-tight">
            {product.nameKo.length > 16 ? `${product.nameKo.slice(0, 16)}...` : product.nameKo}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            {product.hasDiscount && product.originalPrice && (
              <span className="text-[10px] md:text-xs text-muted-foreground line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
            <span className="text-sm md:text-base font-bold text-primary">
              {formatPrice(product.currentPrice)}
            </span>
          </div>
          {/* Discount Period */}
          {formattedPeriod && (
            <div className="flex items-center gap-1 mt-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="text-[10px]">{formattedPeriod}</span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-1 text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Heart className="h-3 w-3" />
              <span className="text-[10px]">{product.likeCount}</span>
            </span>
            <span className="flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" />
              <span className="text-[10px]">{product.viewScore}</span>
            </span>
          </div>
        </div>
      </div>
    );
  };

  const currentCategoryName = categoryOptions.find(c => c.id === selectedCategory)?.nameKo || '전체';

  return (
    <div className="min-h-screen bg-background safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ChevronLeft className="h-6 w-6 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">인기상품 TOP 50</h1>
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {categoryOptions.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <span className="text-base">{cat.icon}</span>
                <span className="text-xs md:text-sm">{cat.nameKo.split('/')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        {/* Sort Options */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex gap-1.5 min-w-max">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSortOption(option.value)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                  sortOption === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results info */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {currentCategoryName} 인기상품 <span className="font-medium text-foreground">{products.length}개</span>
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Flame className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>해당 카테고리에 인기상품이 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {products.map((product) => (
              <ProductCardWithRank 
                key={product.productId} 
                product={product} 
                showCategoryRank={selectedCategory !== 'all'}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default PopularProducts;
