import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Heart, Share2, ShoppingCart, Pencil, Upload, Clock, TrendingDown, Store, ClipboardList, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductReviews from '@/components/ProductReviews';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { isDiscountPeriodActiveKST, formatDiscountPeriod, getDiscountStartDisplay, getDiscountStartKey } from '@/lib/discount';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import SEOHead from '@/components/SEOHead';

// Deduplication helper using discount start key + current_price
const buildDedupeKey = (discountPeriod: string | null, currentPrice: number): string => {
  const startKey = getDiscountStartKey(discountPeriod) || 0;
  return `${startKey}_${currentPrice}`;
};

interface Product {
  product_id: string;
  name: string;
  category: string;
  image_url: string | null;
  product_image_url: string | null;
}

interface PriceHistory {
  id: string;
  product_id: string;
  store_id: string;
  user_id: string;
  selling_price: number;
  discount_price: number | null;
  current_price: number;
  discount_period: string | null;
  recorded_at: string;
  image_url: string | null;
}

interface StoreData {
  id: string;
  name: string;
  region: string;
}

// Image Carousel Component with clear distinction
interface ImageCarouselProps {
  productImage: string | null | undefined;
  priceTagImage: string | null;
  productName: string;
  isAdmin: boolean;
  uploadingImage: 'price' | 'product' | null;
  onImageUpload: (type: 'price' | 'product', file: File) => void;
}

