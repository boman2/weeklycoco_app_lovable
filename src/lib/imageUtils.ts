export function getPublicImageUrl(path: string, width?: number, height?: number) {
  if (!path) return "";

  // 이미 절대 URL이면 그대로 반환
  if (path.startsWith("http")) return path;

  const baseUrl = import.meta.env.VITE_SUPABASE_URL;

  // object/public 경로 그대로 사용 (render/image 사용 안 함)
  let url = `${baseUrl}/storage/v1/object/public/${path}`;

  // width/height는 무시 (render 안 쓰므로 의미 없음)
  return url;
}
