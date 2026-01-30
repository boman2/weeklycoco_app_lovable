import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://weeklycoco.kr/update-password",
      });

      if (error) throw error;

      setIsEmailSent(true);
      toast({
        title: "이메일 전송 완료",
        description: "비밀번호 재설정 링크를 이메일로 보냈습니다.",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      toast({
        title: "오류 발생",
        description: error instanceof Error ? error.message : "이메일 전송에 실패했습니다.",
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
          <h1 className="text-lg font-bold">비밀번호 찾기</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="px-4 py-8">
        {isEmailSent ? (
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="mb-2 text-xl font-bold">이메일을 확인해주세요</h2>
            <p className="mb-6 text-muted-foreground">
              {email}로 비밀번호 재설정 링크를 보냈습니다.
              <br />
              이메일의 링크를 클릭하여 새 비밀번호를 설정하세요.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate("/auth")}
              className="w-full max-w-xs"
            >
              로그인 페이지로 돌아가기
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-4xl">
                🔐
              </div>
              <h2 className="text-xl font-bold">비밀번호를 잊으셨나요?</h2>
              <p className="mt-2 text-muted-foreground">
                가입한 이메일 주소를 입력하시면
                <br />
                비밀번호 재설정 링크를 보내드립니다.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Mail className="h-4 w-4" />
                  이메일
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="가입한 이메일 주소"
                  required
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
                    전송 중...
                  </>
                ) : (
                  "비밀번호 재설정 링크 보내기"
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => navigate("/auth")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                로그인 페이지로 돌아가기
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ResetPassword;
