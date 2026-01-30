import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Eye, EyeOff, Trash2, RotateCcw, Flag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BlindedDiscussion {
  id: string;
  title: string;
  content: string;
  category: string;
  user_id: string;
  created_at: string;
  is_blinded: boolean;
  report_count: number;
  author_nickname: string | null;
}

const AdminDiscussions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [discussions, setDiscussions] = useState<BlindedDiscussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<'all' | 'blinded' | 'reported'>('all');

  useEffect(() => {
    checkAdminAndFetch();
  }, [filter]);

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
      .maybeSingle();

    if (!roleData) {
      toast({ title: '접근 권한이 없습니다', variant: 'destructive' });
      navigate('/');
      return;
    }

    setIsAdmin(true);
    fetchDiscussions();
  };

  const fetchDiscussions = async () => {
    setLoading(true);
    try {
      // Fetch discussions with report counts
      let query = supabase
        .from('discussions')
        .select('id, title, content, category, user_id, created_at, is_blinded')
        .order('created_at', { ascending: false });

      if (filter === 'blinded') {
        query = query.eq('is_blinded', true);
      }

      const { data: discussionsData, error } = await query;
      if (error) throw error;

      if (!discussionsData || discussionsData.length === 0) {
        setDiscussions([]);
        setLoading(false);
        return;
      }

      // Fetch report counts
      const discussionIds = discussionsData.map(d => d.id);
      const { data: reportsData } = await supabase
        .from('discussion_reports')
        .select('discussion_id')
        .in('discussion_id', discussionIds);

      const reportCounts: Record<string, number> = {};
      reportsData?.forEach(r => {
        reportCounts[r.discussion_id] = (reportCounts[r.discussion_id] || 0) + 1;
      });

      // Fetch author nicknames
      const userIds = [...new Set(discussionsData.map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, nickname')
        .in('id', userIds);

      const nicknameMap: Record<string, string | null> = {};
      profiles?.forEach(p => {
        nicknameMap[p.id] = p.nickname;
      });

      let result = discussionsData.map(d => ({
        ...d,
        report_count: reportCounts[d.id] || 0,
        author_nickname: nicknameMap[d.user_id] || null,
      }));

      if (filter === 'reported') {
        result = result.filter(d => d.report_count > 0);
      }

      setDiscussions(result);
    } catch (error) {
      console.error('Error fetching discussions:', error);
      toast({ title: '데이터 로드 실패', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlind = async (id: string, currentBlinded: boolean) => {
    try {
      const { error } = await supabase
        .from('discussions')
        .update({ is_blinded: !currentBlinded })
        .eq('id', id);

      if (error) throw error;

      toast({ title: currentBlinded ? '게시글이 복원되었습니다' : '게시글이 블라인드 처리되었습니다' });
      fetchDiscussions();
    } catch (error) {
      console.error('Error toggling blind:', error);
      toast({ title: '처리 실패', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    try {
      const { error } = await supabase
        .from('discussions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: '게시글이 삭제되었습니다' });
      fetchDiscussions();
    } catch (error) {
      console.error('Error deleting discussion:', error);
      toast({ title: '삭제 실패', variant: 'destructive' });
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      general: '자유게시판',
      deal: '할인정보',
      recipe: '레시피',
      store: '매장정보',
    };
    return labels[category] || category;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background safe-bottom pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">게시글 관리</h1>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex gap-2 px-4 pb-3">
          {[
            { id: 'all', label: '전체' },
            { id: 'reported', label: '신고됨' },
            { id: 'blinded', label: '블라인드' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                filter === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : discussions.length > 0 ? (
          <div className="space-y-3">
            {discussions.map((discussion) => (
              <div
                key={discussion.id}
                className={cn(
                  'rounded-xl bg-card border p-4',
                  discussion.is_blinded ? 'border-destructive/50 bg-destructive/5' : 'border-border'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {getCategoryLabel(discussion.category)}
                      </span>
                      {discussion.is_blinded && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                          블라인드
                        </span>
                      )}
                      {discussion.report_count > 0 && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          <Flag className="h-3 w-3" />
                          {discussion.report_count}
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-foreground mt-2 line-clamp-1">{discussion.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{discussion.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{discussion.author_nickname || '익명'}</span>
                      <span>·</span>
                      <span>{formatDate(discussion.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleBlind(discussion.id, discussion.is_blinded)}
                      className={cn(
                        'gap-1',
                        discussion.is_blinded && 'text-green-600 border-green-600 hover:bg-green-50'
                      )}
                    >
                      {discussion.is_blinded ? (
                        <>
                          <RotateCcw className="h-3 w-3" />
                          복원
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" />
                          블라인드
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(discussion.id)}
                      className="gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {filter === 'blinded' ? '블라인드 처리된 게시글이 없습니다' :
               filter === 'reported' ? '신고된 게시글이 없습니다' :
               '게시글이 없습니다'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDiscussions;
