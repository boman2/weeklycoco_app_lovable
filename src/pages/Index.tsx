import { useState, useEffect } from 'react';
import { ChevronRight, TrendingDown, Tag, Heart, Star, MessageSquare, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '@/components/SearchBar';
import CategoryChip from '@/components/CategoryChip';
import ProductCard from '@/components/ProductCard';
import AdBanner from '@/components/AdBanner';
import { categories, stores } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { isDiscountPeriodActiveKST } from '@/lib/discount';
import SEOHead from '@/components/SEOHead';

interface ProductStats {
  totalProducts: number;
  discountProducts: number;
}

interface CategoryCount {
  category: string;
  count: number;
}

interface DiscussionPost {
  id: string;
  title: string;
  image_url: string | null;
  user_id: string;
  created_at: string;
  category: string;
  commentCount: number;
  likeCount: number;
  nickname: string;
  linked_product_id: string | null;
}

const Index = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ProductStats>({ totalProducts: 0, discountProducts: 0 });
  const [categoryStats, setCategoryStats] = useState<CategoryCount[]>([]);
  const [discountProducts, setDiscountProducts] = useState<any[]>([]);
  const [popularProducts, setPopularProducts] = useState<any[]>([]);
  const [recentPriceChanges, setRecentPriceChanges] = useState<any[]>([]);
  const [generalPosts, setGeneralPosts] = useState<DiscussionPost[]>([]);
  const [dealPosts, setDealPosts] = useState<DiscussionPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const takeUnique = (ids: string[], limit: number) => {
      const out: string[] = [];
      const seen = new Set<string>();
      for (const id of ids) {
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(id);
        if (out.length >= limit) break;
      }
      return out;
    };

    const fetchStats = async () => {
      try {
        setIsLoading(true);

        // Get this week's start date (Monday)
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() + mondayOffset);
        weekStart.setHours(0, 0, 0, 0);
        const weekStartIso = weekStart.toISOString();

        // 1) Fetch lightweight stats + recent price records in parallel
        const [totalRes, categoryRes, discountRes, recentRes, likesRes] = await Promise.all([
          supabase.from('products').select('*', { count: 'exact', head: true }),
          supabase.from('products').select('category'),
          supabase
            .from('price_history')
            .select('product_id, current_price, selling_price, discount_price, discount_period, recorded_at, image_url')
            .not('discount_price', 'is', null)
            .gte('recorded_at', weekStartIso)
            .order('recorded_at', { ascending: false })
            .limit(800),
          supabase
            .from('price_history')
            .select('product_id, current_price, selling_price, discount_price, discount_period, recorded_at, image_url')
            .order('recorded_at', { ascending: false })
            .limit(800),
          supabase.from('likes').select('product_id'),
        ]);

        // Category stats
        const catCounts: { [key: string]: number } = {};
        categoryRes.data?.forEach((p) => {
          catCounts[p.category] = (catCounts[p.category] || 0) + 1;
        });
        setCategoryStats(Object.entries(catCounts).map(([category, count]) => ({ category, count })));

        // Discount products count (this week) - unique product IDs
        const discountRows = discountRes.data || [];
        const uniqueDiscountProducts = new Set(discountRows.map((d) => d.product_id));

        setStats({
          totalProducts: totalRes.count || 0,
          discountProducts: uniqueDiscountProducts.size,
        });

        // Likes count (used for Popular)
        const likeCounts: Record<string, number> = {};
        likesRes.data?.forEach((l) => {
          likeCounts[l.product_id] = (likeCounts[l.product_id] || 0) + 1;
        });

        // Price history count as fallback popularity metric
        const priceHistoryCounts: Record<string, number> = {};
        (recentRes.data || []).forEach((r: any) => {
          priceHistoryCounts[r.product_id] = (priceHistoryCounts[r.product_id] || 0) + 1;
        });

        // Combine likes first, then fallback to price history count
        const hasAnyLikes = Object.keys(likeCounts).length > 0;
        
        let popularIdsTop50: string[];
        if (hasAnyLikes) {
          popularIdsTop50 = Object.entries(likeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 50)
            .map(([productId]) => productId);
        } else {
          // Fallback: use products with most price registrations
          popularIdsTop50 = Object.entries(priceHistoryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 50)
            .map(([productId]) => productId);
        }

        // IDs we need to render (small set)
        const discountIds = takeUnique(discountRows.map((r: any) => r.product_id), 24);
        const recentIds = takeUnique((recentRes.data || []).map((r: any) => r.product_id), 40);

        const productIdsNeeded = Array.from(new Set([...discountIds, ...recentIds, ...popularIdsTop50]));

        // 2) Fetch just the products we need + their reviews + (popular) latest price records
        const [productsRes, reviewsRes, popularPriceRes] = await Promise.all([
          productIdsNeeded.length
            ? supabase
                .from('products')
                .select('product_id, name, category, image_url, product_image_url')
                .in('product_id', productIdsNeeded)
            : Promise.resolve({ data: [] as any[] }),
          productIdsNeeded.length
            ? supabase.from('product_reviews').select('product_id').in('product_id', productIdsNeeded)
            : Promise.resolve({ data: [] as any[] }),
          popularIdsTop50.length
            ? supabase
                .from('price_history')
                .select('product_id, current_price, selling_price, discount_price, discount_period, recorded_at, image_url')
                .in('product_id', popularIdsTop50)
                .order('recorded_at', { ascending: false })
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const productMap: Record<string, any> = {};
        productsRes.data?.forEach((p: any) => {
          productMap[p.product_id] = p;
        });

        const reviewCounts: Record<string, number> = {};
        reviewsRes.data?.forEach((r: any) => {
          reviewCounts[r.product_id] = (reviewCounts[r.product_id] || 0) + 1;
        });

        // Build a "latest price" map by keeping the first record per product_id (queries are ordered desc)
        const latestPriceByProduct = new Map<string, any>();
        const fillLatest = (rows?: any[]) => {
          rows?.forEach((row) => {
            if (!latestPriceByProduct.has(row.product_id)) latestPriceByProduct.set(row.product_id, row);
          });
        };
        fillLatest(recentRes.data || []);
        fillLatest(discountRows);
        fillLatest(popularPriceRes.data || []);

        const toCard = (productId: string) => {
          const p = productMap[productId];
          const latest = latestPriceByProduct.get(productId);

          const hasActiveDiscount = !!(
            latest?.discount_price &&
            latest.discount_price > 0 &&
            isDiscountPeriodActiveKST(latest.discount_period || undefined)
          );

          return {
            id: productId,
            productId,
            name: p?.name || productId,
            nameKo: p?.name || productId,
            category: p?.category || '',
            image: p?.product_image_url || latest?.image_url || p?.image_url || '/placeholder.svg',
            currentPrice: hasActiveDiscount
              ? (latest?.current_price || 0)
              : (latest?.selling_price || latest?.current_price || 0),
            originalPrice: hasActiveDiscount ? latest?.selling_price : undefined,
            discountPrice: hasActiveDiscount ? latest?.discount_price : undefined,
            discountPeriod: hasActiveDiscount ? (latest?.discount_period || undefined) : undefined,
            unit: '1개',
            hasDiscount: hasActiveDiscount,
            likeCount: likeCounts[productId] || 0,
            reviewCount: reviewCounts[productId] || 0,
          };
        };

        // Discount products (top 6)
        const discountProductsList = discountIds
          .map(toCard)
          .filter((p) => p.hasDiscount)
          .slice(0, 6);
        setDiscountProducts(discountProductsList);

        // Recent price changes (top 12)
        setRecentPriceChanges(recentIds.map(toCard).slice(0, 12));

        // Popular products (top 6 by likes)
        const popularProductsList = popularIdsTop50
          .slice(0, 6)
          .map(toCard)
          .map((p, idx) => ({ ...p, rank: idx + 1 }));
        setPopularProducts(popularProductsList);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchDiscussionPosts = async () => {
      try {
        // Fetch general posts (newest first)
        const { data: generalData } = await supabase
          .from('discussions')
          .select('id, title, image_url, user_id, created_at, category, linked_product_id')
          .eq('category', 'general')
          .order('created_at', { ascending: false })
          .limit(5);

        // Fetch deal posts (newest first)
        const { data: dealData } = await supabase
          .from('discussions')
          .select('id, title, image_url, user_id, created_at, category, linked_product_id')
          .eq('category', 'deal')
          .order('created_at', { ascending: false })
          .limit(5);

        const allPosts = [...(generalData || []), ...(dealData || [])];
        
        if (allPosts.length > 0) {
          const userIds = [...new Set(allPosts.map(p => p.user_id))];
          const postIds = allPosts.map(p => p.id);

          const [profilesRes, commentsRes, likesRes] = await Promise.all([
            supabase.from('user_profiles').select('id, nickname').in('id', userIds),
            supabase.from('discussion_comments').select('discussion_id').in('discussion_id', postIds),
            supabase.from('discussion_likes').select('discussion_id').in('discussion_id', postIds)
          ]);

          const profileMap: Record<string, string> = {};
          profilesRes.data?.forEach(p => { profileMap[p.id] = p.nickname || '익명'; });

          const commentCounts: Record<string, number> = {};
          commentsRes.data?.forEach(c => { commentCounts[c.discussion_id] = (commentCounts[c.discussion_id] || 0) + 1; });

          const likeCounts: Record<string, number> = {};
          likesRes.data?.forEach(l => { likeCounts[l.discussion_id] = (likeCounts[l.discussion_id] || 0) + 1; });

          const mapPost = (post: any): DiscussionPost => ({
            ...post,
            nickname: profileMap[post.user_id] || '익명',
            commentCount: commentCounts[post.id] || 0,
            likeCount: likeCounts[post.id] || 0,
            linked_product_id: post.linked_product_id || null
          });

          setGeneralPosts((generalData || []).map(mapPost));
          setDealPosts((dealData || []).map(mapPost));
        }
      } catch (error) {
        console.error('Error fetching discussion posts:', error);
      }
    };

    fetchStats();
    fetchDiscussionPosts();
  }, []);

  const getCategoryCount = (categoryId: string) => {
    const stat = categoryStats.find(s => s.category === categoryId);
    return stat?.count || 0;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
  };

  const PostItem = ({ post, category }: { post: DiscussionPost; category: string }) => (
    <div
      onClick={() => navigate(`/community?category=${category}&post=${post.id}`)}
      className="flex items-center gap-2 p-2 rounded-lg bg-card hover:bg-muted transition-colors cursor-pointer"
    >
      <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-muted overflow-hidden">
        {post.image_url ? (
          <img src={post.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
            📝
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          {post.linked_product_id && (
            <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />
          )}
          <p className="text-sm font-medium text-foreground line-clamp-1">
            {post.title}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
        {post.commentCount > 0 && (
          <span className="flex items-center gap-0.5">
            <MessageSquare className="h-3 w-3" />
            {post.commentCount}
          </span>
        )}
        <span className="flex items-center gap-0.5">
          <Heart className="h-3 w-3" />
          {post.likeCount}
        </span>
      </div>
    </div>
  );

  return (
    <>
      <SEOHead />
      <div className="min-h-screen bg-background safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <a href="https://www.weeklycoco.kr" className="text-xl lg:text-2xl font-extrabold text-primary hover:opacity-80 transition-opacity">주간코코</a>
            {/* PC 헤더 배너 - 로고 우측 */}
            <AdBanner variant="header" />
          </div>
        </div>
        <div className="px-4 pb-4">
          <SearchBar onSearch={(q) => navigate(`/search?q=${q}`)} />
        </div>
      </header>

      <div className="flex gap-6">
        {/* Main Content */}
        <main className="flex-1 min-w-0 px-4 pb-8 space-y-6 sm:space-y-8">

        {/* Categories - 6x2 Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">카테고리</h2>
            <button 
              onClick={() => navigate('/category')}
              className="flex items-center gap-1 text-sm text-muted-foreground"
            >
              전체보기 <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {categories.slice(0, 12).map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/category?category_id=${encodeURIComponent(cat.id)}`)}
                className="flex flex-col items-center justify-center rounded-xl px-1 py-2 bg-card hover:bg-muted transition-colors"
              >
                <span className="text-lg md:text-2xl mb-0.5">{cat.icon}</span>
                <span className="text-[10px] md:text-xs font-medium text-foreground text-center truncate w-full">{cat.nameKo.split('/')[0]}</span>
                <span className="text-[9px] md:text-[10px] text-muted-foreground">({getCategoryCount(cat.id)})</span>
              </button>
            ))}
          </div>
        </section>

        {/* Discount Products (formerly Hot Deals) - Mobile: Horizontal cards like Bakery */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">할인상품</h2>
            </div>
            <button 
              onClick={() => navigate('/search?filter=deals')}
              className="flex items-center gap-1 text-sm text-primary font-medium"
            >
              더보기 <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : discountProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>이번 주 할인 상품이 없습니다</p>
            </div>
          ) : (
            <>
              {/* Mobile: Horizontal list, PC: Grid */}
              <div className="space-y-3 md:hidden">
                {discountProducts.slice(0, 4).map((product) => (
                  <ProductCard key={product.productId} product={product} variant="horizontal" reviewCount={product.reviewCount} />
                ))}
              </div>
              <div className="hidden md:grid md:grid-cols-6 gap-4">
                {discountProducts.slice(0, 6).map((product) => (
                  <ProductCard key={product.productId} product={product} variant="compact" reviewCount={product.reviewCount} />
                ))}
              </div>
            </>
          )}
        </section>

        {/* 모바일 인라인 배너 - 콘텐츠 사이 */}
        <AdBanner variant="inline" className="md:hidden" />

        {/* Popular Products Section - Thumbnail grid like Recent Price Changes */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">인기상품</h2>
            </div>
            <button 
              onClick={() => navigate('/popular-products')}
              className="flex items-center gap-1 text-sm text-primary font-medium"
            >
              더보기 <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : popularProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>등록된 상품이 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
              {popularProducts.map((product) => (
                <div
                  key={product.productId}
                  onClick={() => navigate(`/product/${product.productId}`)}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                    <img
                      src={product.image}
                      alt={product.nameKo}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    {/* Rank Badge */}
                    <div className="absolute left-1 top-1 z-10 flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-[10px] md:text-xs shadow-lg">
                      {product.rank}
                    </div>
                    {product.hasDiscount && (
                      <div className="absolute right-1 top-1 rounded bg-destructive px-1 py-0.5">
                        <span className="text-[8px] md:text-[10px] font-bold text-destructive-foreground">할인</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-1.5 overflow-hidden">
                    <h3 className="text-[10px] md:text-xs font-medium text-foreground truncate">
                      {product.nameKo.length > 8 ? `${product.nameKo.slice(0, 8)}..` : product.nameKo}
                      {product.reviewCount > 0 && (
                        <span className="text-muted-foreground font-normal ml-0.5">({product.reviewCount})</span>
                      )}
                    </h3>
                    <p className="text-xs md:text-sm font-bold text-primary mt-0.5">
                      {product.currentPrice.toLocaleString()}원
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Price Updates - Mobile: Horizontal cards like Bakery */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={() => navigate('/weekly-deals')}
              className="flex items-center gap-2 group"
            >
              <TrendingDown className="h-5 w-5 text-success" />
              <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">최근 가격 변동</h2>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentPriceChanges.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>등록된 상품이 없습니다</p>
            </div>
          ) : (
            <>
              {/* Mobile: Horizontal list, PC: Grid */}
              <div className="space-y-3 md:hidden">
                {recentPriceChanges.slice(0, 6).map((product) => (
                  <ProductCard key={product.productId} product={product} variant="horizontal" reviewCount={product.reviewCount} />
                ))}
              </div>
              <div className="hidden md:grid md:grid-cols-6 gap-3">
                {recentPriceChanges.slice(0, 12).map((product) => (
                  <ProductCard key={product.productId} product={product} variant="mini" reviewCount={product.reviewCount} />
                ))}
              </div>
            </>
          )}
        </section>

        {/* Discussion Posts Section */}
        {(generalPosts.length > 0 || dealPosts.length > 0) && (
          <section className="mt-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 자유게시판 */}
              <div className="rounded-2xl bg-card p-4 shadow-card">
                <div className="flex items-center justify-between mb-3">
                  <button 
                    onClick={() => navigate('/discussion?category=general')}
                    className="font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    자유게시판 →
                  </button>
                </div>
                <div className="space-y-2">
                  {generalPosts.length > 0 ? (
                    generalPosts.map(post => <PostItem key={post.id} post={post} category="general" />)
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">아직 글이 없습니다</p>
                  )}
                </div>
              </div>

              {/* 할인정보 */}
              <div className="rounded-2xl bg-card p-4 shadow-card">
                <div className="flex items-center justify-between mb-3">
                  <button 
                    onClick={() => navigate('/discussion?category=deal')}
                    className="font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    할인정보 →
                  </button>
                </div>
                <div className="space-y-2">
                  {dealPosts.length > 0 ? (
                    dealPosts.map(post => <PostItem key={post.id} post={post} category="deal" />)
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">아직 글이 없습니다</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
        </main>

        {/* PC 사이드바 광고 영역 */}
        <AdBanner variant="sidebar" className="pr-4" />
      </div>
      </div>
    </>
  );
};

export default Index;
