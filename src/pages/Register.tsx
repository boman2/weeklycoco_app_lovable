import { useState, useEffect } from 'react';
import { ArrowLeft, Camera, Upload, Hash, Tag, Store, Calendar, DollarSign, Loader2, ImagePlus, AlertCircle, MapPin, Shield, Coins } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { compressPriceTagImage, compressProductImage } from '@/lib/imageCompression';

interface VerificationResult {
  isValidImage: boolean;
  imageValidationMessage?: string;
  isDuplicate: boolean;
  duplicateMessage?: string;
  awardPoints: boolean;
  locationWarning?: string;
  pointsToAward: number;
}

// Categories matching database constraint (Korean names with comma separator)
const orderedCategories = [
  { id: '신선식품,빵', name: 'Fresh Food & Bakery', nameKo: '신선식품/빵', icon: '🥖', group: 'B' as const },
  { id: '냉장,냉동', name: 'Chilled & Frozen', nameKo: '냉장/냉동', icon: '❄️', group: 'B' as const },
  { id: '가공식품', name: 'Processed Food', nameKo: '가공식품', icon: '🥫', group: 'B' as const },
  { id: '음료,주류', name: 'Drinks & Alcohol', nameKo: '음료/주류', icon: '🍷', group: 'B' as const },
  { id: '커피,차', name: 'Coffee & Tea', nameKo: '커피/차', icon: '☕', group: 'B' as const },
  { id: '과자,간식', name: 'Snacks', nameKo: '과자/간식', icon: '🍪', group: 'B' as const },
  { id: '디지털,가전', name: 'Digital & Appliances', nameKo: '디지털/가전', icon: '📱', group: 'A' as const },
  { id: '주방,욕실', name: 'Kitchen & Bath', nameKo: '주방/욕실', icon: '🍳', group: 'A' as const },
  { id: '의류,잡화', name: 'Apparel & Goods', nameKo: '의류/잡화', icon: '👕', group: 'A' as const },
  { id: '생활용품', name: 'Daily Supplies', nameKo: '생활용품', icon: '🧴', group: 'A' as const },
  { id: '건강,미용', name: 'Health & Beauty', nameKo: '건강/미용', icon: '💊', group: 'A' as const },
  { id: '공구,문구', name: 'Tools & Stationery', nameKo: '공구/문구', icon: '🔧', group: 'A' as const },
];

interface DbStore {
  id: string;
  name: string;
  region: string;
}

