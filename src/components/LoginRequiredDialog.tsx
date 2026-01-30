import { useState, useEffect } from 'react';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LoginRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess?: () => void;
  message?: string;
}

const LoginRequiredDialog = ({ 
  open, 
  onOpenChange, 
  onLoginSuccess,
  message = "로그인이 필요합니다"
}: LoginRequiredDialogProps) => {
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Listen for auth changes
  useEffect(() => {
    if (!open) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        onOpenChange(false);
        setTimeout(() => {
          onLoginSuccess?.();
        }, 100);
      }
    });

    return () => subscription.unsubscribe();
  }, [open, onOpenChange, onLoginSuccess]);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      // Always redirect to production domain (weeklycoco.kr) and return to the exact current URL.
      // We redirect to /auth first so the app can cleanly navigate back without leftover OAuth params.
      const baseUrl = "https://weeklycoco.kr";
      const currentPath = window.location.pathname + window.location.search;
      const redirectUrl = `${baseUrl}/auth?returnTo=${encodeURIComponent(currentPath)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error("Google login error:", error);
      toast({
        title: "Google 로그인 실패",
        description: error instanceof Error ? error.message : "오류가 발생했습니다.",
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
          }
          throw error;
        }

        toast({ title: "로그인 성공!" });
      } else {
        // Always redirect to production domain
        const redirectUrl = "https://weeklycoco.kr";

        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            throw new Error("이미 등록된 이메일입니다.");
          }
          throw error;
        }

        toast({
          title: "회원가입 성공!",
          description: "이메일을 확인해주세요.",
        });
        setIsLogin(true);
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast({
        title: isLogin ? "로그인 실패" : "회원가입 실패",
        description: error instanceof Error ? error.message : "오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">
            {message}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-70"
          >
            {isGoogleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Google로 {isLogin ? "로그인" : "회원가입"}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground">또는</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="이메일"
                required
                className="pl-10"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="비밀번호"
                required
                minLength={6}
                className="pl-10"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  처리 중...
                </>
              ) : isLogin ? "로그인" : "회원가입"}
            </Button>
          </form>

          {/* Toggle */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              {isLogin ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({ email: '', password: '' });
              }}
              className="ml-2 font-semibold text-primary"
            >
              {isLogin ? "회원가입" : "로그인"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginRequiredDialog;
