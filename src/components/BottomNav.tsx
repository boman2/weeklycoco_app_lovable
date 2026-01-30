import { useState, useEffect } from 'react';
import { Home, Users, User, ClipboardList, Camera, LogIn, Check } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const navItems = [
    { icon: Home, label: '홈', path: '/' },
    { icon: Users, label: '커뮤니티', path: '/community' },
    { icon: Camera, label: '등록', path: '/register', isMain: true },
    { icon: ClipboardList, label: '쇼핑메모', path: '/memo' },
    { 
      icon: isLoggedIn ? User : LogIn, 
      label: isLoggedIn ? '내 정보' : '로그인', 
      path: isLoggedIn ? '/profile' : '/auth',
      showBadge: isLoggedIn 
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border shadow-soft">
      <div className="flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
            (item.path === '/' && location.pathname === '/') ||
            (item.path === '/community' && (location.pathname === '/community' || location.pathname === '/discussion' || location.pathname === '/map'));
          
          if (item.isMain) {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative -mt-6 flex flex-col items-center"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-glow transition-transform hover:scale-105 active:scale-95">
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="mt-1 text-xs font-semibold text-primary">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => {
                // Pass current path (+ query) as returnTo for auth page
                if (item.path === '/auth') {
                  navigate(`/auth?returnTo=${encodeURIComponent(location.pathname + location.search)}`);
                } else {
                  navigate(item.path);
                }
              }}
              className={cn(
                'relative flex flex-col items-center py-3 px-4 transition-colors min-h-[56px]',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <Icon className={cn('h-5 w-5', isActive && 'animate-bounce-subtle')} />
                {item.showBadge && (
                  <div className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-green-500">
                    <Check className="h-2 w-2 text-white" />
                  </div>
                )}
              </div>
              <span className="mt-1 text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
