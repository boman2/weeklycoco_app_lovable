import { useState, useEffect } from 'react';
import { X, ImageIcon, Loader2, Search, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { compressDiscussionImage } from '@/lib/imageCompression';

interface LinkedProduct {
  product_id: string;
  name: string;
  current_price: number;
}

interface InquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkedProduct?: LinkedProduct | null;
}

const InquiryDialog = ({ open, onOpenChange, linkedProduct }: InquiryDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<LinkedProduct | null>(linkedProduct || null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user.id);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (linkedProduct) {
      setSelectedProduct(linkedProduct);
    }
  }, [linkedProduct]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      toast({ title: '로그인이 필요합니다', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast({ title: '제목과 내용을 입력해주세요', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        // Compress image before upload
        const { blob: compressedBlob, extension } = await compressDiscussionImage(imageFile);
        const fileName = `discussions/${currentUser}/${Date.now()}.${extension}`;
        
        const { error: uploadError } = await supabase.storage
          .from('price-tags')
          .upload(fileName, compressedBlob, {
            contentType: extension === 'webp' ? 'image/webp' : 'image/jpeg',
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('price-tags')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const { error } = await supabase.from('discussions').insert({
        user_id: currentUser,
        category: 'general',
        title: title.trim(),
        content: content.trim(),
        image_url: imageUrl,
        linked_product_id: selectedProduct?.product_id || null,
      });

      if (error) throw error;

      toast({ title: '문의가 등록되었습니다' });
      setTitle('');
      setContent('');
      setImageFile(null);
      setImagePreview('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating inquiry:', error);
      toast({ title: '문의 등록에 실패했습니다', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>문의 작성</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Linked Product Display */}
          {selectedProduct && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{selectedProduct.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedProduct.current_price > 0 && `${selectedProduct.current_price.toLocaleString()}원`}
                </p>
              </div>
              <span className="text-xs bg-amber-200 dark:bg-amber-800 px-2 py-0.5 rounded text-amber-800 dark:text-amber-200">
                상품연결
              </span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">제목</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력해주세요"
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">내용</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="문의 내용을 입력해주세요"
              rows={6}
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">이미지 (선택)</label>
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview" className="h-24 w-24 rounded-lg object-cover" />
                <button
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview('');
                  }}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center h-24 w-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </label>
            )}
          </div>

          {/* Submit Button */}
          <Button onClick={handleSubmit} disabled={uploading} className="w-full">
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                등록 중...
              </>
            ) : (
              '등록하기'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InquiryDialog;
