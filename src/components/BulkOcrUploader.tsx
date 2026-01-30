import { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2, Play, Pause, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { compressPriceTagImage } from '@/lib/imageCompression';

interface OcrResult {
  productId: string | null;
  productName: string | null;
  currentPrice: string | null;
  originalPrice: string | null;
  discountPeriod: string | null;
}

interface FileItem {
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'success' | 'error' | 'skipped';
  result?: OcrResult;
  error?: string;
}

interface BulkOcrUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  existingProductIds: string[];
  defaultCategory: string;
  defaultStoreId: string;
}

const BulkOcrUploader = ({ 
  open, 
  onOpenChange, 
  onComplete,
  existingProductIds,
  defaultCategory,
  defaultStoreId
}: BulkOcrUploaderProps) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const pauseRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles: FileItem[] = selectedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending'
    }));
    setFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const clearAll = () => {
    files.forEach(f => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setCurrentIndex(0);
    setIsProcessing(false);
    setIsPaused(false);
  };

  const processFile = async (fileItem: FileItem, index: number): Promise<FileItem> => {
    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileItem.file);
      });

      // Call OCR function
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('ocr-price-tag', {
        body: { imageBase64: base64 }
      });

      if (ocrError) throw ocrError;
      if (ocrData.error) throw new Error(ocrData.error);

      const result = ocrData as OcrResult;

      if (!result.productId || !result.productName) {
        return {
          ...fileItem,
          status: 'error',
          result,
          error: 'OCR 인식 실패: 상품ID 또는 상품명을 찾을 수 없습니다'
        };
      }

      // Check if product already exists
      const isExistingProduct = existingProductIds.includes(result.productId);

      // Get user for price history
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !defaultStoreId) {
        throw new Error('로그인 및 매장 선택이 필요합니다');
      }

      // Check for duplicate price registration (same store, same price within 24 hours)
      const currentPrice = result.currentPrice ? parseInt(result.currentPrice) : 0;
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: recentPrices } = await supabase
        .from('price_history')
        .select('current_price, recorded_at')
        .eq('product_id', result.productId)
        .eq('store_id', defaultStoreId)
        .gte('recorded_at', twentyFourHoursAgo)
        .order('recorded_at', { ascending: false })
        .limit(1);

      if (recentPrices && recentPrices.length > 0) {
        const lastPrice = recentPrices[0].current_price;
        if (Number(lastPrice) === currentPrice) {
          return {
            ...fileItem,
            status: 'skipped',
            result,
            error: '24시간 내 동일 가격이 이미 등록됨'
          };
        }
      }

      // Compress and upload image to storage (always needed for price history)
      const { blob: compressedBlob, extension } = await compressPriceTagImage(fileItem.file);
      const fileName = `${result.productId}/price-${Date.now()}.${extension}`;
      
      const { error: uploadError } = await supabase.storage
        .from('price-tags')
        .upload(fileName, compressedBlob, {
          contentType: extension === 'webp' ? 'image/webp' : 'image/jpeg',
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('price-tags')
        .getPublicUrl(fileName);

      // If new product, insert into products table
      if (!isExistingProduct) {
        const { error: insertError } = await supabase
          .from('products')
          .insert({
            product_id: result.productId,
            name: result.productName,
            category: defaultCategory,
            image_url: publicUrl
          });

        if (insertError && insertError.code !== '23505') {
          throw insertError;
        }
      }

      // Always record price history (for both new and existing products)
      const originalPrice = result.originalPrice ? parseInt(result.originalPrice) : currentPrice;
      const discountPrice = originalPrice > currentPrice ? originalPrice - currentPrice : null;

      await supabase.from('price_history').insert({
        product_id: result.productId,
        store_id: defaultStoreId,
        user_id: user.id,
        selling_price: originalPrice,
        current_price: currentPrice,
        discount_price: discountPrice,
        discount_period: result.discountPeriod,
        image_url: publicUrl
      });

      return {
        ...fileItem,
        status: 'success',
        result,
        error: isExistingProduct ? '기존 상품 - 가격 히스토리 추가됨' : undefined
      };
    } catch (error) {
      console.error('Processing error:', error);
      return {
        ...fileItem,
        status: 'error',
        error: error instanceof Error ? error.message : '처리 중 오류 발생'
      };
    }
  };

  const startProcessing = async () => {
    setIsProcessing(true);
    setIsPaused(false);
    pauseRef.current = false;

    for (let i = currentIndex; i < files.length; i++) {
      if (pauseRef.current) {
        setCurrentIndex(i);
        setIsProcessing(false);
        return;
      }

      if (files[i].status !== 'pending') continue;

      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'processing' } : f
      ));

      const processedFile = await processFile(files[i], i);
      
      setFiles(prev => prev.map((f, idx) => 
        idx === i ? processedFile : f
      ));

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsProcessing(false);
    setCurrentIndex(0);
    toast({ title: '일괄 처리가 완료되었습니다' });
    onComplete();
  };

  const pauseProcessing = () => {
    pauseRef.current = true;
    setIsPaused(true);
  };

  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const skippedCount = files.filter(f => f.status === 'skipped').length;
  const pendingCount = files.filter(f => f.status === 'pending').length;
  const processingCount = files.filter(f => f.status === 'processing').length;
  const progress = files.length > 0 ? ((files.length - pendingCount - processingCount) / files.length) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>일괄 OCR 처리</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* File Input */}
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesSelect}
              className="hidden"
              id="bulk-file-input"
            />
            <label 
              htmlFor="bulk-file-input"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                이미지 파일들을 선택하거나 드래그하세요
              </p>
              <p className="text-xs text-muted-foreground">
                (가격표 이미지)
              </p>
            </label>
          </div>

          {/* Stats */}
          {files.length > 0 && (
            <div className="flex gap-4 text-sm">
              <span className="text-muted-foreground">총 {files.length}개</span>
              <span className="text-green-600">성공: {successCount}</span>
              <span className="text-red-600">실패: {errorCount}</span>
              <span className="text-yellow-600">건너뜀: {skippedCount}</span>
              <span className="text-muted-foreground">대기: {pendingCount}</span>
            </div>
          )}

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                처리 중... {Math.round(progress)}%
              </p>
            </div>
          )}

          {/* File List */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[40vh] overflow-auto">
            {files.map((fileItem, index) => (
              <div 
                key={index} 
                className={cn(
                  "relative aspect-square rounded-lg overflow-hidden border-2",
                  fileItem.status === 'success' && "border-green-500",
                  fileItem.status === 'error' && "border-red-500",
                  fileItem.status === 'skipped' && "border-yellow-500",
                  fileItem.status === 'processing' && "border-primary",
                  fileItem.status === 'pending' && "border-border"
                )}
              >
                <img 
                  src={fileItem.preview} 
                  alt={`Preview ${index}`}
                  className="w-full h-full object-cover"
                />
                
                {/* Status Overlay */}
                <div className={cn(
                  "absolute inset-0 flex flex-col items-center justify-center bg-black/60",
                  fileItem.status === 'pending' && "bg-transparent"
                )}>
                  {fileItem.status === 'processing' && (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  )}
                  {fileItem.status === 'success' && (
                    <>
                      <CheckCircle className="h-6 w-6 text-green-400" />
                      <p className="text-[10px] text-white mt-1 px-1 text-center truncate w-full">
                        {fileItem.result?.productId}
                      </p>
                    </>
                  )}
                  {fileItem.status === 'error' && (
                    <>
                      <AlertCircle className="h-6 w-6 text-red-400" />
                      <p className="text-[10px] text-white mt-1 px-1 text-center">
                        실패
                      </p>
                    </>
                  )}
                  {fileItem.status === 'skipped' && (
                    <>
                      <AlertCircle className="h-6 w-6 text-yellow-400" />
                      <p className="text-[10px] text-white mt-1 px-1 text-center">
                        건너뜀
                      </p>
                    </>
                  )}
                </div>

                {/* Remove Button (only for pending) */}
                {fileItem.status === 'pending' && !isProcessing && (
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Error Details */}
          {(errorCount > 0 || skippedCount > 0) && !isProcessing && (
            <div className="text-xs space-y-1 max-h-24 overflow-auto bg-muted p-3 rounded-lg">
              {files.filter(f => f.status === 'error' || f.status === 'skipped').map((f, i) => (
                <p key={i} className={cn(
                  f.status === 'error' ? "text-red-600" : "text-yellow-600"
                )}>
                  {f.file.name}: {f.error}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-border">
          {files.length > 0 && !isProcessing && (
            <button
              onClick={clearAll}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg"
            >
              전체 삭제
            </button>
          )}
          <div className="flex-1" />
          {isProcessing ? (
            <button
              onClick={pauseProcessing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-yellow-500 text-white rounded-lg"
            >
              <Pause className="h-4 w-4" />
              일시정지
            </button>
          ) : (
            <button
              onClick={startProcessing}
              disabled={pendingCount === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {isPaused ? '재개' : '처리 시작'} ({pendingCount}개)
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkOcrUploader;
