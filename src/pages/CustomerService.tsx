import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Lock, Loader2, MessageSquare, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';

interface CustomerRequest {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  hasComment?: boolean;
}

interface RequestComment {
  id: string;
  content: string;
  is_admin: boolean;
  created_at: string;
}

const TermsContent = () => (
  <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
    <p className="font-bold text-foreground text-base">주간코코(weeklycoco.kr) 이용약관</p>
    
    <div>
      <p className="font-bold text-foreground">제1조 (목적)</p>
      <p className="mt-1">본 약관은 '주간코코'(이하 "서비스")가 제공하는 온라인 웹사이트 및 모바일 애플리케이션 서비스의 이용과 관련하여, "서비스"와 "회원" 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.</p>
    </div>

    <div>
      <p className="font-bold text-foreground">제2조 (용어의 정의)</p>
      <ul className="mt-1 list-disc list-inside space-y-1">
        <li>주간코코: 코스트코 할인 정보, 상품평, 커뮤니티 서비스를 제공하는 운영 주체를 말합니다.</li>
        <li>회원: 본 약관에 동의하고 서비스를 이용하는 사용자를 말합니다.</li>
        <li>게시물: 회원이 서비스 내에 게시한 글, 사진, 상품평 등 모든 정보를 말합니다.</li>
      </ul>
    </div>

    <div>
      <p className="font-bold text-foreground">제3조 (서비스의 제공 및 면책사항)</p>
      <ul className="mt-1 list-disc list-inside space-y-1">
        <li>"주간코코"는 코스트코의 할인 정보 및 상품 관련 정보를 제공합니다.</li>
        <li><span className="font-semibold">[필독]</span> 본 서비스에서 제공하는 할인 정보 및 상품 가격은 매장 상황이나 시점에 따라 다를 수 있습니다. "주간코코"는 정보의 정확성을 위해 최선을 다하지만, 실제 매장 가격과의 차이로 인해 발생한 손실에 대해서는 법적 책임을 지지 않습니다.</li>
        <li>본 서비스는 코스트코 홀세일(Costco Wholesale)과는 독립적인 서비스이며, 공식 파트너십 관계가 아님을 명시합니다.</li>
      </ul>
    </div>

    <div>
      <p className="font-bold text-foreground">제4조 (회원의 의무 및 커뮤니티 매너)</p>
      <p className="mt-1">회원은 상품평 작성 시 본인의 직접적인 경험을 바탕으로 진실되게 작성해야 합니다.</p>
      <p className="mt-2">다음과 같은 행위는 서비스 이용이 제한되거나 게시물이 삭제될 수 있습니다.</p>
      <ul className="mt-1 list-disc list-inside space-y-1">
        <li>타인에 대한 비방, 욕설, 인신공격 행위</li>
        <li>광고성 스팸 게시물 등록</li>
        <li>허위 사실 유포 및 저작권 침해 게시물</li>
        <li>특정인 또는 특정 업체에 대한 근거 없는 비난</li>
      </ul>
    </div>

    <div>
      <p className="font-bold text-foreground">제5조 (저작권의 귀속)</p>
      <ul className="mt-1 list-disc list-inside space-y-1">
        <li>"주간코코"가 작성한 콘텐츠의 저작권은 "주간코코"에 귀속됩니다.</li>
        <li>회원이 작성한 게시물의 저작권은 회원 본인에게 있으나, 서비스 노출 및 홍보를 위해 "주간코코" 내에서 활용될 수 있습니다.</li>
      </ul>
    </div>

    <div>
      <p className="font-bold text-foreground">제6조 (이용 제한 및 서비스 중단)</p>
      <ul className="mt-1 list-disc list-inside space-y-1">
        <li>"주간코코"는 시스템 점검, 교체 또는 천재지변 등의 사유가 발생한 경우 서비스 제공을 일시적으로 중단할 수 있습니다.</li>
        <li>본 약관을 위반한 회원은 운영 정책에 따라 서비스 이용이 단계적으로 제한될 수 있습니다.</li>
      </ul>
    </div>

    <div>
      <p className="font-bold text-foreground">제7조 (개인정보보호)</p>
      <p className="mt-1">"주간코코"는 회원의 개인정보를 소중히 다루며, 관련 법령에 따라 보호합니다. 상세한 내용은 별도의 '개인정보처리방침'을 따릅니다.</p>
    </div>

    <p className="text-right">2026.01.10</p>
  </div>
);

