// src/lib/storage.ts

const normalizePath = (p: string) => {
  let path = (p || "").trim();

  // 이미 전체 URL이면 그대로
  if (/^https?:\/\//i.test(path)) return path;

  // 앞의 슬래시 제거
  path = path.replace(/^\/+/, "");

  // 혹시 "storage/v1/object/public/price-tags/..." 같은 걸 넣어도 처리
  path = path.replace(/^storage\/v1\/object\/public\/price-tags\//i, "");

  // DB에 "price-tags/..."로 들어간 경우도 처리
  path = path.replace(/^price-tags\//i, "");

  return path;
};

export const getPriceTagPublicUrl = (imageUrl?: string | null) => {
  if (!imageUrl) return "";

  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base || !/^https?:\/\//i.test(base)) return "";

  const path = normalizePath(imageUrl);
  if (!path) return "";

  // DB에 "test/manual-test.jpg" 형태로 들어와도 OK
  return `${base}/storage/v1/object/public/price-tags/${path}`;
};
