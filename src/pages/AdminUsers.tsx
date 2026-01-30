import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, User, MoreVertical, CheckCircle, AlertTriangle, Ban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getCurrentLevel } from '@/components/LevelPopup';

interface UserInfo {
  id: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  points: number;
  pending_points: number;
  confirmed_points: number;
  daily_budget: number;
  bakery_purchase_count: number;
  unique_stores_visited: string[];
  preferred_store_id: string | null;
  status: string;
  avatar_url: string | null;
  badges: string[];
}

interface Store {
  id: string;
  name: string;
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [actionType, setActionType] = useState<'suspend' | 'ban' | 'activate'>('suspend');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      toast({ title: '접근 권한이 없습니다', variant: 'destructive' });
      navigate('/');
      return;
    }

    setIsAdmin(true);
    await Promise.all([fetchUsers(), fetchStores()]);
  };

  const fetchStores = async () => {
    const { data } = await supabase.from('stores').select('id, name');
    setStores(data || []);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, nickname, email, phone, created_at, points, pending_points, confirmed_points, daily_budget, bakery_purchase_count, unique_stores_visited, preferred_store_id, status, avatar_url, badges')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers((data || []).map(u => ({
        ...u,
        status: u.status || 'active',
        points: u.points || 0,
        pending_points: u.pending_points || 0,
        confirmed_points: u.confirmed_points || 0,
        daily_budget: u.daily_budget || 0,
        bakery_purchase_count: u.bakery_purchase_count || 0,
        unique_stores_visited: (u.unique_stores_visited as string[]) || [],
        badges: (u.badges as string[]) || [],
      })));
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: '사용자 목록 로드 실패', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.nickname?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.email?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.phone?.includes(searchQuery)) ||
      (user.id.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const openActionDialog = (user: UserInfo, action: 'suspend' | 'ban' | 'activate') => {
    setSelectedUser(user);
    setActionType(action);
    setActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!selectedUser) return;

    setProcessing(true);
    try {
      const newStatus = actionType === 'activate' ? 'active' : actionType === 'suspend' ? 'suspended' : 'banned';
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ status: newStatus })
        .eq('id', selectedUser.id);

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id ? { ...u, status: newStatus } : u
      ));

      const actionLabels = {
        suspend: '활동 정지',
        ban: '강제 탈퇴',
        activate: '활성화'
      };

      toast({ 
        title: `${actionLabels[actionType]} 완료`,
        description: `${selectedUser.nickname || selectedUser.email} 사용자 처리 완료`
      });
    } catch (error) {
      console.error('Action error:', error);
      toast({ title: '처리 중 오류 발생', variant: 'destructive' });
    } finally {
      setProcessing(false);
      setActionDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getStoreName = (storeId: string | null) => {
    if (!storeId) return '-';
    const store = stores.find(s => s.id === storeId);
    return store?.name || '-';
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500 text-white';
      case 'suspended':
        return 'bg-yellow-500 text-white';
      case 'banned':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '활성';
      case 'suspended': return '정지';
      case 'banned': return '탈퇴';
      default: return status;
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">권한 확인 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b shrink-0">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">고객 관리</h1>
            <p className="text-xs text-muted-foreground">
              전체: {users.length}명 | 표시: {filteredUsers.length}명
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="px-4 pb-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="닉네임, 이메일, ID 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="active">활성</SelectItem>
              <SelectItem value="suspended">정지</SelectItem>
              <SelectItem value="banned">탈퇴</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Table Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            로딩 중...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">검색 결과가 없습니다</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="min-w-[1200px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10 text-center sticky left-0 bg-muted/50">#</TableHead>
                    <TableHead className="w-12">사진</TableHead>
                    <TableHead className="min-w-[100px]">닉네임</TableHead>
                    <TableHead className="min-w-[180px]">이메일</TableHead>
                    <TableHead className="min-w-[100px]">연락처</TableHead>
                    <TableHead className="min-w-[80px]">가입일</TableHead>
                    <TableHead className="w-20 text-center">메달</TableHead>
                    <TableHead className="text-right min-w-[70px]">총포인트</TableHead>
                    <TableHead className="text-right min-w-[70px]">확정</TableHead>
                    <TableHead className="text-right min-w-[70px]">대기</TableHead>
                    <TableHead className="text-right min-w-[80px]">일예산</TableHead>
                    <TableHead className="text-right min-w-[60px]">베이커리</TableHead>
                    <TableHead className="text-right min-w-[60px]">매장수</TableHead>
                    <TableHead className="min-w-[100px]">선호매장</TableHead>
                    <TableHead className="text-right min-w-[60px]">뱃지수</TableHead>
                    <TableHead className="w-16 text-center">상태</TableHead>
                    <TableHead className="w-12 text-center">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user, index) => (
                    <TableRow key={user.id} className="hover:bg-muted/30">
                      <TableCell className="text-center text-xs text-muted-foreground sticky left-0 bg-background">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt="" 
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {user.nickname || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.email || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.phone || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell className="text-center text-lg">
                        {getCurrentLevel(user.confirmed_points).emoji}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {user.points.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {user.confirmed_points.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-yellow-600 font-medium">
                        {user.pending_points.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.daily_budget > 0 ? `${user.daily_budget.toLocaleString()}원` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.bakery_purchase_count}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.unique_stores_visited.length}
                      </TableCell>
                      <TableCell className="text-sm">
                        {getStoreName(user.preferred_store_id)}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.badges.length}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusStyle(user.status)}`}>
                          {getStatusLabel(user.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.status !== 'active' && (
                              <DropdownMenuItem onClick={() => openActionDialog(user, 'activate')}>
                                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                활성화
                              </DropdownMenuItem>
                            )}
                            {user.status !== 'suspended' && (
                              <DropdownMenuItem onClick={() => openActionDialog(user, 'suspend')}>
                                <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                                활동 정지
                              </DropdownMenuItem>
                            )}
                            {user.status !== 'banned' && (
                              <DropdownMenuItem onClick={() => openActionDialog(user, 'ban')} className="text-destructive">
                                <Ban className="h-4 w-4 mr-2" />
                                강제 탈퇴
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'suspend' && '활동 정지'}
              {actionType === 'ban' && '강제 탈퇴'}
              {actionType === 'activate' && '계정 활성화'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.nickname || selectedUser?.email} 사용자를 
              {actionType === 'suspend' && ' 활동 정지 처리하시겠습니까?'}
              {actionType === 'ban' && ' 강제 탈퇴 처리하시겠습니까?'}
              {actionType === 'activate' && ' 다시 활성화하시겠습니까?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} disabled={processing}>
              취소
            </Button>
            <Button 
              variant={actionType === 'ban' ? 'destructive' : 'default'} 
              onClick={handleAction}
              disabled={processing}
            >
              {processing ? '처리 중...' : '확인'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
