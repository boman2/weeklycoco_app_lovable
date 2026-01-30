import { MapPin, Clock, ChevronRight, CalendarX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoreCardProps {
  store: {
    id: string;
    name: string;
    region: string;
    closing_dates?: string[] | null;
    isPlanned?: boolean;
  };
  distance?: string;
  onClick?: () => void;
}

// 현재 월의 휴무일만 필터링하는 함수
const getCurrentMonthClosingDates = (closingDates: string[] | null | undefined): string[] => {
  if (!closingDates || closingDates.length === 0) return [];
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  return closingDates.filter(dateStr => {
    const date = new Date(dateStr);
    return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
  });
};

// 날짜를 "12/14" 형식으로 포맷
const formatClosingDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const StoreCard = ({ store, distance, onClick }: StoreCardProps) => {
  const currentMonthClosingDates = getCurrentMonthClosingDates(store.closing_dates);
  
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 p-4 bg-card rounded-xl shadow-card cursor-pointer transition-all hover:shadow-card-lg active:scale-[0.98]',
        store.isPlanned && 'opacity-60'
      )}
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-secondary">
        <MapPin className="h-6 w-6 text-secondary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">{store.name}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
            {store.region}
          </span>
          {store.isPlanned && (
            <span className="rounded-md bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning">
              오픈예정
            </span>
          )}
        </div>
        {currentMonthClosingDates.length > 0 ? (
          <div className="mt-1 flex items-center gap-1.5 text-xs">
            <CalendarX className="h-3.5 w-3.5 text-destructive" />
            <span className="text-destructive font-medium">
              휴무: {currentMonthClosingDates.map(formatClosingDate).join(', ')}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mt-0.5">휴무일 정보 없음</p>
        )}
        {distance && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{distance}</span>
          </div>
        )}
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
    </div>
  );
};

export default StoreCard;
