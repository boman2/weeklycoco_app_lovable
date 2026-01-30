import { useState, useEffect, useMemo } from 'react';
import { MapIcon, MessageSquare, List, Calendar, Heart, Star, Plus, ChevronLeft, ChevronRight, FolderEdit, Flag, Trash2, Send, X, Search, ExternalLink, ImageIcon, MessagesSquare } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import GoogleMapView from '@/components/GoogleMap';
import StoreBottomSheet from '@/components/StoreBottomSheet';
import LoginRequiredDialog from '@/components/LoginRequiredDialog';
import { stores as mockStores, Store } from '@/data/mockData';

interface Discussion {
  id: string;
  user_id: string;
  category: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  linked_product_id?: string | null;
  is_blinded?: boolean;
}

interface UserProfile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
}

interface LinkedProduct {
  product_id: string;
  name: string;
  current_price: number;
}

interface Comment {
  id: string;
  discussion_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  content: string;
  created_at: string;
  product?: {
    name: string;
  };
  user_profile?: {
    nickname: string | null;
  };
}

interface DbStore {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  closing_dates: string[] | null;
}

const FILTER_CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'general', label: '자유' },
  { id: 'deal', label: '할인' },
  { id: 'recipe', label: '레시피' },
  { id: 'store', label: '매장' },
];

const POST_CATEGORIES = [
  { id: 'general', label: '자유게시판' },
  { id: 'deal', label: '할인정보' },
  { id: 'recipe', label: '레시피' },
  { id: 'store', label: '매장정보' },
];

const ITEMS_PER_PAGE = 20;
const defaultClosingDays = [8, 22];

const Community = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  // View mode: 'discussion', 'map', or 'reviews'
  const [viewMode, setViewMode] = useState<'discussion' | 'map' | 'reviews'>('discussion');
  const [mapViewMode, setMapViewMode] = useState<'list' | 'map' | 'calendar'>('list');
  
  // Discussion state
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'general', imageFile: null as File | null, imagePreview: '' });
  const [filterCategory, setFilterCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [selectedPost, setSelectedPost] = useState<Discussion | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<LinkedProduct[]>([]);
  const [selectedLinkedProduct, setSelectedLinkedProduct] = useState<LinkedProduct | null>(null);
  const [linkedProducts, setLinkedProducts] = useState<Record<string, LinkedProduct>>({});
  const [userReports, setUserReports] = useState<Set<string>>(new Set());
  
  // Product Reviews state
  const [productReviews, setProductReviews] = useState<ProductReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  
  // Map state
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [dbStores, setDbStores] = useState<DbStore[]>([]);
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user.id);
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();
        setIsAdmin(!!roleData);
      }
    };
    checkAuth();
    fetchCategoryCounts();
    fetchStores();
  }, []);

  useEffect(() => {
    if (viewMode === 'discussion') {
      fetchDiscussions();
    } else if (viewMode === 'reviews') {
      fetchProductReviews();
    }
  }, [currentPage, filterCategory, viewMode]);

  const fetchProductReviews = async () => {
    setReviewsLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        // Fetch product names
        const productIds = [...new Set(data.map(r => r.product_id))];
        const { data: productsData } = await supabase
          .from('products')
          .select('product_id, name')
          .in('product_id', productIds);

        // Fetch user profiles
        const userIds = [...new Set(data.map(r => r.user_id))];
        const { data: profilesData } = await supabase
          .from('user_profiles')
          .select('id, nickname')
          .in('id', userIds);

        const productMap: Record<string, string> = {};
        productsData?.forEach(p => { productMap[p.product_id] = p.name; });

        const profileMap: Record<string, string | null> = {};
        profilesData?.forEach(p => { profileMap[p.id] = p.nickname; });

        const reviewsWithDetails = data.map(review => ({
          ...review,
          product: { name: productMap[review.product_id] || '알 수 없는 상품' },
          user_profile: { nickname: profileMap[review.user_id] || null }
        }));

        setProductReviews(reviewsWithDetails);
      } else {
        setProductReviews([]);
      }
    } catch (error) {
      console.error('Error fetching product reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchStores = async () => {
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
    }
  };

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
  
  const sortedStores = useMemo(() => {
    const filtered = selectedRegion
      ? stores.filter((s) => s.region === selectedRegion)
      : stores;
    return [...filtered].sort((a, b) => a.nameKo.localeCompare(b.nameKo, 'ko'));
  }, [selectedRegion, stores]);

  const fetchCategoryCounts = async () => {
    try {
      const counts: Record<string, number> = {};
      for (const cat of POST_CATEGORIES) {
        const { count } = await supabase
          .from('discussions')
          .select('*', { count: 'exact', head: true })
          .eq('category', cat.id);
        counts[cat.id] = count || 0;
      }
      const { count: totalAll } = await supabase
        .from('discussions')
        .select('*', { count: 'exact', head: true });
      counts['all'] = totalAll || 0;
      setCategoryCounts(counts);
    } catch (error) {
      console.error('Error fetching category counts:', error);
    }
  };

  const fetchDiscussions = async () => {
    setLoading(true);
    try {
      let countQuery = supabase.from('discussions').select('*', { count: 'exact', head: true });
      if (filterCategory !== 'all') {
        countQuery = countQuery.eq('category', filterCategory);
      }
      const { count } = await countQuery;
      setTotalCount(count || 0);

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let dataQuery = supabase.from('discussions').select('*').order('created_at', { ascending: false }).range(from, to);
      if (filterCategory !== 'all') {
        dataQuery = dataQuery.eq('category', filterCategory);
      }

      const { data, error } = await dataQuery;
      if (error) throw error;
      setDiscussions(data || []);

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(d => d.user_id))];
        const { data: profiles } = await supabase.from('user_profiles').select('id, nickname, avatar_url').in('id', userIds);

        if (profiles) {
          const profileMap: Record<string, UserProfile> = {};
          profiles.forEach(p => { profileMap[p.id] = p; });
          setUserProfiles(profileMap);
        }

        const productIds = data.filter(d => d.linked_product_id).map(d => d.linked_product_id);
        if (productIds.length > 0) {
          const { data: productsData } = await supabase.from('products').select('product_id, name').in('product_id', productIds);
          const { data: priceData } = await supabase.from('price_history').select('product_id, current_price, discount_price').in('product_id', productIds).order('recorded_at', { ascending: false });

          if (productsData) {
            const priceMap: Record<string, number> = {};
            priceData?.forEach(p => {
              if (!priceMap[p.product_id]) {
                priceMap[p.product_id] = p.discount_price || p.current_price;
              }
            });

            const linkedMap: Record<string, LinkedProduct> = {};
            productsData.forEach(p => {
              linkedMap[p.product_id] = { product_id: p.product_id, name: p.name, current_price: priceMap[p.product_id] || 0 };
            });
            setLinkedProducts(linkedMap);
          }
        }

        const discussionIds = data.map(d => d.id);
        const { data: commentsData } = await supabase.from('discussion_comments').select('discussion_id').in('discussion_id', discussionIds);
        if (commentsData) {
          const counts: Record<string, number> = {};
          commentsData.forEach(c => { counts[c.discussion_id] = (counts[c.discussion_id] || 0) + 1; });
          setCommentCounts(counts);
        }

        const { data: likesData } = await supabase.from('discussion_likes').select('discussion_id').in('discussion_id', discussionIds);
        if (likesData) {
          const counts: Record<string, number> = {};
          likesData.forEach(l => { counts[l.discussion_id] = (counts[l.discussion_id] || 0) + 1; });
          setLikeCounts(counts);
        }
      }
    } catch (error) {
      console.error('Error fetching discussions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && discussions.length > 0) {
      fetchUserLikes();
    }
  }, [currentUser, discussions]);

  const fetchUserLikes = async () => {
    if (!currentUser) return;
    const discussionIds = discussions.map(d => d.id);
    const { data } = await supabase.from('discussion_likes').select('discussion_id').eq('user_id', currentUser).in('discussion_id', discussionIds);
    if (data) {
      setUserLikes(new Set(data.map(l => l.discussion_id)));
    }
  };

  const handleLike = async (discussionId: string) => {
    if (!currentUser) {
      toast({ title: '로그인이 필요합니다', variant: 'destructive' });
      return;
    }

    const isLiked = userLikes.has(discussionId);
    try {
      if (isLiked) {
        await supabase.from('discussion_likes').delete().eq('discussion_id', discussionId).eq('user_id', currentUser);
        setUserLikes(prev => { const newSet = new Set(prev); newSet.delete(discussionId); return newSet; });
        setLikeCounts(prev => ({ ...prev, [discussionId]: Math.max((prev[discussionId] || 1) - 1, 0) }));
      } else {
        await supabase.from('discussion_likes').insert({ discussion_id: discussionId, user_id: currentUser });
        setUserLikes(prev => new Set(prev).add(discussionId));
        setLikeCounts(prev => ({ ...prev, [discussionId]: (prev[discussionId] || 0) + 1 }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const fetchComments = async (discussionId: string) => {
    const { data } = await supabase.from('discussion_comments').select('*').eq('discussion_id', discussionId).order('created_at', { ascending: true });
    if (data) {
      setComments(data);
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase.from('user_profiles').select('id, nickname, avatar_url').in('id', userIds);
      if (profiles) {
        const profileMap = { ...userProfiles };
        profiles.forEach(p => { profileMap[p.id] = p; });
        setUserProfiles(profileMap);
      }
    }
  };

  const handleCreateComment = async () => {
    if (!currentUser || !selectedPost || !newComment.trim()) return;

    try {
      const { error } = await supabase.from('discussion_comments').insert({ discussion_id: selectedPost.id, user_id: currentUser, content: newComment.trim() });
      if (error) throw error;

      setNewComment('');
      fetchComments(selectedPost.id);
      setCommentCounts(prev => ({ ...prev, [selectedPost.id]: (prev[selectedPost.id] || 0) + 1 }));
    } catch (error) {
      console.error('Error creating comment:', error);
      toast({ title: '댓글 등록에 실패했습니다', variant: 'destructive' });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPost({ ...newPost, imageFile: file, imagePreview: URL.createObjectURL(file) });
    }
  };

  const handleCreatePost = async () => {
    if (!currentUser) {
      toast({ title: '로그인이 필요합니다', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    if (!newPost.title.trim() || !newPost.content.trim()) {
      toast({ title: '제목과 내용을 입력해주세요', variant: 'destructive' });
      return;
    }

    try {
      let imageUrl = null;
      if (newPost.imageFile) {
        setUploadingImage(true);
        const fileExt = newPost.imageFile.name.split('.').pop();
        const fileName = `discussions/${currentUser}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('price-tags').upload(fileName, newPost.imageFile);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('price-tags').getPublicUrl(fileName);
        imageUrl = publicUrl;
        setUploadingImage(false);
      }

      const { error } = await supabase.from('discussions').insert({
        user_id: currentUser,
        category: newPost.category,
        title: newPost.title.trim(),
        content: newPost.content.trim(),
        image_url: imageUrl,
        linked_product_id: selectedLinkedProduct?.product_id || null,
      });

      toast({ title: '글이 등록되었습니다' });
      setNewPost({ title: '', content: '', category: 'general', imageFile: null, imagePreview: '' });
      setSelectedLinkedProduct(null);
      setIsDialogOpen(false);
      setCurrentPage(1);
      fetchDiscussions();
      fetchCategoryCounts();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({ title: '글 등록에 실패했습니다', variant: 'destructive' });
      setUploadingImage(false);
    }
  };

  const handleStoreSelect = (storeId: string) => {
    const store = stores.find((s) => s.id === storeId);
    if (store) {
      setSelectedStore({ id: store.id, name: store.name, nameKo: store.nameKo, region: store.region, address: store.address, lat: store.lat, lng: store.lng, isPlanned: store.isPlanned });
      setIsBottomSheetOpen(true);
    }
  };

  const handleRegisterAtStore = (storeId: string) => {
    setIsBottomSheetOpen(false);
    navigate(`/register?store=${storeId}`);
  };

  const getStoreClosingInfo = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    const closingDates = store?.closingDates || [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const specificDates = closingDates
      .filter(dateStr => {
        const date = new Date(dateStr);
        return date.getFullYear() === year && date.getMonth() === month;
      })
      .map(dateStr => new Date(dateStr).getDate());

    const allClosingDays = [...new Set([...defaultClosingDays, ...specificDates])].sort((a, b) => a - b);
    
    if (specificDates.length > 0) {
      return `휴무: ${allClosingDays.join('일, ')}일`;
    }
    return '휴무: 둘째·넷째 일요일';
  };

  const getCategoryLabel = (categoryId: string) => {
    return POST_CATEGORIES.find(c => c.id === categoryId)?.label || categoryId;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold">커뮤니티</h1>
            <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
              <button
                onClick={() => setViewMode('discussion')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-sm font-medium transition-colors',
                  viewMode === 'discussion' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                )}
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">토론</span>
              </button>
              <button
                onClick={() => setViewMode('reviews')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-sm font-medium transition-colors',
                  viewMode === 'reviews' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                )}
              >
                <MessagesSquare className="h-4 w-4" />
                <span className="hidden sm:inline">상품평</span>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-sm font-medium transition-colors',
                  viewMode === 'map' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                )}
              >
                <MapIcon className="h-4 w-4" />
                <span className="hidden sm:inline">매장</span>
              </button>
            </div>
          </div>

          {/* Sub-filters based on view mode */}
          {viewMode === 'discussion' && (
            <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
              {FILTER_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setFilterCategory(cat.id); setCurrentPage(1); }}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors',
                    filterCategory === cat.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {cat.label} {categoryCounts[cat.id] !== undefined && `(${categoryCounts[cat.id]})`}
                </button>
              ))}
            </div>
          )}
          
          {viewMode === 'reviews' && (
            <p className="text-xs text-muted-foreground">🔥 최근 상품평 (클릭하면 상품 페이지로 이동)</p>
          )}
          
          {viewMode === 'map' && (
            <div className="flex items-center justify-between gap-2">
              <Select value={selectedRegion || 'all'} onValueChange={(value) => setSelectedRegion(value === 'all' ? null : value)}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue placeholder="지역 선택" />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border z-50">
                  <SelectItem value="all">전체</SelectItem>
                  {regions.map((region) => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <button onClick={() => setMapViewMode('list')} className={cn('p-2 rounded-lg', mapViewMode === 'list' ? 'bg-muted' : '')}>
                  <List className="h-4 w-4" />
                </button>
                <button onClick={() => setMapViewMode('map')} className={cn('p-2 rounded-lg', mapViewMode === 'map' ? 'bg-muted' : '')}>
                  <MapIcon className="h-4 w-4" />
                </button>
                <button onClick={() => setMapViewMode('calendar')} className={cn('p-2 rounded-lg', mapViewMode === 'calendar' ? 'bg-muted' : '')}>
                  <Calendar className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="px-4 py-4">
        {viewMode === 'discussion' && (
          /* Discussion View */
          <div className="space-y-1.5">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : discussions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>게시글이 없습니다</p>
              </div>
            ) : (
              discussions.map((post) => (
                <div
                  key={post.id}
                  onClick={() => { setSelectedPost(post); fetchComments(post.id); }}
                  className={cn(
                    "p-2 rounded-lg bg-card border border-border transition-all cursor-pointer hover:shadow-sm",
                    post.is_blinded && "opacity-50"
                  )}
                >
                  {/* Mobile Layout - Compact */}
                  <div className="flex items-start gap-2 sm:hidden">
                    {post.image_url && (
                      <img src={post.image_url} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {/* New badge - within 24 hours */}
                        {new Date().getTime() - new Date(post.created_at).getTime() < 24 * 60 * 60 * 1000 && (
                          <span className="px-1 rounded bg-destructive text-destructive-foreground font-bold flex-shrink-0" style={{ fontSize: '8px' }}>N</span>
                        )}
                        <h3 className="font-medium text-foreground line-clamp-1 flex-1 min-w-0" style={{ fontSize: '14px' }}>
                          {post.is_blinded ? '[블라인드 처리된 게시글]' : post.title}
                        </h3>
                        <span className="px-1 rounded bg-muted flex-shrink-0" style={{ fontSize: '8px', color: 'hsl(var(--muted-foreground))', opacity: 0.5 }}>
                          {getCategoryLabel(post.category)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5" style={{ fontSize: '10px', color: 'hsl(var(--muted-foreground))', opacity: 0.7 }}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/user/${post.user_id}`);
                            }}
                          >
                            {userProfiles[post.user_id]?.nickname || '익명'}
                          </button>
                          <span>·</span>
                          <span>{formatDate(post.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center gap-0.5">
                            <MessageSquare style={{ width: '10px', height: '10px' }} />
                            {commentCounts[post.id] || 0}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}
                            className={cn("flex items-center gap-0.5", userLikes.has(post.id) && "text-primary")}
                          >
                            <Heart style={{ width: '10px', height: '10px' }} className={cn(userLikes.has(post.id) && "fill-current")} />
                            {likeCounts[post.id] || 0}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout - Single row */}
                  <div className="hidden sm:flex items-center gap-3">
                    {post.image_url && (
                      <img src={post.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium flex-shrink-0">
                      {getCategoryLabel(post.category)}
                    </span>
                    {/* New badge - within 24 hours */}
                    {new Date().getTime() - new Date(post.created_at).getTime() < 24 * 60 * 60 * 1000 && (
                      <span className="px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground text-[9px] font-bold flex-shrink-0">N</span>
                    )}
                    <h3 className="font-medium text-foreground text-sm line-clamp-1 flex-1 min-w-0">
                      {post.is_blinded ? '[블라인드 처리된 게시글]' : post.title}
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/user/${post.user_id}`);
                        }}
                        className="hover:text-primary hover:underline transition-colors"
                      >
                        {userProfiles[post.user_id]?.nickname || '익명'}
                      </button>
                      <span>{formatDate(post.created_at)}</span>
                      <span className="flex items-center gap-0.5">
                        <MessageSquare className="h-3 w-3" />
                        {commentCounts[post.id] || 0}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}
                        className={cn("flex items-center gap-0.5", userLikes.has(post.id) && "text-primary")}
                      >
                        <Heart className={cn("h-3 w-3", userLikes.has(post.id) && "fill-current")} />
                        {likeCounts[post.id] || 0}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 py-4 flex-wrap">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(1)}
                  className="h-8 w-8 p-0"
                >
                  1
                </Button>
                {currentPage > 3 && <span className="text-muted-foreground px-1">...</span>}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => page !== 1 && page !== totalPages && Math.abs(page - currentPage) <= 2)
                  .map(page => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="h-8 w-8 p-0"
                    >
                      {page}
                    </Button>
                  ))
                }
                {currentPage < totalPages - 2 && <span className="text-muted-foreground px-1">...</span>}
                {totalPages > 1 && (
                  <Button 
                    variant={currentPage === totalPages ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setCurrentPage(totalPages)}
                    className="h-8 w-8 p-0"
                  >
                    {totalPages}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {viewMode === 'reviews' && (
          /* Product Reviews View */
          <div className="space-y-3">
            {reviewsLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : productReviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessagesSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>아직 상품평이 없습니다</p>
              </div>
            ) : (
              productReviews.map((review) => (
                <div
                  key={review.id}
                  className="block p-3 rounded-xl bg-card border border-border transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      to={`/product/${review.product_id}`} 
                      className="flex-1 min-w-0"
                    >
                      <p className="text-sm font-medium text-primary truncate mb-1">
                        {review.product?.name || '알 수 없는 상품'}
                      </p>
                      <p className="text-sm text-foreground break-words">
                        "{review.content}"
                      </p>
                    </Link>
                    <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground shrink-0">
                      <button
                        onClick={() => navigate(`/user/${review.user_id}`)}
                        className="hover:text-primary hover:underline transition-colors"
                      >
                        {review.user_profile?.nickname || '익명'}
                      </button>
                      <span>{formatDate(review.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {viewMode === 'map' && (
          <div>
            {mapViewMode === 'map' ? (
              <div className="h-[calc(100vh-220px)] rounded-2xl overflow-hidden">
                <GoogleMapView
                  stores={sortedStores}
                  onStoreSelect={handleStoreSelect}
                  onRegisterAtStore={handleRegisterAtStore}
                />
              </div>
            ) : mapViewMode === 'calendar' ? (
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
                {(() => {
                  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
                  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
                  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
                  const daysInMonth = getDaysInMonth(currentMonth);
                  const firstDay = getFirstDayOfMonth(currentMonth);
                  
                  const getClosedStoresForDay = (day: number) => {
                    const year = currentMonth.getFullYear();
                    const month = currentMonth.getMonth();
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isDefaultClosingDay = defaultClosingDays.includes(day);
                    
                    if (isDefaultClosingDay) {
                      return sortedStores;
                    }
                    return sortedStores.filter(s => s.closingDates?.includes(dateStr));
                  };
                  
                  const days = [];
                  for (let i = 0; i < firstDay; i++) {
                    days.push(<div key={`empty-${i}`} className="p-1 md:p-2" />);
                  }
                  for (let day = 1; day <= daysInMonth; day++) {
                    const closedStores = getClosedStoresForDay(day);
                    const hasClosedStores = closedStores.length > 0;
                    const isAllStoresClosed = closedStores.length === sortedStores.length;
                    
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
                        
                        {hoveredDay === day && hasClosedStores && (
                          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-card border border-border rounded-lg shadow-lg p-3 min-w-[200px] md:min-w-[320px]">
                            <p className="text-xs font-medium text-foreground mb-2">
                              {currentMonth.getMonth() + 1}월 {day}일 휴무 매장
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-2 gap-y-0.5">
                              {closedStores.map(store => (
                                <p key={store.id} className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                                  {store.nameKo}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  return (
                    <>
                      <div className="grid grid-cols-7 gap-0.5 md:gap-1">
                        {weekDays.map(day => (
                          <div key={day} className="text-center text-xs md:text-sm font-medium text-muted-foreground py-2">
                            {day}
                          </div>
                        ))}
                        {days}
                      </div>
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
                    </>
                  );
                })()}
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-4">{sortedStores.length}개 매장</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {sortedStores.map((store) => (
                    <div
                      key={store.id}
                      onClick={() => handleStoreSelect(store.id)}
                      className="flex flex-col items-center p-4 bg-card rounded-xl border border-border cursor-pointer hover:shadow-md transition-all"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mb-2">
                        <span className="text-lg">🏪</span>
                      </div>
                      <h3 className="font-medium text-sm text-center">{store.nameKo}</h3>
                      <p className="text-[10px] text-muted-foreground mt-1">{store.region}</p>
                      <p className="text-[10px] text-destructive/80 mt-1">{getStoreClosingInfo(store.id)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FAB for discussion */}
      {viewMode === 'discussion' && (
        <button
          onClick={() => {
            if (!currentUser) {
              setIsLoginDialogOpen(true);
            } else {
              setIsDialogOpen(true);
            }
          }}
          className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className="h-6 w-6 text-primary-foreground" />
        </button>
      )}

      {/* Login Required Dialog */}
      <LoginRequiredDialog
        open={isLoginDialogOpen}
        onOpenChange={setIsLoginDialogOpen}
        onLoginSuccess={() => {
          // Re-check auth and open create dialog
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
              setCurrentUser(user.id);
              setIsDialogOpen(true);
            }
          });
        }}
        message="글을 작성하려면 로그인이 필요합니다"
      />

      {/* Create Post Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 글 작성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={newPost.category} onValueChange={(v) => setNewPost({ ...newPost, category: v })}>
              <SelectTrigger><SelectValue placeholder="카테고리 선택" /></SelectTrigger>
              <SelectContent>
                {POST_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="제목" value={newPost.title} onChange={(e) => setNewPost({ ...newPost, title: e.target.value })} />
            <Textarea placeholder="내용을 입력하세요..." value={newPost.content} onChange={(e) => setNewPost({ ...newPost, content: e.target.value })} rows={5} />
            
            {newPost.imagePreview ? (
              <div className="relative">
                <img src={newPost.imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                <button onClick={() => setNewPost({ ...newPost, imageFile: null, imagePreview: '' })} className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">이미지 첨부</span>
                <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              </label>
            )}
            
            <Button onClick={handleCreatePost} disabled={uploadingImage} className="w-full">
              {uploadingImage ? '업로드 중...' : '등록하기'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Post Detail Dialog - Enhanced Design */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden rounded-2xl">
          {selectedPost && (
            <div className="flex flex-col max-h-[90vh]">
              {/* Header with close button */}
              <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
                <span className="inline-block px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {getCategoryLabel(selectedPost.category)}
                </span>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <button
                    onClick={() => handleLike(selectedPost.id)}
                    className={cn("flex items-center gap-1 hover:text-primary transition-colors", userLikes.has(selectedPost.id) && "text-primary")}
                  >
                    <Heart className={cn("h-4 w-4", userLikes.has(selectedPost.id) && "fill-current")} />
                    {likeCounts[selectedPost.id] || 0}
                  </button>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    {comments.length}
                  </span>
                </div>
              </div>

              {/* Image Section */}
              {selectedPost.image_url && (
                <div className="relative w-full aspect-video max-h-[35vh] bg-muted">
                  <img 
                    src={selectedPost.image_url} 
                    alt="" 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              
              {/* Content Section */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Title */}
                <h2 className="text-lg font-bold text-foreground leading-tight">
                  {selectedPost.is_blinded ? '[블라인드]' : selectedPost.title}
                </h2>

                {/* Author Info */}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => navigate(`/user/${selectedPost.user_id}`)}
                    className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-sm font-semibold text-primary hover:ring-2 hover:ring-primary transition-all"
                  >
                    {(userProfiles[selectedPost.user_id]?.nickname || '익명').charAt(0)}
                  </button>
                  <div className="flex-1">
                    <button
                      onClick={() => navigate(`/user/${selectedPost.user_id}`)}
                      className="font-medium text-sm hover:text-primary hover:underline transition-colors"
                    >
                      {userProfiles[selectedPost.user_id]?.nickname || '익명'}
                    </button>
                    <p className="text-xs text-muted-foreground">{formatDate(selectedPost.created_at)}</p>
                  </div>
                </div>

                {/* Content Text */}
                <div className="bg-muted/30 rounded-xl p-4">
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed text-sm">
                    {selectedPost.is_blinded ? '신고가 누적되어 블라인드 처리되었습니다.' : selectedPost.content}
                  </p>
                </div>

                {/* Linked Product */}
                {selectedPost.linked_product_id && linkedProducts[selectedPost.linked_product_id] && (
                  <div 
                    onClick={() => navigate(`/product/${selectedPost.linked_product_id}`)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Star className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{linkedProducts[selectedPost.linked_product_id].name}</p>
                      <p className="text-xs text-muted-foreground">연결된 상품 보기</p>
                    </div>
                    <span className="font-bold text-primary text-sm">
                      ₩{linkedProducts[selectedPost.linked_product_id].current_price.toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Comments Section */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    댓글 {comments.length}개
                  </h4>
                  
                  {comments.length > 0 ? (
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 p-3 bg-muted/30 rounded-xl">
                          <button
                            onClick={() => navigate(`/user/${comment.user_id}`)}
                            className="h-8 w-8 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center text-xs font-medium flex-shrink-0 hover:ring-2 hover:ring-primary transition-all"
                          >
                            {(userProfiles[comment.user_id]?.nickname || '익명').charAt(0)}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <button
                                onClick={() => navigate(`/user/${comment.user_id}`)}
                                className="text-sm font-medium hover:text-primary hover:underline transition-colors"
                              >
                                {userProfiles[comment.user_id]?.nickname || '익명'}
                              </button>
                              <span className="text-[10px] text-muted-foreground">{formatDate(comment.created_at)}</span>
                            </div>
                            <p className="text-sm text-foreground">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">아직 댓글이 없습니다</p>
                      <p className="text-xs">첫 댓글을 남겨보세요!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Comment Input - Fixed at bottom */}
              {currentUser && (
                <div className="border-t border-border p-3 bg-card/95 backdrop-blur-sm">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="댓글을 입력하세요..." 
                      value={newComment} 
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleCreateComment()}
                      className="flex-1 h-10 rounded-full px-4"
                    />
                    <Button 
                      size="icon" 
                      onClick={handleCreateComment} 
                      disabled={!newComment.trim()}
                      className="h-10 w-10 rounded-full"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Store Bottom Sheet */}
      <StoreBottomSheet
        store={selectedStore}
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        onRegister={handleRegisterAtStore}
      />
    </div>
  );
};

export default Community;
