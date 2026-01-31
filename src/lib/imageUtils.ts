// src/lib/imageUtils.ts

export const THUMBNAIL_SIZES = {
  mini: { width: 120, height: 120 },
  small: { width: 150, height: 150 },
  medium: { width: 300, height: 300 },
  large: { width: 600, height: 600 },
};

type OptimizeOptions = {
  width?: number;
  height?: number;
  quality?: number; // 1~100
  resize?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
};

/**
 * DB에 저장된 image_url 값을 "항상 정상 URL"로 바꿔주는 함수.
 */
export function getPublicImageUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return '/placeholder.svg';

  const raw = String(pathOrUrl).trim();
  if (!raw) return '/placeholder.svg';

  // 이미 전체 URL이면 그대로
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;

  // 사이트 상대경로면 그대로
  if (raw.startsWith('/')) return raw;

  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base) return '/placeholder.svg';

  return `${base}/storage/v1/object/public/${raw}`;
}

/**
 * Supabase image transformation(render) URL 생성
 */
export function getOptimizedImageUrl(
  pathOrUrl: string | null | undefined,
  opts: OptimizeOptions = {}
): string {
  const publicUrl = getPublicImageUrl(pathOrUrl);
  if (!publicUrl) return '/placeholder.svg';
  if (publicUrl === '/placeholder.svg') return publicUrl;

  const renderUrl = publicUrl.includes('/storage/v1/object/public/')
    ? publicUrl.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
    : publicUrl;

  const width = opts.width ?? 300;
  const height = opts.height ?? 300;
  const quality = opts.quality ?? 80;
  const resize = opts.resize ?? 'cover';

  const url = new URL(renderUrl);
  url.searchParams.set('width', String(width));
  url.searchParams.set('height', String(height));
  url.searchParams.set('quality', String(quality));
  url.searchParams.set('resize', resize);

  return url.toString();
}
