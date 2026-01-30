import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article';
  product?: {
    name: string;
    price: number;
    currency?: string;
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
    category?: string;
    sku?: string;
    image?: string;
  };
}

const BASE_URL = 'https://weeklycoco.kr';
const DEFAULT_IMAGE = 'https://lovable.dev/opengraph-image-p98pqg.png';
const SITE_NAME = '주간코코';

const SEOHead = ({
  title,
  description = '주간코코 | 코스트코 실시간 가격 정보 & 할인 소식',
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  product,
}: SEOHeadProps) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | 코스트코 실시간 가격 정보 & 할인 소식`;
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : BASE_URL);

  // JSON-LD 구조화 데이터
  const jsonLd = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: description,
        image: product.image || image,
        sku: product.sku,
        category: product.category,
        offers: {
          '@type': 'Offer',
          price: product.price,
          priceCurrency: product.currency || 'KRW',
          availability: `https://schema.org/${product.availability || 'InStock'}`,
          url: currentUrl,
        },
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        description: description,
        url: BASE_URL,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${BASE_URL}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      };

  return (
    <Helmet>
      {/* 기본 메타 태그 */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={currentUrl} />

      {/* Open Graph 태그 */}
      <meta property="og:type" content={type === 'product' ? 'product' : 'website'} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="ko_KR" />

      {/* Twitter 카드 */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* 상품 전용 메타 태그 */}
      {product && (
        <>
          <meta property="product:price:amount" content={String(product.price)} />
          <meta property="product:price:currency" content={product.currency || 'KRW'} />
          <meta property="product:availability" content={product.availability || 'in stock'} />
          {product.category && <meta property="product:category" content={product.category} />}
        </>
      )}

      {/* JSON-LD 구조화 데이터 */}
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
};

export default SEOHead;
