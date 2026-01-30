import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, Award, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getCurrentLevel } from '@/components/LevelPopup';
import { badges, Badge as BadgeType } from '@/data/mockData';

interface UserProfileData {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  bio: string | null;
  confirmed_points: number;
  unique_stores_visited: string[];
  created_at: string;
}

interface UserPost {
  id: string;
  title: string;
  category: string;
  created_at: string;
  is_blinded?: boolean;
}

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    'general': '자유게시판',
    'deal': '할인정보',
    'recipe': '레시피',
    'store': '매장정보',
  };
  return labels[category] || category;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '방금';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
};

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'badges'>('posts');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        // If viewing own profile, redirect to /profile
        if (user.id === userId) {
          navigate('/profile');
          return;
        }
      }
    };
    checkCurrentUser();
  }, [userId, navigate]);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    if (!userId) return;
    setIsLoading(true);

    try {
      // Fetch user profile (public info only)
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, nickname, avatar_url, bio, confirmed_points, unique_stores_visited, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        navigate('/community');
        return;
      }

      setProfile(profileData as UserProfileData);

      // Fetch user's public posts
      const { data: postsData } = await supabase
        .from('discussions')
        .select('id, title, category, created_at, is_blinded')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      setPosts(postsData || []);

      // Fetch comment count
      const { count } = await supabase
        .from('discussion_comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      setCommentCount(count || 0);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate earned badges based on public info
  const getEarnedBadges = (): BadgeType[] => {
    if (!profile) return [];
    
    const earned: BadgeType[] = [];
    const visitedCount = profile.unique_stores_visited?.length || 0;

    // Costco Nomad - visited 5+ stores
    if (visitedCount >= 5) {
      const nomadBadge = badges.find(b => b.id === 'costco-nomad');
      if (nomadBadge) earned.push(nomadBadge);
    }

    return earned;
  };

  const level = profile ? getCurrentLevel(profile.confirmed_points || 0) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">사용자를 찾을 수 없습니다</p>
      </div>
    );
  }

  const earnedBadges = getEarnedBadges();

  return (
    <div className="min-h-screen bg-background safe-bottom pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button 
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">프로필</h1>
        </div>
      </header>

      {/* Profile Card */}
      <div className="px-4 py-4">
        <div className="rounded-2xl bg-gradient-to-br from-primary to-secondary p-5 md:p-6 text-primary-foreground">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-16 w-16 md:h-20 md:w-20 border-2 border-primary-foreground/30">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.nickname || '사용자'} />
                <AvatarFallback className="bg-primary-foreground/20 text-xl md:text-2xl">
                  {profile.nickname?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              {level && (
                <span 
                  className="absolute -bottom-1 -right-1 text-xl md:text-2xl drop-shadow-lg"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                >
                  {level.emoji}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg md:text-xl font-bold truncate">
                  {profile.nickname || '익명'}
                </h2>
                {level && (
                  <span className="text-[10px] md:text-xs px-1.5 py-0.5 rounded bg-primary-foreground/20 font-medium">
                    {level.name}
                  </span>
                )}
              </div>
              <p className="text-xs opacity-70 mt-1">
                가입일: {new Date(profile.created_at).toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mt-4 rounded-xl bg-primary-foreground/10 p-3">
              <p className="text-sm opacity-90">{profile.bio}</p>
            </div>
          )}

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-primary-foreground/10 p-3 md:p-4">
            <div className="text-center">
              <p className="text-lg md:text-xl font-bold">{posts.length}</p>
              <p className="text-[10px] md:text-xs opacity-80">게시글</p>
            </div>
            <div className="text-center">
              <p className="text-lg md:text-xl font-bold">{commentCount}</p>
              <p className="text-[10px] md:text-xs opacity-80">댓글</p>
            </div>
            <div className="text-center">
              <p className="text-lg md:text-xl font-bold">{(profile.confirmed_points || 0).toLocaleString()}</p>
              <p className="text-[10px] md:text-xs opacity-80">포인트</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab('posts')}
            className={cn(
              "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'posts'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            )}
          >
            <FileText className="h-4 w-4 mx-auto mb-1" />
            게시글
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            className={cn(
              "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'badges'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            )}
          >
            <Award className="h-4 w-4 mx-auto mb-1" />
            배지
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-4">
        {activeTab === 'posts' && (
          <div className="space-y-2">
            {posts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>작성한 게시글이 없습니다</p>
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => navigate(`/community?post=${post.id}`)}
                  className="p-3 rounded-xl bg-card shadow-sm cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {getCategoryLabel(post.category)}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(post.created_at)}</span>
                  </div>
                  <h3 className="font-medium text-foreground line-clamp-1">
                    {post.is_blinded ? '[블라인드 처리된 게시글]' : post.title}
                  </h3>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'badges' && (
          <div className="space-y-4">
            {earnedBadges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Award className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>획득한 배지가 없습니다</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {earnedBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex flex-col items-center p-3 rounded-xl bg-card shadow-sm"
                  >
                    <span className="text-3xl mb-2">{badge.icon}</span>
                    <p className="text-xs font-medium text-center">{badge.nameKo}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
