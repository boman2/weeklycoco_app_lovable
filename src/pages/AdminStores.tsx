import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Calendar, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface Store {
  id: string;
  name: string;
  region: string;
  closing_dates: string[];
}

const AdminStores = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [viewYear, setViewYear] = useState(2025);

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: '로그인이 필요합니다', variant: 'destructive' });
        navigate('/auth');
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        toast({ title: '관리자 권한이 필요합니다', variant: 'destructive' });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      fetchStores();
    };

    checkAdminAndFetch();
  }, [navigate, toast]);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      
      // Sort by Korean name
      const sorted = (data || []).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      setStores(sorted);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast({ title: '매장 목록을 불러오는데 실패했습니다', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddClosingDate = async () => {
    if (!selectedStore || !selectedDate) return;

    // Format date in local timezone (YYYY-MM-DD) to avoid UTC conversion issues
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    if (selectedStore.closing_dates?.includes(dateStr)) {
      toast({ title: '이미 등록된 휴무일입니다', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const newDates = [...(selectedStore.closing_dates || []), dateStr].sort();
      
      const { error } = await supabase
        .from('stores')
        .update({ closing_dates: newDates })
        .eq('id', selectedStore.id);

      if (error) throw error;

      setSelectedStore({ ...selectedStore, closing_dates: newDates });
      setStores(stores.map(s => s.id === selectedStore.id ? { ...s, closing_dates: newDates } : s));
      setSelectedDate(undefined);
      toast({ title: '휴무일이 추가되었습니다' });
    } catch (error) {
      console.error('Error adding closing date:', error);
      toast({ title: '휴무일 추가에 실패했습니다', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveClosingDate = async (dateStr: string) => {
    if (!selectedStore) return;

    setSaving(true);
    try {
      const newDates = selectedStore.closing_dates.filter(d => d !== dateStr);
      
      const { error } = await supabase
        .from('stores')
        .update({ closing_dates: newDates })
        .eq('id', selectedStore.id);

      if (error) throw error;

      setSelectedStore({ ...selectedStore, closing_dates: newDates });
      setStores(stores.map(s => s.id === selectedStore.id ? { ...s, closing_dates: newDates } : s));
      toast({ title: '휴무일이 삭제되었습니다' });
    } catch (error) {
      console.error('Error removing closing date:', error);
      toast({ title: '휴무일 삭제에 실패했습니다', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const formatDateKo = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const getClosingDatesForYear = (year: number) => {
    if (!selectedStore?.closing_dates) return [];
    return selectedStore.closing_dates
      .filter(d => d.startsWith(String(year)))
      .sort();
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-bottom pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">매장 휴무일 관리</h1>
            <p className="text-xs text-muted-foreground">{stores.length}개 매장</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((store) => (
              <div
                key={store.id}
                onClick={() => {
                  setSelectedStore(store);
                  setIsDialogOpen(true);
                }}
                className={cn(
                  "p-4 rounded-xl bg-card shadow-card cursor-pointer transition-all hover:shadow-card-lg",
                  selectedStore?.id === store.id && "ring-2 ring-primary"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">{store.name}</h3>
                  <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                    {store.region}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>휴무일 {store.closing_dates?.length || 0}개 등록</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Store Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {selectedStore?.name} 휴무일 관리
            </DialogTitle>
          </DialogHeader>

          {selectedStore && (
            <div className="space-y-6">
              {/* Add Closing Date */}
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">휴무일 추가</h4>
                <div className="flex flex-col items-center gap-4">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border pointer-events-auto"
                    fromDate={new Date(2025, 0, 1)}
                    toDate={new Date(2026, 11, 31)}
                  />
                  <Button
                    onClick={handleAddClosingDate}
                    disabled={!selectedDate || saving}
                    className="w-full max-w-xs"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    휴무일 추가
                  </Button>
                </div>
              </div>

              {/* Year Selector */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewYear(2025)}
                  className={cn(viewYear === 2025 && "bg-primary text-primary-foreground")}
                >
                  2025년
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewYear(2026)}
                  className={cn(viewYear === 2026 && "bg-primary text-primary-foreground")}
                >
                  2026년
                </Button>
              </div>

              {/* Closing Dates List */}
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">{viewYear}년 휴무일 목록</h4>
                {getClosingDatesForYear(viewYear).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    등록된 휴무일이 없습니다
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {getClosingDatesForYear(viewYear).map((dateStr) => (
                      <div
                        key={dateStr}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {formatDateKo(dateStr)}
                        </span>
                        <button
                          onClick={() => handleRemoveClosingDate(dateStr)}
                          disabled={saving}
                          className="text-destructive hover:text-destructive/80 transition-colors p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStores;