interface ExistingProduct {
  product_id: string;
  name: string;
  category: string;
  latestPrice?: {
    discount_period: string | null;
    current_price: number;
    recorded_at: string;
  };
}

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Pre-select store from URL params
  const preselectedStoreId = searchParams.get('store');
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [dbStores, setDbStores] = useState<DbStore[]>([]);
  const [existingProduct, setExistingProduct] = useState<ExistingProduct | null>(null);
  const [isCheckingProduct, setIsCheckingProduct] = useState(false);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productImageUrl, setProductImageUrl] = useState<string>('');
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [preferredStoreLoaded, setPreferredStoreLoaded] = useState(false);
  
  const [formData, setFormData] = useState({
    productId: '',
    productName: '',
    category: '',
    storeId: preselectedStoreId || '',
    currentPrice: '',
    originalPrice: '',
    discountPeriod: '',
    image: null as File | null,
    imageUrl: '',
  });

  // Get user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Geolocation error:', error.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);

  // Save selected store as default (no longer using localStorage)
  const handleStoreChange = (storeId: string) => {
    setFormData({ ...formData, storeId });
    setShowStoreSelector(false);
  };

  // Load stores from database
  useEffect(() => {
    const loadStores = async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, region')
        .order('name', { ascending: true });
      
      if (!error && data) {
        // Sort by Korean name (ㄱㄴㄷ순)
        const sortedStores = [...data].sort((a, b) => 
          a.name.localeCompare(b.name, 'ko')
        );
        setDbStores(sortedStores);
      }
    };
    loadStores();
  }, []);

  // Check auth status and load preferred store (only after dbStores are loaded)
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        // Load user's preferred store from profile only after stores are loaded
        if (!preselectedStoreId && !preferredStoreLoaded && dbStores.length > 0) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('preferred_store_id')
            .eq('id', user.id)
            .maybeSingle();
          
          if (profile?.preferred_store_id) {
            setFormData(prev => ({ ...prev, storeId: profile.preferred_store_id }));
          } else {
            // No preferred store set, show store selector
            setShowStoreSelector(true);
          }
          setPreferredStoreLoaded(true);
        }
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, [preselectedStoreId, preferredStoreLoaded, dbStores.length]);

  // Check if product exists when product ID changes
  useEffect(() => {
    const checkExistingProduct = async () => {
      if (formData.productId.length < 5) {
        setExistingProduct(null);
        return;
      }

      setIsCheckingProduct(true);
      try {
        // Check if product exists
        const { data: product } = await supabase
          .from('products')
          .select('product_id, name, category')
          .eq('product_id', formData.productId)
          .maybeSingle();

        if (product) {
          // Get latest price history with discount period
          const { data: priceHistory } = await supabase
            .from('price_history')
            .select('discount_period, current_price, recorded_at')
            .eq('product_id', formData.productId)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          setExistingProduct({
            ...product,
            latestPrice: priceHistory || undefined,
          });

          // Auto-fill product name and category if exists
          if (!formData.productName && product.name) {
            setFormData(prev => ({
              ...prev,
              productName: product.name,
              category: product.category || prev.category,
            }));
          }
        } else {
          setExistingProduct(null);
        }
      } catch (error) {
        console.error('Error checking product:', error);
      } finally {
        setIsCheckingProduct(false);
      }
    };

    const debounce = setTimeout(checkExistingProduct, 500);
    return () => clearTimeout(debounce);
  }, [formData.productId]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  // Sanitize price string to number
  const sanitizePrice = (priceStr: string): number => {
    if (!priceStr) return 0;
    // Remove all non-numeric characters except decimal point
    const cleaned = priceStr.toString().replace(/[^0-9]/g, '');
    return parseInt(cleaned, 10) || 0;
  };

  // Upload image to Supabase Storage
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      // Compress image before upload
      const { blob: compressedBlob, extension } = await compressPriceTagImage(file);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
      const filePath = `uploads/${fileName}`;

      const { data, error } = await supabase.storage
        .from('price-tags')
        .upload(filePath, compressedBlob, {
          contentType: extension === 'webp' ? 'image/webp' : 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('price-tags')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Upload error:', err);
      return null;
    }
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setIsProcessing(true);
      setOcrProgress(0);

      toast({
        title: "이미지 분석 중...",
        description: "Gemini AI가 가격표를 인식하고 있습니다.",
      });

      try {
        // Upload image to storage first
        setOcrProgress(10);
        const imageUrl = await uploadImage(file);
        
        if (imageUrl) {
          setFormData(prev => ({ ...prev, imageUrl }));
        }
        setOcrProgress(30);

        // Convert image to base64 for OCR
        const imageBase64 = await fileToBase64(file);
        setOcrProgress(40);

        // Call the OCR edge function
        const { data, error } = await supabase.functions.invoke('ocr-price-tag', {
          body: { imageBase64 }
        });

        setOcrProgress(80);

        if (error) {
          console.error('OCR Error:', error);
          throw new Error(error.message || 'OCR 처리 실패');
        }

        console.log('OCR Result:', data);
        setOcrProgress(100);

        // Auto-fill form with OCR results
        setFormData((prev) => ({
          ...prev,
          productId: data.productId || prev.productId,
          productName: data.productName || prev.productName,
          currentPrice: data.currentPrice ? String(sanitizePrice(data.currentPrice)) : prev.currentPrice,
          originalPrice: data.originalPrice ? String(sanitizePrice(data.originalPrice)) : prev.originalPrice,
          discountPeriod: data.discountPeriod || prev.discountPeriod,
        }));

        const hasResults = data.productId || data.currentPrice || data.productName;
        if (hasResults) {
          const parts = [];
          if (data.productId) parts.push('상품번호');
          if (data.productName) parts.push('상품명');
          if (data.currentPrice) parts.push('가격');
          
          toast({
            title: "인식 완료!",
            description: `${parts.join(', ')} 정보가 자동으로 입력되었습니다. 확인 후 수정해주세요.`,
          });
        } else {
          toast({
            title: "인식 실패",
            description: "가격표 정보를 찾을 수 없습니다. 직접 입력해주세요.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('OCR Error:', error);
        toast({
          title: "인식 오류",
          description: error instanceof Error ? error.message : "이미지 분석 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
        setOcrProgress(0);
      }
    }
  };

  // Upload product image to storage
  const uploadProductImage = async (file: File, productId: string): Promise<string | null> => {
    try {
      // Compress product image before upload
      const { blob: compressedBlob, extension } = await compressProductImage(file);
      const fileName = `products/${productId}-${Date.now()}.${extension}`;

      const { error } = await supabase.storage
        .from('price-tags')
        .upload(fileName, compressedBlob, {
          contentType: extension === 'webp' ? 'image/webp' : 'image/jpeg',
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        console.error('Product image upload error:', error);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('price-tags')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error('Product image upload error:', err);
      return null;
    }
  };

  // Upsert product and save price history
  const handleSubmit = async () => {
    // Validation
    if (!formData.productId || !formData.currentPrice || !formData.storeId) {
      toast({
        title: "입력 오류",
        description: "상품번호, 가격, 매장을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // Check if new product needs image
    if (!existingProduct && formData.productId.length >= 5 && !productImage) {
      toast({
        title: "이미지 필요",
        description: "새 상품은 상품 이미지가 필요합니다.",
        variant: "destructive",
      });
      return;
    }

    // Check authentication
    if (!userId) {
      toast({
        title: "로그인 필요",
        description: "가격을 등록하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    setIsSaving(true);
    setIsVerifying(true);

    try {
      const productId = formData.productId.trim();
      const currentPrice = sanitizePrice(formData.currentPrice);
      const originalPrice = sanitizePrice(formData.originalPrice);
      const category = formData.category || '가공식품';

      console.log('Saving with data:', {
        productId,
        productName: formData.productName,
        category,
        storeId: formData.storeId,
        currentPrice,
        originalPrice,
        userId,
      });

      // Step 0: Verify registration with anti-fraud logic
      let verification: VerificationResult = {
        isValidImage: true,
        isDuplicate: false,
        awardPoints: true,
        pointsToAward: 5,
      };

      try {
        // Convert image to base64 for verification if available
        let imageBase64 = null;
        if (formData.image) {
          imageBase64 = await fileToBase64(formData.image);
        }

        const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-price-registration', {
          body: {
            imageBase64,
            productId,
            storeId: formData.storeId,
            userLatitude: userLocation?.latitude,
            userLongitude: userLocation?.longitude,
          }
        });

        if (!verifyError && verifyData) {
          verification = verifyData;
          setVerificationResult(verifyData);
          console.log('Verification result:', verifyData);

          // Show location warning if present
          if (verifyData.locationWarning) {
            toast({
              title: "위치 확인",
              description: verifyData.locationWarning,
              variant: "destructive",
            });
          }

          // If image is invalid, block registration
          if (!verifyData.isValidImage) {
            toast({
              title: "이미지 검증 실패",
              description: verifyData.imageValidationMessage || "유효한 코스트코 가격표가 아닙니다.",
              variant: "destructive",
            });
            setIsSaving(false);
            setIsVerifying(false);
            return;
          }

          // Show duplicate warning (but allow registration)
          if (verifyData.isDuplicate) {
            toast({
              title: "중복 등록",
              description: verifyData.duplicateMessage || "24시간 내 이미 등록된 상품입니다. 포인트가 지급되지 않습니다.",
            });
          }
        }
      } catch (verifyErr) {
        console.error('Verification error:', verifyErr);
        // Continue with registration even if verification fails
      }
      setIsVerifying(false);

      // Step 1: Upload product image if new product
      let uploadedProductImageUrl = productImageUrl;
      if (!existingProduct && productImage) {
        const imageUrl = await uploadProductImage(productImage, productId);
        if (imageUrl) {
          uploadedProductImageUrl = imageUrl;
          setProductImageUrl(imageUrl);
        }
      }

      // Step 2: Upsert product (create if not exists)
      const productData: any = {
        product_id: productId,
        name: formData.productName || `상품 ${productId}`,
        category: category,
        image_url: formData.imageUrl || null,
      };

      if (uploadedProductImageUrl) {
        productData.product_image_url = uploadedProductImageUrl;
      }

      const { error: productError } = await supabase
        .from('products')
        .upsert(productData, {
          onConflict: 'product_id',
          ignoreDuplicates: false,
        });

      if (productError) {
        console.error('Product upsert error:', productError);
        throw new Error(`상품 등록 실패: ${productError.message}`);
      }

      console.log('Product upserted successfully');

      // Step 3: Insert price history (using upsert with ON CONFLICT DO NOTHING for duplicate discount_period)
      const { data: priceHistoryData, error: priceError } = await supabase
        .from('price_history')
        .upsert({
          product_id: productId,
          store_id: formData.storeId,
          user_id: userId,
          current_price: currentPrice,
          selling_price: originalPrice || currentPrice,
          discount_price: originalPrice ? originalPrice - currentPrice : null,
          discount_period: formData.discountPeriod || null,
          image_url: formData.imageUrl || null,
        }, {
          onConflict: 'product_id,discount_period',
          ignoreDuplicates: true,
        })
        .select();

      // Check if duplicate discount period (no data returned means ignored due to conflict)
      if (priceError) {
        // Handle unique constraint violation explicitly
        if (priceError.code === '23505' || priceError.message?.includes('duplicate') || priceError.message?.includes('unique')) {
          toast({
            title: "이미 등록된 할인 기간",
            description: "해당 상품의 동일한 할인 기간이 이미 등록되어 있습니다.",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }
        console.error('Price history insert error:', priceError);
        throw new Error(`가격 등록 실패: ${priceError.message}`);
      }

      // If no data returned (ignored duplicate), show friendly message
      if (!priceHistoryData || priceHistoryData.length === 0) {
        toast({
          title: "이미 등록된 할인 기간",
          description: "해당 상품의 동일한 할인 기간이 이미 등록되어 있습니다.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      const insertedPriceHistory = priceHistoryData[0];

      console.log('Price history inserted successfully');

      // Step 4: Update user gamification data and award pending points
      const isBakeryCategory = ['신선식품,빵', '냉장,냉동'].includes(category);
      
      const { data: profile, error: profileFetchError } = await supabase
        .from('user_profiles')
        .select('bakery_purchase_count, unique_stores_visited, points, pending_points, confirmed_points')
        .eq('id', userId)
        .single();

      if (!profileFetchError && profile) {
        const updates: any = {};
        
        // Increment bakery count if applicable
        if (isBakeryCategory) {
          updates.bakery_purchase_count = (profile.bakery_purchase_count || 0) + 1;
          console.log('Incrementing bakery count');
        }

        // Add store to visited stores
        const visitedStores = (profile.unique_stores_visited as string[]) || [];
        if (!visitedStores.includes(formData.storeId)) {
          updates.unique_stores_visited = [...visitedStores, formData.storeId];
          console.log('Adding new store to visited stores');
        }

        if (Object.keys(updates).length > 0) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update(updates)
            .eq('id', userId);

          if (profileError) {
            console.warn('Profile update warning:', profileError);
          }
        }

        // Award pending points using database function if eligible
        if (verification.awardPoints && verification.pointsToAward > 0) {
          console.log(`Awarding ${verification.pointsToAward} pending points`);

          // Use RPC to add pending points (creates transaction and updates profile atomically)
          const { data: transactionId, error: rpcError } = await supabase.rpc('add_pending_points', {
            p_user_id: userId,
            p_amount: verification.pointsToAward,
            p_reason: '가격 등록',
            p_reference_id: insertedPriceHistory?.id || null,
          });

          if (rpcError) {
            console.error('Pending points error:', rpcError);
          } else {
            console.log('Pending points transaction created:', transactionId);

            // If image verification passed, immediately confirm the points
            if (verification.isValidImage) {
              const { error: confirmError } = await supabase.rpc('confirm_pending_points', {
                p_transaction_id: transactionId,
              });

              if (confirmError) {
                console.error('Confirm points error:', confirmError);
              } else {
                console.log('Points confirmed immediately');
              }
            }
          }
        }
      }

      // Show success message with points info
      if (verification.awardPoints && verification.pointsToAward > 0) {
        if (verification.isValidImage) {
          toast({
            title: "등록 완료! 🎉",
            description: `가격 정보가 성공적으로 등록되었습니다. +${verification.pointsToAward} 포인트 확정!`,
          });
        } else {
          toast({
            title: "등록 완료!",
            description: `가격 정보가 등록되었습니다. ${verification.pointsToAward} 포인트가 대기 중입니다.`,
          });
        }
      } else {
        toast({
          title: "등록 완료!",
          description: "가격 정보가 성공적으로 등록되었습니다.",
        });
      }
      
      navigate('/');
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "등록 실패",
        description: error instanceof Error ? error.message : "가격 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">가격 등록</h1>
          <div className="w-10" />
        </div>
        {/* Progress */}
        <div className="flex gap-2 px-4 pb-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                s <= step ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>
      </header>

      <main className="px-4 py-4 pb-24">
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center py-1">
              <h2 className="text-lg font-bold text-foreground">가격표 촬영</h2>
              <p className="text-xs text-muted-foreground">
                코스트코 가격표를 촬영하면 자동으로 정보를 인식합니다
              </p>
            </div>

            <label className="group block cursor-pointer">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageCapture}
                className="hidden"
                disabled={isProcessing}
              />
              <div className="flex aspect-video flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted transition-colors group-hover:border-primary group-hover:bg-accent">
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="font-medium text-foreground">OCR 분석 중... {ocrProgress}%</p>
                    <div className="w-48 h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${ocrProgress}%` }}
                      />
                    </div>
                  </div>
                ) : formData.image ? (
                  <img
                    src={URL.createObjectURL(formData.image)}
                    alt="가격표"
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  <>
                    <Camera className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 font-medium text-foreground">가격표 촬영하기</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      탭하여 카메라를 열거나 이미지를 업로드하세요
                    </p>
                  </>
                )}
              </div>
            </label>

            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm text-muted-foreground">또는</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <button
              onClick={() => setStep(2)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-muted py-4 font-medium text-foreground"
            >
              <Upload className="h-5 w-5" />
              직접 입력하기
            </button>

            {formData.image && (
              <button
                onClick={() => setStep(2)}
                className="btn-primary w-full rounded-xl py-4 font-semibold"
              >
                다음 단계
              </button>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center py-1">
              <h2 className="text-lg font-bold text-foreground">상품 정보</h2>
              <p className="text-xs text-muted-foreground">
                상품 정보를 확인하고 수정해주세요
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Hash className="h-4 w-4" />
                  상품번호
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    placeholder="7자리 상품번호"
                    className="w-full rounded-xl bg-muted px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {isCheckingProduct && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Existing Product Info */}
              {existingProduct && (
                <div className="rounded-xl bg-primary/10 p-4 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                      <AlertCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">기존 등록 상품</p>
                      <p className="text-sm text-muted-foreground">{existingProduct.name}</p>
                      {existingProduct.latestPrice && (
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="text-foreground">
                            최근 가격: <span className="font-bold text-primary">{existingProduct.latestPrice.current_price.toLocaleString()}원</span>
                          </p>
                          {existingProduct.latestPrice.discount_period && (
                            <p className="text-muted-foreground">
                              할인 기간: {existingProduct.latestPrice.discount_period}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            등록일: {new Date(existingProduct.latestPrice.recorded_at).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* New Product Image Upload */}
              {!existingProduct && formData.productId.length >= 5 && !isCheckingProduct && (
                <div className="rounded-xl bg-accent/50 p-4 border border-border">
                  <p className="font-medium text-foreground mb-3">
                    <ImagePlus className="inline h-4 w-4 mr-2" />
                    새 상품입니다! 상품 이미지를 추가해주세요
                  </p>
                  <label className="block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setProductImage(file);
                        }
                      }}
                      className="hidden"
                    />
                    <div className={cn(
                      "flex items-center justify-center rounded-xl border-2 border-dashed p-4 transition-colors",
                      productImage 
                        ? "border-primary bg-primary/5" 
                        : "border-muted-foreground/30 hover:border-primary"
                    )}>
                      {productImage ? (
                        <div className="flex items-center gap-3">
                          <img 
                            src={URL.createObjectURL(productImage)} 
                            alt="상품 이미지" 
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                          <div>
                            <p className="font-medium text-foreground">{productImage.name}</p>
                            <p className="text-sm text-muted-foreground">탭하여 변경</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <ImagePlus className="mx-auto h-8 w-8 text-muted-foreground" />
                          <p className="mt-2 text-sm text-muted-foreground">상품 이미지 업로드</p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              )}

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Tag className="h-4 w-4" />
                  상품명 (용량 포함)
                </label>
                <input
                  type="text"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  placeholder="예: 신라면 120g x 5입"
                  className="w-full rounded-xl bg-muted px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="mt-1 text-xs text-muted-foreground">용량 정보를 함께 입력해주세요 (예: 1.5L, 500g, 12입)</p>
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Store className="h-4 w-4" />
                  구매 매장
                </label>
                {!showStoreSelector && formData.storeId ? (
                  <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3.5">
                    <span className="font-medium text-foreground">
                      {dbStores.find((s) => s.id === formData.storeId)?.name || '선택된 매장'}
                      <span className="ml-2 text-sm text-muted-foreground">
                        ({dbStores.find((s) => s.id === formData.storeId)?.region})
                      </span>
                    </span>
                    <button
                      onClick={() => setShowStoreSelector(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      변경
                    </button>
                  </div>
                ) : (
                  <select
                    value={formData.storeId}
                    onChange={(e) => handleStoreChange(e.target.value)}
                    className="w-full rounded-xl bg-muted px-4 py-3.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">매장 선택</option>
                    {dbStores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name} ({store.region})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="mb-2 text-sm font-medium text-foreground">카테고리</label>
                <div className="flex flex-wrap gap-2">
                  {orderedCategories.slice(0, 6).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setFormData({ ...formData, category: cat.id })}
                      className={cn(
                        'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                        formData.category === cat.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {cat.icon} {cat.nameKo}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {orderedCategories.slice(6).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setFormData({ ...formData, category: cat.id })}
                      className={cn(
                        'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                        formData.category === cat.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {cat.icon} {cat.nameKo}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              className="btn-primary w-full rounded-xl py-3 font-semibold"
            >
              다음 단계
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center py-1">
              <h2 className="text-lg font-bold text-foreground">가격 정보</h2>
              <p className="text-xs text-muted-foreground">
                현재 판매 가격을 입력해주세요
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <DollarSign className="h-4 w-4" />
                  현재 가격 (필수)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.currentPrice}
                    onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                    placeholder="0"
                    className="w-full rounded-xl bg-muted px-4 py-3.5 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    원
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  정상가 (할인 상품인 경우)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                    placeholder="0"
                    className="w-full rounded-xl bg-muted px-4 py-3.5 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    원
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Calendar className="h-4 w-4" />
                  할인 기간 (선택)
                </label>
                <input
                  type="text"
                  value={formData.discountPeriod}
                  onChange={(e) => setFormData({ ...formData, discountPeriod: e.target.value })}
                  placeholder="예: 12/20 - 12/31"
                  className="w-full rounded-xl bg-muted px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-xl bg-card p-4 shadow-card">
              <h3 className="font-semibold text-foreground mb-3">등록 정보 확인</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">상품번호</span>
                  <span className="font-medium">{formData.productId || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">상품명</span>
                  <span className="font-medium">{formData.productName || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">매장</span>
                  <span className="font-medium">
                    {dbStores.find((s) => s.id === formData.storeId)?.name || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">가격</span>
                  <span className="font-bold text-primary">
                    {formData.currentPrice
                      ? `${Number(formData.currentPrice).toLocaleString()}원`
                      : '-'}
                  </span>
                </div>
                {formData.originalPrice && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">정상가</span>
                    <span className="text-muted-foreground line-through">
                      {Number(formData.originalPrice).toLocaleString()}원
                    </span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!formData.productId || !formData.currentPrice || !formData.storeId || isSaving}
              className={cn(
                'w-full rounded-xl py-4 font-semibold transition-all flex items-center justify-center gap-2',
                formData.productId && formData.currentPrice && formData.storeId && !isSaving
                  ? 'btn-primary'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  저장 중...
                </>
              ) : (
                '등록하기'
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Register;
