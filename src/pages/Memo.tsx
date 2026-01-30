import { useState, useEffect, useMemo } from 'react';
import { Settings, Plus, ShoppingCart, AlertTriangle, Store, ChevronDown, Camera, Search, X, Circle, CheckCircle2, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import SwipeableItem from '@/components/SwipeableItem';

interface MemoItem {
  id: string;
  product_id: string;
  product_name: string;
  estimated_price: number;
  store_id: string | null;
  store_name: string | null;
  is_purchased: boolean;
  quantity: number;
  created_at: string;
  category?: string;
}

interface SearchProduct {
  product_id: string;
  name: string;
  category: string;
  lowest_price: number;
  store_name: string | null;
  store_id: string | null;
}

const Memo = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [memoItems, setMemoItems] = useState<MemoItem[]>([]);
  const [dailyBudget, setDailyBudget] = useState(0);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  
  
  // Product search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchMode, setShowSearchMode] = useState(true);
  
  // Price registration prompt state
  const [pricePromptOpen, setPricePromptOpen] = useState(false);
  const [pendingPurchaseItem, setPendingPurchaseItem] = useState<MemoItem | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
      fetchData(session.user.id);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchData = async (userId: string) => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('daily_budget')
        .eq('id', userId)
        .single();

      if (profile) {
        setDailyBudget(profile.daily_budget || 0);
      }

      const { data: items, error } = await supabase
        .from('shopping_memo')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (items && items.length > 0) {
        const productIds = items.map(i => i.product_id).filter(id => !id.startsWith('custom-'));
        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select('product_id, category')
            .in('product_id', productIds);

          const categoryMap: Record<string, string> = {};
          products?.forEach(p => { categoryMap[p.product_id] = p.category; });

          const itemsWithCategory = items.map(item => ({
            ...item,
            category: categoryMap[item.product_id] || '기타',
          }));
          setMemoItems(itemsWithCategory);
        } else {
          setMemoItems(items.map(item => ({ ...item, category: '기타' })));
        }
      } else {
        setMemoItems([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search products from DB
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Search products
      const { data: products, error } = await supabase
        .from('products')
        .select('product_id, name, category')
        .ilike('name', `%${query}%`)
        .limit(10);

      if (error) throw error;

      if (products && products.length > 0) {
        // Get lowest prices for each product
        const productIds = products.map(p => p.product_id);
        const { data: priceData } = await supabase
          .from('price_history')
          .select('product_id, current_price, store_id')
          .in('product_id', productIds)
          .order('recorded_at', { ascending: false });

        const { data: stores } = await supabase
          .from('stores')
          .select('id, name');

        const storeMap: Record<string, string> = {};
        stores?.forEach(s => { storeMap[s.id] = s.name; });

        // Find lowest price per product
        const lowestPrices: Record<string, { price: number; store_id: string | null }> = {};
        priceData?.forEach(p => {
          if (!lowestPrices[p.product_id] || p.current_price < lowestPrices[p.product_id].price) {
            lowestPrices[p.product_id] = { price: p.current_price, store_id: p.store_id };
          }
        });

        const results: SearchProduct[] = products.map(p => ({
          product_id: p.product_id,
          name: p.name,
          category: p.category,
          lowest_price: lowestPrices[p.product_id]?.price || 0,
          store_id: lowestPrices[p.product_id]?.store_id || null,
          store_name: lowestPrices[p.product_id]?.store_id 
            ? storeMap[lowestPrices[p.product_id].store_id] || null 
            : null,
        }));

        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFromSearch = async (product: SearchProduct) => {
    if (!user) return;

    try {
      // Check if already in memo
      const existing = memoItems.find(i => i.product_id === product.product_id);
      if (existing) {
        toast.error('이미 메모에 있는 상품입니다');
        return;
      }

      const { data, error } = await supabase
        .from('shopping_memo')
        .insert({
          user_id: user.id,
          product_id: product.product_id,
          product_name: product.name,
          estimated_price: Math.round(product.lowest_price),
          store_id: product.store_id,
          store_name: product.store_name,
          quantity: 1,
        })
        .select()
        .single();

      if (error) throw error;
      
      setMemoItems([{ ...data, category: product.category }, ...memoItems]);
      setSearchQuery('');
      setSearchResults([]);
      setAddDialogOpen(false);
      toast.success(`${product.name} 추가됨 (최저가 ₩${formatPrice(product.lowest_price)})`);
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('추가 실패');
    }
  };


  // Calculate totals
  const { estimatedTotal, unpurchasedTotal, purchasedTotal, budgetPercentage, isOverBudget, overAmount } = useMemo(() => {
    const allTotal = memoItems.reduce((sum, item) => sum + (item.estimated_price * item.quantity), 0);
    const unpurchased = memoItems.filter(i => !i.is_purchased).reduce((sum, item) => sum + (item.estimated_price * item.quantity), 0);
    const purchased = memoItems.filter(i => i.is_purchased).reduce((sum, item) => sum + (item.estimated_price * item.quantity), 0);
    const percentage = dailyBudget > 0 ? Math.min((allTotal / dailyBudget) * 100, 100) : 0;
    const over = dailyBudget > 0 && allTotal > dailyBudget;
    const overAmt = over ? allTotal - dailyBudget : 0;

    return {
      estimatedTotal: allTotal,
      unpurchasedTotal: unpurchased,
      purchasedTotal: purchased,
      budgetPercentage: percentage,
      isOverBudget: over,
      overAmount: overAmt,
    };
  }, [memoItems, dailyBudget]);

  const handleSaveBudget = async () => {
    if (!user) return;
    let budgetValue = parseInt(budgetInput.replace(/,/g, ''), 10) || 0;
    
    // 최대 500만원으로 제한
    if (budgetValue > 5000000) {
      budgetValue = 5000000;
      toast.info('예산은 최대 500만원까지 설정 가능합니다');
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ daily_budget: budgetValue })
        .eq('id', user.id);

      if (error) throw error;
      setDailyBudget(budgetValue);
      setBudgetDialogOpen(false);
      toast.success('예산이 저장되었습니다');
    } catch (error) {
      console.error('Error saving budget:', error);
      toast.error('예산 저장 실패');
    }
  };

  const handleAddItem = async () => {
    if (!user || !newItemName.trim()) return;

    const price = parseInt(newItemPrice.replace(/,/g, ''), 10) || 0;
    const quantity = parseInt(newItemQuantity, 10) || 1;

    try {
      const { data, error } = await supabase
        .from('shopping_memo')
        .insert({
          user_id: user.id,
          product_id: `custom-${Date.now()}`,
          product_name: newItemName.trim(),
          estimated_price: price,
          quantity: quantity,
        })
        .select()
        .single();

      if (error) throw error;
      setMemoItems([{ ...data, category: '기타' }, ...memoItems]);
      setAddDialogOpen(false);
      setNewItemName('');
      setNewItemPrice('');
      setNewItemQuantity('1');
      toast.success('항목이 추가되었습니다');
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('항목 추가 실패');
    }
  };

  const handleTogglePurchased = async (item: MemoItem) => {
    if (!item.is_purchased) {
      setPendingPurchaseItem(item);
      setPricePromptOpen(true);
      return;
    }
    
    await completePurchaseToggle(item);
  };

  const completePurchaseToggle = async (item: MemoItem) => {
    try {
      const { error } = await supabase
        .from('shopping_memo')
        .update({ is_purchased: !item.is_purchased })
        .eq('id', item.id);

      if (error) throw error;
      setMemoItems(memoItems.map(i => 
        i.id === item.id ? { ...i, is_purchased: !i.is_purchased } : i
      ));
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('업데이트 실패');
    }
  };

  const handleConfirmPurchase = async (registerPrice: boolean) => {
    if (!pendingPurchaseItem) return;

    await completePurchaseToggle(pendingPurchaseItem);
    setPricePromptOpen(false);
    
    if (registerPrice) {
      navigate(`/register?product=${pendingPurchaseItem.product_id}&name=${encodeURIComponent(pendingPurchaseItem.product_name)}`);
    }
    
    setPendingPurchaseItem(null);
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('shopping_memo')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMemoItems(memoItems.filter(i => i.id !== id));
      toast.success('항목이 삭제되었습니다');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('삭제 실패');
    }
  };

  const handleUpdateQuantity = async (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    try {
      const { error } = await supabase
        .from('shopping_memo')
        .update({ quantity: newQuantity })
        .eq('id', id);

      if (error) throw error;
      setMemoItems(memoItems.map(i => 
        i.id === id ? { ...i, quantity: newQuantity } : i
      ));
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('수량 변경 실패');
    }
  };


  const formatPrice = (price: number) => {
    return price.toLocaleString('ko-KR');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-lg border-b border-border shadow-soft">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-bold">쇼핑 메모</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setBudgetInput(dailyBudget.toString());
                setBudgetDialogOpen(true);
              }}
              className="h-9 w-9"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {/* Budget Display */}
          <div className="space-y-2 p-3 rounded-xl bg-muted/50 shadow-soft">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">오늘의 예산</span>
              <span className="font-semibold">₩{formatPrice(dailyBudget)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">예상 총액</span>
              <span className={cn(
                "font-bold text-lg",
                isOverBudget ? "text-destructive" : "text-success"
              )}>
                ₩{formatPrice(estimatedTotal)}
              </span>
            </div>

            {/* Progress Bar - Sleek and thin */}
            <div className="space-y-1">
              <Progress 
                value={budgetPercentage} 
                className={cn(
                  "h-1.5 rounded-full",
                  isOverBudget && "[&>div]:bg-destructive"
                )}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{dailyBudget > 0 ? `${Math.round(budgetPercentage)}% 사용` : '예산 미설정'}</span>
                <span>남은: ₩{formatPrice(Math.max(dailyBudget - estimatedTotal, 0))}</span>
              </div>
            </div>

            {/* Over Budget Warning - Soft professional style */}
            {isOverBudget && (
              <div className="budget-warning text-sm py-1.5 px-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">
                  예산 ₩{formatPrice(overAmount)} 초과
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats & Sort */}
      <div className="px-4 py-4 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 p-4 rounded-2xl bg-card border border-border shadow-soft">
            <div className="text-sm text-muted-foreground mb-1">미구매</div>
            <div className="font-bold text-lg text-primary">₩{formatPrice(unpurchasedTotal)}</div>
          </div>
          <div className="flex-1 p-4 rounded-2xl bg-card border border-border shadow-soft">
            <div className="text-sm text-muted-foreground mb-1">구매완료</div>
            <div className="font-bold text-lg text-success">₩{formatPrice(purchasedTotal)}</div>
          </div>
        </div>

      </div>

      {/* Memo List */}
      <div className="px-4 space-y-2">
        {memoItems.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">쇼핑 메모가 비어있습니다</p>
            <p className="text-muted-foreground mt-1">아래 + 버튼으로 항목을 추가하세요</p>
          </div>
        ) : (
          <>
            {/* Unpurchased Items */}
            {memoItems.filter(item => !item.is_purchased).map((item) => (
              <SwipeableItem key={item.id} onDelete={() => handleDeleteItem(item.id)}>
                <div className="flex items-center gap-2.5 py-2 px-3 bg-card">
                  <button
                    onClick={() => handleTogglePurchased(item)}
                    className="flex-shrink-0 transition-all duration-200 ease-out active:scale-90"
                  >
                    <Circle className="h-[18px] w-[18px] text-muted-foreground/40 hover:text-primary/60" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate text-sm block">{item.product_name}</span>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                      disabled={item.quantity <= 1}
                    >
                      <span className="text-sm font-medium">−</span>
                    </button>
                    <span className="text-xs font-medium w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                      className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span className="text-sm font-medium">+</span>
                    </button>
                  </div>
                  <span className="font-bold text-primary text-sm whitespace-nowrap ml-2">
                    ₩{formatPrice(item.estimated_price * item.quantity)}
                  </span>
                </div>
              </SwipeableItem>
            ))}

            {/* Purchased Items Section */}
            {memoItems.filter(item => item.is_purchased).length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">구매 완료</p>
                <div className="space-y-2">
                  {memoItems.filter(item => item.is_purchased).map((item) => (
                    <SwipeableItem key={item.id} onDelete={() => handleDeleteItem(item.id)}>
                      <div className="flex items-center gap-2.5 py-2 px-3 bg-card/50 opacity-60">
                        <button
                          onClick={() => handleTogglePurchased(item)}
                          className="flex-shrink-0 transition-all duration-200 ease-out active:scale-90"
                        >
                          <CheckCircle2 className="h-[18px] w-[18px] text-primary" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate text-sm line-through text-muted-foreground block">{item.product_name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">×{item.quantity}</span>
                        <span className="font-bold text-muted-foreground text-sm whitespace-nowrap ml-1">
                          ₩{formatPrice(item.estimated_price * item.quantity)}
                        </span>
                      </div>
                    </SwipeableItem>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB - Add Item */}
      <button
        onClick={() => setAddDialogOpen(true)}
        className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="h-6 w-6 text-primary-foreground" />
      </button>

      {/* Budget Setting Dialog */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>오늘의 예산 설정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₩</span>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="예: 100,000"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value.replace(/[^0-9,]/g, ''))}
                className="pl-8 h-12"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[30000, 50000, 100000, 150000, 200000].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setBudgetInput(amount.toString())}
                  className="h-10"
                >
                  ₩{formatPrice(amount)}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBudgetDialogOpen(false)} className="h-11">
              취소
            </Button>
            <Button onClick={handleSaveBudget} className="h-11">
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog with Product Search */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>쇼핑 항목 추가</DialogTitle>
          </DialogHeader>
          
          {/* Toggle between search and manual */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={showSearchMode ? "default" : "outline"}
              size="sm"
              onClick={() => setShowSearchMode(true)}
              className="flex-1 h-10"
            >
              <Search className="h-4 w-4 mr-2" />
              상품 검색
            </Button>
            <Button
              variant={!showSearchMode ? "default" : "outline"}
              size="sm"
              onClick={() => setShowSearchMode(false)}
              className="flex-1 h-10"
            >
              직접 입력
            </Button>
          </div>

          {showSearchMode ? (
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="상품명으로 검색..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 h-12"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Search Results */}
              <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                {isSearching ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((product) => (
                    <button
                      key={product.product_id}
                      onClick={() => handleAddFromSearch(product)}
                      className="w-full p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
                    >
                      <div className="font-medium">{product.name}</div>
                      <div className="flex items-center justify-between mt-1 text-sm">
                        <span className="text-muted-foreground">{product.category}</span>
                        <div className="text-right">
                          {product.lowest_price > 0 ? (
                            <>
                              <span className="font-bold text-primary">₩{formatPrice(product.lowest_price)}</span>
                              {product.store_name && (
                                <span className="text-muted-foreground ml-1">@ {product.store_name}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">가격 정보 없음</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                ) : searchQuery.length >= 2 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    검색 결과가 없습니다
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    상품명을 2글자 이상 입력하세요
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div>
                <label className="font-medium mb-2 block">상품명</label>
                <Input
                  placeholder="예: 우유, 계란, 빵 등"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="h-12"
                />
              </div>
              <div>
                <label className="font-medium mb-2 block">예상 가격</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₩</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="예: 5,000"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value.replace(/[^0-9,]/g, ''))}
                    className="pl-8 h-12"
                  />
                </div>
              </div>
              <div>
                <label className="font-medium mb-2 block">수량</label>
                <Input
                  type="number"
                  min="1"
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(e.target.value)}
                  className="h-12"
                />
              </div>
              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="h-11">
                  취소
                </Button>
                <Button onClick={handleAddItem} disabled={!newItemName.trim()} className="h-11">
                  추가
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Price Registration Prompt Dialog */}
      <Dialog open={pricePromptOpen} onOpenChange={(open) => {
        if (!open) {
          setPricePromptOpen(false);
          setPendingPurchaseItem(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>구매 완료!</DialogTitle>
            <DialogDescription className="pt-2">
              {pendingPurchaseItem?.product_name}을(를) 구매하셨나요?
              <br />
              현재 가격을 등록하면 5포인트를 받을 수 있습니다!
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button onClick={() => handleConfirmPurchase(true)} className="w-full h-12 gap-2">
              <Camera className="h-5 w-5" />
              가격 등록하고 5포인트 받기
            </Button>
            <Button variant="outline" onClick={() => handleConfirmPurchase(false)} className="w-full h-12">
              다음에 등록하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Memo;