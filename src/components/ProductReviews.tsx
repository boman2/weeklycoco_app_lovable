import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_profile?: {
    nickname: string | null;
    avatar_url: string | null;
  };
}

interface ProductReviewsProps {
  productId: string;
  productName?: string;
}

const ProductReviews = ({ productId, productName }: ProductReviewsProps) => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
    checkAuth();

    // Realtime subscription
    const channel = supabase
      .channel('product-reviews-' + productId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_reviews',
          filter: `product_id=eq.${productId}`
        },
        () => {
          fetchReviews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [productId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching reviews:', error);
      return;
    }

    // Fetch user profiles for each review
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, nickname, avatar_url')
        .in('id', userIds);

      const reviewsWithProfiles = data.map(review => ({
        ...review,
        user_profile: profiles?.find(p => p.id === review.user_id) || null
      }));

      setReviews(reviewsWithProfiles);
    } else {
      setReviews([]);
    }
  };

  const handleSubmit = async () => {
    if (!currentUserId) {
      toast.error('로그인이 필요합니다');
      navigate('/auth');
      return;
    }

    const trimmedReview = newReview.trim();
    if (!trimmedReview) {
      toast.error('상품평을 입력해주세요');
      return;
    }

    if (trimmedReview.length > 30) {
      toast.error('상품평은 30자 이내로 작성해주세요');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('product_reviews')
      .insert({
        product_id: productId,
        user_id: currentUserId,
        content: trimmedReview
      });

    setLoading(false);

    if (error) {
      console.error('Error submitting review:', error);
      toast.error('상품평 등록에 실패했습니다');
      return;
    }

    setNewReview('');
    toast.success('상품평이 등록되었습니다');
  };

  const handleDelete = async (reviewId: string) => {
    const { error } = await supabase
      .from('product_reviews')
      .delete()
      .eq('id', reviewId);

    if (error) {
      console.error('Error deleting review:', error);
      toast.error('삭제에 실패했습니다');
      return;
    }

    toast.success('상품평이 삭제되었습니다');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">상품평</h3>
        <span className="text-sm text-muted-foreground">({reviews.length})</span>
      </div>

      {/* Input Section */}
      <div className="flex gap-2 mb-4">
        <Input
          value={newReview}
          onChange={(e) => setNewReview(e.target.value)}
          placeholder="상품평을 입력하세요 (30자 이내)"
          maxLength={30}
          className="flex-1 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <Button 
          onClick={handleSubmit} 
          disabled={loading || !newReview.trim()}
          size="sm"
          className="shrink-0"
        >
          <span className="hidden sm:inline">등록</span>
          <MessageSquare className="w-4 h-4 sm:hidden" />
        </Button>
      </div>

      {/* Character count */}
      <div className="text-xs text-muted-foreground text-right mb-4 -mt-2">
        {newReview.length}/30
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            아직 상품평이 없습니다. 첫 번째 상품평을 남겨보세요!
          </p>
        ) : (
          reviews.map((review) => (
            <div 
              key={review.id} 
              className="flex items-start justify-between gap-2 py-2 border-b last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <button
                    onClick={() => navigate(`/user/${review.user_id}`)}
                    className="text-sm font-medium truncate hover:text-primary hover:underline transition-colors"
                  >
                    {review.user_profile?.nickname || '익명'}
                  </button>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDate(review.created_at)}
                  </span>
                </div>
                <p className="text-sm text-foreground break-words">
                  {review.content}
                </p>
              </div>
              {currentUserId === review.user_id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(review.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProductReviews;
