// src/lib/storage.ts
import { supabase } from "@/integrations/supabase/client";

/**
 * price_history.image_url 에 저장된 값이
 * - "price-tags/test/a.jpg" 처럼 버킷 포함 경로거나
 * - "test/a.jpg" 처럼 버킷 내부 경로거나
 * - 이미 https://... 로 시작하는 전체 URL일 수도 있음
 *
 * 최종적으로는 "object/public" 방식으로만 반환해서 403(render) 회피
 */
export function getPriceTagPublicUrl(pathOrUrl: string | null | undefined) {
  if (!pathOrUrl) return "/placeholder.svg";

  // 이미 절대 URL이면 그대로 사용
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  // "price-tags/..." 형태면 bucket prefix 제거
  const bucket = "price-tags";
  const path = pathOrUrl.startsWith(`${bucket}/`)
    ? pathOrUrl.slice(bucket.length + 1)
    : pathOrUrl;

  // Supabase SDK로 public URL 생성 (object/public)
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
