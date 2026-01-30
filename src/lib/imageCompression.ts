import imageCompression from 'browser-image-compression';

interface CompressionOptions {
  maxWidthOrHeight?: number;
  maxSizeMB?: number;
  quality?: number;
  convertToWebP?: boolean;
}

/**
 * 이미지를 압축하고 WebP 포맷으로 변환합니다.
 * @param file - 원본 이미지 파일
 * @param options - 압축 옵션
 * @returns 압축된 이미지 Blob 및 파일 확장자
 */
export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<{ blob: Blob; extension: string }> => {
  const {
    maxWidthOrHeight = 1200,
    maxSizeMB = 1,
    quality = 0.8,
    convertToWebP = true,
  } = options;

  try {
    // browser-image-compression 옵션
    const compressionOptions = {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: true,
      initialQuality: quality,
      // WebP 변환을 위해 output type 지정
      fileType: convertToWebP ? 'image/webp' : undefined,
    };

    const compressedFile = await imageCompression(file, compressionOptions);
    
    // WebP 변환 여부에 따른 확장자
    const extension = convertToWebP ? 'webp' : file.name.split('.').pop() || 'jpg';
    
    console.log(`Image compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB (${extension})`);
    
    return { blob: compressedFile, extension };
  } catch (error) {
    console.error('Image compression failed:', error);
    // 압축 실패 시 원본 반환
    const extension = file.name.split('.').pop() || 'jpg';
    return { blob: file, extension };
  }
};

/**
 * 가격표 이미지 압축 (최대 1200px, 80% 품질, WebP 변환)
 */
export const compressPriceTagImage = async (file: File): Promise<{ blob: Blob; extension: string }> => {
  return compressImage(file, {
    maxWidthOrHeight: 1200,
    maxSizeMB: 1,
    quality: 0.8,
    convertToWebP: true,
  });
};

/**
 * 상품 이미지 압축 (최대 1200px, 80% 품질, WebP 변환)
 */
export const compressProductImage = async (file: File): Promise<{ blob: Blob; extension: string }> => {
  return compressImage(file, {
    maxWidthOrHeight: 1200,
    maxSizeMB: 1.5,
    quality: 0.8,
    convertToWebP: true,
  });
};

/**
 * 아바타 이미지 압축 (최대 400px, 높은 압축률)
 */
export const compressAvatarImage = async (file: File): Promise<{ blob: Blob; extension: string }> => {
  return compressImage(file, {
    maxWidthOrHeight: 400,
    maxSizeMB: 0.3,
    quality: 0.75,
    convertToWebP: true,
  });
};

/**
 * 커뮤니티 게시물 이미지 압축
 */
export const compressDiscussionImage = async (file: File): Promise<{ blob: Blob; extension: string }> => {
  return compressImage(file, {
    maxWidthOrHeight: 1200,
    maxSizeMB: 1,
    quality: 0.8,
    convertToWebP: true,
  });
};
