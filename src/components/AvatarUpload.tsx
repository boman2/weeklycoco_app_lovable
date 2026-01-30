import { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { compressAvatarImage } from '@/lib/imageCompression';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  onAvatarUpdated: (url: string) => void;
  levelEmoji?: string;
  levelColor?: string;
}

const AvatarUpload = ({ userId, currentAvatarUrl, onAvatarUpdated, levelEmoji, levelColor }: AvatarUploadProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: '이미지 파일만 업로드 가능합니다', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      // Compress and resize the image using unified utility
      const { blob: compressedBlob, extension } = await compressAvatarImage(file);
      
      // Upload to storage
      const fileName = `${userId}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressedBlob, {
          contentType: extension === 'webp' ? 'image/webp' : 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update user profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      onAvatarUpdated(publicUrl);
      toast({ title: '프로필 이미지가 업데이트되었습니다' });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({ title: '이미지 업로드에 실패했습니다', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground/20 overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl">🛒</span>
        )}
      </div>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-muted/60 shadow-md backdrop-blur-sm"
      >
        {uploading ? (
          <Loader2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 animate-spin" />
        ) : levelEmoji ? (
          <span className="text-base sm:text-lg">{levelEmoji}</span>
        ) : (
          <Camera className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
};

export default AvatarUpload;
