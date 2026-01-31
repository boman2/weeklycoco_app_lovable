export function toPublicPriceTagUrl(imageUrl: string, supabaseUrl: string) {
  if (!imageUrl) return "";

  // 이미 완전한 URL이면 그대로
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  // DB 값이 "price-tags/..." 형태면 버킷 prefix 제거
  const normalized = imageUrl.startsWith("price-tags/")
    ? imageUrl.replace(/^price-tags\//, "")
    : imageUrl;

  // 최종: Supabase Storage public URL로 조립
  // 예: https://skc...supabase.co/storage/v1/object/public/price-tags/<path>
  return `${supabaseUrl}/storage/v1/object/public/price-tags/${normalized}`;
}
