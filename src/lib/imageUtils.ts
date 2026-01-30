/**
 * Transforms Supabase Storage image URL to include resize parameters
 * Only applies to Supabase Storage URLs, returns other URLs unchanged
 */
export const getOptimizedImageUrl = (
  url: string | undefined,
  options: { width?: number; height?: number; quality?: number } = {}
): string => {
  if (!url) return '/placeholder.svg';
  
  // Check if it's a Supabase Storage URL
  const supabaseStoragePattern = /supabase\.co\/storage\/v1\/object\/public\//;
  if (!supabaseStoragePattern.test(url)) {
    return url;
  }

  const { width = 400, height, quality = 80 } = options;

  // Convert object URL to render URL for transformations
  const renderUrl = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );

  // Build query parameters
  const params = new URLSearchParams();
  params.set('width', width.toString());
  if (height) {
    params.set('height', height.toString());
  }
  params.set('quality', quality.toString());
  params.set('resize', 'cover');

  // Check if URL already has query params
  const separator = renderUrl.includes('?') ? '&' : '?';
  
  return `${renderUrl}${separator}${params.toString()}`;
};

// Preset sizes for different card variants
export const THUMBNAIL_SIZES = {
  default: { width: 400, height: 300 },
  compact: { width: 300, height: 300 },
  horizontal: { width: 200, height: 200 },
  mini: { width: 150, height: 150 },
} as const;
