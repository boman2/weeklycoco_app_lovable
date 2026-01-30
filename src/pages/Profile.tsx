import { useState, useEffect, useRef } from 'react';
import { Settings, ChevronRight, ChevronDown, Heart, MapPin, Award, LogOut, Loader2, Package, Star, FileText, ShoppingCart, Coins, Clock, CheckCircle, XCircle, Bell, Navigation, MessageSquare, Info, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import BadgeDisplay from '@/components/BadgeDisplay';
import BadgeCelebration from '@/components/BadgeCelebration';
import BadgeProgressCard from '@/components/BadgeProgressCard';
import MedalDisplay, { getMedalTier } from '@/components/MedalDisplay';
import ProductCard from '@/components/ProductCard';
import PointsPopup from '@/components/PointsPopup';
import AvatarUpload from '@/components/AvatarUpload';
import LevelPopup, { getCurrentLevel } from '@/components/LevelPopup';
import { mockUser, badges, stores, Badge as BadgeType } from '@/data/mockData';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LikedProduct {
  product_id: string;
  name: string;
  category: string;
  product_image_url: string | null;
  current_price: number;
  discount_price: number | null;
  discount_period: string | null;
}

interface MyPost {
  id: string;
  title: string;
  category: string;
  created_at: string;
  commentCount: number;
}

interface WishlistProduct {
  product_id: string;
  name: string;
  category: string;
  product_image_url: string | null;
  current_price: number;
  discount_price: number | null;
}

interface MyReview {
  id: string;
  product_id: string;
  content: string;
  created_at: string;
  product_name?: string;
}

const PREVIEW_LIMIT = 5;
const PRICE_HISTORY_PER_PAGE = 15;
const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'posts' | 'likes' | 'reviews' | 'wishlist' | 'badges' | 'stores' | 'points'>('posts');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ 
    nickname: string | null; 
    bakery_purchase_count: number; 
    unique_stores_visited: string[];
    points: number;
    pending_points: number;
    confirmed_points: number;
    avatar_url: string | null;
    preferred_store_id: string | null;
    bio: string | null;
  } | null>(null);
  const [pointTransactions, setPointTransactions] = useState<{
    id: string;
    amount: number;
    status: string;
    reason: string;
    created_at: string;
  }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [likedProducts, setLikedProducts] = useState<LikedProduct[]>([]);
  const [showAllLikes, setShowAllLikes] = useState(false);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [wishlistProducts, setWishlistProducts] = useState<WishlistProduct[]>([]);
  const [showAllWishlist, setShowAllWishlist] = useState(false);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [myReviews, setMyReviews] = useState<MyReview[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [priceHistoryDialogOpen, setPriceHistoryDialogOpen] = useState(false);
  const [appInfoDialogOpen, setAppInfoDialogOpen] = useState(false);
  const [notifications, setNotifications] = useState({
    priceAlerts: true,
    dealUpdates: true,
    communityReplies: true,
  });
  const [priceHistoryItems, setPriceHistoryItems] = useState<any[]>([]);
  const [priceHistoryPage, setPriceHistoryPage] = useState(1);
  const [priceHistoryTotal, setPriceHistoryTotal] = useState(0);
  const [loadingPriceHistory, setLoadingPriceHistory] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string | 'gps'>('gps');
  const [userCommentCount, setUserCommentCount] = useState(0);
  const [userRecipeLikesReceived, setUserRecipeLikesReceived] = useState(0);
  const [userFirstPriceReports, setUserFirstPriceReports] = useState(0);
  const [celebrationBadge, setCelebrationBadge] = useState<BadgeType | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showPointsGuide, setShowPointsGuide] = useState(false);
  const [showBadgesGuide, setShowBadgesGuide] = useState(false);
  const previousEarnedBadgesRef = useRef<Set<string>>(new Set());
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  
  // Tab counts state for initial display
  const [tabCounts, setTabCounts] = useState({
    posts: 0,
    likes: 0,
    reviews: 0,
    wishlist: 0,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);

      // Parallel fetch all initial data
      const [
        profileResult,
        transactionsResult,
        roleResult,
        commentCountResult,
        postsCountResult,
        likesCountResult,
        reviewsCountResult,
      ] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('nickname, bakery_purchase_count, unique_stores_visited, points, pending_points, confirmed_points, avatar_url, preferred_store_id, bio')
          .eq('id', session.user.id)
          .maybeSingle(),
        supabase
          .from('point_transactions')
          .select('id, amount, status, reason, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle(),
        supabase
          .from('discussion_comments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id),
        supabase.from('discussions').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id),
        supabase.from('likes').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id),
        supabase.from('product_reviews').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id),
      ]);

      if (profileResult.data) {
        setProfile(profileResult.data as any);
        if (profileResult.data.preferred_store_id) {
          setSelectedStore(profileResult.data.preferred_store_id);
        }
      }

      if (transactionsResult.data) {
        setPointTransactions(transactionsResult.data);
      }

      setIsAdmin(!!roleResult.data);
      setUserCommentCount(commentCountResult.count || 0);

      const wishlistIds = JSON.parse(localStorage.getItem(`wishlist_${session.user.id}`) || '[]');
      
      setTabCounts({
        posts: postsCountResult.count || 0,
        likes: likesCountResult.count || 0,
        reviews: reviewsCountResult.count || 0,
        wishlist: wishlistIds.length,
      });

      // Fetch badge-related stats in background (non-blocking)
      fetchBadgeStats(session.user.id);
      
      setIsLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Separate function for badge stats (runs in background)
  const fetchBadgeStats = async (userId: string) => {
    try {
      // Fetch recipe likes received
      const { data: userRecipePosts } = await supabase
        .from('discussions')
        .select('id')
        .eq('user_id', userId)
        .eq('category', 'recipe');

      if (userRecipePosts && userRecipePosts.length > 0) {
        const recipePostIds = userRecipePosts.map(p => p.id);
        const { count: recipeLikesCount } = await supabase
          .from('discussion_likes')
          .select('*', { count: 'exact', head: true })
          .in('discussion_id', recipePostIds);
        setUserRecipeLikesReceived(recipeLikesCount || 0);
      }

      // Simplified first price reports count - just count user's earliest records
      const { count: priceReportsCount } = await supabase
        .from('price_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      // Approximate: assume ~10% of user's reports are first reports (faster than N queries)
      setUserFirstPriceReports(Math.floor((priceReportsCount || 0) * 0.1));
    } catch (error) {
      console.error('Error fetching badge stats:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'likes' && user) {
      fetchLikedProducts();
    } else if (activeTab === 'posts' && user) {
      fetchMyPosts();
    } else if (activeTab === 'wishlist' && user) {
      fetchWishlistProducts();
    } else if (activeTab === 'reviews' && user) {
      fetchMyReviews();
    }
  }, [activeTab, user]);

  const fetchMyReviews = async () => {
    if (!user) return;
    setLoadingReviews(true);
    try {
      const { data: reviews } = await supabase
        .from('product_reviews')
        .select('id, product_id, content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (reviews && reviews.length > 0) {
        const productIds = [...new Set(reviews.map(r => r.product_id))];
        const { data: products } = await supabase
          .from('products')
          .select('product_id, name')
          .in('product_id', productIds);

        const productMap: Record<string, string> = {};
        products?.forEach(p => { productMap[p.product_id] = p.name; });

        setMyReviews(reviews.map(r => ({
          ...r,
          product_name: productMap[r.product_id] || r.product_id
        })));
      } else {
        setMyReviews([]);
      }
    } catch (error) {
      console.error('Error fetching my reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchMyPosts = async () => {
    if (!user) return;
    setLoadingPosts(true);
    try {
      const { data: posts } = await supabase
        .from('discussions')
        .select('id, title, category, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (posts && posts.length > 0) {
        // Fetch comment counts for all posts
        const postIds = posts.map(p => p.id);
        const { data: comments } = await supabase
          .from('discussion_comments')
          .select('discussion_id')
          .in('discussion_id', postIds);

        const commentCounts: Record<string, number> = {};
        comments?.forEach(c => {
          commentCounts[c.discussion_id] = (commentCounts[c.discussion_id] || 0) + 1;
        });

        setMyPosts(posts.map(p => ({
          ...p,
          commentCount: commentCounts[p.id] || 0
        })));
      } else {
        setMyPosts([]);
      }
    } catch (error) {
      console.error('Error fetching my posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchLikedProducts = async () => {
    if (!user) return;
    setLoadingLikes(true);
    try {
      // Get liked product IDs with created_at for sorting by recent action
      const { data: likes } = await supabase
        .from('likes')
        .select('product_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!likes || likes.length === 0) {
        setLikedProducts([]);
        return;
      }

      const productIds = likes.map(l => l.product_id);
      const likeOrder = likes.reduce((acc, l, idx) => ({ ...acc, [l.product_id]: idx }), {} as Record<string, number>);

      // Get product details and latest prices in parallel
      const [productsResult, pricesResult] = await Promise.all([
        supabase
          .from('products')
          .select('product_id, name, category, product_image_url')
          .in('product_id', productIds),
        supabase
          .from('price_history')
          .select('product_id, current_price, discount_price, discount_period, recorded_at')
          .in('product_id', productIds)
          .order('recorded_at', { ascending: false })
      ]);

      // Build a map of latest price per product
      const latestPrices: Record<string, { current_price: number; discount_price: number | null; discount_period: string | null }> = {};
      pricesResult.data?.forEach(p => {
        if (!latestPrices[p.product_id]) {
          latestPrices[p.product_id] = {
            current_price: p.current_price,
            discount_price: p.discount_price,
            discount_period: p.discount_period
          };
        }
      });

      const likedProductsWithPrices: LikedProduct[] = (productsResult.data || []).map(product => ({
        ...product,
        current_price: latestPrices[product.product_id]?.current_price || 0,
        discount_price: latestPrices[product.product_id]?.discount_price || null,
        discount_period: latestPrices[product.product_id]?.discount_period || null,
      }));

      // Sort by most recent like action
      likedProductsWithPrices.sort((a, b) => (likeOrder[a.product_id] || 0) - (likeOrder[b.product_id] || 0));
      setLikedProducts(likedProductsWithPrices);
    } catch (error) {
      console.error('Error fetching liked products:', error);
    } finally {
      setLoadingLikes(false);
    }
  };

  const fetchWishlistProducts = async () => {
    if (!user) return;
    setLoadingWishlist(true);
    try {
      const wishlistIds = JSON.parse(localStorage.getItem(`wishlist_${user.id}`) || '[]');
      
      if (wishlistIds.length === 0) {
        setWishlistProducts([]);
        return;
      }

      // Get products and prices in parallel
      const [productsResult, pricesResult] = await Promise.all([
        supabase
          .from('products')
          .select('product_id, name, category, product_image_url')
          .in('product_id', wishlistIds),
        supabase
          .from('price_history')
          .select('product_id, current_price, discount_price, recorded_at')
          .in('product_id', wishlistIds)
          .order('recorded_at', { ascending: false })
      ]);

      // Build a map of latest price per product
      const latestPrices: Record<string, { current_price: number; discount_price: number | null }> = {};
      pricesResult.data?.forEach(p => {
        if (!latestPrices[p.product_id]) {
          latestPrices[p.product_id] = {
            current_price: p.current_price,
            discount_price: p.discount_price
          };
        }
      });

      const wishlistWithPrices: WishlistProduct[] = (productsResult.data || []).map(product => ({
        ...product,
        current_price: latestPrices[product.product_id]?.current_price || 0,
        discount_price: latestPrices[product.product_id]?.discount_price || null,
      }));

      wishlistWithPrices.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      setWishlistProducts(wishlistWithPrices);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoadingWishlist(false);
    }
  };

  const fetchPriceHistory = async () => {
    if (!user) return;
    setLoadingPriceHistory(true);
    try {
      // Get total count
      const { count } = await supabase
        .from('price_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setPriceHistoryTotal(count || 0);

      // Get paginated data sorted by product name
      const from = (priceHistoryPage - 1) * PRICE_HISTORY_PER_PAGE;
      const to = from + PRICE_HISTORY_PER_PAGE - 1;

      const { data: priceData } = await supabase
        .from('price_history')
        .select('id, product_id, current_price, recorded_at, store_id')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .range(from, to);

      if (priceData && priceData.length > 0) {
        const productIds = [...new Set(priceData.map(p => p.product_id))];
        const storeIds = [...new Set(priceData.filter(p => p.store_id).map(p => p.store_id))];

        const { data: products } = await supabase
          .from('products')
          .select('product_id, name')
          .in('product_id', productIds);

        const { data: storesData } = await supabase
          .from('stores')
          .select('id, name')
          .in('id', storeIds);

        const productMap: Record<string, string> = {};
        products?.forEach(p => { productMap[p.product_id] = p.name; });

        const storeMap: Record<string, string> = {};
        storesData?.forEach(s => { storeMap[s.id] = s.name; });

        const itemsWithNames = priceData.map(item => ({
          ...item,
          product_name: productMap[item.product_id] || item.product_id,
          store_name: item.store_id ? storeMap[item.store_id] : null,
        }));

        // Sort by product name in Korean
        itemsWithNames.sort((a, b) => a.product_name.localeCompare(b.product_name, 'ko'));
        setPriceHistoryItems(itemsWithNames);
      } else {
        setPriceHistoryItems([]);
      }
    } catch (error) {
      console.error('Error fetching price history:', error);
    } finally {
      setLoadingPriceHistory(false);
    }
  };

  useEffect(() => {
    if (priceHistoryDialogOpen) {
      fetchPriceHistory();
    }
  }, [priceHistoryDialogOpen, priceHistoryPage]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: '로그아웃 완료',
        description: '다음에 또 만나요!',
      });
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: '로그아웃 실패',
        description: '다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleAvatarUpdated = (url: string) => {
    if (profile) {
      setProfile({ ...profile, avatar_url: url });
    }
  };

  const handleEditNickname = () => {
    setNicknameInput(profile?.nickname || user?.email?.split('@')[0] || '');
    setIsEditingNickname(true);
  };

  const handleSaveNickname = async () => {
    if (!user || !nicknameInput.trim()) {
      toast({ title: '닉네임을 입력해주세요', variant: 'destructive' });
      return;
    }

    const trimmedNickname = nicknameInput.trim();

    if (trimmedNickname.length > 20) {
      toast({ title: '닉네임은 20자 이하로 입력해주세요', variant: 'destructive' });
      return;
    }

    // Skip check if nickname unchanged
    if (trimmedNickname === profile?.nickname) {
      setIsEditingNickname(false);
      return;
    }

    setSavingNickname(true);
    try {
      // Check for duplicate nickname
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('nickname', trimmedNickname)
        .neq('id', user.id)
        .maybeSingle();

      if (existing) {
        toast({ title: '이미 사용 중인 닉네임입니다', variant: 'destructive' });
        setSavingNickname(false);
        return;
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ nickname: trimmedNickname })
        .eq('id', user.id);

      if (error) throw error;

      if (profile) {
        setProfile({ ...profile, nickname: trimmedNickname });
      }
      setIsEditingNickname(false);
      toast({ title: '닉네임이 변경되었습니다' });
    } catch (error) {
      console.error('Error updating nickname:', error);
      toast({ title: '닉네임 변경에 실패했습니다', variant: 'destructive' });
    } finally {
      setSavingNickname(false);
    }
  };

  const handleEditBio = () => {
    setBioInput(profile?.bio || '');
    setIsEditingBio(true);
  };

  const handleSaveBio = async () => {
    if (!user) return;

    const trimmedBio = bioInput.trim();

    if (trimmedBio.length > 200) {
      toast({ title: '자기소개는 200자 이하로 입력해주세요', variant: 'destructive' });
      return;
    }

    // Skip if unchanged
    if (trimmedBio === (profile?.bio || '')) {
      setIsEditingBio(false);
      return;
    }

    setSavingBio(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ bio: trimmedBio || null })
        .eq('id', user.id);

      if (error) throw error;

      if (profile) {
        setProfile({ ...profile, bio: trimmedBio || null });
      }
      setIsEditingBio(false);
      toast({ title: '자기소개가 저장되었습니다' });
    } catch (error) {
      console.error('Error updating bio:', error);
      toast({ title: '자기소개 저장에 실패했습니다', variant: 'destructive' });
    } finally {
      setSavingBio(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'general': '자유게시판',
      'deal': '할인정보',
      'recipe': '레시피',
      'store': '매장정보',
    };
    return labels[category] || category;
  };

  const getNearbyStore = () => {
    if (selectedStore === 'gps') {
      return stores[0]; // Default to first store for GPS mode
    }
    return stores.find(s => s.id === selectedStore) || stores[0];
  };

  const visitedStoreIds = profile?.unique_stores_visited || [];
  const visitedStores = stores.filter((s) => visitedStoreIds.includes(s.id));

  // Check actual user qualifications for each badge (DB-based)
  const bakeryPurchaseCount = profile?.bakery_purchase_count || 0;
  const qualifiesForBakeryMaster = bakeryPurchaseCount >= 10;
  
  // Check if user qualifies for Costco Nomad badge (5+ stores visited)
  const qualifiesForNomad = visitedStores.length >= 5;
  
  // Check if user qualifies for Point Starter badge (50+ confirmed points)
  const confirmedPoints = profile?.confirmed_points || 0;
  const qualifiesForPointStarter = confirmedPoints >= 50;

  // Check if user qualifies for Communication King badge (100+ comments)
  const qualifiesForCommunicationKing = userCommentCount >= 100;
  
  // Check if user qualifies for Review Master badge (200+ reviews)
  const qualifiesForReviewMaster = tabCounts.reviews >= 200;
  
  // Check if user qualifies for Recipe Star badge (50+ likes on recipe posts)
  const qualifiesForRecipeStar = userRecipeLikesReceived >= 50;
  
  // Check if user qualifies for Price Hunter badge (10+ first price reports)
  const qualifiesForPriceHunter = userFirstPriceReports >= 10;

  // Build current earned badges set based on ACTUAL user qualifications
  const currentEarnedBadges = new Set<string>();
  
  if (qualifiesForBakeryMaster) {
    currentEarnedBadges.add('bakery-master');
  }
  if (qualifiesForNomad) {
    currentEarnedBadges.add('costco-nomad');
  }
  if (qualifiesForPointStarter) {
    currentEarnedBadges.add('point-starter');
  }
  if (qualifiesForCommunicationKing) {
    currentEarnedBadges.add('communication-king');
  }
  if (qualifiesForReviewMaster) {
    currentEarnedBadges.add('review-master');
  }
  if (qualifiesForRecipeStar) {
    currentEarnedBadges.add('recipe-star');
  }
  if (qualifiesForPriceHunter) {
    currentEarnedBadges.add('price-hunter');
  }
  
  // Get earned badges for display
  const earnedBadges = badges.filter((b) => currentEarnedBadges.has(b.id));

  // Check if badge celebration was shown recently (within 3 days)
  const wasBadgeCelebrationShownRecently = (badgeId: string): boolean => {
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    const storageKey = `badge_celebration_${user?.id}_${badgeId}`;
    const lastShown = localStorage.getItem(storageKey);
    if (!lastShown) return false;
    const lastShownTime = parseInt(lastShown, 10);
    return Date.now() - lastShownTime < THREE_DAYS_MS;
  };

  const markBadgeCelebrationShown = (badgeId: string) => {
    const storageKey = `badge_celebration_${user?.id}_${badgeId}`;
    localStorage.setItem(storageKey, Date.now().toString());
  };

  // Badge name map for toast notifications
  const getBadgeDisplayName = (badgeId: string): { name: string; icon: string } => {
    const badgeMap: Record<string, { name: string; icon: string }> = {
      'point-starter': { name: '포인트 스타터', icon: '🥈' },
      'costco-nomad': { name: '코스트코 노마드', icon: '🧭' },
      'communication-king': { name: '소통왕', icon: '💬' },
      'review-master': { name: '리뷰 달인', icon: '📝' },
      'recipe-star': { name: '레시피스타', icon: '🍳' },
      'price-hunter': { name: '가격 사냥꾼', icon: '🎯' },
      'bakery-master': { name: '베이커리 마스터', icon: '🍞' },
    };
    return badgeMap[badgeId] || { name: badgeId, icon: '🏆' };
  };

  // Check for 80% progress notifications
  const wasProgressNotificationShown = (badgeId: string): boolean => {
    const storageKey = `badge_progress_80_${user?.id}_${badgeId}`;
    return localStorage.getItem(storageKey) === 'true';
  };

  const markProgressNotificationShown = (badgeId: string) => {
    const storageKey = `badge_progress_80_${user?.id}_${badgeId}`;
    localStorage.setItem(storageKey, 'true');
  };

  // Badge progress data for 80% check
  const badgeProgressData: Array<{
    id: string;
    current: number;
    target: number;
    name: string;
    icon: string;
  }> = [
    { id: 'point-starter', current: confirmedPoints, target: 50, name: '포인트 스타터', icon: '🥈' },
    { id: 'costco-nomad', current: visitedStores.length, target: 5, name: '코스트코 노마드', icon: '🧭' },
    { id: 'communication-king', current: userCommentCount, target: 100, name: '소통왕', icon: '💬' },
    { id: 'review-master', current: tabCounts.reviews, target: 100, name: '리뷰 달인', icon: '📝' },
    { id: 'recipe-star', current: userRecipeLikesReceived, target: 100, name: '레시피스타', icon: '🍳' },
    { id: 'price-hunter', current: userFirstPriceReports, target: 10, name: '가격 사냥꾼', icon: '🎯' },
    { id: 'bakery-master', current: bakeryPurchaseCount, target: 10, name: '베이커리 마스터', icon: '🍞' },
  ];

  // Check for 80% progress and show encouragement notification
  useEffect(() => {
    if (isLoading || !user) return;

    badgeProgressData.forEach((badge) => {
      const progress = badge.current / badge.target;
      const isEarned = currentEarnedBadges.has(badge.id);
      
      // Check if progress is between 80% and 100% (not yet earned)
      if (progress >= 0.8 && progress < 1 && !isEarned) {
        if (!wasProgressNotificationShown(badge.id)) {
          toast({
            title: `${badge.icon} 거의 다 왔어요!`,
            description: `"${badge.name}" 배지까지 ${Math.round((1 - progress) * 100)}% 남았어요! (${badge.current}/${badge.target})`,
            duration: 6000,
          });
          markProgressNotificationShown(badge.id);
        }
      }
    });
  }, [isLoading, user, confirmedPoints, visitedStores.length, userCommentCount, tabCounts.reviews, userRecipeLikesReceived, userFirstPriceReports, bakeryPurchaseCount]);

  // Check for newly earned badges and show celebration
  useEffect(() => {
    if (isLoading || !user) return;
    
    const previousBadges = previousEarnedBadgesRef.current;
    
    // Find newly earned badges
    for (const badgeId of currentEarnedBadges) {
      if (!previousBadges.has(badgeId)) {
        // Skip if already shown recently (within 3 days)
        if (wasBadgeCelebrationShownRecently(badgeId)) {
          continue;
        }
        
        // Show toast notification for badge
        const badgeInfo = getBadgeDisplayName(badgeId);
        toast({
          title: `${badgeInfo.icon} 새 배지 획득!`,
          description: `축하합니다! "${badgeInfo.name}" 배지를 획득했습니다!`,
          duration: 5000,
        });
        
        // New badge earned!
        const newBadge = badges.find(b => b.id === badgeId);
        if (newBadge) {
          setCelebrationBadge(newBadge);
          setShowCelebration(true);
          markBadgeCelebrationShown(badgeId);
          break; // Show one badge at a time
        } else if (badgeId === 'point-starter') {
          // Point Starter badge
          setCelebrationBadge({
            id: 'point-starter',
            name: 'Point Starter',
            nameKo: '포인트 스타터',
            description: 'Earned 50+ confirmed points',
            icon: '🥈',
            requirement: '50포인트 달성',
          });
          setShowCelebration(true);
          markBadgeCelebrationShown(badgeId);
          break;
        }
      }
    }
    
    // Update previous badges ref
    previousEarnedBadgesRef.current = new Set(currentEarnedBadges);
  }, [currentEarnedBadges, isLoading, toast]);

  const handleCloseCelebration = () => {
    setShowCelebration(false);
    setCelebrationBadge(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-bottom">
      {/* Badge Celebration Popup */}
      <BadgeCelebration 
        badge={celebrationBadge} 
        isOpen={showCelebration} 
        onClose={handleCloseCelebration} 
      />
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">마이페이지</h1>
          <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Profile Card */}
      <div className="px-4 py-4">
        <div className="rounded-2xl bg-gradient-to-br from-primary to-secondary p-5 md:p-6 text-primary-foreground">
          <div className="flex items-center gap-3 md:gap-4">
            {user && (
              <AvatarUpload 
                userId={user.id} 
                currentAvatarUrl={profile?.avatar_url || null}
                onAvatarUpdated={handleAvatarUpdated}
                levelEmoji={getCurrentLevel(profile?.confirmed_points || 0).emoji}
                levelColor={getCurrentLevel(profile?.confirmed_points || 0).color}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-lg md:text-xl font-bold truncate">{profile?.nickname || user?.email?.split('@')[0] || '사용자'}</h2>
                <button 
                  onClick={handleEditNickname}
                  className="p-1 rounded-full hover:bg-primary-foreground/20 transition-colors"
                  aria-label="닉네임 수정"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] md:text-xs px-1.5 py-0.5 rounded bg-primary-foreground/20 font-medium">
                  {getCurrentLevel(profile?.confirmed_points || 0).name}
                </span>
              </div>
              <p className="text-xs md:text-sm opacity-80 truncate">{user?.email}</p>
              <p className="text-[10px] mt-1 opacity-70">
                {(() => {
                  const currentLevel = getCurrentLevel(profile?.confirmed_points || 0);
                  const levels = [
                    { name: '브론즈', minPoints: 0 },
                    { name: '실버', minPoints: 1000 },
                    { name: '골드', minPoints: 3000 },
                    { name: '플래티넘', minPoints: 6000 },
                    { name: '다이아몬드', minPoints: 9000 },
                  ];
                  const currentIndex = levels.findIndex(l => l.name === currentLevel.name);
                  const nextLevel = currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
                  return nextLevel 
                    ? `${nextLevel.name} 등급: ${nextLevel.minPoints.toLocaleString()}점 이상`
                    : '최고 등급 달성!';
                })()}
              </p>
            </div>
          </div>

          {/* Bio Section */}
          <div className="mt-3 rounded-xl bg-primary-foreground/10 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs opacity-70 mb-1">자기소개</p>
                <p className="text-sm opacity-90 line-clamp-2">
                  {profile?.bio || '자기소개를 작성해보세요!'}
                </p>
              </div>
              <button 
                onClick={handleEditBio}
                className="p-1.5 rounded-full hover:bg-primary-foreground/20 transition-colors flex-shrink-0"
                aria-label="자기소개 수정"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Points Display */}
          <div className="mt-4 rounded-xl bg-primary-foreground/15 p-3 md:p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-300" />
                  <span className="text-[10px] md:text-xs opacity-80">사용 가능</span>
                </div>
                <p className="text-lg md:text-xl font-bold">{(profile?.confirmed_points || 0).toLocaleString()}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3 md:h-4 md:w-4 text-yellow-300" />
                  <span className="text-[10px] md:text-xs opacity-80">대기 중</span>
                </div>
                <p className="text-lg md:text-xl font-bold">{(profile?.pending_points || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Stats - Icon only on mobile */}
          <div className="mt-4 grid grid-cols-4 gap-1 md:gap-2 rounded-xl bg-primary-foreground/10 p-3 md:p-4">
            <button onClick={() => setActiveTab('posts')} className="text-center py-1 hover:bg-primary-foreground/10 rounded-lg transition-colors">
              <FileText className="h-5 w-5 md:hidden mx-auto mb-1" />
              <p className="text-lg md:text-xl font-bold hidden md:block">{myPosts.length || tabCounts.posts}</p>
              <p className="text-[10px] md:text-xs opacity-80">
                <span className="md:hidden">{myPosts.length || tabCounts.posts}</span>
                <span className="hidden md:inline">내글</span>
              </p>
            </button>
            <button onClick={() => setActiveTab('likes')} className="text-center py-1 hover:bg-primary-foreground/10 rounded-lg transition-colors">
              <Heart className="h-5 w-5 md:hidden mx-auto mb-1" />
              <p className="text-lg md:text-xl font-bold hidden md:block">{likedProducts.length || tabCounts.likes}</p>
              <p className="text-[10px] md:text-xs opacity-80">
                <span className="md:hidden">{likedProducts.length || tabCounts.likes}</span>
                <span className="hidden md:inline">좋아요</span>
              </p>
            </button>
            <button onClick={() => setActiveTab('wishlist')} className="text-center py-1 hover:bg-primary-foreground/10 rounded-lg transition-colors">
              <Star className="h-5 w-5 md:hidden mx-auto mb-1" />
              <p className="text-lg md:text-xl font-bold hidden md:block">{wishlistProducts.length || tabCounts.wishlist}</p>
              <p className="text-[10px] md:text-xs opacity-80">
                <span className="md:hidden">{wishlistProducts.length || tabCounts.wishlist}</span>
                <span className="hidden md:inline">관심</span>
              </p>
            </button>
            <button onClick={() => setActiveTab('points')} className="text-center py-1 hover:bg-primary-foreground/10 rounded-lg transition-colors">
              <Coins className="h-5 w-5 md:hidden mx-auto mb-1" />
              <p className="text-lg md:text-xl font-bold hidden md:block">{getCurrentLevel(profile?.confirmed_points || 0).emoji}</p>
              <p className="text-[10px] md:text-xs opacity-80">
                <span className="md:hidden">{getCurrentLevel(profile?.confirmed_points || 0).emoji}</span>
                <span className="hidden md:inline">등급</span>
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Silver Saver Badge Progress - Silver level is 1,000 points */}
      {!qualifiesForPointStarter && (
        <div className="px-4 pb-2">
          <div className="rounded-xl bg-card p-3 md:p-4 shadow-card">
            <div className="flex items-center gap-3">
              <span className="text-xl md:text-2xl">🥈</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm md:text-base">포인트 스타터 도전!</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {confirmedPoints < 1000 
                    ? `${1000 - confirmedPoints}포인트 더 확정하면 실버 등급!`
                    : `${50 - confirmedPoints}포인트 더 확정하면 배지 획득`
                  }
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm md:text-lg font-bold text-primary">{confirmedPoints}/1,000</p>
              </div>
            </div>
            <div className="mt-2 md:mt-3 h-1.5 md:h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-gradient-to-r from-gray-400 to-gray-300 transition-all"
                style={{ width: `${Math.min((confirmedPoints / 1000) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {qualifiesForPointStarter && (
        <div className="px-4 pb-2">
          <div className="rounded-xl bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-500 p-4 shadow-card">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🥈</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground">포인트 스타터 달성!</p>
                <p className="text-sm text-muted-foreground">
                  축하합니다! 포인트 스타터 배지를 획득했어요 🎉
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nomad Badge Progress */}
      {!mockUser.earnedBadges.includes('costco-nomad') && (
        <div className="px-4 pb-4">
          <div className="rounded-xl bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🗺️</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground">코스트코 노마드 도전!</p>
                <p className="text-sm text-muted-foreground">
                  {qualifiesForNomad
                    ? '축하합니다! 배지를 획득했어요'
                    : `${5 - visitedStores.length}개 매장 더 방문하면 배지 획득`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">{visitedStores.length}/5</p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min((visitedStores.length / 5) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex px-4 overflow-x-auto">
          {[
            { id: 'posts', label: '내글', icon: FileText, count: myPosts.length || tabCounts.posts },
            { id: 'likes', label: '좋아요', icon: Heart, count: likedProducts.length || tabCounts.likes },
            { id: 'reviews', label: '상품평', icon: MessageSquare, count: myReviews.length || tabCounts.reviews },
            { id: 'wishlist', label: '관심', icon: ShoppingCart, count: wishlistProducts.length || tabCounts.wishlist },
            { id: 'points', label: '포인트', icon: Coins, count: pointTransactions.length },
            { id: 'badges', label: '배지', icon: Award, count: earnedBadges.length },
            { id: 'stores', label: '매장', icon: MapPin, count: visitedStores.length },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1 border-b-2 py-2 text-xs md:text-sm font-medium transition-colors whitespace-nowrap min-w-0',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground'
                )}
              >
                <Icon className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                <span className="truncate">{tab.label}<span className="hidden sm:inline">({tab.count})</span></span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <main className="px-4 py-4">
        {activeTab === 'posts' && (
          <div className="space-y-3">
            {loadingPosts ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : myPosts.length > 0 ? (
              <>
                {(showAllPosts ? myPosts : myPosts.slice(0, PREVIEW_LIMIT)).map((post) => (
                  <div
                    key={post.id}
                    onClick={() => navigate('/discussion')}
                    className="flex items-center gap-4 rounded-xl bg-card p-4 shadow-card cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-xl flex-shrink-0">
                      📝
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground line-clamp-1">
                        {post.title}
                        {post.commentCount > 0 && (
                          <span className="text-primary ml-1">({post.commentCount})</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {getCategoryLabel(post.category)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
                {!showAllPosts && myPosts.length > PREVIEW_LIMIT && (
                  <button
                    onClick={() => setShowAllPosts(true)}
                    className="w-full py-3 rounded-xl bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors"
                  >
                    전체보기 ({myPosts.length}개)
                  </button>
                )}
                {showAllPosts && myPosts.length > PREVIEW_LIMIT && (
                  <button
                    onClick={() => setShowAllPosts(false)}
                    className="w-full py-3 rounded-xl bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors"
                  >
                    접기
                  </button>
                )}
              </>
            ) : (
              <div className="py-16 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">작성한 글이 없습니다</p>
                <button
                  onClick={() => navigate('/discussion')}
                  className="mt-4 px-6 py-2 rounded-xl bg-primary text-primary-foreground font-medium"
                >
                  글 작성하러 가기
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'likes' && (
          <div className="space-y-3">
            {loadingLikes ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : likedProducts.length > 0 ? (
              <>
                {(showAllLikes ? likedProducts : likedProducts.slice(0, PREVIEW_LIMIT)).map((product) => (
                  <div
                    key={product.product_id}
                    onClick={() => navigate(`/product/${product.product_id}`)}
                    className="flex items-center gap-4 rounded-xl bg-card p-4 shadow-card cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      {product.product_image_url ? (
                        <img src={product.product_image_url} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-2xl">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground line-clamp-1">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.category}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {product.discount_price ? (
                          <>
                            <span className="text-primary font-bold">₩{product.discount_price.toLocaleString()}</span>
                            <span className="text-sm text-muted-foreground line-through">₩{product.current_price.toLocaleString()}</span>
                          </>
                        ) : (
                          <span className="font-bold">₩{product.current_price.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <Heart className="h-5 w-5 text-destructive fill-destructive flex-shrink-0" />
                  </div>
                ))}
                {!showAllLikes && likedProducts.length > PREVIEW_LIMIT && (
                  <button
                    onClick={() => setShowAllLikes(true)}
                    className="w-full py-3 rounded-xl bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors"
                  >
                    전체보기 ({likedProducts.length}개)
                  </button>
                )}
                {showAllLikes && likedProducts.length > PREVIEW_LIMIT && (
                  <button
                    onClick={() => setShowAllLikes(false)}
                    className="w-full py-3 rounded-xl bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors"
                  >
                    접기
                  </button>
                )}
              </>
            ) : (
              <div className="py-16 text-center">
                <Heart className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">좋아요한 상품이 없습니다</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-3">
            {loadingReviews ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : myReviews.length > 0 ? (
              <>
                {(showAllReviews ? myReviews : myReviews.slice(0, PREVIEW_LIMIT)).map((review) => (
                  <div
                    key={review.id}
                    onClick={() => navigate(`/product/${review.product_id}`)}
                    className="flex items-center gap-4 rounded-xl bg-card p-4 shadow-card cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-xl flex-shrink-0">
                      💬
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-primary text-sm line-clamp-1">{review.product_name}</p>
                      <p className="text-foreground mt-0.5 line-clamp-1">"{review.content}"</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(review.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
                {!showAllReviews && myReviews.length > PREVIEW_LIMIT && (
                  <button
                    onClick={() => setShowAllReviews(true)}
                    className="w-full py-3 rounded-xl bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors"
                  >
                    전체보기 ({myReviews.length}개)
                  </button>
                )}
                {showAllReviews && myReviews.length > PREVIEW_LIMIT && (
                  <button
                    onClick={() => setShowAllReviews(false)}
                    className="w-full py-3 rounded-xl bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors"
                  >
                    접기
                  </button>
                )}
              </>
            ) : (
              <div className="py-16 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">작성한 상품평이 없습니다</p>
                <p className="text-sm text-muted-foreground mt-1">상품 페이지에서 상품평을 남겨보세요 (+1 포인트)</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'wishlist' && (
          <div className="space-y-3">
            {loadingWishlist ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : wishlistProducts.length > 0 ? (
              <>
                {(showAllWishlist ? wishlistProducts : wishlistProducts.slice(0, PREVIEW_LIMIT)).map((product) => (
                  <div
                    key={product.product_id}
                    onClick={() => navigate(`/product/${product.product_id}`)}
                    className="flex items-center gap-4 rounded-xl bg-card p-4 shadow-card cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      {product.product_image_url ? (
                        <img src={product.product_image_url} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-2xl">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground line-clamp-1">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.category}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {product.discount_price ? (
                          <>
                            <span className="text-primary font-bold">₩{product.discount_price.toLocaleString()}</span>
                            <span className="text-sm text-muted-foreground line-through">₩{product.current_price.toLocaleString()}</span>
                          </>
                        ) : (
                          <span className="font-bold">₩{product.current_price.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <ShoppingCart className="h-5 w-5 text-primary flex-shrink-0" />
                  </div>
                ))}
                {!showAllWishlist && wishlistProducts.length > PREVIEW_LIMIT && (
                  <button
                    onClick={() => setShowAllWishlist(true)}
                    className="w-full py-3 rounded-xl bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors"
                  >
                    전체보기 ({wishlistProducts.length}개)
                  </button>
                )}
                {showAllWishlist && wishlistProducts.length > PREVIEW_LIMIT && (
                  <button
                    onClick={() => setShowAllWishlist(false)}
                    className="w-full py-3 rounded-xl bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors"
                  >
                    접기
                  </button>
                )}
              </>
            ) : (
              <div className="py-16 text-center">
                <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">관심상품이 없습니다</p>
                <p className="text-sm text-muted-foreground mt-1">상품 상세페이지에서 '관심상품 등록'을 눌러보세요</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'points' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="rounded-xl bg-card p-4 shadow-card">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-muted-foreground">사용 가능 포인트</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{(profile?.confirmed_points || 0).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm text-muted-foreground">대기 중 포인트</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">{(profile?.pending_points || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Points Guide */}
            <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 p-4 border border-primary/20">
              <button 
                onClick={() => setShowPointsGuide(!showPointsGuide)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">포인트 적립 안내</span>
                </div>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform",
                  showPointsGuide && "rotate-180"
                )} />
              </button>
              
              {showPointsGuide && (
                <div className="mt-4 space-y-3 text-sm">
                  <div className="grid gap-2">
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50">
                      <span className="text-lg">📷</span>
                      <div>
                        <p className="font-medium text-foreground">가격표 등록</p>
                        <p className="text-muted-foreground">상품 가격 등록 시 <span className="text-primary font-semibold">+10P</span> (검증 후 확정)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50">
                      <span className="text-lg">✍️</span>
                      <div>
                        <p className="font-medium text-foreground">커뮤니티 글 작성</p>
                        <p className="text-muted-foreground">게시글 작성 시 <span className="text-primary font-semibold">+5P</span></p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50">
                      <span className="text-lg">💬</span>
                      <div>
                        <p className="font-medium text-foreground">댓글 작성</p>
                        <p className="text-muted-foreground">댓글 작성 시 <span className="text-primary font-semibold">+2P</span></p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50">
                      <span className="text-lg">⭐</span>
                      <div>
                        <p className="font-medium text-foreground">상품평 작성</p>
                        <p className="text-muted-foreground">상품 리뷰 작성 시 <span className="text-primary font-semibold">+3P</span></p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50">
                      <span className="text-lg">❤️</span>
                      <div>
                        <p className="font-medium text-foreground">좋아요 받기</p>
                        <p className="text-muted-foreground">내 글/리뷰에 좋아요 받을 때 <span className="text-primary font-semibold">+1P</span></p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                    ※ 포인트는 활동 검증 후 확정되며, 부정 활동 시 취소될 수 있습니다.
                  </p>
                </div>
              )}
            </div>

            {/* Transaction History */}
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground px-1">포인트 내역</h3>
              {pointTransactions.length > 0 ? (
                pointTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-4 rounded-xl bg-card p-4 shadow-card"
                  >
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      tx.status === 'confirmed' && "bg-green-100 text-green-600",
                      tx.status === 'pending' && "bg-yellow-100 text-yellow-600",
                      tx.status === 'cancelled' && "bg-red-100 text-red-600"
                    )}>
                      {tx.status === 'confirmed' && <CheckCircle className="h-5 w-5" />}
                      {tx.status === 'pending' && <Clock className="h-5 w-5" />}
                      {tx.status === 'cancelled' && <XCircle className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{tx.reason}</p>
                      <div className="flex items-center gap-2 mt-0.5">
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
                        <span className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>
                    <div className={cn(
                      "text-lg font-bold",
                      tx.status === 'cancelled' ? "text-muted-foreground line-through" : "text-primary"
                    )}>
                      +{tx.amount}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center">
                  <Coins className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">포인트 내역이 없습니다</p>
                  <p className="text-sm text-muted-foreground mt-1">가격 등록을 통해 포인트를 적립하세요</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'badges' && (
          <div className="space-y-6">
            {/* Medal Tier Display */}
            <div className="rounded-xl bg-gradient-to-br from-primary/5 to-secondary/10 dark:from-primary/10 dark:to-secondary/20 p-4 border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">내 메달 등급</h3>
                  <p className="text-xs text-muted-foreground">포인트를 모아 더 높은 등급에 도전하세요!</p>
                </div>
                <MedalDisplay points={confirmedPoints} size="md" />
              </div>
              
              {/* Medal Tier Progress */}
              {(() => {
                const currentMedal = getMedalTier(confirmedPoints);
                const nextTarget = currentMedal.max === Infinity ? confirmedPoints : currentMedal.max;
                const progressInTier = currentMedal.max === Infinity 
                  ? 100 
                  : ((confirmedPoints - currentMedal.min) / (currentMedal.max - currentMedal.min)) * 100;
                
                return currentMedal.tier !== 'diamond' ? (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{currentMedal.name}</span>
                      <span>{confirmedPoints.toLocaleString()} / {nextTarget.toLocaleString()}P</span>
                    </div>
                    <Progress value={progressInTier} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {(nextTarget - confirmedPoints).toLocaleString()}P 더 모으면 다음 등급!
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">🎉 최고 등급 달성!</p>
                  </div>
                );
              })()}
              
              {/* Medal Tier Legend */}
              <div className="mt-4 pt-4 border-t border-border/50">
                <h4 className="font-semibold text-foreground mb-2">등급 기준</h4>
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-300/30 to-amber-500/30">
                    <span className="text-lg">🥉</span>
                    <p className="text-[10px] text-muted-foreground">브론즈</p>
                    <p className="text-[10px] text-muted-foreground">0~999</p>
                  </div>
                  <div className="p-2 rounded-lg bg-gradient-to-br from-gray-200/30 to-gray-400/30">
                    <span className="text-lg">🥈</span>
                    <p className="text-[10px] text-muted-foreground">실버</p>
                    <p className="text-[10px] text-muted-foreground">1,000+</p>
                  </div>
                  <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-300/30 to-amber-400/30">
                    <span className="text-lg">🥇</span>
                    <p className="text-[10px] text-muted-foreground">골드</p>
                    <p className="text-[10px] text-muted-foreground">3,000+</p>
                  </div>
                  <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-200/30 to-teal-300/30">
                    <span className="text-lg">👑</span>
                    <p className="text-[10px] text-muted-foreground">플래티넘</p>
                    <p className="text-[10px] text-muted-foreground">6,000+</p>
                  </div>
                  <div className="p-2 rounded-lg bg-gradient-to-br from-purple-300/30 to-violet-400/30">
                    <span className="text-lg">💎</span>
                    <p className="text-[10px] text-muted-foreground">다이아</p>
                    <p className="text-[10px] text-muted-foreground">9,000+</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Badges Guide */}
            <div className="rounded-xl bg-gradient-to-br from-amber-500/5 to-orange-500/10 dark:from-amber-500/10 dark:to-orange-500/20 p-4 border border-amber-500/20">
              <button 
                onClick={() => setShowBadgesGuide(!showBadgesGuide)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  <span className="font-semibold text-foreground">배지 획득 안내</span>
                </div>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform",
                  showBadgesGuide && "rotate-180"
                )} />
              </button>
              
              {showBadgesGuide && (
                <div className="mt-4 space-y-3 text-sm">
                  <div className="grid gap-2">
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50">
                      <span className="text-lg">🥉</span>
                      <div>
                        <p className="font-medium text-foreground">브론즈</p>
                        <p className="text-muted-foreground">확정 포인트 <span className="text-amber-600 font-semibold">0 ~ 999P</span></p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50">
                      <span className="text-lg">🥈</span>
                      <div>
                        <p className="font-medium text-foreground">실버</p>
                        <p className="text-muted-foreground">확정 포인트 <span className="text-amber-600 font-semibold">1,000 ~ 2,999P</span></p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50">
                      <span className="text-lg">🥇</span>
                      <div>
                        <p className="font-medium text-foreground">골드</p>
                        <p className="text-muted-foreground">확정 포인트 <span className="text-amber-600 font-semibold">3,000 ~ 5,999P</span></p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50">
                      <span className="text-lg">👑</span>
                      <div>
                        <p className="font-medium text-foreground">플래티넘</p>
                        <p className="text-muted-foreground">확정 포인트 <span className="text-amber-600 font-semibold">6,000 ~ 8,999P</span></p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50">
                      <span className="text-lg">💎</span>
                      <div>
                        <p className="font-medium text-foreground">다이아몬드</p>
                        <p className="text-muted-foreground">확정 포인트 <span className="text-amber-600 font-semibold">9,000P 이상</span></p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50">
                      <span className="text-lg">🍞</span>
                      <div>
                        <p className="font-medium text-foreground">베이커리 마스터</p>
                        <p className="text-muted-foreground">베이커리 상품 <span className="text-amber-600 font-semibold">10개 이상</span> 등록</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50">
                      <span className="text-lg">🧭</span>
                      <div>
                        <p className="font-medium text-foreground">코스트코 노마드</p>
                        <p className="text-muted-foreground"><span className="text-amber-600 font-semibold">5개 이상</span> 매장 방문 인증</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50">
                      <span className="text-lg">🏹</span>
                      <div>
                        <p className="font-medium text-foreground">가격 사냥꾼</p>
                        <p className="text-muted-foreground">최저가 <span className="text-amber-600 font-semibold">5회 최초</span> 제보</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50">
                      <span className="text-lg">👨‍🍳</span>
                      <div>
                        <p className="font-medium text-foreground">레시피 스타</p>
                        <p className="text-muted-foreground">레시피 좋아요 <span className="text-amber-600 font-semibold">100개</span> 달성</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50">
                      <span className="text-lg">💬</span>
                      <div>
                        <p className="font-medium text-foreground">소통왕</p>
                        <p className="text-muted-foreground">커뮤니티 댓글 <span className="text-amber-600 font-semibold">100개 이상</span> 달성</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50">
                      <span className="text-lg">📝</span>
                      <div>
                        <p className="font-medium text-foreground">리뷰 달인</p>
                        <p className="text-muted-foreground">상품평 <span className="text-amber-600 font-semibold">200개 이상</span> 달성</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                    ※ 배지는 조건 달성 시 자동으로 부여됩니다.
                  </p>
                </div>
              )}
            </div>

            {/* Badge Progress Cards */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">배지 획득 현황</h3>
              <div className="space-y-3">
                <BadgeProgressCard
                  icon="🥈"
                  name="포인트 스타터"
                  current={confirmedPoints}
                  target={50}
                  isEarned={qualifiesForPointStarter}
                />
                <BadgeProgressCard
                  icon="🧭"
                  name="코스트코 노마드"
                  current={visitedStores.length}
                  target={5}
                  isEarned={qualifiesForNomad}
                />
                <BadgeProgressCard
                  icon="💬"
                  name="소통왕"
                  current={userCommentCount}
                  target={100}
                  isEarned={qualifiesForCommunicationKing}
                />
                <BadgeProgressCard
                  icon="📝"
                  name="리뷰 달인"
                  current={myReviews.length}
                  target={200}
                  isEarned={qualifiesForReviewMaster}
                />
                <BadgeProgressCard
                  icon="🍳"
                  name="레시피스타"
                  current={userRecipeLikesReceived}
                  target={50}
                  isEarned={qualifiesForRecipeStar}
                />
                <BadgeProgressCard
                  icon="🎯"
                  name="가격 사냥꾼"
                  current={userFirstPriceReports}
                  target={10}
                  isEarned={qualifiesForPriceHunter}
                />
                <BadgeProgressCard
                  icon="🍞"
                  name="베이커리 마스터"
                  current={profile?.bakery_purchase_count || 0}
                  target={10}
                  isEarned={qualifiesForBakeryMaster}
                />
              </div>
            </div>

            {/* Earned Badges Grid */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">획득한 배지</h3>
              <div className="grid grid-cols-3 gap-4">
                {/* Silver Saver Badge */}
                {qualifiesForPointStarter && (
                  <div className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-500 p-4">
                    <span className="text-3xl md:text-4xl">🥈</span>
                    <p className="mt-2 text-sm font-medium text-center">포인트 스타터</p>
                    <p className="text-xs text-muted-foreground text-center mt-1">50포인트 달성</p>
                  </div>
                )}
                {earnedBadges.filter(b => b.id !== 'point-starter').map((badge) => (
                    <BadgeDisplay
                      key={badge.id}
                      badge={badge}
                      isEarned={true}
                    />
                  ))}
              </div>
              
              {/* Unearned Badges */}
              <h3 className="font-semibold text-foreground mb-3 mt-6">도전 중인 배지</h3>
              <div className="grid grid-cols-3 gap-4">
                {!qualifiesForPointStarter && (
                  <BadgeDisplay
                    badge={{
                      id: 'point-starter',
                      name: 'Point Starter',
                      nameKo: '포인트 스타터',
                      description: 'Earned 50+ confirmed points',
                      icon: '🥈',
                      requirement: '50포인트 달성',
                    }}
                    isEarned={false}
                  />
                )}
                {badges.filter(badge => !currentEarnedBadges.has(badge.id)).map((badge) => (
                    <BadgeDisplay
                      key={badge.id}
                      badge={badge}
                      isEarned={false}
                    />
                  ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stores' && (
          <div className="space-y-3">
            {visitedStores.map((store) => (
              <div
                key={store.id}
                className="flex items-center gap-4 rounded-xl bg-card p-4 shadow-card"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/20 text-success">
                  ✓
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{store.nameKo}</p>
                  <p className="text-sm text-muted-foreground">{store.address}</p>
                </div>
              </div>
            ))}
            {visitedStores.length < stores.length && (
              <button
                onClick={() => navigate('/map')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-muted py-4 text-sm font-medium text-muted-foreground"
              >
                <MapPin className="h-4 w-4" />
                더 많은 매장 방문하기
              </button>
            )}
          </div>
        )}
      </main>

      {/* Menu */}
      <div className="px-4 pb-8">
        {/* Admin Menu */}
        {isAdmin && (
          <div className="mb-4">
            <button
              onClick={() => navigate('/admin')}
              className="flex w-full items-center justify-between rounded-xl bg-primary/10 px-4 py-4"
            >
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-primary" />
                <span className="font-medium text-primary">관리자메뉴</span>
              </div>
              <ChevronRight className="h-5 w-5 text-primary" />
            </button>
          </div>
        )}

        <div className="rounded-2xl bg-card shadow-card overflow-hidden">
          {[
            { label: '지도보기', icon: '🗺️', action: () => navigate('/map') },
            { label: '알림 설정', icon: '🔔', action: () => setNotificationDialogOpen(true) },
            { label: '가격 제보 내역', icon: '📝', action: () => setPriceHistoryDialogOpen(true) },
            { label: '고객센터', icon: '💬', action: () => navigate('/customer-service') },
            { label: '앱 정보', icon: 'ℹ️', action: () => setAppInfoDialogOpen(true) },
          ].map((item, i) => (
            <button
              key={item.label}
              onClick={item.action}
              className={cn(
                'flex w-full items-center justify-between px-4 py-4',
                i < 4 && 'border-b border-border'
              )}
            >
              <div className="flex items-center gap-3">
                <span>{item.icon}</span>
                <span className="font-medium text-foreground">{item.label}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          ))}
        </div>

        <button 
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 py-4 text-destructive disabled:opacity-50"
        >
          {isLoggingOut ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LogOut className="h-5 w-5" />
          )}
          <span className="font-medium">{isLoggingOut ? '로그아웃 중...' : '로그아웃'}</span>
        </button>
      </div>

      {/* Notification Settings Dialog */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>알림 설정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">가격 알림</p>
                <p className="text-sm text-muted-foreground">관심상품 가격 변동 알림</p>
              </div>
              <Switch checked={notifications.priceAlerts} onCheckedChange={(v) => setNotifications({...notifications, priceAlerts: v})} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">할인 정보</p>
                <p className="text-sm text-muted-foreground">새로운 할인 정보 알림</p>
              </div>
              <Switch checked={notifications.dealUpdates} onCheckedChange={(v) => setNotifications({...notifications, dealUpdates: v})} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">커뮤니티 답글</p>
                <p className="text-sm text-muted-foreground">내 글에 댓글 알림</p>
              </div>
              <Switch checked={notifications.communityReplies} onCheckedChange={(v) => setNotifications({...notifications, communityReplies: v})} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Price History Dialog */}
      <Dialog open={priceHistoryDialogOpen} onOpenChange={setPriceHistoryDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>가격 제보 내역</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {loadingPriceHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : priceHistoryItems.length > 0 ? (
              priceHistoryItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.store_name && `${item.store_name} · `}
                      {new Date(item.recorded_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <span className="font-bold text-primary">₩{item.current_price.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">등록한 가격 제보가 없습니다</p>
            )}
          </div>
          {Math.ceil(priceHistoryTotal / PRICE_HISTORY_PER_PAGE) > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" disabled={priceHistoryPage === 1} onClick={() => setPriceHistoryPage(p => p - 1)}>이전</Button>
              <span className="text-sm text-muted-foreground">{priceHistoryPage} / {Math.ceil(priceHistoryTotal / PRICE_HISTORY_PER_PAGE)}</span>
              <Button variant="outline" size="sm" disabled={priceHistoryPage >= Math.ceil(priceHistoryTotal / PRICE_HISTORY_PER_PAGE)} onClick={() => setPriceHistoryPage(p => p + 1)}>다음</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Nickname Edit Dialog */}
      <Dialog open={isEditingNickname} onOpenChange={setIsEditingNickname}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>닉네임 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">새 닉네임</label>
              <Input
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder="닉네임을 입력하세요"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground mt-1">{nicknameInput.length}/20자</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsEditingNickname(false)}
              >
                취소
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveNickname}
                disabled={savingNickname || !nicknameInput.trim()}
              >
                {savingNickname ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  '저장'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bio Edit Dialog */}
      <Dialog open={isEditingBio} onOpenChange={setIsEditingBio}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>자기소개 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">자기소개</label>
              <textarea
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                placeholder="자신을 소개해주세요"
                maxLength={200}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">{bioInput.length}/200자</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsEditingBio(false)}
              >
                취소
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveBio}
                disabled={savingBio}
              >
                {savingBio ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  '저장'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* App Info Dialog */}
      <Dialog open={appInfoDialogOpen} onOpenChange={setAppInfoDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>앱 정보</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
              <span className="text-muted-foreground whitespace-nowrap">최신버전 업데이트</span>
              <span className="font-medium text-right">26.01.11 (260111)</span>
              <span className="text-muted-foreground whitespace-nowrap">비지니스 문의</span>
              <a 
                href="mailto:weeklycoco.kr@gmail.com" 
                className="font-medium text-primary hover:underline text-right break-all"
              >
                weeklycoco.kr@gmail.com
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;