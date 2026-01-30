import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Image, User, Store, Package, Calendar, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface PendingVerification {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  reference_id: string | null;
  created_at: string;
  user_nickname?: string;
  user_email?: string;
  price_history?: {
    id: string;
    product_id: string;
    store_id: string;
    selling_price: number;
    discount_price: number | null;
    current_price: number;
    image_url: string | null;
    recorded_at: string;
    discount_period: string | null;
  };
  product_name?: string;
  store_name?: string;
}

const AdminPriceVerificationTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingItems, setPendingItems] = useState<PendingVerification[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PendingVerification | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingItems();
  }, []);

  const fetchPendingItems = async () => {
    setLoading(true);
    try {
      const { data: transactions, error } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedItems: PendingVerification[] = [];

      for (const tx of transactions || []) {
        const item: PendingVerification = {
          id: tx.id,
          user_id: tx.user_id,
          amount: tx.amount,
          reason: tx.reason,
          reference_id: tx.reference_id,
          created_at: tx.created_at,
        };

        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('nickname')
          .eq('id', tx.user_id)
          .single();

        if (userProfile) {
          item.user_nickname = userProfile.nickname;
        }

        if (tx.reference_id) {
          const { data: priceHistory } = await supabase
            .from('price_history')
            .select('*')
            .eq('id', tx.reference_id)
            .single();

          if (priceHistory) {
            item.price_history = priceHistory;

            const { data: product } = await supabase
              .from('products')
              .select('name')
              .eq('product_id', priceHistory.product_id)
              .single();

            if (product) {
              item.product_name = product.name;
            }

            const { data: store } = await supabase
              .from('stores')
              .select('name')
              .eq('id', priceHistory.store_id)
              .single();

            if (store) {
              item.store_name = store.name;
            }
          }
        }

        enrichedItems.push(item);
      }

      setPendingItems(enrichedItems);
    } catch (error) {
      console.error('Error fetching pending items:', error);
      toast({ title: '데이터 로드 실패', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (item: PendingVerification) => {
    setProcessingId(item.id);
    try {
      const { data, error } = await supabase.rpc('confirm_pending_points', {
        p_transaction_id: item.id
      });

      if (error) throw error;

      if (data) {
        toast({ title: '승인 완료', description: `${item.amount}P가 확정되었습니다.` });
        setPendingItems(prev => prev.filter(p => p.id !== item.id));
      } else {
        toast({ title: '승인 실패', description: '이미 처리된 항목입니다.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Approve error:', error);
      toast({ title: '승인 처리 중 오류 발생', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (item: PendingVerification) => {
    setSelectedItem(item);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedItem) return;

    setProcessingId(selectedItem.id);
    try {
      const { data, error } = await supabase.rpc('cancel_pending_points', {
        p_transaction_id: selectedItem.id
      });

      if (error) throw error;

      if (data) {
        toast({ title: '거절 완료', description: '포인트가 취소되었습니다.' });
        setPendingItems(prev => prev.filter(p => p.id !== selectedItem.id));
      } else {
        toast({ title: '거절 실패', description: '이미 처리된 항목입니다.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Reject error:', error);
      toast({ title: '거절 처리 중 오류 발생', variant: 'destructive' });
    } finally {
      setProcessingId(null);
      setRejectDialogOpen(false);
      setSelectedItem(null);
    }
  };

  const openImageDialog = (url: string) => {
    setSelectedImageUrl(url);
    setImageDialogOpen(true);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4">
        <p className="text-sm text-muted-foreground">대기 중: {pendingItems.length}건</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {pendingItems.length === 0 ? (
          <div className="text-center py-12">
            <Check className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <p className="text-muted-foreground">대기 중인 검증 항목이 없습니다</p>
          </div>
        ) : (
          pendingItems.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {item.product_name || item.price_history?.product_id || '상품 정보 없음'}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      <span>{item.user_nickname || '알 수 없음'}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Coins className="h-3 w-3" />
                    {item.amount}P
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {item.price_history && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      <span>{item.store_name || '매장 정보 없음'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>상품 ID: {item.price_history.product_id}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <p className="text-xs text-muted-foreground">정상가</p>
                        <p className="font-medium">{formatPrice(item.price_history.selling_price)}</p>
                      </div>
                      {item.price_history.discount_price && (
                        <div>
                          <p className="text-xs text-muted-foreground">할인액</p>
                          <p className="font-medium text-red-500">-{formatPrice(item.price_history.discount_price)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground">현재가</p>
                        <p className="font-bold text-primary">{formatPrice(item.price_history.current_price)}</p>
                      </div>
                      {item.price_history.discount_period && (
                        <div>
                          <p className="text-xs text-muted-foreground">할인 기간</p>
                          <p className="font-medium">{item.price_history.discount_period}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {item.price_history?.image_url && (
                  <button
                    onClick={() => openImageDialog(item.price_history!.image_url!)}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Image className="h-4 w-4" />
                    가격표 이미지 보기
                  </button>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>등록: {formatDate(item.created_at)}</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => handleApprove(item)}
                    disabled={processingId === item.id}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    승인
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => openRejectDialog(item)}
                    disabled={processingId === item.id}
                  >
                    <X className="h-4 w-4 mr-1" />
                    거절
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>등록 거절</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="거절 사유를 입력하세요 (선택)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              거절 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>가격표 이미지</DialogTitle>
          </DialogHeader>
          {selectedImageUrl && (
            <img
              src={selectedImageUrl}
              alt="가격표"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPriceVerificationTab;
