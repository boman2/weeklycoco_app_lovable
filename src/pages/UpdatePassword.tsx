import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const UpdatePassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsValidSession(!!session);
      setIsChecking(false);
    };
    checkSession();

    // Listen for auth changes (recovery token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "비밀번호 불일치",
        description: "비밀번호가 일치하지 않습니다.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "비밀번호 오류",
        description: "비밀번호는 6자 이상이어야 합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setIsSuccess(true);
      toast({
        title: "비밀번호 변경 완료",
        description: "새 비밀번호로 로그인하세요.",
      });
    } catch (error) {
      console.error("Update password error:", error);
      toast({
        title: "오류 발생",
        description: error instanceof Error ? error.message : "비밀번호 변경에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isValidSession && !isSuccess) {
    return (
      <div className="min-h-screen bg-background safe-bottom">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => navigate("/")}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold">비밀번호 재설정</h1>
            <div className="w-10" />
          </div>
        </header>
        <main className="px-4 py-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100 text-4xl">
            ⚠️
          </div>
          <h2 className="mb-2 text-xl font-bold">유효하지 않은 링크</h2>
          <p className="mb-6 text-muted-foreground">
            비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다.
            <br />
            다시 비밀번호 찾기를 시도해주세요.
          </p>
          <Button onClick={() => navigate("/reset-password")} className="w-full max-w-xs">
            비밀번호 찾기로 이동
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate("/")}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">새 비밀번호 설정</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="px-4 py-8">
        {isSuccess ? (
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="mb-2 text-xl font-bold">비밀번호 변경 완료</h2>
            <p className="mb-6 text-muted-foreground">
              새 비밀번호가 성공적으로 설정되었습니다.
              <br />
              이제 새 비밀번호로 로그인하세요.
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full max-w-xs">
              로그인하기
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-4xl">
                🔑
              </div>
              <h2 className="text-xl font-bold">새 비밀번호 설정</h2>
              <p className="mt-2 text-muted-foreground">
                새로 사용할 비밀번호를 입력해주세요.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Lock className="h-4 w-4" />
                  새 비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="새 비밀번호 (6자 이상)"
                  required
                  minLength={6}
                  className="w-full rounded-xl bg-muted px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Lock className="h-4 w-4" />
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호 재입력"
                  required
                  minLength={6}
                  className="w-full rounded-xl bg-muted px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="mt-6 w-full py-6"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    변경 중...
                  </>
                ) : (
                  "비밀번호 변경하기"
                )}
              </Button>
            </form>
          </>
        )}
      </main>
    </div>
  );
};

export default UpdatePassword;
