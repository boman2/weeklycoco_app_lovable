import { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { MapPin, Navigation, Clock, TrendingDown } from 'lucide-react';
import { Store } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface GoogleMapViewProps {
  stores: Store[];
  selectedStoreId?: string | null;
  onStoreSelect?: (storeId: string) => void;
  onRegisterAtStore?: (storeId: string) => void;
}

interface LatestPrice {
  product_id: string;
  product_name: string;
  current_price: number;
  discount_price: number | null;
  recorded_at: string;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 36.5,
  lng: 127.5,
};

// Google Maps API key - should have HTTP referrer restrictions set in Google Cloud Console
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export default function GoogleMapView({
  stores,
  selectedStoreId,
  onStoreSelect,
  onRegisterAtStore,
}: GoogleMapViewProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    language: 'ko',
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [latestPrices, setLatestPrices] = useState<LatestPrice[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  const onLoad = useCallback((map: google.maps.Map) => {
    const bounds = new window.google.maps.LatLngBounds();
    stores.forEach((store) => {
      bounds.extend({ lat: store.lat, lng: store.lng });
    });
    map.fitBounds(bounds);
    setMap(map);
  }, [stores]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Get user's current location
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(pos);
          if (map) {
            map.panTo(pos);
            map.setZoom(12);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  }, [map]);

  // Fetch latest prices for a store
  const fetchLatestPrices = async (storeId: string) => {
    setIsLoadingPrices(true);
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select(`
          product_id,
          current_price,
          discount_price,
          recorded_at,
          products!inner(name)
        `)
        .eq('store_id', storeId)
        .order('recorded_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching prices:', error);
        return;
      }

      const formattedPrices: LatestPrice[] = (data || []).map((item: any) => ({
        product_id: item.product_id,
        product_name: item.products?.name || '상품명 없음',
        current_price: item.current_price,
        discount_price: item.discount_price,
        recorded_at: item.recorded_at,
      }));

      setLatestPrices(formattedPrices);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoadingPrices(false);
    }
  };

  // Handle marker click
  const handleMarkerClick = (store: Store) => {
    setActiveStore(store);
    onStoreSelect?.(store.id);
    fetchLatestPrices(store.id);
    if (map) {
      map.panTo({ lat: store.lat, lng: store.lng });
    }
  };

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center bg-muted rounded-2xl">
        <p className="text-destructive">지도를 불러올 수 없습니다</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center bg-muted rounded-2xl">
        <div className="animate-pulse text-muted-foreground">지도 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={7}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        }}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#4285F4',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            }}
          />
        )}

        {/* Store markers */}
        {stores.map((store) => (
          <Marker
            key={store.id}
            position={{ lat: store.lat, lng: store.lng }}
            onClick={() => handleMarkerClick(store)}
            icon={{
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 0C9 0 0 9 0 20C0 35 20 48 20 48C20 48 40 35 40 20C40 9 31 0 20 0Z" fill="${store.id === selectedStoreId ? '#005DAA' : '#E31837'}"/>
                  <circle cx="20" cy="18" r="10" fill="white"/>
                  <text x="20" y="22" font-size="12" font-weight="bold" text-anchor="middle" fill="${store.id === selectedStoreId ? '#005DAA' : '#E31837'}">C</text>
                </svg>
              `)}`,
              scaledSize: new google.maps.Size(40, 48),
              anchor: new google.maps.Point(20, 48),
            }}
          />
        ))}

        {/* Info Window */}
        {activeStore && (
          <InfoWindow
            position={{ lat: activeStore.lat, lng: activeStore.lng }}
            onCloseClick={() => {
              setActiveStore(null);
              setLatestPrices([]);
            }}
            options={{
              pixelOffset: new google.maps.Size(0, -48),
            }}
          >
            <div className="min-w-[260px] max-w-[300px] p-1">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-base">코스트코 {activeStore.nameKo}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{activeStore.address}</p>

              {/* Latest prices */}
              <div className="mb-3">
                <div className="flex items-center gap-1 mb-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">최근 등록 가격</span>
                </div>
                {isLoadingPrices ? (
                  <div className="text-xs text-muted-foreground py-2">로딩 중...</div>
                ) : latestPrices.length > 0 ? (
                  <ul className="space-y-1.5">
                    {latestPrices.map((price, idx) => (
                      <li key={idx} className="flex items-center justify-between text-xs">
                        <span className="truncate max-w-[140px]">{price.product_name}</span>
                        <div className="flex items-center gap-1">
                          {price.discount_price && (
                            <TrendingDown className="h-3 w-3 text-primary" />
                          )}
                          <span className="font-semibold text-primary">
                            {formatPrice(price.discount_price || price.current_price)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground py-1">등록된 가격 정보가 없습니다</p>
                )}
              </div>

              {/* Register button */}
              <button
                onClick={() => onRegisterAtStore?.(activeStore.id)}
                className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                이 매장에서 가격 등록하기
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* My location button */}
      <button
        onClick={getCurrentLocation}
        className="absolute bottom-4 right-4 flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm font-medium shadow-lg hover:bg-card/90 transition-colors"
      >
        <Navigation className="h-4 w-4 text-secondary" />
        내 위치
      </button>
    </div>
  );
}