const ImageCarousel = ({ productImage, priceTagImage, productName, isAdmin, uploadingImage, onImageUpload }: ImageCarouselProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [api, setApi] = useState<any>(null);
  
  const images = [
    { 
      type: 'product' as const, 
      src: productImage, 
      label: '상품 이미지',
      icon: '📦',
      description: '실제 상품 사진',
      placeholder: '상품의 실제 모습을 보여주는 사진을 올려주세요',
      warningText: '⚠️ 가격표가 아닌 상품 사진만 업로드해주세요',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      iconBg: 'bg-blue-500'
    },
    { 
      type: 'price' as const, 
      src: priceTagImage, 
      label: '가격표 이미지',
      icon: '🏷️',
      description: '코스트코 가격표',
      placeholder: '코스트코 매장의 가격표를 촬영해 올려주세요',
      warningText: '⚠️ 상품 사진이 아닌 가격표만 업로드해주세요',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      iconBg: 'bg-orange-500'
    },
  ].filter(img => img.src || isAdmin);

  useEffect(() => {
    if (!api) return;
    
    const onSelect = () => {
      setCurrentSlide(api.selectedScrollSnap());
    };
    
    api.on('select', onSelect);
    onSelect();
    
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  return (
    <div className="relative">
      <Carousel className="w-full" opts={{ loop: true }} setApi={setApi}>
        <CarouselContent>
          {images.map((img) => (
            <CarouselItem key={img.type}>
              <div className={cn(
                "relative aspect-square rounded-2xl overflow-hidden border-2",
                img.src ? "border-border" : img.borderColor
              )}>
                {img.src ? (
                  <>
                    <img src={img.src} alt={img.label} className="h-full w-full object-cover" />
                    {/* Image type badge */}
                    <div className={cn(
                      "absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-xs font-medium shadow-lg",
                      img.iconBg
                    )}>
                      <span>{img.icon}</span>
                      <span>{img.label}</span>
                    </div>
                  </>
                ) : (
                  <div className={cn("h-full w-full flex flex-col items-center justify-center p-6", img.bgColor)}>
                    {/* Large icon */}
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-lg",
                      img.iconBg
                    )}>
                      {img.icon}
                    </div>
                    
                    {/* Label */}
                    <p className="font-bold text-foreground mb-1">{img.label}</p>
                    <p className="text-xs text-muted-foreground text-center mb-4">{img.placeholder}</p>
                    
                    {/* Warning message */}
                    <div className={cn(
                      "text-xs px-3 py-2 rounded-lg text-center",
                      img.type === 'product' ? "bg-blue-500/20 text-blue-700 dark:text-blue-300" : "bg-orange-500/20 text-orange-700 dark:text-orange-300"
                    )}>
                      {img.warningText}
                    </div>
                  </div>
                )}
                
                {/* Admin upload button */}
                {isAdmin && (
                  <label className={cn(
                    "absolute bottom-3 right-3 flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors shadow-lg",
                    img.src 
                      ? "bg-background/90 hover:bg-background" 
                      : cn("text-white", img.iconBg, "hover:opacity-90")
                  )}>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && onImageUpload(img.type, e.target.files[0])}
                      disabled={!!uploadingImage}
                    />
                    {uploadingImage === img.type ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : img.type === 'product' ? (
                      <Pencil className="h-4 w-4" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {img.src ? `${img.label} 수정` : `${img.label} 등록`}
                    </span>
                  </label>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      
      {/* Slide indicators with labels */}
      {images.length > 1 && (
        <div className="flex justify-center gap-3 mt-3">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                index === currentSlide 
                  ? cn("text-white shadow-md", img.iconBg)
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <span>{img.icon}</span>
              <span className="hidden sm:inline">{img.type === 'product' ? '상품' : '가격표'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Price Chart Component - Show discount prices based on discount start date
interface PriceChartProps {
  data: PriceHistory[];
}

const PriceChart = ({ data }: PriceChartProps) => {
  // Only show records with discount prices, use common parser for start date
  const chartData = data
    .filter(h => h.discount_price && h.discount_price > 0 && h.discount_period)
    .map((h) => {
      // Use common helper to extract standardized start date display
      const startDate = getDiscountStartDisplay(h.discount_period) || '';
      return {
        date: startDate,
        할인가: h.current_price,
        rawDate: h.recorded_at,
      };
    })
    .filter(d => d.date !== '')
    .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const visible = payload.filter((p: any) => p?.value != null);
    if (visible.length === 0) return null;

    return (
      <div className="rounded-lg bg-card p-3 shadow-lg border border-border">
        <p className="text-sm font-medium text-foreground mb-1">{label}</p>
        {visible.map((p: any, i: number) => (
          <p key={i} className="text-sm font-bold" style={{ color: p.color }}>
            {p.name}: {formatPrice(p.value)}
          </p>
        ))}
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground">
        할인 가격 데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="h-48 md:h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={chartData} 
          margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            interval="preserveStartEnd"
            tickMargin={5}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Discount price line */}
          <Line
            type="monotone"
            dataKey="할인가"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
            connectNulls={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Price History Table Component - 할인기간시작일, 종료일, 판매가, 할인금액, 할인가
interface PriceHistoryTableProps {
  data: PriceHistory[];
}

const PriceHistoryTable = ({ data }: PriceHistoryTableProps) => {
  const [showAll, setShowAll] = useState(false);
  const INITIAL_ROWS = 5;

  // Deduplicate by (discount start date) + current_price combination.
  // This also collapses cases like:
  // - "26.01.05 ~ 26.01.18" and "26.01.05 ~ 26.01.19" with same current_price
  // because they represent the same discount-start event.
  const uniqueData = useMemo(() => {
    const seen = new Set<string>();
    return data.filter((h) => {
      const key = buildDedupeKey(h.discount_period, h.current_price);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data]);

  if (uniqueData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        가격 기록이 없습니다
      </div>
    );
  }

  const displayData = showAll ? uniqueData : uniqueData.slice(0, INITIAL_ROWS);

  return (
    <div className="space-y-3">
      {/* Desktop Table */}
      <div className="hidden md:block rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-center font-semibold text-xs px-2" colSpan={2}>할인기간</TableHead>
              <TableHead className="text-center font-semibold text-xs px-2">판매가</TableHead>
              <TableHead className="text-center font-semibold text-xs px-2">할인금액</TableHead>
              <TableHead className="text-center font-semibold text-xs px-2">할인가</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((record, index) => {
              // discount_price can be either:
              // 1. Discount AMOUNT (e.g., 2500 means -2,500원 off) - when discount_price < selling_price * 0.5
              // 2. Discounted PRICE (e.g., 21990 is the final price) - when discount_price is close to current_price
              const isDiscountedPrice = record.discount_price && record.discount_price > record.selling_price * 0.3;
              const discountAmount = record.discount_price 
                ? (isDiscountedPrice ? record.selling_price - record.discount_price : record.discount_price)
                : 0;
              const discountedPrice = record.current_price;
              const discountPercent = discountAmount > 0 
                ? Math.round((discountAmount / record.selling_price) * 100) 
                : 0;

              return (
                <TableRow key={record.id} className={index === 0 ? "bg-primary/5" : ""}>
                  <TableCell className="text-center text-sm px-2" colSpan={2}>
                    {record.discount_period ? (
                      <span className="font-medium">{formatDiscountPeriod(record.discount_period)}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-sm font-medium px-2">
                    {formatPrice(record.selling_price)}
                  </TableCell>
                  <TableCell className="text-center px-2">
                    {discountAmount > 0 ? (
                      <span className="text-sm font-bold text-destructive">
                        {formatPrice(discountAmount)}({discountPercent}%)
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center px-2">
                    {discountAmount > 0 ? (
                      <span className="text-sm font-bold text-primary">
                        {formatPrice(discountedPrice)}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-2">
        {displayData.map((record, index) => {
          // discount_price can be either discount amount or discounted price
          const isDiscountedPrice = record.discount_price && record.discount_price > record.selling_price * 0.3;
          const discountAmount = record.discount_price 
            ? (isDiscountedPrice ? record.selling_price - record.discount_price : record.discount_price)
            : 0;
          const discountedPrice = record.current_price;
          const discountPercent = discountAmount > 0 
            ? Math.round((discountAmount / record.selling_price) * 100) 
            : 0;
          

          return (
            <div 
              key={record.id} 
              className={cn(
                "rounded-lg border border-border p-3",
                index === 0 ? "bg-primary/5 border-primary/30" : "bg-card"
              )}
            >
              {/* Date Row */}
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>할인기간</span>
                <span className="font-medium text-foreground">
                  {formatDiscountPeriod(record.discount_period) || "-"}
                </span>
              </div>
              
              {/* Price Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground mb-0.5">판매가</p>
                  <p className="text-xs font-medium">{formatPrice(record.selling_price)}</p>
                </div>
                <div className={cn(
                  "rounded-lg p-2",
                  discountAmount > 0 ? "bg-secondary/10" : "bg-muted/30"
                )}>
                  <p className="text-[10px] text-muted-foreground mb-0.5">할인</p>
                  {discountAmount > 0 ? (
                    <p className="text-xs font-bold text-secondary">{discountPercent}%</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">-</p>
                  )}
                </div>
                <div className={cn(
                  "rounded-lg p-2",
                  discountAmount > 0 ? "bg-primary text-primary-foreground" : "bg-muted/30"
                )}>
                  <p className={cn(
                    "text-[10px] mb-0.5",
                    discountAmount > 0 ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>할인가</p>
                  {discountAmount > 0 ? (
                    <p className="text-xs font-bold">{formatPrice(discountedPrice)}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">-</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {uniqueData.length > INITIAL_ROWS && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary hover:bg-primary/10 rounded-xl transition-colors border border-border"
        >
          <ChevronDown className="h-4 w-4" />
          더보기 ({uniqueData.length - INITIAL_ROWS}건)
        </button>
      )}
    </div>
  );
};

const ProductDetail = () => {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<'price' | 'product' | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [discountProductIds, setDiscountProductIds] = useState<string[]>([]);
  const [discountProducts, setDiscountProducts] = useState<{ product_id: string; name: string; image_url: string | null; current_price: number }[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!productId) return;

      try {
        const { data: productData } = await supabase
          .from('products')
          .select('*')
          .eq('product_id', productId)
          .maybeSingle();

        setProduct(productData);

        const { data: historyData } = await supabase
          .from('price_history')
          .select('*')
          .eq('product_id', productId)
          .order('recorded_at', { ascending: false });

        setPriceHistory(historyData || []);

        const { data: storesData } = await supabase
          .from('stores')
          .select('id, name, region');

        setStores(storesData || []);

        // Set default store - prioritize stores with active discounts
        if (historyData && historyData.length > 0 && storesData) {
          const storeLatestPrices = new Map<string, typeof historyData[0]>();
          historyData.forEach(h => {
            const existing = storeLatestPrices.get(h.store_id);
            if (!existing || new Date(h.recorded_at) > new Date(existing.recorded_at)) {
              storeLatestPrices.set(h.store_id, h);
            }
          });

          // Find store with active discount first
          let defaultStoreId: string | null = null;
          storeLatestPrices.forEach((price, storeId) => {
            if (!defaultStoreId && isDiscountPeriodActiveKST(price.discount_period) && price.discount_price && price.discount_price > 0) {
              defaultStoreId = storeId;
            }
          });

          // If no active discount, use first store with data
          if (!defaultStoreId) {
            const storesWithData = storesData.filter(s => historyData.some(h => h.store_id === s.id));
            if (storesWithData.length > 0) {
              defaultStoreId = storesWithData[0].id;
            }
          }

          if (defaultStoreId) {
            setSelectedStoreId(defaultStoreId);
          }
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle();
          
          setIsAdmin(!!roleData);

          const wishlist = JSON.parse(localStorage.getItem(`wishlist_${user.id}`) || '[]');
          setIsWishlisted(wishlist.includes(productId));

          const { data: likeData } = await supabase
            .from('likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('product_id', productId)
            .maybeSingle();
          
          setIsLiked(!!likeData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productId]);

  // Fetch discount products for navigation
  useEffect(() => {
    const fetchDiscountProducts = async () => {
      // Get this week's start date (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() + mondayOffset);
      weekStart.setHours(0, 0, 0, 0);

      const { data: priceData } = await supabase
        .from('price_history')
        .select('product_id, current_price, recorded_at')
        .not('discount_price', 'is', null)
        .gte('recorded_at', weekStart.toISOString())
        .order('recorded_at', { ascending: false });

      if (priceData) {
        // Get unique product IDs while preserving order
        const uniqueIds: string[] = [];
        const priceMap: Record<string, number> = {};
        priceData.forEach(p => {
          if (!uniqueIds.includes(p.product_id)) {
            uniqueIds.push(p.product_id);
            priceMap[p.product_id] = p.current_price;
          }
        });
        setDiscountProductIds(uniqueIds);

        // Fetch product details for drawer
        if (uniqueIds.length > 0) {
          const { data: productsData } = await supabase
            .from('products')
            .select('product_id, name, product_image_url')
            .in('product_id', uniqueIds);

          if (productsData) {
            const productsWithPrice = uniqueIds.map(id => {
              const prod = productsData.find(p => p.product_id === id);
              return {
                product_id: id,
                name: prod?.name || id,
                image_url: prod?.product_image_url || null,
                current_price: priceMap[id] || 0
              };
            });
            setDiscountProducts(productsWithPrice);
          }
        }
      }
    };
    fetchDiscountProducts();
  }, []);

  // Navigation for discount products
  const currentIndex = discountProductIds.indexOf(productId || '');
  const prevProductId = currentIndex > 0 ? discountProductIds[currentIndex - 1] : null;
  const nextProductId = currentIndex >= 0 && currentIndex < discountProductIds.length - 1 
    ? discountProductIds[currentIndex + 1] 
    : null;

  // Swipe gesture handling for mobile
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && nextProductId) {
      navigate(`/product/${nextProductId}`);
    } else if (isRightSwipe && prevProductId) {
      navigate(`/product/${prevProductId}`);
    }

    touchStartX.current = null;
    touchEndX.current = null;
  }, [navigate, nextProductId, prevProductId]);

  // Filter stores that have price data
  const storesWithData = useMemo(() => {
    return stores.filter(s => priceHistory.some(h => h.store_id === s.id));
  }, [stores, priceHistory]);

  // Get price history for selected store with deduplication
  const selectedStorePrices = useMemo(() => {
    if (!selectedStoreId) return [];

    // priceHistory is already ordered by recorded_at desc.
    // Keep the first (newest) record per key.
    const seen = new Set<string>();
    return priceHistory
      .filter((h) => h.store_id === selectedStoreId)
      .filter((h) => {
        const key = buildDedupeKey(h.discount_period, h.current_price);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [priceHistory, selectedStoreId]);

  const selectedStoreDiscountHistory = useMemo(
    () => selectedStorePrices.filter((p) => p.discount_price && p.discount_price > 0),
    [selectedStorePrices]
  );

  // All stores discount history (for unified view) - deduplicated
  const allStoresDiscountHistory = useMemo(() => {
    const discountRecords = priceHistory.filter((p) => p.discount_price && p.discount_price > 0);
    // Sort by recorded_at desc
    const sorted = [...discountRecords].sort(
      (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    );
    // Deduplicate by discount start date + current_price
    const seen = new Set<string>();
    return sorted.filter((h) => {
      const key = buildDedupeKey(h.discount_period, h.current_price);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [priceHistory]);

  // Store comparison: group stores by discount status (active discounts first)
  const storeComparison = useMemo(() => {
    const storeLatestPrices = new Map<string, PriceHistory>();
    
    // Get the latest price for each store
    priceHistory.forEach(h => {
      const existing = storeLatestPrices.get(h.store_id);
      if (!existing || new Date(h.recorded_at) > new Date(existing.recorded_at)) {
        storeLatestPrices.set(h.store_id, h);
      }
    });

    const discountStores: { store: StoreData; price: PriceHistory }[] = [];
    const regularStores: { store: StoreData; price: PriceHistory }[] = [];

    storeLatestPrices.forEach((price, storeId) => {
      const store = stores.find(s => s.id === storeId);
      if (!store) return;
      
      // Only show as discount if period is currently active AND discount_price > 0
      const isPeriodActive = isDiscountPeriodActiveKST(price.discount_period);
      if (isPeriodActive && price.discount_price && price.discount_price > 0) {
        discountStores.push({ store, price });
      } else {
        regularStores.push({ store, price });
      }
    });

    // Sort by price (cheapest first)
    discountStores.sort((a, b) => a.price.current_price - b.price.current_price);
    regularStores.sort((a, b) => a.price.selling_price - b.price.selling_price);

    return { discountStores, regularStores };
  }, [priceHistory, stores]);

  // Calculate lowest price across all stores
  const lowestPriceInfo = useMemo(() => {
    if (priceHistory.length === 0) return null;
    
    const storeLatestPrices = new Map<string, PriceHistory>();
    priceHistory.forEach(h => {
      const existing = storeLatestPrices.get(h.store_id);
      if (!existing || new Date(h.recorded_at) > new Date(existing.recorded_at)) {
        storeLatestPrices.set(h.store_id, h);
      }
    });

    let lowestPrice = Infinity;
    let lowestStore: StoreData | null = null;
    let lowestPriceRecord: PriceHistory | null = null;

    storeLatestPrices.forEach((price, storeId) => {
      const effectivePrice = price.current_price;
      if (effectivePrice < lowestPrice) {
        lowestPrice = effectivePrice;
        lowestStore = stores.find(s => s.id === storeId) || null;
        lowestPriceRecord = price;
      }
    });

    return lowestStore && lowestPriceRecord ? { store: lowestStore, price: lowestPriceRecord, effectivePrice: lowestPrice } : null;
  }, [priceHistory, stores]);

  // Get latest price for selected store
  const latestPrice = selectedStorePrices[0] || null;
  const selectedStore = stores.find(s => s.id === selectedStoreId);

  // discount_price can be either discount amount OR discounted price (data inconsistency)
  // Detect based on value: if > 30% of selling_price, it's likely the discounted price
  // Only show discount info if discount period is currently active
  const isDiscountActive = latestPrice ? isDiscountPeriodActiveKST(latestPrice.discount_period) : false;
  const isDiscountedPriceFormat = latestPrice?.discount_price && latestPrice.discount_price > latestPrice.selling_price * 0.3;
  const discountAmount = (isDiscountActive && latestPrice?.discount_price) 
    ? (isDiscountedPriceFormat ? latestPrice.selling_price - latestPrice.discount_price : latestPrice.discount_price)
    : 0;
  const discountedPrice = latestPrice?.current_price || 0;
  const displayPrice = isDiscountActive ? discountedPrice : (latestPrice?.selling_price || 0);
  const discountPercent = discountAmount > 0 && latestPrice
    ? Math.round((discountAmount / latestPrice.selling_price) * 100)
    : 0;

  const handleWishlistToggle = async () => {
    if (!currentUserId || !productId) {
      toast({
        title: '로그인 필요',
        description: '관심상품 등록은 로그인이 필요합니다.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    const wishlist = JSON.parse(localStorage.getItem(`wishlist_${currentUserId}`) || '[]');
    
    if (isWishlisted) {
      const newWishlist = wishlist.filter((id: string) => id !== productId);
      localStorage.setItem(`wishlist_${currentUserId}`, JSON.stringify(newWishlist));
      setIsWishlisted(false);
      toast({ title: '관심상품에서 삭제되었습니다' });
    } else {
      wishlist.push(productId);
      localStorage.setItem(`wishlist_${currentUserId}`, JSON.stringify(wishlist));
      setIsWishlisted(true);
      toast({ title: '관심상품에 등록되었습니다' });
    }
  };

  const handleLikeToggle = async () => {
    if (!currentUserId || !productId) {
      toast({
        title: '로그인 필요',
        description: '좋아요는 로그인이 필요합니다.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (isLiked) {
      await supabase
        .from('likes')
        .delete()
        .eq('user_id', currentUserId)
        .eq('product_id', productId);
      setIsLiked(false);
      toast({ title: '좋아요가 취소되었습니다' });
    } else {
      await supabase
        .from('likes')
        .insert({ user_id: currentUserId, product_id: productId });
      setIsLiked(true);
      toast({ title: '좋아요가 등록되었습니다' });
    }
  };

  const handleAddToMemo = async () => {
    if (!currentUserId) {
      toast({
        title: '로그인 필요',
        description: '쇼핑메모 추가는 로그인이 필요합니다.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (!product || !lowestPriceInfo) {
      toast({
        title: '가격 정보 없음',
        description: '등록된 가격 정보가 없어 메모에 추가할 수 없습니다.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Check if already in memo
      const { data: existingMemo } = await supabase
        .from('shopping_memo')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('product_id', product.product_id)
        .maybeSingle();

      if (existingMemo) {
        toast({
          title: '이미 메모에 있습니다',
          description: '해당 상품은 이미 쇼핑메모에 추가되어 있습니다.',
        });
        return;
      }

      const { error } = await supabase
        .from('shopping_memo')
        .insert({
          user_id: currentUserId,
          product_id: product.product_id,
          product_name: product.name,
          estimated_price: Math.round(lowestPriceInfo.effectivePrice),
          store_id: lowestPriceInfo.store.id,
          store_name: lowestPriceInfo.store.name,
        });

      if (error) throw error;

      toast({
        title: '쇼핑메모에 추가되었습니다',
        description: `${product.name} - ${formatPrice(lowestPriceInfo.effectivePrice)} (${lowestPriceInfo.store.name})`,
      });
    } catch (error) {
      console.error('Add to memo error:', error);
      toast({
        title: '추가 실패',
        description: '쇼핑메모 추가 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleImageUpload = async (type: 'price' | 'product', file: File) => {
    if (!product || !isAdmin) return;

    setUploadingImage(type);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${product.product_id}/${type}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('price-tags')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('price-tags')
        .getPublicUrl(fileName);

      const updateField = type === 'price' ? 'image_url' : 'product_image_url';
      const { error: updateError } = await supabase
        .from('products')
        .update({ [updateField]: publicUrl })
        .eq('product_id', product.product_id);

      if (updateError) throw updateError;

      setProduct(prev => prev ? { ...prev, [updateField]: publicUrl } : null);
      toast({ title: '이미지가 업로드되었습니다' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: '이미지 업로드 실패', variant: 'destructive' });
    } finally {
      setUploadingImage(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">상품을 찾을 수 없습니다</p>
      </div>
    );
  }

  const productImage = product.product_image_url || product.image_url || latestPrice?.image_url;

  return (
    <>
      {/* SEO 메타 태그 */}
      <SEOHead
        title={product.name}
        description={`${product.name} - ${product.category} | 코스트코 가격 정보, 할인 정보, 매장별 가격 비교`}
        image={productImage || undefined}
        url={`https://cocohub.kr/product/${product.product_id}`}
        type="product"
        product={{
          name: product.name,
          price: latestPrice?.current_price || 0,
          currency: 'KRW',
          availability: 'InStock',
          category: product.category,
          sku: product.product_id,
          image: productImage || undefined,
        }}
      />
      <div 
        className="min-h-screen bg-background safe-bottom"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-2 bg-background/95 px-4 py-3 backdrop-blur-lg border-b border-border">
        <button
          onClick={() => prevProductId ? navigate(`/product/${prevProductId}`) : navigate(-1)}
          className={cn(
            "flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
            prevProductId ? "hover:bg-muted" : "hover:bg-muted"
          )}
          title={prevProductId ? "이전 할인 상품" : "뒤로 가기"}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0 text-center overflow-hidden">
          <h1 className="font-semibold text-foreground truncate">{product.name}</h1>
          {discountProductIds.length > 0 && currentIndex >= 0 && (
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="text-[10px] text-primary hover:underline"
            >
              할인상품 {currentIndex + 1}/{discountProductIds.length} · 목록보기
            </button>
          )}
        </div>
        <button
          onClick={() => nextProductId && navigate(`/product/${nextProductId}`)}
          disabled={!nextProductId}
          className={cn(
            "flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
            nextProductId 
              ? "hover:bg-muted text-foreground" 
              : "text-muted-foreground/30 cursor-not-allowed"
          )}
          title={nextProductId ? "다음 할인 상품" : "다음 상품 없음"}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </header>

      {/* Breadcrumb */}
      <div className="px-4 py-2 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-primary">홈</Link>
        <span className="mx-2">&gt;</span>
        <Link to={`/category?category_id=${encodeURIComponent(product.category)}`} className="hover:text-primary">
          {product.category}
        </Link>
        <span className="mx-2">&gt;</span>
        <span className="text-foreground">{product.name}</span>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-8 space-y-6">
        {/* Product Info Section */}
        <section className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Product Image */}
          <div className="md:w-1/3">
            <ImageCarousel
              productImage={productImage}
              priceTagImage={product.image_url}
              productName={product.name}
              isAdmin={isAdmin}
              uploadingImage={uploadingImage}
              onImageUpload={handleImageUpload}
            />
          </div>

          {/* Product Summary */}
          <div className="flex-1 space-y-5">
            {/* Header */}
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                {product.category}
              </span>
              <h1 className="text-xl font-bold text-foreground leading-tight">{product.name}</h1>
              <p className="text-xs text-muted-foreground">상품번호: {product.product_id}</p>
            </div>

            {/* Store Selector - Compact */}
            {storesWithData.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">매장:</span>
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="bg-transparent border-none text-foreground font-medium focus:outline-none cursor-pointer"
                >
                  {storesWithData.map(store => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Price Info - Cocodalin Style */}
            {latestPrice && selectedStore && (
              <div className="space-y-4">
                {/* Main Price Display */}
                <div className="space-y-2">
                  {/* Discount Badge + Original Price */}
                  {discountAmount > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-bold bg-secondary text-secondary-foreground rounded">
                        {discountPercent}%
                      </span>
                      <span className="text-muted-foreground line-through">
                        {formatPrice(latestPrice.selling_price)}
                      </span>
                      <span className="text-secondary text-sm">
                        -{formatPrice(discountAmount)} 할인
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">판매가</span>
                    </div>
                  )}
                  
                  {/* Current Price - Large */}
                  <p className={cn(
                    "text-3xl font-bold",
                    discountAmount > 0 ? "text-secondary" : "text-foreground"
                  )}>
                    {formatPrice(displayPrice)}
                  </p>
                  
                  {/* Discount Status */}
                  {discountAmount > 0 && (
                    <span className="inline-block text-sm text-secondary font-medium">
                      할인 중
                    </span>
                  )}
                </div>
                
                {/* Discount Period */}
                {latestPrice.discount_period && (
                  <div className={cn(
                    "text-sm border-l-2 pl-3",
                    isDiscountActive 
                      ? "text-muted-foreground border-primary"
                      : "text-muted-foreground/60 border-muted"
                  )}>
                    할인 기간: {formatDiscountPeriod(latestPrice.discount_period)}
                    {!isDiscountActive && latestPrice.discount_price && latestPrice.discount_price > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">(종료됨)</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* No store selected */}
            {!selectedStoreId && storesWithData.length > 0 && (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center">
                <Store className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">매장을 선택하면 가격 정보를 확인할 수 있습니다</p>
              </div>
            )}

            {/* No price data */}
            {storesWithData.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center">
                <p className="text-sm text-muted-foreground mb-3">아직 등록된 가격 정보가 없습니다</p>
                <Button variant="outline" size="sm">
                  가격 등록하고 5포인트 받기!
                </Button>
              </div>
            )}

            {/* Action Buttons - Horizontal Layout */}
            <div className="flex items-center gap-2 md:gap-3 pt-4 border-t border-border">
              <button
                onClick={handleAddToMemo}
                className="flex items-center justify-center gap-2 p-2 md:px-4 md:py-2 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <ClipboardList className="h-4 w-4" />
                <span className="hidden md:inline text-sm">쇼핑메모</span>
              </button>
              <button
                onClick={handleWishlistToggle}
                className={cn(
                  "flex items-center justify-center gap-2 p-2 md:px-4 md:py-2 rounded-lg border transition-colors",
                  isWishlisted 
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted"
                )}
              >
                <ShoppingCart className={cn("h-4 w-4", isWishlisted && "fill-current")} />
                <span className="hidden md:inline text-sm">관심상품</span>
              </button>
              <button
                onClick={handleLikeToggle}
                className={cn(
                  "flex items-center justify-center gap-2 p-2 md:px-4 md:py-2 rounded-lg border transition-colors",
                  isLiked 
                    ? "border-secondary bg-secondary/10 text-secondary"
                    : "border-border hover:bg-muted"
                )}
              >
                <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                <span className="hidden md:inline text-sm">좋아요</span>
              </button>
              <button
                onClick={() => {
                  navigator.share?.({
                    title: product.name,
                    url: window.location.href
                  }).catch(() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast({ title: '링크가 복사되었습니다' });
                  });
                }}
                className="flex items-center justify-center gap-2 p-2 md:px-4 md:py-2 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden md:inline text-sm">공유</span>
              </button>
            </div>
          </div>
        </section>

        {/* Price Summary Stats - Cocodalin Style */}
        {priceHistory.length > 0 && (
          <section className="mt-6">
            <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border overflow-hidden">
              {/* Max Discount */}
              <div className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">최대할인액</p>
                <p className="text-secondary font-bold">
                  {formatPrice(Math.max(...priceHistory.filter(h => h.discount_price).map(h => {
                    const isDiscountedPrice = h.discount_price && h.discount_price > h.selling_price * 0.3;
                    return isDiscountedPrice ? h.selling_price - h.discount_price : (h.discount_price || 0);
                  }), 0))}
                </p>
              </div>
              {/* Highest Price */}
              <div className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">최고가</p>
                <p className="font-bold text-foreground">
                  {formatPrice(Math.max(...priceHistory.map(h => h.selling_price)))}
                </p>
              </div>
              {/* Lowest Price */}
              <div className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">최저가</p>
                <p className="text-primary font-bold">
                  {formatPrice(Math.min(...priceHistory.map(h => h.current_price)))}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Store Price Comparison - Compact Table */}
        {(storeComparison.discountStores.length > 0 || storeComparison.regularStores.length > 0) && (
          <section className="mt-6">
            <h2 className="text-base font-bold text-foreground mb-3">매장별 가격</h2>
            
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-sm font-semibold">매장</TableHead>
                    <TableHead className="text-sm font-semibold text-right">현재가</TableHead>
                    <TableHead className="text-sm font-semibold text-center">상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...storeComparison.discountStores, ...storeComparison.regularStores].map(({ store, price }) => {
                    const isPeriodActive = isDiscountPeriodActiveKST(price.discount_period);
                    // Detect discount_price format
                    const isDiscountedPriceFormat = price.discount_price && price.discount_price > price.selling_price * 0.3;
                    const actualDiscountAmount = price.discount_price 
                      ? (isDiscountedPriceFormat ? price.selling_price - price.discount_price : price.discount_price)
                      : 0;
                    const isDiscount = isPeriodActive && actualDiscountAmount > 0;
                    const discountPct = isDiscount ? Math.round((actualDiscountAmount / price.selling_price) * 100) : 0;
                    const currentDisplayPrice = isDiscount ? price.current_price : price.selling_price;
                    return (
                      <TableRow 
                        key={store.id}
                        className={cn(
                          "cursor-pointer transition-colors",
                          selectedStoreId === store.id ? "bg-primary/5" : "hover:bg-muted/50"
                        )}
                        onClick={() => setSelectedStoreId(store.id)}
                      >
                        <TableCell className="text-sm font-medium">{store.name}</TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "text-sm font-bold",
                            isDiscount ? "text-primary" : "text-foreground"
                          )}>
                            {formatPrice(currentDisplayPrice)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {isDiscount ? (
                            <span className="text-sm text-secondary font-semibold">{discountPct}%</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">정상가</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </section>
        )}

        {/* Price Chart - Above table */}
        {selectedStoreId && selectedStorePrices.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" />
              가격 변동 그래프
            </h2>
            <div className="rounded-xl border border-border bg-card p-4">
              <PriceChart data={selectedStorePrices} />
              {selectedStorePrices.length < 2 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  가격 기록이 1건이라 선이 표시되지 않습니다.
                </p>
              )}
            </div>
          </section>
        )}

        {/* Price History Table - Show all stores unified discount history */}
        {allStoresDiscountHistory.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-foreground mb-3">
              최근 1년 할인 이력 ({allStoresDiscountHistory.length}회)
            </h2>
            <PriceHistoryTable data={allStoresDiscountHistory} />
          </section>
        )}

        {/* Product Reviews Section */}
        {product && (
          <section>
            <ProductReviews productId={product.product_id} productName={product.name} />
          </section>
        )}
      </div>

      {/* Discount Products Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center justify-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" />
              금주 할인 상품 ({discountProducts.length}개)
            </DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="h-[60vh] px-4 pb-4">
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {discountProducts.map((item, index) => (
                <button
                  key={item.product_id}
                  onClick={() => {
                    setIsDrawerOpen(false);
                    navigate(`/product/${item.product_id}`);
                  }}
                  className={cn(
                    "flex flex-col items-center p-2 rounded-xl transition-all text-left",
                    item.product_id === productId 
                      ? "bg-primary/10 ring-2 ring-primary" 
                      : "hover:bg-muted"
                  )}
                >
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        📦
                      </div>
                    )}
                    <div className="absolute left-1 top-1 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded">
                      {index + 1}
                    </div>
                  </div>
                  <p className="text-[11px] font-medium text-foreground line-clamp-2 text-center w-full">
                    {item.name}
                  </p>
                  <p className="text-xs font-bold text-primary mt-0.5">
                    {formatPrice(item.current_price)}
                  </p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
      </div>
    </>
  );
};

export default ProductDetail;
