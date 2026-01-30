import { useIsMobile } from '@/hooks/use-mobile';
import adBannerHeader from '@/assets/ad-banner-header.jpg';
import adBannerInline from '@/assets/ad-banner-inline.jpg';
import adBannerSidebar from '@/assets/ad-banner-sidebar.jpg';

interface AdBannerProps {
  variant?: 'header' | 'inline' | 'bottom' | 'sidebar';
  className?: string;
}

const AdBanner = ({ variant = 'inline', className = '' }: AdBannerProps) => {
  const isMobile = useIsMobile();

  // PC 헤더 배너 (로고 우측) - 더 넓게
  if (variant === 'header') {
    return (
      <a 
        href="https://www.weeklycoco.kr"
        className={`hidden lg:flex items-center justify-center rounded-xl overflow-hidden relative h-20 flex-1 max-w-[calc(100%-200px)] ml-4 hover:opacity-90 transition-opacity ${className}`}
      >
        <img 
          src={adBannerHeader} 
          alt="광고 배경" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
        <div className="relative z-10 flex items-center gap-3 px-6">
          <div className="text-white text-center">
            <p className="font-bold text-base">코스트코 할인정보는</p>
            <p className="font-extrabold text-xl text-yellow-400">&apos;주간코코&apos;에서!</p>
          </div>
        </div>
        <span className="absolute top-1 right-2 z-10 text-[9px] text-white/60 bg-black/30 px-1.5 py-0.5 rounded">AD</span>
      </a>
    );
  }

  // PC 사이드바 광고 (우측 고정) - 하나의 긴 배너로 통합
  if (variant === 'sidebar') {
    return (
      <div className={`hidden xl:block w-[200px] flex-shrink-0 ${className}`}>
        <div className="sticky top-20">
          {/* 통합 사이드바 배너 */}
          <a 
            href="https://www.weeklycoco.kr"
            className="block relative rounded-xl overflow-hidden h-[600px] hover:opacity-90 transition-opacity"
          >
            <img 
              src={adBannerSidebar} 
              alt="광고 배경" 
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <p className="font-bold text-white text-lg mb-2">코스트코 가기 전</p>
              <p className="font-extrabold text-yellow-400 text-3xl mb-2">&apos;주간코코&apos;</p>
              <p className="font-bold text-white text-lg">에서 확인하자!</p>
            </div>
            <span className="absolute top-2 right-2 text-[9px] text-white/60 bg-black/30 px-1.5 py-0.5 rounded">AD</span>
          </a>
        </div>
      </div>
    );
  }

  // 모바일/PC 공통 인라인 배너 (콘텐츠 사이)
  if (variant === 'inline') {
    return (
      <a 
        href="https://www.weeklycoco.kr"
        className={`block w-full rounded-xl overflow-hidden relative h-28 hover:opacity-90 transition-opacity ${className}`}
      >
        <img 
          src={adBannerInline} 
          alt="광고 배경" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
        <div className="absolute inset-0 flex items-center px-5">
          <div className="text-white">
            <p className="font-bold text-lg md:text-xl">코스트코 할인정보는</p>
            <p className="font-extrabold text-xl md:text-2xl text-yellow-400">&apos;주간코코&apos;에서 확인하자!</p>
          </div>
        </div>
        <span className="absolute top-2 right-2 text-[9px] text-white/60 bg-black/30 px-1.5 py-0.5 rounded">AD</span>
      </a>
    );
  }

  // 하단 고정 배너 (모바일 전용)
  if (variant === 'bottom') {
    if (!isMobile) return null;
    
    return (
      <div 
        className={`fixed bottom-16 left-0 right-0 z-30 px-4 pb-2 ${className}`}
      >
        <a 
          href="https://www.weeklycoco.kr"
          className="block relative w-full rounded-xl overflow-hidden h-16 shadow-lg hover:opacity-90 transition-opacity"
        >
          <img 
            src={adBannerHeader} 
            alt="광고 배경" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/50" />
          <div className="absolute inset-0 flex items-center justify-between px-4">
            <p className="font-bold text-white text-base"><span className="text-yellow-400 font-extrabold">&apos;주간코코&apos;</span>에서 확인하자!</p>
            <span className="text-[8px] text-white/60 bg-black/30 px-1 py-0.5 rounded">AD</span>
          </div>
        </a>
      </div>
    );
  }

  return null;
};

export default AdBanner;

/**
 * Google AdSense 적용 가이드:
 * 
 * 1. PC 화면 (>1024px):
 *    - 헤더 우측에 728x90 또는 responsive 배너 권장 (variant="header")
 *    - 사이드바에 160x600 또는 300x250 배너 권장 (variant="sidebar")
 * 
 * 2. 모바일 화면 (<768px):
 *    - 콘텐츠 사이에 320x100 또는 responsive 배너 권장 (variant="inline")
 *    - 또는 하단 고정 배너로 320x50 사용 (variant="bottom")
 * 
 * 3. AdSense 코드 적용 방법:
 *    - index.html의 <head>에 AdSense 스크립트 추가:
 *      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXX" crossorigin="anonymous"></script>
 *    
 *    - 각 배너 div 내부에 ins 태그 추가:
 *      <ins className="adsbygoogle"
 *           style={{ display: 'block' }}
 *           data-ad-client="ca-pub-XXXXX"
 *           data-ad-slot="XXXXX"
 *           data-ad-format="auto"
 *           data-full-width-responsive="true" />
 * 
 * 4. 반응형 광고 단위:
 *    - data-ad-format="auto" 와 data-full-width-responsive="true" 사용 시
 *      Google이 자동으로 최적 크기 결정
 */
