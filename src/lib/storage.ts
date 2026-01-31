// src/lib/storage.ts
import { supabase } from '@/integrations/supabase/client';

const PRICE_TAG_BUCKET = 'price-tags';

// ✅ named export (Index.tsx가 이걸 import함)
export function getPriceTagPublicUrl(path?: string | null): string {
  if (!path) return '/placeholder.svg';

  // 이미 절대 URL이면 그대로
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  // data/blob도 그대로
  if (path.startsWith('data:') || path.startsWith('blob:')) return path;

  // 혹시 "/price-tags/..." 같은 형태로 들어오면 앞의 "/" 제거
  const clean = path.replace(/^\/+/, '');

  // "price-tags/xxx" 로 저장된 경우 bucket prefix 제거
  const objectPath = clean.startsWith(`${PRICE_TAG_BUCKET}/`)
    ? clean.substring(`${PRICE_TAG_BUCKET}/`.length)
    : clean;

  const { data } = supabase.storage.from(PRICE_TAG_BUCKET).getPublicUrl(objectPath);

  return data?.publicUrl || '/placeholder.svg';
}