const PrivacyPolicyContent = () => (
  <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
    <p className="font-bold text-foreground text-base">주간코코(weeklycoco.kr) 개인정보처리방침</p>
    
    <p>본 개인정보처리방침은 '주간코코'(이하 "서비스")가 이용자의 소중한 개인정보를 어떻게 수집, 이용, 보호하는지 안내해 드립니다.</p>

    <div>
      <p className="font-bold text-foreground">1. 수집하는 개인정보 항목 및 방법</p>
      <p className="mt-1">서비스는 회원가입 및 서비스 제공을 위해 최소한의 정보만을 수집합니다.</p>
      <ul className="mt-1 list-disc list-inside space-y-1">
        <li>수집 항목: 이메일 주소(아이디), 비밀번호, 닉네임, 기기 정보(앱 서비스 이용 시), 구글(이름, 프로필 사진 등), 카카오(이름, 프로필 사진 등)</li>
        <li>수집 방법: 웹사이트/모바일 앱 회원가입, 커뮤니티 활동(게시물 작성 등)</li>
      </ul>
    </div>

    <div>
      <p className="font-bold text-foreground">2. 개인정보의 수집 및 이용 목적</p>
      <p className="mt-1">수집된 정보는 다음의 목적을 위해서만 사용됩니다.</p>
      <ul className="mt-1 list-disc list-inside space-y-1">
        <li>회원 관리: 서비스 이용에 따른 본인 식별, 불량 회원의 부정 이용 방지</li>
        <li>서비스 제공: 코스트코 할인 정보 제공, 상품평 등록, 커뮤니티 운영</li>
        <li>공지 및 안내: 새로운 할인 소식 전달, 서비스 변경 사항 안내(이벤트 포함)</li>
      </ul>
    </div>

    <div>
      <p className="font-bold text-foreground">3. 개인정보의 보유 및 이용 기간</p>
      <ul className="mt-1 list-disc list-inside space-y-1">
        <li>보유 기간: 회원이 서비스 이용을 지속하는 동안 보유하며, 회원 탈퇴 시 즉시 파기합니다.</li>
        <li>예외 사항: 관계 법령(전자상거래법 등)에 따라 보존할 필요가 있는 경우 해당 법령이 정한 기간 동안 안전하게 보관합니다.</li>
      </ul>
    </div>

    <div>
      <p className="font-bold text-foreground">4. 개인정보의 파기 절차 및 방법</p>
      <ul className="mt-1 list-disc list-inside space-y-1">
        <li>절차: 이용 목적이 달성된 개인정보는 내부 방침 및 법령에 따라 지체 없이 파기합니다.</li>
        <li>방법: 전자적 파일 형태는 복구할 수 없는 기술적 방법을 사용하여 삭제하며, 종이 문서는 파쇄합니다.</li>
      </ul>
    </div>

    <div>
      <p className="font-bold text-foreground">5. 제3자에게의 개인정보 제공 및 위탁</p>
      <p className="mt-1">"주간코코"는 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다.</p>
      <p className="mt-1">단, 법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우는 예외로 합니다.</p>
    </div>

    <div>
      <p className="font-bold text-foreground">6. 이용자의 권리와 행사 방법</p>
      <p className="mt-1">회원은 언제든지 본인의 개인정보를 조회하거나 수정할 수 있으며, 회원 탈퇴를 통해 개인정보 이용 동의를 철회할 수 있습니다.</p>
      <p className="mt-1">앱 내 '마이페이지' 또는 고객문의를 통해 직접 처리할 수 있습니다.</p>
    </div>

    <div>
      <p className="font-bold text-foreground">7. 개인정보의 안전성 확보 조치</p>
      <p className="mt-1">회원의 개인정보를 보호하기 위해 다음과 같은 조치를 취하고 있습니다.</p>
      <ul className="mt-1 list-disc list-inside space-y-1">
        <li>비밀번호 암호화 저장 및 전송</li>
        <li>해킹이나 컴퓨터 바이러스로부터의 보호를 위한 보안 시스템 운영</li>
      </ul>
    </div>

    <div>
      <p className="font-bold text-foreground">8. 개인정보 보호 책임자 및 상담</p>
      <p className="mt-1">서비스 이용 중 발생하는 모든 개인정보 관련 문의는 아래의 책임자에게 연락해 주시기 바랍니다.</p>
      <ul className="mt-1 list-disc list-inside space-y-1">
        <li>성명 : 김범완</li>
        <li>이메일 : weeklycoco.kr@gmail.com</li>
      </ul>
    </div>
  </div>
);

