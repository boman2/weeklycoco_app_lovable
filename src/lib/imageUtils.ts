// src/lib/imageUtils.ts

export type ThumbnailSize = {
  width: number;
  height: number;
};

export const THUMBNAIL_SIZES = {
  MINI: { width: 80, height: 80 },
  SMALL: { width: 150, height: 150 },
  MEDIUM: { width: 200, height: 200 },
  LARGE: { width: 400, height: 400 },
} as const;

interface OptimizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

/**
 * Supabase public object URL 생성
 */
export function getPublicImageUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return '/placeholder.svg';

  // 이미 전체 URL이면 그대로 사용
  if (pathOrUrl.startsWith('http')) return pathOrUrl;

  const baseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!baseUrl) return '/placeholder.svg';

  return `${baseUrl}/storage/v1/object/public/${pathOrUrl}`;
}

/**
 * ⚠️ 현재는 render(image resize) 사용 안 함
 * 이유: render 경로가 403 발생
 * → 그냥 public URL만 반환
 */
export function getOptimizedImageUrl(
  pathOrUrl: string | null | undefined,
  _opts: OptimizeOptions = {}
): string {
  return getPublicImageUrl(pathOrUrl);
}
