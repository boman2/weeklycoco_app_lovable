import { useState, useEffect } from 'react';
import { X, MapPin, Clock, TrendingDown, ChevronUp, Phone, Mail, Car, Ear, AlertCircle } from 'lucide-react';
import { Store } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface StoreBottomSheetProps {
  store: Store | null;
  isOpen: boolean;
  onClose: () => void;
  onRegister: (storeId: string) => void;
}

interface PriceRecord {
  product_id: string;
  product_name: string;
  current_price: number;
  discount_price: number | null;
  discount_period: string | null;
  recorded_at: string;
}

interface StoreDetails {
  postal_code: string | null;
  address: string | null;
  address_detail: string | null;
  phone: string | null;
  email: string | null;
  business_hours: string | null;
  holiday_info: string | null;
  has_tire_center: boolean | null;
  has_hearing_aids: boolean | null;
  special_notice: string | null;
}

export default function StoreBottomSheet({
  store,
  isOpen,
  onClose,
  onRegister,
}: StoreBottomSheetProps) {
  const [prices, setPrices] = useState<PriceRecord[]>([]);
  const [storeDetails, setStoreDetails] = useState<StoreDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'prices'>('info');

  useEffect(() => {
    if (store && isOpen) {
      fetchStoreDetails(store.id);
      fetchStorePrices(store.id);
    }
  }, [store, isOpen]);

  const fetchStoreDetails = async (storeId: string) => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('postal_code, address, address_detail, phone, email, business_hours, holiday_info, has_tire_center, has_hearing_aids, special_notice')
        .eq('id', storeId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching store details:', error);
        return;
      }

      setStoreDetails(data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchStorePrices = async (storeId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select(`
          product_id,
          current_price,
          discount_price,
          discount_period,
          recorded_at,
          products!inner(name)
        `)
        .eq('store_id', storeId)
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching prices:', error);
        return;
      }

      const formattedPrices: PriceRecord[] = (data || []).map((item: any) => ({
        product_id: item.product_id,
        product_name: item.products?.name || '상품명 없음',
        current_price: item.current_price,
        discount_price: item.discount_price,
        discount_period: item.discount_period,
        recorded_at: item.recorded_at,
      }));

      setPrices(formattedPrices);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  if (!store) return null;

  const fullAddress = storeDetails?.address 
    ? `${storeDetails.postal_code ? `(${storeDetails.postal_code}) ` : ''}${storeDetails.address}${storeDetails.address_detail ? ` ${storeDetails.address_detail}` : ''}`
    : store.address;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-lg transition-transform duration-300 ease-out',
          isOpen ? 'translate-y-0' : 'translate-y-full',
          isExpanded ? 'max-h-[85vh]' : 'max-h-[60vh]'
        )}
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-12 h-1.5 rounded-full bg-muted-foreground/30"
          />
        </div>

        <div className="px-5 pb-8 overflow-y-auto max-h-[calc(85vh-60px)]">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">코스트코 {store.nameKo}</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{fullAddress}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('info')}
              className={cn(
                'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'info' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              매장 정보
            </button>
            <button
              onClick={() => setActiveTab('prices')}
              className={cn(
                'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'prices' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              최근 가격
            </button>
          </div>

          {/* Store Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-3 mb-4">
              {/* Business Hours */}
              {storeDetails?.business_hours && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">영업시간</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{storeDetails.business_hours}</p>
                  </div>
                </div>
              )}

              {/* Holiday Info */}
              {storeDetails?.holiday_info && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                  <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">휴무일</p>
                    <p className="text-sm text-muted-foreground">{storeDetails.holiday_info}</p>
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">연락처</p>
                  <p className="text-sm text-muted-foreground">{storeDetails?.phone || '1899-9900'}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">이메일</p>
                  <p className="text-sm text-muted-foreground">{storeDetails?.email || 'member@costcokr.com'}</p>
                </div>
              </div>

              {/* Facilities */}
              <div className="flex gap-2">
                {storeDetails?.has_tire_center && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary">
                    <Car className="h-4 w-4" />
                    <span className="text-sm font-medium">타이어센터</span>
                  </div>
                )}
                {storeDetails?.has_hearing_aids && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary">
                    <Ear className="h-4 w-4" />
                    <span className="text-sm font-medium">보청기센터</span>
                  </div>
                )}
              </div>

              {/* Special Notice */}
              {storeDetails?.special_notice && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    <span className="font-medium">📢 공지: </span>
                    {storeDetails.special_notice}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Price List Tab */}
          {activeTab === 'prices' && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">최근 등록된 가격</span>
              </div>

              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  로딩 중...
                </div>
              ) : prices.length > 0 ? (
                <div className="space-y-2">
                  {prices.map((price, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{price.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(price.recorded_at)} 등록
                          {price.discount_period && ` · ${price.discount_period}`}
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <div className="flex items-center gap-1">
                          {price.discount_price && (
                            <TrendingDown className="h-4 w-4 text-primary" />
                          )}
                          <span className="font-bold text-primary">
                            {formatPrice(price.discount_price || price.current_price)}
                          </span>
                        </div>
                        {price.discount_price && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatPrice(price.current_price)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  등록된 가격 정보가 없습니다
                </div>
              )}
            </div>
          )}

          {/* Expand button */}
          {activeTab === 'prices' && prices.length > 3 && !isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="flex items-center justify-center gap-1 w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              더보기
              <ChevronUp className="h-4 w-4" />
            </button>
          )}

          {/* Register button */}
          <button
            onClick={() => onRegister(store.id)}
            className="w-full rounded-xl bg-primary py-4 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors mt-4"
          >
            이 매장에서 가격 등록하기
          </button>
        </div>
      </div>
    </>
  );
}