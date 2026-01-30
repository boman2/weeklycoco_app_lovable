import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, Pencil, Upload, X, Check, Image, FileStack, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import BulkOcrUploader from '@/components/BulkOcrUploader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { compressPriceTagImage, compressProductImage } from '@/lib/imageCompression';

const ITEMS_PER_PAGE = 50;

interface Product {
  product_id: string;
  name: string;
  category: string;
  image_url: string | null;
  product_image_url: string | null;
  created_at: string;
}

interface PriceInfo {
  id: string;
  current_price: number;
  selling_price: number;
  discount_price: number | null;
  discount_period: string | null;
}

interface Store {
  id: string;
  name: string;
}

const AdminProducts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'no-product-image' | 'no-price-tag'>('date');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<{ productId: string; type: 'price' | 'product' } | null>(null);
  const [editingFields, setEditingFields] = useState<{ productId: string; name: string; category: string } | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<string | null>(null);
  const [showBulkUploader, setShowBulkUploader] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('신선식품,빵');
  const [bulkStoreId, setBulkStoreId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [priceInfoMap, setPriceInfoMap] = useState<Record<string, PriceInfo>>({});
  const [editingPriceInfo, setEditingPriceInfo] = useState<{ productId: string; priceInfo: PriceInfo } | null>(null);
  const [savingPriceInfo, setSavingPriceInfo] = useState(false);

  const categories = [
    { id: 'all', name: '전체', icon: '📋' },
    { id: '신선식품,빵', name: '신선식품/빵', icon: '🥖' },
    { id: '냉장,냉동', name: '냉장/냉동', icon: '❄️' },
    { id: '가공식품', name: '가공식품', icon: '🥫' },
    { id: '음료,주류', name: '음료/주류', icon: '🍷' },
    { id: '커피,차', name: '커피/차', icon: '☕' },
    { id: '과자,간식', name: '과자/간식', icon: '🍪' },
    { id: '디지털,가전', name: '디지털/가전', icon: '📱' },
    { id: '주방,욕실', name: '주방/욕실', icon: '🍳' },
    { id: '의류,잡화', name: '의류/잡화', icon: '👕' },
    { id: '생활용품', name: '생활용품', icon: '🧴' },
    { id: '건강,미용', name: '건강/미용', icon: '💊' },
    { id: '공구,문구', name: '공구/문구', icon: '🔧' },
  ];

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      try {
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

        const [{ data: productsData }, { data: storesData }, { data: priceData }] = await Promise.all([
          supabase.from('products').select('*').order('created_at', { ascending: false }),
          supabase.from('stores').select('id, name').order('name'),
          supabase.from('price_history').select('id, product_id, current_price, selling_price, discount_price, discount_period').order('recorded_at', { ascending: false })
        ]);

        setProducts(productsData || []);
        setStores(storesData || []);
        if (storesData && storesData.length > 0) {
          setBulkStoreId(storesData[0].id);
        }
        
        // Build price info map (latest price for each product)
        const priceMap: Record<string, PriceInfo> = {};
        (priceData || []).forEach(p => {
          if (!priceMap[p.product_id]) {
            priceMap[p.product_id] = {
              id: p.id,
              current_price: p.current_price,
              selling_price: p.selling_price,
              discount_price: p.discount_price,
              discount_period: p.discount_period
            };
          }
        });
        setPriceInfoMap(priceMap);
      } catch (error) {
        console.error('Error:', error);
        toast({ title: '데이터를 불러올 수 없습니다', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndFetch();
  }, [navigate, toast]);

  const handleImageUpload = async (productId: string, type: 'price' | 'product', file: File) => {
    setUploadingImage({ productId, type });
    
    try {
      // Compress image before upload
      const compressFunc = type === 'price' ? compressPriceTagImage : compressProductImage;
      const { blob: compressedBlob, extension } = await compressFunc(file);
      const fileName = `${productId}/${type}-${Date.now()}.${extension}`;
      
      const { error: uploadError } = await supabase.storage
        .from('price-tags')
        .upload(fileName, compressedBlob, {
          contentType: extension === 'webp' ? 'image/webp' : 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('price-tags')
        .getPublicUrl(fileName);

      const updateField = type === 'price' ? 'image_url' : 'product_image_url';
      const { error: updateError } = await supabase
        .from('products')
        .update({ [updateField]: publicUrl })
        .eq('product_id', productId);

      if (updateError) throw updateError;

      setProducts(prev => prev.map(p => 
        p.product_id === productId ? { ...p, [updateField]: publicUrl } : p
      ));
      
      toast({ title: '이미지가 업로드되었습니다' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: '이미지 업로드 실패', variant: 'destructive' });
    } finally {
      setUploadingImage(null);
    }
  };

  const handleSaveProduct = async (product: Product) => {
    if (!editingFields) return;
    setSavingProduct(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          name: editingFields.name,
          product_id: editingFields.productId,
          category: editingFields.category
        })
        .eq('product_id', product.product_id);

      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.product_id === product.product_id 
          ? { ...p, product_id: editingFields.productId, name: editingFields.name, category: editingFields.category }
          : p
      ));
      
      toast({ title: '상품 정보가 수정되었습니다' });
      setEditingFields(null);
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: '상품 수정 실패', variant: 'destructive' });
    } finally {
      setSavingProduct(false);
    }
  };

  const handleCategoryChange = async (productId: string, newCategory: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ category: newCategory })
        .eq('product_id', productId);

      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.product_id === productId ? { ...p, category: newCategory } : p
      ));
      
      toast({ title: '카테고리가 변경되었습니다' });
    } catch (error) {
      console.error('Category update error:', error);
      toast({ title: '카테고리 변경 실패', variant: 'destructive' });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('정말로 이 상품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }
    
    setDeletingProduct(productId);
    try {
      // Delete related price history first
      await supabase
        .from('price_history')
        .delete()
        .eq('product_id', productId);
      
      // Delete the product
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('product_id', productId);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.product_id !== productId));
      setEditingProduct(null);
      toast({ title: '상품이 삭제되었습니다' });
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: '상품 삭제 실패', variant: 'destructive' });
    } finally {
      setDeletingProduct(null);
    }
  };

  const handleSavePriceInfo = async () => {
    if (!editingPriceInfo) return;
    setSavingPriceInfo(true);
    try {
      const { error } = await supabase
        .from('price_history')
        .update({
          current_price: editingPriceInfo.priceInfo.current_price,
          selling_price: editingPriceInfo.priceInfo.selling_price,
          discount_price: editingPriceInfo.priceInfo.discount_price,
          discount_period: editingPriceInfo.priceInfo.discount_period
        })
        .eq('id', editingPriceInfo.priceInfo.id);

      if (error) throw error;

      setPriceInfoMap(prev => ({
        ...prev,
        [editingPriceInfo.productId]: editingPriceInfo.priceInfo
      }));
      
      toast({ title: '가격 정보가 수정되었습니다' });
      setEditingPriceInfo(null);
    } catch (error) {
      console.error('Price info update error:', error);
      toast({ title: '가격 정보 수정 실패', variant: 'destructive' });
    } finally {
      setSavingPriceInfo(false);
    }
  };

  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.product_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sorting
    if (sortBy === 'no-product-image') {
      filtered = [...filtered].sort((a, b) => {
        const aHas = a.product_image_url ? 1 : 0;
        const bHas = b.product_image_url ? 1 : 0;
        return aHas - bHas; // 없는 것 우선
      });
    } else if (sortBy === 'no-price-tag') {
      filtered = [...filtered].sort((a, b) => {
        const aHas = a.image_url ? 1 : 0;
        const bHas = b.image_url ? 1 : 0;
        return aHas - bHas; // 없는 것 우선
      });
    }
    // 'date' is default (already sorted by created_at desc from DB)

    return filtered;
  }, [products, searchQuery, selectedCategory, sortBy]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy]);

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

  const refreshProducts = async () => {
    const { data: productsData } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    setProducts(productsData || []);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Bulk Uploader Modal */}
      <BulkOcrUploader
        open={showBulkUploader}
        onOpenChange={setShowBulkUploader}
        onComplete={refreshProducts}
        existingProductIds={products.map(p => p.product_id)}
        defaultCategory={bulkCategory}
        defaultStoreId={bulkStoreId}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">상품 관리</h1>
          <button
            onClick={() => setShowBulkUploader(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted transition-colors"
          >
            <FileStack className="h-5 w-5" />
          </button>
        </div>
        
        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="상품명 또는 상품번호 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto hide-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Bulk Upload Settings */}
      <div className="px-4 py-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            총 <span className="font-medium text-foreground">{filteredProducts.length}</span>개 상품
          </p>
          
          {/* Sort Options */}
          <div className="flex gap-1">
            <button
              onClick={() => setSortBy('date')}
              className={cn(
                'px-3 py-1.5 text-xs rounded-full transition-colors',
                sortBy === 'date'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              등록일순
            </button>
            <button
              onClick={() => setSortBy('no-product-image')}
              className={cn(
                'px-3 py-1.5 text-xs rounded-full transition-colors',
                sortBy === 'no-product-image'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              상품이미지 없음
            </button>
            <button
              onClick={() => setSortBy('no-price-tag')}
              className={cn(
                'px-3 py-1.5 text-xs rounded-full transition-colors',
                sortBy === 'no-price-tag'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              가격표 없음
            </button>
          </div>
        </div>
        
        <div className="flex gap-2 items-center">
          <span className="text-xs text-muted-foreground whitespace-nowrap">일괄 등록 설정:</span>
          <Select value={bulkCategory} onValueChange={setBulkCategory}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="카테고리" />
            </SelectTrigger>
            <SelectContent>
              {categories.filter(c => c.id !== 'all').map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={bulkStoreId} onValueChange={setBulkStoreId}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="매장" />
            </SelectTrigger>
            <SelectContent>
              {stores.map(store => (
                <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Product List */}
      <div className="divide-y divide-border">
        {paginatedProducts.map((product) => (
          <div key={product.product_id} className="p-4">
            <div className="flex gap-4">
              {/* Product Image */}
              <div className="relative w-20 h-20 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                {product.product_image_url || product.image_url ? (
                  <img
                    src={product.product_image_url || product.image_url || ''}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Image className="h-6 w-6" />
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">#{product.product_id}</p>
                <h3 className="font-medium text-foreground truncate">{product.name}</h3>
                <Select 
                  value={product.category} 
                  onValueChange={(value) => handleCategoryChange(product.product_id, value)}
                >
                  <SelectTrigger className="h-6 text-xs w-auto max-w-[140px] px-2 py-0 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.id !== 'all').map(cat => (
                      <SelectItem key={cat.id} value={cat.id} className="text-xs">{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Image Status */}
                <div className="flex gap-2 mt-2">
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    product.product_image_url ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                  )}>
                    상품이미지 {product.product_image_url ? '있음' : '없음'}
                  </span>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    product.image_url ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                  )}>
                    가격표 {product.image_url ? '있음' : '없음'}
                  </span>
                </div>
              </div>

              {/* Edit Button */}
              <button
                onClick={() => setEditingProduct(editingProduct === product.product_id ? null : product.product_id)}
                className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center transition-colors',
                  editingProduct === product.product_id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                )}
              >
                {editingProduct === product.product_id ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Pencil className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Edit Panel */}
            {editingProduct === product.product_id && (
              <div className="mt-4 p-4 bg-muted/50 rounded-xl space-y-4">
                {/* Product Info Edit */}
                <div>
                  <h4 className="font-medium text-sm mb-3">상품 정보 수정</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground">상품번호</label>
                      <input
                        type="text"
                        value={editingFields?.productId ?? product.product_id}
                        onChange={(e) => setEditingFields({
                          productId: e.target.value,
                          name: editingFields?.name ?? product.name,
                          category: editingFields?.category ?? product.category
                        })}
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">상품명</label>
                      <input
                        type="text"
                        value={editingFields?.name ?? product.name}
                        onChange={(e) => setEditingFields({
                          productId: editingFields?.productId ?? product.product_id,
                          name: e.target.value,
                          category: editingFields?.category ?? product.category
                        })}
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    {editingFields && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveProduct(product)}
                          disabled={savingProduct}
                          className="flex-1 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                        >
                          {savingProduct ? '저장 중...' : '저장'}
                        </button>
                        <button
                          onClick={() => setEditingFields(null)}
                          className="flex-1 py-2 text-sm font-medium bg-muted text-muted-foreground rounded-lg"
                        >
                          취소
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="font-medium text-sm mb-3">이미지 수정</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Product Image Upload */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <span>📦</span> 상품 이미지
                      </p>
                      <div className="w-40 h-40 bg-muted rounded-lg overflow-hidden relative">
                        {product.product_image_url ? (
                          <img
                            src={product.product_image_url}
                            alt="상품"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Image className="h-8 w-8" />
                          </div>
                        )}
                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleImageUpload(product.product_id, 'product', e.target.files[0])}
                            disabled={!!uploadingImage}
                          />
                          {uploadingImage?.productId === product.product_id && uploadingImage.type === 'product' ? (
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <Upload className="h-6 w-6 text-white" />
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Price Tag Upload with OCR Info */}
                    <div className="flex gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <span>🏷️</span> 가격표 이미지
                        </p>
                        <div className="w-40 h-40 bg-muted rounded-lg overflow-hidden relative">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt="가격표"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Image className="h-8 w-8" />
                            </div>
                          )}
                          <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleImageUpload(product.product_id, 'price', e.target.files[0])}
                              disabled={!!uploadingImage}
                            />
                            {uploadingImage?.productId === product.product_id && uploadingImage.type === 'price' ? (
                              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                              <Upload className="h-6 w-6 text-white" />
                            )}
                          </label>
                        </div>
                      </div>
                      
                      {/* OCR Price Info */}
                      {priceInfoMap[product.product_id] && (
                        <div className="flex-1 bg-background rounded-lg p-3 text-xs space-y-2 border border-border">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-muted-foreground">OCR 인식 정보</p>
                            {editingPriceInfo?.productId !== product.product_id && (
                              <button
                                onClick={() => setEditingPriceInfo({
                                  productId: product.product_id,
                                  priceInfo: { ...priceInfoMap[product.product_id] }
                                })}
                                className="text-primary hover:underline text-xs"
                              >
                                수정
                              </button>
                            )}
                          </div>
                          
                          {editingPriceInfo?.productId === product.product_id ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-muted-foreground text-[10px]">현재가</label>
                                  <input
                                    type="number"
                                    value={editingPriceInfo.priceInfo.current_price}
                                    onChange={(e) => setEditingPriceInfo({
                                      ...editingPriceInfo,
                                      priceInfo: { ...editingPriceInfo.priceInfo, current_price: Number(e.target.value) }
                                    })}
                                    className="w-full px-2 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                                <div>
                                  <label className="text-muted-foreground text-[10px]">판매가</label>
                                  <input
                                    type="number"
                                    value={editingPriceInfo.priceInfo.selling_price}
                                    onChange={(e) => setEditingPriceInfo({
                                      ...editingPriceInfo,
                                      priceInfo: { ...editingPriceInfo.priceInfo, selling_price: Number(e.target.value) }
                                    })}
                                    className="w-full px-2 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                                <div>
                                  <label className="text-muted-foreground text-[10px]">할인가</label>
                                  <input
                                    type="number"
                                    value={editingPriceInfo.priceInfo.discount_price || ''}
                                    onChange={(e) => setEditingPriceInfo({
                                      ...editingPriceInfo,
                                      priceInfo: { ...editingPriceInfo.priceInfo, discount_price: e.target.value ? Number(e.target.value) : null }
                                    })}
                                    placeholder="없음"
                                    className="w-full px-2 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                                <div>
                                  <label className="text-muted-foreground text-[10px]">할인기간</label>
                                  <input
                                    type="text"
                                    value={editingPriceInfo.priceInfo.discount_period || ''}
                                    onChange={(e) => setEditingPriceInfo({
                                      ...editingPriceInfo,
                                      priceInfo: { ...editingPriceInfo.priceInfo, discount_period: e.target.value || null }
                                    })}
                                    placeholder="예: 1/6~1/12"
                                    className="w-full px-2 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSavePriceInfo}
                                  disabled={savingPriceInfo}
                                  className="flex-1 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded disabled:opacity-50"
                                >
                                  {savingPriceInfo ? '저장 중...' : '저장'}
                                </button>
                                <button
                                  onClick={() => setEditingPriceInfo(null)}
                                  className="flex-1 py-1.5 text-xs font-medium bg-muted text-muted-foreground rounded"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              <div>
                                <span className="text-muted-foreground">현재가:</span>
                                <span className="ml-1 font-medium">{priceInfoMap[product.product_id].current_price.toLocaleString()}원</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">판매가:</span>
                                <span className="ml-1 font-medium">{priceInfoMap[product.product_id].selling_price.toLocaleString()}원</span>
                              </div>
                              {priceInfoMap[product.product_id].discount_price && (
                                <>
                                  <div>
                                    <span className="text-muted-foreground">할인가:</span>
                                    <span className="ml-1 font-medium text-destructive">{priceInfoMap[product.product_id].discount_price?.toLocaleString()}원</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">할인율:</span>
                                    <span className="ml-1 font-medium text-destructive">
                                      {Math.round((priceInfoMap[product.product_id].discount_price! / priceInfoMap[product.product_id].selling_price) * 100)}%
                                    </span>
                                  </div>
                                </>
                              )}
                              {priceInfoMap[product.product_id].discount_period && (
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">할인기간:</span>
                                  <span className="ml-1 font-medium">{priceInfoMap[product.product_id].discount_period}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {!priceInfoMap[product.product_id] && (
                        <div className="flex-1 bg-muted/50 rounded-lg p-2 flex items-center justify-center">
                          <p className="text-xs text-muted-foreground">가격 정보 없음</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/product/${product.product_id}`)}
                    className="flex-1 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-xl transition-colors"
                  >
                    상품 상세 페이지 보기
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.product_id)}
                    disabled={deletingProduct === product.product_id}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {deletingProduct === product.product_id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    삭제
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="sticky bottom-0 bg-background border-t border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg bg-muted disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/80 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              이전
            </button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {currentPage} / {totalPages} 페이지
              </span>
              <span className="text-xs text-muted-foreground">
                ({filteredProducts.length}개 중 {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)})
              </span>
            </div>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg bg-muted disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/80 transition-colors"
            >
              다음
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">상품이 없습니다</p>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;