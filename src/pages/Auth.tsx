import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, User, ArrowLeft, Loader2, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawReturnTo =
    searchParams.get("returnTo") ?? sessionStorage.getItem("returnTo") ?? "/";
  const returnTo =
    rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//") ? rawReturnTo : "/";
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    nickname: "",
    phone: "",
  });

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        navigate(returnTo);
      }
    };
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate(returnTo);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, returnTo]);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      // Always redirect to production domain (weeklycoco.kr)
      // Redirect back to /auth with returnTo so we can remove OAuth params (code, etc.)
      // and land on the exact original URL (including query).
      const baseUrl = "https://weeklycoco.kr";
      const redirectUrl = `${baseUrl}/auth?returnTo=${encodeURIComponent(returnTo)}`;

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

      if (error) {
        throw error;
      }
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
      // Password confirmation check for signup
      if (!isLogin && formData.password !== formData.confirmPassword) {
        throw new Error("비밀번호가 일치하지 않습니다.");
      }

      if (isLogin) {
        // Login
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

        toast({
          title: "로그인 성공!",
          description: "환영합니다.",
        });
      } else {
        // Sign up - Always redirect to production domain
        const redirectUrl = "https://weeklycoco.kr";

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              nickname: formData.nickname || formData.email.split("@")[0],
              phone: formData.phone,
            },
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            throw new Error("이미 등록된 이메일입니다.");
          }
          throw error;
        }

        // Update phone in user_profiles if provided
        if (data.user && formData.phone) {
          await supabase.from("user_profiles").update({ phone: formData.phone }).eq("id", data.user.id);
        }

        toast({
          title: "회원가입 성공!",
          description: "이제 로그인하여 서비스를 이용하세요.",
        });

        // Switch to login after successful signup
        setIsLogin(true);
        setFormData({ ...formData, password: "", confirmPassword: "", phone: "" });
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
    <div className="min-h-screen bg-background safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">{isLogin ? "로그인" : "회원가입"}</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="px-4 py-8">
        {/* Logo/Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-4xl">
            🛒
          </div>
          <a href="https://www.weeklycoco.kr" className="text-2xl font-bold text-foreground hover:opacity-80 transition-opacity">주간 코스트코 : 주간코코</a>
          <p className="mt-2 text-muted-foreground">
            {isLogin
              ? "로그인 후 가격 정보 등록하고 어떤 상품을 할인하는지, 구매하는지 확인하자."
              : "회원가입하고 시작하세요"}
          </p>
        </div>

        {/* Google Login Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          className="mb-6 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white py-3.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-70"
        >
          {isGoogleLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          Google로 {isLogin ? "로그인" : "회원가입"}
        </button>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-background px-4 text-muted-foreground">또는</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <User className="h-4 w-4" />
                  닉네임
                </label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  placeholder="닉네임 (선택)"
                  className="w-full rounded-xl bg-muted px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Phone className="h-4 w-4" />
                  핸드폰 번호
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="010-0000-0000"
                  className="w-full rounded-xl bg-muted px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Mail className="h-4 w-4" />
              이메일
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="이메일 주소"
              required
              className="w-full rounded-xl bg-muted px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Lock className="h-4 w-4" />
              비밀번호
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="비밀번호 (6자 이상)"
              required
              minLength={6}
              className="w-full rounded-xl bg-muted px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <Lock className="h-4 w-4" />
                비밀번호 확인
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="비밀번호 재입력"
                required
                minLength={6}
                className="w-full rounded-xl bg-muted px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-semibold text-primary-foreground transition-opacity",
              isLoading && "opacity-70",
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                처리 중...
              </>
            ) : isLogin ? (
              "로그인"
            ) : (
              "회원가입"
            )}
          </button>
        </form>

        {/* Forgot Password Link - Only show on login */}
        {isLogin && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => navigate("/reset-password")}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>
        )}

        {/* Toggle */}
        <div className="mt-6 text-center">
          <p className="text-muted-foreground">{isLogin ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}</p>
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setFormData({ email: "", password: "", confirmPassword: "", nickname: "", phone: "" });
            }}
            className="mt-2 font-semibold text-primary"
          >
            {isLogin ? "회원가입" : "로그인"}
          </button>
        </div>
      </main>
    </div>
  );
};

export default Auth;
