import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Clock, Loader2, Search, ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PointTransaction {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  reason: string;
  reference_id: string | null;
  created_at: string;
  user_email?: string;
  user_nickname?: string;
}

const ITEMS_PER_PAGE = 20;

const AdminPoints = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'confirm' | 'cancel';
    transaction: PointTransaction | null;
  }>({ open: false, type: 'confirm', transaction: null });
  const [batchDialog, setBatchDialog] = useState<{
    open: boolean;
    type: 'confirm' | 'cancel';
  }>({ open: false, type: 'confirm' });

  useEffect(() => {
    const checkAdminAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        toast({
          title: '접근 권한 없음',
          description: '관리자만 접근할 수 있습니다.',
          variant: 'destructive',
        });
        navigate('/profile');
        return;
      }

      setIsAdmin(true);
      await loadTransactions();
    };

    checkAdminAndLoad();
  }, [navigate, toast]);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('point_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: transactionsData, error } = await query;

      if (error) throw error;

      // Fetch user info for each transaction
      if (transactionsData && transactionsData.length > 0) {
        const userIds = [...new Set(transactionsData.map(t => t.user_id))];
        
        // Fetch profiles
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, nickname')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.nickname]) || []);

        const enrichedTransactions = transactionsData.map(t => ({
          ...t,
          user_nickname: profileMap.get(t.user_id) || '사용자',
        }));

        setTransactions(enrichedTransactions);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: '오류',
        description: '포인트 내역을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPoints = async (transaction: PointTransaction) => {
    setProcessingId(transaction.id);
    try {
      const { error } = await supabase.rpc('confirm_pending_points', {
        p_transaction_id: transaction.id,
      });

      if (error) throw error;

      toast({
        title: '포인트 확정 완료',
        description: `${transaction.amount}P가 확정되었습니다.`,
      });

      await loadTransactions();
    } catch (error) {
      console.error('Error confirming points:', error);
      toast({
        title: '오류',
        description: '포인트 확정에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
      setConfirmDialog({ open: false, type: 'confirm', transaction: null });
    }
  };

  const handleCancelPoints = async (transaction: PointTransaction) => {
    setProcessingId(transaction.id);
    try {
      const { error } = await supabase.rpc('cancel_pending_points', {
        p_transaction_id: transaction.id,
      });

      if (error) throw error;

      toast({
        title: '포인트 취소 완료',
        description: `${transaction.amount}P가 취소되었습니다.`,
      });

      await loadTransactions();
    } catch (error) {
      console.error('Error cancelling points:', error);
      toast({
        title: '오류',
        description: '포인트 취소에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
      setConfirmDialog({ open: false, type: 'cancel', transaction: null });
    }
  };

  const handleBatchConfirm = async () => {
    if (selectedIds.size === 0) return;
    
    setIsBatchProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      try {
        const { error } = await supabase.rpc('confirm_pending_points', {
          p_transaction_id: id,
        });
        if (!error) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    toast({
      title: '일괄 확정 완료',
      description: `${successCount}건 확정, ${failCount}건 실패`,
    });

    setSelectedIds(new Set());
    setBatchDialog({ open: false, type: 'confirm' });
    await loadTransactions();
    setIsBatchProcessing(false);
  };

  const handleBatchCancel = async () => {
    if (selectedIds.size === 0) return;
    
    setIsBatchProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      try {
        const { error } = await supabase.rpc('cancel_pending_points', {
          p_transaction_id: id,
        });
        if (!error) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    toast({
      title: '일괄 취소 완료',
      description: `${successCount}건 취소, ${failCount}건 실패`,
    });

    setSelectedIds(new Set());
    setBatchDialog({ open: false, type: 'cancel' });
    await loadTransactions();
    setIsBatchProcessing(false);
  };

  const toggleSelectAll = () => {
    const pendingIds = paginatedTransactions
      .filter(t => t.status === 'pending')
      .map(t => t.id);
    
    if (pendingIds.every(id => selectedIds.has(id))) {
      const newSet = new Set(selectedIds);
      pendingIds.forEach(id => newSet.delete(id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      pendingIds.forEach(id => newSet.add(id));
      setSelectedIds(newSet);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesSearch = searchQuery === '' ||
      t.user_nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.reason.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const stats = {
    pending: transactions.filter(t => t.status === 'pending').length,
    confirmed: transactions.filter(t => t.status === 'confirmed').length,
    cancelled: transactions.filter(t => t.status === 'cancelled').length,
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate('/profile')}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">포인트 관리</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Stats */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
            className={cn(
              "rounded-xl p-4 text-center transition-colors",
              statusFilter === 'pending' ? "bg-yellow-100 dark:bg-yellow-900/30" : "bg-card"
            )}
          >
            <Clock className="h-5 w-5 mx-auto text-yellow-600" />
            <p className="text-2xl font-bold mt-2">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">대기 중</p>
          </button>
          <button
            onClick={() => { setStatusFilter('confirmed'); setCurrentPage(1); }}
            className={cn(
              "rounded-xl p-4 text-center transition-colors",
              statusFilter === 'confirmed' ? "bg-green-100 dark:bg-green-900/30" : "bg-card"
            )}
          >
            <CheckCircle className="h-5 w-5 mx-auto text-green-600" />
            <p className="text-2xl font-bold mt-2">{stats.confirmed}</p>
            <p className="text-xs text-muted-foreground">확정</p>
          </button>
          <button
            onClick={() => { setStatusFilter('cancelled'); setCurrentPage(1); }}
            className={cn(
              "rounded-xl p-4 text-center transition-colors",
              statusFilter === 'cancelled' ? "bg-red-100 dark:bg-red-900/30" : "bg-card"
            )}
          >
            <XCircle className="h-5 w-5 mx-auto text-red-600" />
            <p className="text-2xl font-bold mt-2">{stats.cancelled}</p>
            <p className="text-xs text-muted-foreground">취소</p>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="사용자 또는 사유로 검색..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          {[
            { id: 'all', label: '전체' },
            { id: 'pending', label: '대기' },
            { id: 'confirmed', label: '확정' },
            { id: 'cancelled', label: '취소' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setStatusFilter(tab.id as any); setCurrentPage(1); }}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                statusFilter === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Batch Actions */}
      {statusFilter === 'pending' && stats.pending > 0 && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={paginatedTransactions.filter(t => t.status === 'pending').length > 0 &&
                  paginatedTransactions.filter(t => t.status === 'pending').every(t => selectedIds.has(t.id))}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-medium">
                {selectedIds.size > 0 ? `${selectedIds.size}건 선택됨` : '전체 선택'}
              </span>
            </div>
            {selectedIds.size > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setBatchDialog({ open: true, type: 'confirm' })}
                  disabled={isBatchProcessing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 disabled:opacity-50"
                >
                  {isBatchProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  일괄 확정
                </button>
                <button
                  onClick={() => setBatchDialog({ open: true, type: 'cancel' })}
                  disabled={isBatchProcessing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50"
                >
                  {isBatchProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  일괄 취소
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="px-4 pb-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : paginatedTransactions.length > 0 ? (
          <div className="space-y-3">
            {paginatedTransactions.map((tx) => (
              <div
                key={tx.id}
                className="rounded-xl bg-card p-4 shadow-card"
              >
              <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {tx.status === 'pending' && (
                      <Checkbox
                        checked={selectedIds.has(tx.id)}
                        onCheckedChange={() => toggleSelect(tx.id)}
                        className="flex-shrink-0"
                      />
                    )}
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0",
                      tx.status === 'confirmed' && "bg-green-100 text-green-600",
                      tx.status === 'pending' && "bg-yellow-100 text-yellow-600",
                      tx.status === 'cancelled' && "bg-red-100 text-red-600"
                    )}>
                      {tx.status === 'confirmed' && <CheckCircle className="h-5 w-5" />}
                      {tx.status === 'pending' && <Clock className="h-5 w-5" />}
                      {tx.status === 'cancelled' && <XCircle className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{tx.user_nickname}</p>
                      <p className="text-sm text-muted-foreground">{tx.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(tx.created_at).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn(
                      "text-lg font-bold",
                      tx.status === 'cancelled' ? "text-muted-foreground line-through" : "text-primary"
                    )}>
                      +{tx.amount}P
                    </p>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      tx.status === 'confirmed' && "bg-green-100 text-green-700",
                      tx.status === 'pending' && "bg-yellow-100 text-yellow-700",
                      tx.status === 'cancelled' && "bg-red-100 text-red-700"
                    )}>
                      {tx.status === 'confirmed' && '확정'}
                      {tx.status === 'pending' && '대기'}
                      {tx.status === 'cancelled' && '취소'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons for Pending */}
                {tx.status === 'pending' && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setConfirmDialog({ open: true, type: 'confirm', transaction: tx })}
                      disabled={processingId === tx.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
                    >
                      {processingId === tx.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      확정
                    </button>
                    <button
                      onClick={() => setConfirmDialog({ open: true, type: 'cancel', transaction: tx })}
                      disabled={processingId === tx.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
                    >
                      {processingId === tx.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      취소
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">포인트 내역이 없습니다</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 pb-8 flex items-center justify-center gap-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted disabled:opacity-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted disabled:opacity-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.type === 'confirm' ? '포인트 확정' : '포인트 취소'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === 'confirm' 
                ? `${confirmDialog.transaction?.user_nickname}님의 ${confirmDialog.transaction?.amount}P를 확정하시겠습니까?`
                : `${confirmDialog.transaction?.user_nickname}님의 ${confirmDialog.transaction?.amount}P를 취소하시겠습니까? 취소된 포인트는 복구할 수 없습니다.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>닫기</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog.transaction) {
                  if (confirmDialog.type === 'confirm') {
                    handleConfirmPoints(confirmDialog.transaction);
                  } else {
                    handleCancelPoints(confirmDialog.transaction);
                  }
                }
              }}
              className={cn(
                confirmDialog.type === 'confirm' 
                  ? "bg-green-500 hover:bg-green-600" 
                  : "bg-red-500 hover:bg-red-600"
              )}
            >
              {confirmDialog.type === 'confirm' ? '확정' : '취소'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Dialog */}
      <AlertDialog open={batchDialog.open} onOpenChange={(open) => setBatchDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {batchDialog.type === 'confirm' ? '일괄 확정' : '일괄 취소'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {batchDialog.type === 'confirm'
                ? `선택한 ${selectedIds.size}건의 포인트를 모두 확정하시겠습니까?`
                : `선택한 ${selectedIds.size}건의 포인트를 모두 취소하시겠습니까? 취소된 포인트는 복구할 수 없습니다.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBatchProcessing}>닫기</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (batchDialog.type === 'confirm') {
                  handleBatchConfirm();
                } else {
                  handleBatchCancel();
                }
              }}
              disabled={isBatchProcessing}
              className={cn(
                batchDialog.type === 'confirm'
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-red-500 hover:bg-red-600"
              )}
            >
              {isBatchProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {batchDialog.type === 'confirm' ? '일괄 확정' : '일괄 취소'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPoints;