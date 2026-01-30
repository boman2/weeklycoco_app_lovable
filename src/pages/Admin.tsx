import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Import admin tab components
import AdminProductsTab from '@/components/admin/AdminProductsTab';
import AdminStoresTab from '@/components/admin/AdminStoresTab';
import AdminDiscussionsTab from '@/components/admin/AdminDiscussionsTab';
import AdminPriceVerificationTab from '@/components/admin/AdminPriceVerificationTab';
import AdminUsersTab from '@/components/admin/AdminUsersTab';
import AdminPointsTab from '@/components/admin/AdminPointsTab';

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        toast({ title: '관리자 권한이 필요합니다', variant: 'destructive' });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };

    checkAdmin();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/profile')}
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">관리자 메뉴</h1>
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start px-4 py-2 h-auto flex-wrap gap-1 bg-transparent border-b border-border rounded-none">
          <TabsTrigger 
            value="products" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-2 text-sm"
          >
            상품관리
          </TabsTrigger>
          <TabsTrigger 
            value="stores" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-2 text-sm"
          >
            매장휴무일
          </TabsTrigger>
          <TabsTrigger 
            value="discussions" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-2 text-sm"
          >
            게시글관리
          </TabsTrigger>
          <TabsTrigger 
            value="verification" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-2 text-sm"
          >
            가격검증
          </TabsTrigger>
          <TabsTrigger 
            value="users" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-2 text-sm"
          >
            고객관리
          </TabsTrigger>
          <TabsTrigger 
            value="points" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-2 text-sm"
          >
            포인트관리
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="products" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <AdminProductsTab />
          </TabsContent>
          <TabsContent value="stores" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <AdminStoresTab />
          </TabsContent>
          <TabsContent value="discussions" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <AdminDiscussionsTab />
          </TabsContent>
          <TabsContent value="verification" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <AdminPriceVerificationTab />
          </TabsContent>
          <TabsContent value="users" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <AdminUsersTab />
          </TabsContent>
          <TabsContent value="points" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <AdminPointsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Admin;
