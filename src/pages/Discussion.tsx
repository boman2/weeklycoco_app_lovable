import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Heart, ImageIcon, Send, X, Search, ExternalLink, Star, FolderEdit, Flag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoginRequiredDialog from '@/components/LoginRequiredDialog';

interface Discussion {
  id: string;
  user_id: string;
  category: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  linked_product_id?: string | null;
  is_blinded?: boolean;
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

interface UserProfile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
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

const Discussion = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'general', imageFile: null as File | null, imagePreview: '', linkedProductId: '' });
  const [filterCategory, setFilterCategory] = useState(searchParams.get('category') || 'all');
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
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const [userReports, setUserReports] = useState<Set<string>>(new Set());
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
  }, []);

  useEffect(() => {
    fetchCategoryCounts();
  }, []);

  useEffect(() => {
    fetchDiscussions();
  }, [currentPage, filterCategory]);

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
      // All count
      const { count: totalAll } = await supabase
        .from('discussions')
        .select('*', { count: 'exact', head: true });
      counts['all'] = totalAll || 0;
      setCategoryCounts(counts);
    } catch (error) {
      console.error('Error fetching category counts:', error);
    }
  };

  useEffect(() => {
    if (currentUser && discussions.length > 0) {
      fetchUserLikes();
      fetchUserReports();
    }
  }, [currentUser, discussions]);

  useEffect(() => {
    if (discussions.length > 0) {
      fetchReportCounts();
    }
  }, [discussions]);

  const fetchDiscussions = async () => {
    setLoading(true);
    try {
      let countQuery = supabase
        .from('discussions')
        .select('*', { count: 'exact', head: true });
      
      if (filterCategory !== 'all') {
        countQuery = countQuery.eq('category', filterCategory);
      }
      
      const { count } = await countQuery;
      setTotalCount(count || 0);

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let dataQuery = supabase
        .from('discussions')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (filterCategory !== 'all') {
        dataQuery = dataQuery.eq('category', filterCategory);
      }

      const { data, error } = await dataQuery;

      if (error) throw error;
      setDiscussions(data || []);

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(d => d.user_id))];
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, nickname, avatar_url')
          .in('id', userIds);

        if (profiles) {
          const profileMap: Record<string, UserProfile> = {};
          profiles.forEach(p => { profileMap[p.id] = p; });
          setUserProfiles(profileMap);
        }

        // Fetch linked products
        const productIds = data.filter(d => d.linked_product_id).map(d => d.linked_product_id);
        if (productIds.length > 0) {
          const { data: productsData } = await supabase
            .from('products')
            .select('product_id, name')
            .in('product_id', productIds);
          
          const { data: priceData } = await supabase
            .from('price_history')
            .select('product_id, current_price, discount_price')
            .in('product_id', productIds)
            .order('recorded_at', { ascending: false });

          if (productsData) {
            const priceMap: Record<string, number> = {};
            priceData?.forEach(p => {
              if (!priceMap[p.product_id]) {
                priceMap[p.product_id] = p.discount_price || p.current_price;
              }
            });

            const linkedMap: Record<string, LinkedProduct> = {};
            productsData.forEach(p => {
              linkedMap[p.product_id] = {
                product_id: p.product_id,
                name: p.name,
                current_price: priceMap[p.product_id] || 0
              };
            });
            setLinkedProducts(linkedMap);
          }
        }

        const discussionIds = data.map(d => d.id);
        const { data: commentsData } = await supabase
          .from('discussion_comments')
          .select('discussion_id')
          .in('discussion_id', discussionIds);

        if (commentsData) {
          const counts: Record<string, number> = {};
          commentsData.forEach(c => {
            counts[c.discussion_id] = (counts[c.discussion_id] || 0) + 1;
          });
          setCommentCounts(counts);
        }

        const { data: likesData } = await supabase
          .from('discussion_likes')
          .select('discussion_id')
          .in('discussion_id', discussionIds);

        if (likesData) {
          const counts: Record<string, number> = {};
          likesData.forEach(l => {
            counts[l.discussion_id] = (counts[l.discussion_id] || 0) + 1;
          });
          setLikeCounts(counts);
        }
      }
    } catch (error) {
      console.error('Error fetching discussions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLikes = async () => {
    if (!currentUser) return;
    const discussionIds = discussions.map(d => d.id);
    const { data } = await supabase
      .from('discussion_likes')
      .select('discussion_id')
      .eq('user_id', currentUser)
      .in('discussion_id', discussionIds);

    if (data) {
      setUserLikes(new Set(data.map(l => l.discussion_id)));
    }
  };

  const fetchReportCounts = async () => {
    const discussionIds = discussions.map(d => d.id);
    const { data } = await supabase
      .from('discussion_reports')
      .select('discussion_id')
      .in('discussion_id', discussionIds);

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(r => {
        counts[r.discussion_id] = (counts[r.discussion_id] || 0) + 1;
      });
      setReportCounts(counts);
    }
  };

  const fetchUserReports = async () => {
    if (!currentUser) return;
    const discussionIds = discussions.map(d => d.id);
    const { data } = await supabase
      .from('discussion_reports')
      .select('discussion_id')
      .eq('user_id', currentUser)
      .in('discussion_id', discussionIds);

    if (data) {
      setUserReports(new Set(data.map(r => r.discussion_id)));
    }
  };

  const handleReport = async (discussionId: string) => {
    if (!currentUser) {
      toast({ title: '로그인이 필요합니다', variant: 'destructive' });
      return;
    }

    if (userReports.has(discussionId)) {
      toast({ title: '이미 신고한 게시글입니다', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase
        .from('discussion_reports')
        .insert({ discussion_id: discussionId, user_id: currentUser });

      if (error) throw error;

      setUserReports(prev => new Set(prev).add(discussionId));
      setReportCounts(prev => ({ ...prev, [discussionId]: (prev[discussionId] || 0) + 1 }));
      toast({ title: '신고가 접수되었습니다' });
    } catch (error) {
      console.error('Error reporting:', error);
      toast({ title: '신고 처리에 실패했습니다', variant: 'destructive' });
    }
  };

  const fetchComments = async (discussionId: string) => {
    const { data } = await supabase
      .from('discussion_comments')
      .select('*')
      .eq('discussion_id', discussionId)
      .order('created_at', { ascending: true });

    if (data) {
      setComments(data);
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, nickname, avatar_url')
        .in('id', userIds);
      if (profiles) {
        const profileMap = { ...userProfiles };
        profiles.forEach(p => { profileMap[p.id] = p; });
        setUserProfiles(profileMap);
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPost({
        ...newPost,
        imageFile: file,
        imagePreview: URL.createObjectURL(file)
      });
    }
  };

  const handleSearchProduct = async (query: string) => {
    setProductSearchQuery(query);
    if (query.length < 2) {
      setProductSearchResults([]);
      return;
    }

    try {
      const { data } = await supabase
        .from('products')
        .select('product_id, name')
        .or(`product_id.ilike.%${query}%,name.ilike.%${query}%`)
        .limit(5);

      if (data) {
        // Fetch current prices
        const productIds = data.map(p => p.product_id);
        const { data: priceData } = await supabase
          .from('price_history')
          .select('product_id, current_price, discount_price')
          .in('product_id', productIds)
          .order('recorded_at', { ascending: false });

        const priceMap: Record<string, number> = {};
        priceData?.forEach(p => {
          if (!priceMap[p.product_id]) {
            priceMap[p.product_id] = p.discount_price || p.current_price;
          }
        });

        setProductSearchResults(data.map(p => ({
          product_id: p.product_id,
          name: p.name,
          current_price: priceMap[p.product_id] || 0
        })));
      }
    } catch (error) {
      console.error('Error searching products:', error);
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
        
        const { error: uploadError } = await supabase.storage
          .from('price-tags')
          .upload(fileName, newPost.imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('price-tags')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
        setUploadingImage(false);
      }

      const insertData: any = {
        user_id: currentUser,
        category: newPost.category,
        title: newPost.title.trim(),
        content: newPost.content.trim(),
        image_url: imageUrl,
        linked_product_id: selectedLinkedProduct?.product_id || null,
      };

      const { error } = await supabase.from('discussions').insert(insertData);

      toast({ title: '글이 등록되었습니다' });
      setNewPost({ title: '', content: '', category: 'general', imageFile: null, imagePreview: '', linkedProductId: '' });
      setSelectedLinkedProduct(null);
      setProductSearchQuery('');
      setProductSearchResults([]);
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

  const handleDeletePost = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase.from('discussions').delete().eq('id', id);
      if (error) throw error;
      toast({ title: '글이 삭제되었습니다' });
      fetchDiscussions();
      fetchCategoryCounts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({ title: '삭제에 실패했습니다', variant: 'destructive' });
    }
  };

  const handleChangeCategory = async (discussionId: string, newCategory: string) => {
    try {
      const { error } = await supabase
        .from('discussions')
        .update({ category: newCategory })
        .eq('id', discussionId);
      
      if (error) throw error;
      
      toast({ title: `카테고리가 '${getCategoryLabel(newCategory)}'(으)로 변경되었습니다` });
      fetchDiscussions();
      fetchCategoryCounts();
    } catch (error) {
      console.error('Error changing category:', error);
      toast({ title: '카테고리 변경에 실패했습니다', variant: 'destructive' });
    }
  };

  const handleLikeToggle = async (discussionId: string) => {
    if (!currentUser) {
      toast({ title: '로그인이 필요합니다', variant: 'destructive' });
      return;
    }

    const isLiked = userLikes.has(discussionId);

    try {
      if (isLiked) {
        await supabase
          .from('discussion_likes')
          .delete()
          .eq('discussion_id', discussionId)
          .eq('user_id', currentUser);

        setUserLikes(prev => {
          const next = new Set(prev);
          next.delete(discussionId);
          return next;
        });
        setLikeCounts(prev => ({ ...prev, [discussionId]: (prev[discussionId] || 1) - 1 }));
      } else {
        await supabase
          .from('discussion_likes')
          .insert({ discussion_id: discussionId, user_id: currentUser });

        setUserLikes(prev => new Set(prev).add(discussionId));
        setLikeCounts(prev => ({ ...prev, [discussionId]: (prev[discussionId] || 0) + 1 }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleAddComment = async () => {
    if (!currentUser || !selectedPost) {
      toast({ title: '로그인이 필요합니다', variant: 'destructive' });
      return;
    }

    if (!newComment.trim()) return;

    try {
      const { error } = await supabase
        .from('discussion_comments')
        .insert({
          discussion_id: selectedPost.id,
          user_id: currentUser,
          content: newComment.trim(),
        });

      if (error) throw error;

      setNewComment('');
      fetchComments(selectedPost.id);
      setCommentCounts(prev => ({ ...prev, [selectedPost.id]: (prev[selectedPost.id] || 0) + 1 }));
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({ title: '댓글 등록에 실패했습니다', variant: 'destructive' });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedPost) return;

    try {
      const { error } = await supabase
        .from('discussion_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      fetchComments(selectedPost.id);
      setCommentCounts(prev => ({ ...prev, [selectedPost.id]: Math.max(0, (prev[selectedPost.id] || 1) - 1) }));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
  };

  const getCategoryLabel = (categoryId: string) => {
    return [...FILTER_CATEGORIES, ...POST_CATEGORIES].find(c => c.id === categoryId)?.label || categoryId;
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-background safe-bottom pb-24">
      {/* Login Required Dialog */}
      <LoginRequiredDialog
        open={isLoginDialogOpen}
        onOpenChange={setIsLoginDialogOpen}
        onLoginSuccess={() => {
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>새 글 작성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">카테고리</label>
              <Select value={newPost.category} onValueChange={(value) => setNewPost({ ...newPost, category: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POST_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">제목</label>
              <Input
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                placeholder="제목을 입력하세요"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">내용</label>
              <Textarea
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                placeholder="내용을 입력하세요"
                className="mt-1 min-h-[150px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium">이미지 (선택)</label>
              <div className="mt-1">
                {newPost.imagePreview ? (
                  <div className="relative">
                    <img src={newPost.imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                    <button
                      onClick={() => setNewPost({ ...newPost, imageFile: null, imagePreview: '' })}
                      className="absolute top-2 right-2 p-1 bg-background/80 rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 h-20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">이미지 추가</span>
                  </label>
                )}
              </div>
            </div>
            {/* Product Link Section */}
            <div>
              <label className="text-sm font-medium">상품 연결 (선택)</label>
              <div className="mt-1 space-y-2">
                <div className="relative">
                  <Input
                    value={productSearchQuery}
                    onChange={(e) => handleSearchProduct(e.target.value)}
                    placeholder="상품번호 또는 상품명 검색"
                    className="pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                {productSearchResults.length > 0 && (
                  <div className="border border-border rounded-lg overflow-hidden">
                    {productSearchResults.map((product) => (
                      <button
                        key={product.product_id}
                        onClick={() => {
                          setSelectedLinkedProduct(product);
                          setNewPost({ ...newPost, linkedProductId: product.product_id });
                          setProductSearchQuery(product.name);
                          setProductSearchResults([]);
                        }}
                        className="w-full flex items-center justify-between p-2 hover:bg-muted transition-colors text-left"
                      >
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">#{product.product_id}</p>
                        </div>
                        <span className="text-sm text-primary">{product.current_price.toLocaleString()}원</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedLinkedProduct && (
                  <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{selectedLinkedProduct.name}</p>
                      <p className="text-xs text-muted-foreground">#{selectedLinkedProduct.product_id} · {selectedLinkedProduct.current_price.toLocaleString()}원</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedLinkedProduct(null);
                        setNewPost({ ...newPost, linkedProductId: '' });
                        setProductSearchQuery('');
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <Button onClick={handleCreatePost} className="w-full" disabled={uploadingImage}>
              {uploadingImage ? '업로드 중...' : '등록하기'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 px-4 py-3 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">토론게시판</h1>
          <Button 
            size="sm" 
            className="gap-1"
            onClick={() => {
              if (!currentUser) {
                setIsLoginDialogOpen(true);
              } else {
                setIsDialogOpen(true);
              }
            }}
          >
            <Plus className="h-4 w-4" />
            글쓰기
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">총 {totalCount}개의 글</p>
        
        {/* Category Filter Tabs - Scrollable on mobile */}
        <div className="flex gap-1.5 md:gap-2 mt-3 overflow-x-auto hide-scrollbar pb-1">
          {FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setFilterCategory(cat.id);
                setCurrentPage(1);
              }}
              className={cn(
                'flex-shrink-0 rounded-full px-3 md:px-4 py-1 md:py-1.5 text-xs md:text-sm font-medium transition-colors',
                filterCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {cat.label}
              {categoryCounts[cat.id] !== undefined && (
                <span className="ml-0.5 md:ml-1">({categoryCounts[cat.id]})</span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {/* Discussions List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : discussions.length > 0 ? (
          <div className="space-y-1.5 md:space-y-2">
            {discussions.filter(d => !d.is_blinded || isAdmin).map((discussion) => (
              <div
                key={discussion.id}
                className={cn(
                  "flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl bg-card border transition-colors cursor-pointer",
                  discussion.is_blinded ? "border-destructive/50 bg-destructive/5" : "border-border hover:border-primary/50"
                )}
                onClick={() => {
                  if (discussion.is_blinded && !isAdmin) return;
                  setSelectedPost(discussion);
                  fetchComments(discussion.id);
                }}
              >
                {/* Thumbnail */}
                <div className="w-10 h-10 md:w-14 md:h-14 flex-shrink-0 rounded-lg bg-muted overflow-hidden">
                  {discussion.image_url ? (
                    <img src={discussion.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px] md:text-xs">
                      {getCategoryLabel(discussion.category).slice(0, 2)}
                    </div>
                  )}
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] md:text-xs text-primary font-medium">[{getCategoryLabel(discussion.category)}]</span>
                    {discussion.linked_product_id && (
                      <Star className="h-3 w-3 text-amber-500 fill-current flex-shrink-0" />
                    )}
                  </div>
                  <h3 className="text-xs md:text-sm font-medium text-foreground line-clamp-1">
                    {discussion.title}
                    {(commentCounts[discussion.id] || 0) > 0 && (
                      <span className="text-primary ml-1 text-[10px] md:text-xs">({commentCounts[discussion.id]})</span>
                    )}
                  </h3>
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] md:text-xs text-muted-foreground">
                    <span>{formatDate(discussion.created_at)}</span>
                    <span>·</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLikeToggle(discussion.id);
                      }}
                      className={cn(
                        "flex items-center gap-0.5 transition-colors",
                        userLikes.has(discussion.id) ? "text-destructive" : "text-muted-foreground hover:text-destructive"
                      )}
                    >
                      <Heart className={cn("h-3 w-3", userLikes.has(discussion.id) && "fill-current")} />
                      <span>{likeCounts[discussion.id] || 0}</span>
                    </button>
                  </div>
                </div>

                {/* Admin actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Category change - Admin only */}
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 md:p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="카테고리 변경"
                        >
                          <FolderEdit className="h-3 w-3 md:h-4 md:w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        {POST_CATEGORIES.filter(cat => cat.id !== discussion.category).map((cat) => (
                          <DropdownMenuItem
                            key={cat.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChangeCategory(discussion.id, cat.id);
                            }}
                          >
                            {cat.label}(으)로 이동
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  
                  {/* Delete button */}
                  {(currentUser === discussion.user_id || isAdmin) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePost(discussion.id);
                      }}
                      className="p-1.5 md:p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                    >
                      <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">아직 글이 없습니다</p>
            <p className="text-sm text-muted-foreground">첫 번째 글을 작성해보세요!</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>

      {/* Post Detail Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedPost && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedPost.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-primary font-medium">[{getCategoryLabel(selectedPost.category)}]</span>
                  <span>{userProfiles[selectedPost.user_id]?.nickname || '익명'}</span>
                  <span>·</span>
                  <span>{formatDate(selectedPost.created_at)}</span>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => handleLikeToggle(selectedPost.id)}
                      className={cn(
                        "flex items-center gap-1 transition-colors",
                        userLikes.has(selectedPost.id) ? "text-destructive" : "text-muted-foreground hover:text-destructive"
                      )}
                    >
                      <Heart className={cn("h-4 w-4", userLikes.has(selectedPost.id) && "fill-current")} />
                      <span>{likeCounts[selectedPost.id] || 0}</span>
                    </button>
                    <button
                      onClick={() => handleReport(selectedPost.id)}
                      className={cn(
                        "flex items-center gap-1 transition-colors",
                        userReports.has(selectedPost.id) ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"
                      )}
                      title="신고하기"
                    >
                      <Flag className={cn("h-4 w-4", userReports.has(selectedPost.id) && "fill-current")} />
                    </button>
                  </div>
                </div>
                <p className="text-foreground whitespace-pre-wrap">{selectedPost.content}</p>
                {selectedPost.image_url && (
                  <img src={selectedPost.image_url} alt="" className="w-full rounded-lg" />
                )}
                
              {/* Linked Product Section */}
                {selectedPost.linked_product_id && linkedProducts[selectedPost.linked_product_id] && (
                  <div className="p-3 bg-muted rounded-lg border border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">연결된 상품</p>
                        <p className="font-medium text-foreground">{linkedProducts[selectedPost.linked_product_id].name}</p>
                        <p className="text-sm text-muted-foreground">
                          #{linkedProducts[selectedPost.linked_product_id].product_id} · 
                          <span className="text-primary ml-1">{linkedProducts[selectedPost.linked_product_id].current_price.toLocaleString()}원</span>
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/product/${selectedPost.linked_product_id}`)}
                        className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        상품보기 <ExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Comments Section */}
                <div className="border-t border-border pt-4">
                  <h4 className="font-medium mb-3">댓글 ({comments.length})</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-2 text-sm">
                        <div className="flex-1">
                          <span className="font-medium">{userProfiles[comment.user_id]?.nickname || '익명'}</span>
                          <span className="text-muted-foreground ml-2">{formatDate(comment.created_at)}</span>
                          <p className="mt-1 text-foreground">{comment.content}</p>
                        </div>
                        {(currentUser === comment.user_id || isAdmin) && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-sm text-muted-foreground">아직 댓글이 없습니다</p>
                    )}
                  </div>
                  {currentUser && (
                    <div className="flex gap-2 mt-4">
                      <Input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="댓글을 입력하세요"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                      />
                      <Button size="icon" onClick={handleAddComment}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Discussion;