const LocationTermsContent = () => (
  <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
    <p className="font-bold text-foreground text-base">주간코코(weeklycoco.kr) 위치정보 이용약관</p>

    <div>
      <p className="font-bold text-foreground">제1조 (목적)</p>
      <p className="mt-1">본 약관은 '주간코코'(이하 "회사")가 제공하는 위치기반서비스(내 주변 매장 찾기 등)를 이용함에 있어, "회사"와 개인위치정보주체(이하 "회원")의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
    </div>

    <div>
      <p className="font-bold text-foreground">제2조 (약관 외 준칙)</p>
      <p className="mt-1">본 약관에 명시되지 않은 사항은 위치정보의 보호 및 이용 등에 관한 법률, 개인정보 보호법, 전기통신기본법 등 관계 법령 및 서비스 운영 정책에 따릅니다.</p>
    </div>

    <div>
      <p className="font-bold text-foreground">제3조 (서비스의 내용)</p>
      <p className="mt-1">"회사"는 위치정보사업자로부터 수집한 위치정보를 바탕으로 다음과 같은 서비스를 제공합니다.</p>
      <ul className="mt-1 list-disc list-inside space-y-1">
        <li>내 주변 매장 찾기: 현재 위치를 기반으로 가장 가까운 코스트코 매장의 위치, 거리, 경로 정보를 제공합니다.</li>
        <li>지역별 할인 정보 제공: 회원의 현재 위치를 기준으로 해당 지역 매장의 특화된 할인 소식을 안내합니다.</li>
      </ul>
    </div>

    <div>
      <p className="font-bold text-foreground">제4조 (서비스 이용요금)</p>
      <p className="mt-1">"회사"가 제공하는 위치기반서비스는 무료입니다.</p>
      <p className="mt-1">단, 서비스 이용 시 발생하는 데이터 통신료는 회원이 가입한 통신사의 정책에 따라 부과될 수 있습니다.</p>
    </div>

    <div>
      <p className="font-bold text-foreground">제5조 (개인위치정보주체의 권리)</p>
      <ul className="mt-1 list-disc list-inside space-y-1">
        <li>회원은 언제든지 위치기반서비스 제공 및 개인위치정보의 활용에 대한 동의의 전부 또는 일부를 철회할 수 있습니다.</li>
        <li>회원은 위치정보 이용의 일시적인 중지를 요구할 수 있으며, "회사"는 이를 거절하지 않습니다.</li>
        <li>회원은 "회사"에 대하여 아래 자료에 대한 열람 및 고지, 오류 정정을 요구할 수 있습니다.
          <ul className="ml-4 mt-1 list-disc list-inside space-y-1">
            <li>본인에 대한 위치정보 이용·제공사실 확인자료</li>
            <li>본인의 개인위치정보가 법령에 따라 제3자에게 제공된 이유 및 내용</li>
          </ul>
        </li>
      </ul>
    </div>

    <div>
      <p className="font-bold text-foreground">제6조 (개인위치정보 이용·제공사실 확인자료의 보유근거 및 보유기간)</p>
      <p className="mt-1">"회사"는 위치정보법 제16조 제2항에 따라 위치정보 이용·제공사실 확인자료를 위치정보 시스템에 자동으로 기록하며, 해당 자료는 6개월간 보관합니다.</p>
    </div>

    <div>
      <p className="font-bold text-foreground">제7조 (개인위치정보의 보유기간 및 파기)</p>
      <p className="mt-1">"회사"는 서비스 목적을 달성한 경우 개인위치정보를 즉시 파기합니다.</p>
      <p className="mt-1">단, "내 주변 매장 찾기"를 위해 수집된 일회성 위치정보는 정보 제공 후 별도로 저장하지 않고 즉시 삭제하는 것을 원칙으로 합니다.</p>
    </div>

    <div>
      <p className="font-bold text-foreground">제8조 (위치정보관리책임자의 정보)</p>
      <p className="mt-1">"회사"는 위치정보를 적절히 관리·보호하고 이용자의 불만을 원활히 처리하기 위해 실무자를 책임자로 지정합니다.</p>
      <ul className="mt-1 list-disc list-inside space-y-1">
        <li>성명/닉네임: 김범완</li>
        <li>연락처(이메일): weeklycoco.kr@gmail.com</li>
      </ul>
    </div>
  </div>
);

const CustomerService = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  
  // Create request dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);
  
  // View request dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequest | null>(null);
  const [viewPassword, setViewPassword] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [comments, setComments] = useState<RequestComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    setIsLoading(false);
    fetchRequests();
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from('customer_requests')
        .select('id, user_id, title, content, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!user) {
      toast({ title: '로그인이 필요합니다', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    if (!newTitle.trim() || !newContent.trim() || !newPassword.trim()) {
      toast({ title: '모든 필드를 입력해주세요', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      // Simple hash for password (in production, use proper hashing)
      const passwordHash = btoa(newPassword);

      const { error } = await supabase
        .from('customer_requests')
        .insert({
          user_id: user.id,
          title: newTitle.trim(),
          content: newContent.trim(),
          password_hash: passwordHash,
        });

      if (error) throw error;

      toast({ title: '요청이 등록되었습니다' });
      setCreateDialogOpen(false);
      setNewTitle('');
      setNewContent('');
      setNewPassword('');
      fetchRequests();
    } catch (error: any) {
      toast({ title: '등록 실패', description: error.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleViewRequest = (request: CustomerRequest) => {
    setSelectedRequest(request);
    setViewPassword('');
    setPasswordVerified(false);
    setComments([]);
    
    // If it's the user's own request, skip password verification
    if (user && request.user_id === user.id) {
      setPasswordVerified(true);
      fetchComments(request.id);
    }
    
    setViewDialogOpen(true);
  };

  const handleVerifyPassword = async () => {
    if (!selectedRequest || !viewPassword.trim()) return;

    setVerifyingPassword(true);
    try {
      // Get the request with password_hash
      const { data, error } = await supabase
        .from('customer_requests')
        .select('password_hash')
        .eq('id', selectedRequest.id)
        .single();

      if (error) throw error;

      const inputHash = btoa(viewPassword);
      if (data.password_hash === inputHash) {
        setPasswordVerified(true);
        fetchComments(selectedRequest.id);
      } else {
        toast({ title: '비밀번호가 일치하지 않습니다', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: '확인 실패', description: error.message, variant: 'destructive' });
    } finally {
      setVerifyingPassword(false);
    }
  };

  const fetchComments = async (requestId: string) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('customer_request_comments')
        .select('id, content, is_admin, created_at')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) {
        // User might not have permission to view comments
        console.log('No comments or no permission');
        setComments([]);
      } else {
        setComments(data || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold">고객센터</h1>
        </div>
      </header>

      <main className="px-4 py-4">
        <Tabs defaultValue="terms" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="terms" className="text-xs px-2">이용약관</TabsTrigger>
            <TabsTrigger value="policy" className="text-xs px-2">개인정보처리방침</TabsTrigger>
            <TabsTrigger value="location" className="text-xs px-2">위치정보이용약관</TabsTrigger>
            <TabsTrigger value="requests" className="text-xs px-2">요청바랍니다</TabsTrigger>
          </TabsList>

          <TabsContent value="terms">
            <div className="rounded-xl border border-border bg-card p-4">
              <TermsContent />
            </div>
          </TabsContent>

          <TabsContent value="policy">
            <div className="rounded-xl border border-border bg-card p-4">
              <PrivacyPolicyContent />
            </div>
          </TabsContent>

          <TabsContent value="location">
            <div className="rounded-xl border border-border bg-card p-4">
              <LocationTermsContent />
            </div>
          </TabsContent>

          <TabsContent value="requests">
            <div className="space-y-4">
              {/* Write Button */}
              <Button 
                onClick={() => {
                  if (!user) {
                    toast({ title: '로그인이 필요합니다', variant: 'destructive' });
                    navigate('/auth');
                    return;
                  }
                  setCreateDialogOpen(true);
                }}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                요청 작성하기
              </Button>

              {/* Request List */}
              {loadingRequests ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : requests.length > 0 ? (
                <div className="space-y-2">
                  {requests.map((request) => (
                    <button
                      key={request.id}
                      onClick={() => handleViewRequest(request)}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">{request.title}</span>
                          {user && request.user_id === user.id && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex-shrink-0">내 글</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(request.created_at)}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  등록된 요청이 없습니다
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Request Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>요청 작성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">제목</label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                maxLength={100}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">내용</label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="요청 내용을 입력하세요"
                maxLength={2000}
                className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                <Lock className="h-4 w-4 inline mr-1" />
                비밀번호
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="댓글 확인용 비밀번호"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground mt-1">관리자 댓글 확인 시 필요합니다</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreateDialogOpen(false)}>
                취소
              </Button>
              <Button className="flex-1" onClick={handleCreateRequest} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : '등록'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Request Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {selectedRequest?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {!passwordVerified && !(user && selectedRequest?.user_id === user.id) ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  내용을 확인하려면 비밀번호를 입력하세요
                </p>
                <Input
                  type="password"
                  value={viewPassword}
                  onChange={(e) => setViewPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                />
                <Button 
                  className="w-full" 
                  onClick={handleVerifyPassword}
                  disabled={verifyingPassword || !viewPassword.trim()}
                >
                  {verifyingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : '확인'}
                </Button>
              </div>
            ) : (
              <>
                {/* Request Content */}
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    {selectedRequest && formatDate(selectedRequest.created_at)}
                  </p>
                  <p className="text-sm whitespace-pre-line">{selectedRequest?.content}</p>
                </div>

                {/* Comments Section */}
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    관리자 답변
                  </h3>
                  {loadingComments ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : comments.length > 0 ? (
                    <div className="space-y-2">
                      {comments.map((comment) => (
                        <div 
                          key={comment.id} 
                          className="rounded-lg bg-primary/10 p-3"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-primary">관리자</span>
                            <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      아직 답변이 없습니다
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerService;