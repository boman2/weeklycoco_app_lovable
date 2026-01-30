import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, List, MapIcon, Calendar, Plus, X, MapPin, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import StoreCard from '@/components/StoreCard';
import GoogleMapView from '@/components/GoogleMap';
import StoreBottomSheet from '@/components/StoreBottomSheet';
import { stores as mockStores, Store } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';

interface DbStore {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  closing_dates: string[] | null;
}

// Default closing days (매월 둘째·넷째 일요일)
const defaultClosingDays = [8, 22];

const Map = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const highlightedStore = searchParams.get('store');

  const [viewMode, setViewMode] = useState<'list' | 'map' | 'calendar'>('list');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [dbStores, setDbStores] = useState<DbStore[]>([]);
  const [loading, setLoading] = useState(true);

  // Location consent state
  const [user, setUser] = useState<User | null>(null);
  const [showLocationConsent, setShowLocationConsent] = useState(false);
  const [locationConsentChecked, setLocationConsentChecked] = useState<'agree' | 'disagree' | null>(null);
  const [submittingConsent, setSubmittingConsent] = useState(false);
  const [hasCheckedConsent, setHasCheckedConsent] = useState(false);
  const [locationAgreed, setLocationAgreed] = useState(false);
  
  // Nearest store state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestStore, setNearestStore] = useState<{ id: string; name: string; nameKo: string; distance: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Check auth and location consent
  useEffect(() => {
    const checkAuthAndConsent = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Check if user has already agreed to location terms
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('location_terms_agreed')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.location_terms_agreed === true) {
          setLocationAgreed(true);
        } else if (profile?.location_terms_agreed === null || profile?.location_terms_agreed === undefined) {
          // Show consent popup if not yet decided
          setShowLocationConsent(true);
        }
      }
      setHasCheckedConsent(true);
    };
    checkAuthAndConsent();
  }, []);

  // Fetch stores from database with closing_dates
  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('id, name, region, latitude, longitude, closing_dates')
          .order('name', { ascending: true });
        
        if (!error && data) {
          setDbStores(data);
        }
      } catch (error) {
        console.error('Error fetching stores:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, []);

  const handleLocationConsentSubmit = async () => {
    if (!user || locationConsentChecked === null) {
      toast({ title: '동의 여부를 선택해주세요', variant: 'destructive' });
      return;
    }

    setSubmittingConsent(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          location_terms_agreed: locationConsentChecked === 'agree',
          location_terms_agreed_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({ 
        title: locationConsentChecked === 'agree' 
          ? '위치정보 이용에 동의하셨습니다' 
          : '위치정보 이용에 동의하지 않으셨습니다' 
      });
      setShowLocationConsent(false);
      
      // If agreed, trigger location fetch
      if (locationConsentChecked === 'agree') {
        setLocationAgreed(true);
      }
    } catch (error: any) {
      toast({ title: '저장 실패', description: error.message, variant: 'destructive' });
    } finally {
      setSubmittingConsent(false);
    }
  };

  // Combine DB stores with mock store data for display
  const stores = useMemo(() => {
    if (dbStores.length > 0) {
      return dbStores.map(dbStore => {
        const mockStore = mockStores.find(m => m.id === dbStore.id || m.name === dbStore.name);
        return {
          id: dbStore.id,
          name: dbStore.name,
          nameKo: mockStore?.nameKo || dbStore.name,
          region: dbStore.region,
          address: mockStore?.address || dbStore.region,
          lat: dbStore.latitude,
          lng: dbStore.longitude,
          isPlanned: mockStore?.isPlanned || false,
          closingDates: dbStore.closing_dates || [],
        };
      }).sort((a, b) => a.nameKo.localeCompare(b.nameKo, 'ko'));
    }
    return mockStores.map(s => ({ ...s, closingDates: [] as string[] }));
  }, [dbStores]);

  const regions = [...new Set(stores.map((s) => s.region))];

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get user location and find nearest store when location is agreed
  useEffect(() => {
    if (!locationAgreed || stores.length === 0) return;
    
    setLoadingLocation(true);
    
    if (!navigator.geolocation) {
      toast({ title: '이 브라우저에서는 위치 서비스를 지원하지 않습니다', variant: 'destructive' });
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        // Find nearest store
        let minDistance = Infinity;
        let nearest: typeof nearestStore = null;
        
        stores.forEach(store => {
          if (store.isPlanned) return; // Skip planned stores
          const distance = calculateDistance(latitude, longitude, store.lat, store.lng);
          if (distance < minDistance) {
            minDistance = distance;
            nearest = {
              id: store.id,
              name: store.name,
              nameKo: store.nameKo,
              distance: Math.round(distance * 10) / 10, // Round to 1 decimal
            };
          }
        });
        
        setNearestStore(nearest);
        setLoadingLocation(false);
        
        // Clear location data after use (as promised in consent)
        setUserLocation(null);
      },
      (error) => {
        console.error('Geolocation error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          toast({ title: '위치 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.', variant: 'destructive' });
        } else {
          toast({ title: '위치 정보를 가져올 수 없습니다', variant: 'destructive' });
        }
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [locationAgreed, stores]);
  
  // Sort stores alphabetically by Korean name (ㄱ.ㄴ.ㄷ순)
  const sortedStores = useMemo(() => {
    const filtered = selectedRegion
      ? stores.filter((s) => s.region === selectedRegion)
      : stores;
    return [...filtered].sort((a, b) => a.nameKo.localeCompare(b.nameKo, 'ko'));
  }, [selectedRegion, stores]);

  const handleStoreSelect = (storeId: string) => {
    const store = stores.find((s) => s.id === storeId);
    if (store) {
      // Convert to Store type for compatibility
      setSelectedStore({
        id: store.id,
        name: store.name,
        nameKo: store.nameKo,
        region: store.region,
        address: store.address,
        lat: store.lat,
        lng: store.lng,
        isPlanned: store.isPlanned,
      });
      setIsBottomSheetOpen(true);
    }
  };

  const handleRegisterAtStore = (storeId: string) => {
    setIsBottomSheetOpen(false);
    navigate(`/register?store=${storeId}`);
  };

  // Get closing info for a specific store - 현재 월의 휴무일만 표시
  const getStoreClosingInfo = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    const closingDates = store?.closingDates || [];
    
    // Check if store has specific closures this month
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const specificDates = closingDates
      .filter(dateStr => {
        const date = new Date(dateStr);
        return date.getFullYear() === year && date.getMonth() === month;
      })
      .map(dateStr => new Date(dateStr).getDate());

    if (specificDates.length > 0) {
      return `${month + 1}월 휴무: ${specificDates.join('일, ')}일`;
    }
    return '휴무일 정보 없음';
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getClosedStoresForDay = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Check default closing days (2nd and 4th Sunday)
    const isDefaultClosingDay = defaultClosingDays.includes(day);
    
    let closedStores: typeof stores = [];
    
    if (isDefaultClosingDay) {
      // All stores closed on default days
      closedStores = [...stores];
    } else {
      // Only stores with specific closing dates for this date
      closedStores = stores.filter(s => s.closingDates?.includes(dateStr));
    }

    return closedStores;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

    // Week day headers
    const headers = weekDays.map(day => (
      <div key={day} className="text-center text-xs md:text-sm font-medium text-muted-foreground py-2">
        {day}
      </div>
    ));

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-1 md:p-2" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const closedStores = getClosedStoresForDay(day);
      const hasClosedStores = closedStores.length > 0;
      const isAllStoresClosed = closedStores.length === stores.length;
      
      days.push(
        <div
          key={day}
          className={cn(
            "relative p-1 md:p-2 text-center rounded-lg cursor-pointer transition-colors min-h-[50px] md:min-h-[60px] flex flex-col items-center",
            isAllStoresClosed ? "bg-destructive/20 hover:bg-destructive/30" : 
            hasClosedStores ? "bg-amber-500/10 hover:bg-amber-500/20" : "hover:bg-muted"
          )}
          onMouseEnter={() => setHoveredDay(day)}
          onMouseLeave={() => setHoveredDay(null)}
        >
          <span className={cn(
            "text-xs md:text-sm font-medium",
            isAllStoresClosed ? "text-destructive" : hasClosedStores ? "text-amber-600" : ""
          )}>
            {day}
          </span>
          {hasClosedStores && (
            <span className={cn(
              "text-[9px] md:text-[10px] mt-0.5",
              isAllStoresClosed ? "text-destructive" : "text-amber-600"
            )}>
              {isAllStoresClosed ? '전체휴무' : `${closedStores.length}곳`}
            </span>
          )}
          
          {/* Tooltip on hover */}
          {hoveredDay === day && hasClosedStores && (
            <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-card border border-border rounded-lg shadow-lg p-3 min-w-[180px]">
              <p className="text-xs font-medium text-foreground mb-2">
                {currentMonth.getMonth() + 1}월 {day}일 휴무 매장
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {closedStores.slice(0, 10).map(store => (
                  <p key={store.id} className="text-xs text-muted-foreground">
                    {store.nameKo}
                  </p>
                ))}
                {closedStores.length > 10 && (
                  <p className="text-xs text-muted-foreground">...외 {closedStores.length - 10}곳</p>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="bg-card rounded-xl p-3 md:p-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="p-2 hover:bg-muted rounded-lg"
          >
            ←
          </button>
          <h3 className="font-bold text-base md:text-lg">
            {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
          </h3>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="p-2 hover:bg-muted rounded-lg"
          >
            →
          </button>
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-0.5 md:gap-1">
          {headers}
          {days}
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-4 text-[10px] md:text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-destructive/20" />
            <span>전체휴무</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-500/10" />
            <span>일부휴무</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold">전국 매장</h1>
          </div>
          <div className="flex items-center rounded-xl bg-muted p-1">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium transition-colors',
                viewMode === 'list'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground'
              )}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">목록</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium transition-colors',
                viewMode === 'map'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground'
              )}
            >
              <MapIcon className="h-4 w-4" />
              <span className="hidden sm:inline">지도</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium transition-colors',
                viewMode === 'calendar'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground'
              )}
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">휴무일</span>
            </button>
          </div>
        </div>

        {/* Region Filter */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 hide-scrollbar">
          <button
            onClick={() => setSelectedRegion(null)}
            className={cn(
              'rounded-full px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium whitespace-nowrap transition-colors',
              !selectedRegion
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            전체
          </button>
          {regions.map((region) => (
            <button
              key={region}
              onClick={() => setSelectedRegion(region)}
              className={cn(
                'rounded-full px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium whitespace-nowrap transition-colors',
                selectedRegion === region
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {region}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Nearest Store Recommendation */}
        {locationAgreed && (
          <div className="rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-4">
            {loadingLocation ? (
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">현재 위치에서 가장 가까운 매장을 찾고 있습니다...</span>
              </div>
            ) : nearestStore ? (
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => handleStoreSelect(nearestStore.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">가장 가까운 매장</p>
                    <p className="font-semibold text-foreground">{nearestStore.nameKo}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{nearestStore.distance}km</p>
                  <p className="text-xs text-muted-foreground">거리</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">위치 정보를 가져올 수 없습니다</span>
              </div>
            )}
          </div>
        )}
        {viewMode === 'map' ? (
          /* Map View */
          <div className="h-[calc(100vh-180px)] rounded-2xl overflow-hidden">
            <GoogleMapView
              stores={sortedStores}
              selectedStoreId={highlightedStore}
              onStoreSelect={handleStoreSelect}
              onRegisterAtStore={handleRegisterAtStore}
            />
          </div>
        ) : viewMode === 'calendar' ? (
          /* Calendar View */
          <div>
            {renderCalendar()}
          </div>
        ) : (
          /* List View - Grid Layout */
          <div>
            <p className="text-xs md:text-sm text-muted-foreground mb-4">
              {sortedStores.length}개 매장 (ㄱㄴㄷ순)
            </p>
            {/* PC: 6개씩 2단 = 12개, Mobile: 2개씩 표시 */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 md:gap-3">
              {sortedStores.map((store) => (
                <div
                  key={store.id}
                  onClick={() => handleStoreSelect(store.id)}
                  className={cn(
                    "flex flex-col items-center p-3 md:p-4 bg-card rounded-xl shadow-card cursor-pointer transition-all hover:shadow-card-lg active:scale-[0.98]",
                    store.isPlanned && "opacity-60"
                  )}
                >
                  <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
                    <span className="text-base md:text-lg">🏪</span>
                  </div>
                  <h3 className="font-semibold text-foreground text-center text-xs md:text-sm">
                    {store.nameKo}
                  </h3>
                  {store.isPlanned && (
                    <span className="mt-1 rounded-md bg-warning/20 px-2 py-0.5 text-[9px] md:text-[10px] font-medium text-warning">
                      오픈예정
                    </span>
                  )}
                  <p className="text-[9px] md:text-[10px] text-muted-foreground mt-1 text-center line-clamp-1">
                    {store.address}
                  </p>
                  <p className="text-[9px] md:text-[10px] text-destructive/80 mt-1">
                    {getStoreClosingInfo(store.id)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Sheet for store details */}
      <StoreBottomSheet
        store={selectedStore}
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        onRegister={handleRegisterAtStore}
      />

      {/* Location Consent Dialog */}
      <Dialog open={showLocationConsent} onOpenChange={setShowLocationConsent}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              위치정보 이용 동의
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm font-medium text-foreground">
              가장 가까운 코스트코 매장을 찾기 위해 위치 정보가 필요합니다.
            </p>
            <p className="text-sm text-muted-foreground">
              '매장 찾기'를 위해 받은 현재 위치는 서버에 저장하지 않고 결과값만 보여준 뒤 바로 삭제하는 방식입니다.
            </p>
            
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="agree"
                  checked={locationConsentChecked === 'agree'}
                  onCheckedChange={(checked) => {
                    if (checked) setLocationConsentChecked('agree');
                    else if (locationConsentChecked === 'agree') setLocationConsentChecked(null);
                  }}
                />
                <label
                  htmlFor="agree"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  동의하기
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="disagree"
                  checked={locationConsentChecked === 'disagree'}
                  onCheckedChange={(checked) => {
                    if (checked) setLocationConsentChecked('disagree');
                    else if (locationConsentChecked === 'disagree') setLocationConsentChecked(null);
                  }}
                />
                <label
                  htmlFor="disagree"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  동의안함
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleLocationConsentSubmit}
              disabled={submittingConsent || locationConsentChecked === null}
              className="w-full"
            >
              {submittingConsent ? <Loader2 className="h-4 w-4 animate-spin" /> : '전송'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Map;