// src/lib/imageUtils.ts

type OptimizeOptions = {
  width?: number;
  height?: number;
  quality?: number; // 1~100
  resize?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
};

/**
 * DB에 저장된 image_url 값을 "항상 정상 URL"로 바꿔주는 함수.
 * - "price-tags/..." 같은 object path면 object/public URL로 변환
 * - 이미 http(s)로 시작하면 그대로 사용
 * - "/price-tags/..." 처럼 사이트 경로로 들어오면 그대로 사용
 */
export function getPublicImageUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return '/placeholder.svg';

  const raw = String(pathOrUrl).trim();
  if (!raw) return '/placeholder.svg';

  // 이미 전체 URL이면 그대로
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;

  // 사이트 상대경로면 그대로
  if (raw.startsWith('/')) return raw;

  // "price-tags/..." 같은 storage object 경로면 public object URL로 변환
  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base) return '/placeholder.svg';

  return `${base}/storage/v1/object/public/${raw}`;
}

/**
 * Supabase image transformation(render) URL 생성
 * 주의: render 엔드포인트는 프로젝트 설정/권한에 따라 403이 날 수 있음.
 * 403이 자주 나면 render 대신 object/public URL로 fallback 하도록 구성.
 */
export function getOptimizedImageUrl(
  pathOrUrl: string | null | undefined,
  opts: OptimizeOptions = {}
): string {
  const publicUrl = getPublicImageUrl(pathOrUrl);
  if (!publicUrl) return '/placeholder.svg';

  // placeholder면 그대로
  if (publicUrl === '/placeholder.svg') return publicUrl;

  // render로 바꿀 수 있는 형태만 변환
  // object/public -> render/image/public
  const renderUrl = publicUrl.includes('/storage/v1/object/public/')
    ? publicUrl.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
    : publicUrl;

  const width = opts.width ?? 300;
  const height = opts.height ?? 300;
  const quality = opts.quality ?? 80;
  const resize = opts.resize ?? 'cover';

  // renderUrl이 변환된 케이스에만 파라미터 붙여도 되지만,
  // 그냥 항상 붙여도 무방(서버가 무시/에러 가능성은 낮음)
  const url = new URL(renderUrl);
  url.searchParams.set('width', String(width));
  url.searchParams.set('height', String(height));
  url.searchParams.set('quality', String(quality));
  url.searchParams.set('resize', resize);

  return url.toString();
}
