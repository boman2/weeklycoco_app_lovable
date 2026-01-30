// Store locations - All 20 Korean Costco stores
export interface Store {
  id: string;
  name: string;
  nameKo: string;
  region: string;
  address: string;
  lat: number;
  lng: number;
  isPlanned?: boolean;
}

export const stores: Store[] = [
  { id: 'yangjae', name: 'Yangjae', nameKo: '양재점', region: '서울', address: '서울특별시 서초구 양재대로 159', lat: 37.4677, lng: 127.0378 },
  { id: 'hanam', name: 'Hanam', nameKo: '하남점', region: '경기', address: '경기도 하남시 미사강변중앙로 40', lat: 37.5450, lng: 127.2152 },
  { id: 'gongse', name: 'Gongse', nameKo: '공세점', region: '경기', address: '경기도 용인시 기흥구 탑실로 38', lat: 37.2747, lng: 127.1152 },
  { id: 'sangbong', name: 'Sangbong', nameKo: '상봉점', region: '서울', address: '서울특별시 중랑구 망우로 336', lat: 37.5971, lng: 127.0931 },
  { id: 'gwangmyeong', name: 'Gwangmyeong', nameKo: '광명점', region: '경기', address: '경기도 광명시 일직로 40', lat: 37.4249, lng: 126.8833 },
  { id: 'yangpyeong', name: 'Yangpyeong', nameKo: '양평점', region: '서울', address: '서울특별시 영등포구 선유로 156', lat: 37.5347, lng: 126.8866 },
  { id: 'gocheok', name: 'Gocheok', nameKo: '고척점', region: '서울', address: '서울특별시 구로구 경인로43길 49', lat: 37.5011, lng: 126.8584 },
  { id: 'uijeongbu', name: 'Uijeongbu', nameKo: '의정부점', region: '경기', address: '경기도 의정부시 용민로 489번길 9', lat: 37.7413, lng: 127.0777 },
  { id: 'ilsan', name: 'Ilsan', nameKo: '일산점', region: '경기', address: '경기도 고양시 일산동구 장백로 25', lat: 37.6747, lng: 126.7590 },
  { id: 'pyeongtaek', name: 'Pyeongtaek', nameKo: '평택점', region: '경기', address: '경기도 평택시 경기대로 975', lat: 37.0893, lng: 127.0655 },
  { id: 'songdo', name: 'Songdo', nameKo: '송도점', region: '인천', address: '인천 연수구 컨벤시아대로230번길 60', lat: 37.3919, lng: 126.6403 },
  { id: 'cheongna', name: 'Cheongna', nameKo: '청라점', region: '인천', address: '인천 서구 첨단서로 188', lat: 37.5351, lng: 126.6458 },
  { id: 'cheonan', name: 'Cheonan', nameKo: '천안점', region: '충남', address: '충청남도 천안시 서북구 3공단 6로 77', lat: 36.8151, lng: 127.1139 },
  { id: 'sejong', name: 'Sejong', nameKo: '세종점', region: '세종', address: '세종특별자치시 종합운동장 1로 14', lat: 36.4800, lng: 127.2890 },
  { id: 'daejeon', name: 'Daejeon', nameKo: '대전점', region: '대전', address: '대전광역시 중구 오류로 41', lat: 36.3631, lng: 127.3468 },
  { id: 'daegu', name: 'Daegu', nameKo: '대구점', region: '대구', address: '대구광역시 북구 검단로 97', lat: 35.8886, lng: 128.5923 },
  { id: 'daegu-inno', name: 'Daegu Innovation', nameKo: '대구 혁신도시점', region: '대구', address: '대구광역시 동구 첨단로 10', lat: 35.8714, lng: 128.7023 },
  { id: 'ulsan', name: 'Ulsan', nameKo: '울산점', region: '울산', address: '울산광역시 북구 진장유통로 78-12', lat: 35.5384, lng: 129.3391 },
  { id: 'gimhae', name: 'Gimhae', nameKo: '김해점', region: '경남', address: '경상남도 김해시 주촌면 선천남로 16', lat: 35.2285, lng: 128.8890 },
  { id: 'busan', name: 'Busan', nameKo: '부산점', region: '부산', address: '부산광역시 수영구 구락로 137', lat: 35.1538, lng: 129.1133 },
];

// Product categories
export interface Category {
  id: string;
  name: string;
  nameKo: string;
  icon: string;
  group: 'A' | 'B';
}

export const categories: Category[] = [
  { id: '신선식품,빵', name: 'Fresh Food & Bakery', nameKo: '신선식품/빵', icon: '🥖', group: 'B' },
  { id: '냉장,냉동', name: 'Chilled & Frozen', nameKo: '냉장/냉동', icon: '❄️', group: 'B' },
  { id: '가공식품', name: 'Processed Food', nameKo: '가공식품', icon: '🥫', group: 'B' },
  { id: '음료,주류', name: 'Drinks & Alcohol', nameKo: '음료/주류', icon: '🍷', group: 'B' },
  { id: '커피,차', name: 'Coffee & Tea', nameKo: '커피/차', icon: '☕', group: 'B' },
  { id: '과자,간식', name: 'Snacks', nameKo: '과자/간식', icon: '🍪', group: 'B' },
  { id: '디지털,가전', name: 'Digital & Appliances', nameKo: '디지털/가전', icon: '📱', group: 'A' },
  { id: '주방,욕실', name: 'Kitchen & Bath', nameKo: '주방/욕실', icon: '🍳', group: 'A' },
  { id: '의류,잡화', name: 'Apparel & Goods', nameKo: '의류/잡화', icon: '👕', group: 'A' },
  { id: '생활용품', name: 'Daily Supplies', nameKo: '생활용품', icon: '🧴', group: 'A' },
  { id: '건강,미용', name: 'Health & Beauty', nameKo: '건강/미용', icon: '💊', group: 'A' },
  { id: '공구,문구', name: 'Tools & Stationery', nameKo: '공구/문구', icon: '🔧', group: 'A' },
];

// Products
export interface Product {
  id: string;
  productId: string;
  name: string;
  nameKo: string;
  category: string;
  image: string;
  currentPrice: number;
  originalPrice?: number;
  discountPrice?: number; // 할인 금액 (discount_price from DB)
  discountPeriod?: string;
  unit: string;
  isBakery?: boolean;
}

export const products: Product[] = [
  {
    id: '1',
    productId: '1234567',
    name: 'Kirkland Signature Croissant',
    nameKo: '커클랜드 크루아상 12개입',
    category: 'fresh',
    image: '/placeholder.svg',
    currentPrice: 9990,
    originalPrice: 12990,
    discountPeriod: '12/20 - 12/31',
    unit: '12개',
    isBakery: true,
  },
  {
    id: '2',
    productId: '2345678',
    name: 'Australian Beef Ribeye',
    nameKo: '호주산 소 등심 스테이크용',
    category: 'chilled',
    image: '/placeholder.svg',
    currentPrice: 45900,
    originalPrice: 52900,
    discountPeriod: '12/18 - 12/25',
    unit: '1kg',
  },
  {
    id: '3',
    productId: '3456789',
    name: 'LG UltraGear Monitor 27"',
    nameKo: 'LG 울트라기어 27인치 모니터',
    category: 'digital',
    image: '/placeholder.svg',
    currentPrice: 289000,
    unit: '1개',
  },
  {
    id: '4',
    productId: '4567890',
    name: 'Dyson V15 Detect',
    nameKo: '다이슨 V15 디텍트 무선청소기',
    category: 'digital',
    image: '/placeholder.svg',
    currentPrice: 899000,
    originalPrice: 999000,
    discountPeriod: '12/15 - 12/31',
    unit: '1개',
  },
  {
    id: '5',
    productId: '5678901',
    name: 'Tirtir Cushion Foundation',
    nameKo: '티르티르 마스크핏 쿠션',
    category: 'health',
    image: '/placeholder.svg',
    currentPrice: 24900,
    unit: '1개',
  },
  {
    id: '6',
    productId: '6789012',
    name: 'Kirkland Colombian Coffee',
    nameKo: '커클랜드 콜롬비안 원두커피',
    category: 'coffee',
    image: '/placeholder.svg',
    currentPrice: 18990,
    unit: '1.36kg',
  },
  {
    id: '7',
    productId: '7890123',
    name: 'Organic Blueberries',
    nameKo: '유기농 블루베리',
    category: 'fresh',
    image: '/placeholder.svg',
    currentPrice: 14990,
    originalPrice: 17990,
    discountPeriod: '12/20 - 12/26',
    unit: '510g',
  },
  {
    id: '8',
    productId: '8901234',
    name: 'Choco Cream Cake',
    nameKo: '초코 생크림 케이크',
    category: 'fresh',
    image: '/placeholder.svg',
    currentPrice: 16990,
    unit: '1개',
    isBakery: true,
  },
];

// Price history data
export interface PriceHistory {
  productId: string;
  storeId: string;
  date: string;
  price: number;
}

export const priceHistory: PriceHistory[] = [
  // Croissant at Yangpyeong
  { productId: '1234567', storeId: 'yangpyeong', date: '2024-11-01', price: 12990 },
  { productId: '1234567', storeId: 'yangpyeong', date: '2024-11-15', price: 12990 },
  { productId: '1234567', storeId: 'yangpyeong', date: '2024-12-01', price: 11990 },
  { productId: '1234567', storeId: 'yangpyeong', date: '2024-12-15', price: 9990 },
  { productId: '1234567', storeId: 'yangpyeong', date: '2024-12-20', price: 9990 },
  // Croissant at Yangjae
  { productId: '1234567', storeId: 'yangjae', date: '2024-11-01', price: 12990 },
  { productId: '1234567', storeId: 'yangjae', date: '2024-11-15', price: 12990 },
  { productId: '1234567', storeId: 'yangjae', date: '2024-12-01', price: 12990 },
  { productId: '1234567', storeId: 'yangjae', date: '2024-12-15', price: 10990 },
  { productId: '1234567', storeId: 'yangjae', date: '2024-12-20', price: 10990 },
];

// User badges
export interface Badge {
  id: string;
  name: string;
  nameKo: string;
  description: string;
  icon: string;
  requirement: string;
}

export const badges: Badge[] = [
  {
    id: 'bakery-master',
    name: 'Bakery Master',
    nameKo: '베이커리 마스터',
    description: 'Registered 10+ bakery items',
    icon: '🍞',
    requirement: '베이커리 상품 10개 이상 등록',
  },
  {
    id: 'costco-nomad',
    name: 'Costco Nomad',
    nameKo: '코스트코 노마드',
    description: 'Visited 5+ different stores',
    icon: '🧭',
    requirement: '5개 이상 매장 방문 인증',
  },
  {
    id: 'price-hunter',
    name: 'Price Hunter',
    nameKo: '가격 사냥꾼',
    description: 'First to report 5 price drops',
    icon: '🏹',
    requirement: '최저가 5회 최초 제보',
  },
  {
    id: 'recipe-star',
    name: 'Recipe Star',
    nameKo: '레시피 스타',
    description: 'Recipes got 100+ likes',
    icon: '👨‍🍳',
    requirement: '레시피 좋아요 100개 달성',
  },
  {
    id: 'communication-king',
    name: 'Communication King',
    nameKo: '소통왕',
    description: 'Posted 100+ comments on community',
    icon: '💬',
    requirement: '커뮤니티 댓글 100개 이상 달성',
  },
  {
    id: 'review-master',
    name: 'Review Master',
    nameKo: '리뷰 달인',
    description: 'Written 200+ product reviews',
    icon: '📝',
    requirement: '상품평 200개 이상 달성',
  },
];

// Mock user
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  earnedBadges: string[];
  likedProducts: string[];
  visitedStores: string[];
  bakeryRegistrations: number;
}

export const mockUser: User = {
  id: 'user1',
  name: '코스트코 러버',
  email: 'costco@example.com',
  earnedBadges: ['bakery-master'],
  likedProducts: ['1234567', '2345678', '6789012'],
  visitedStores: ['yangpyeong', 'yangjae', 'sangbong', 'gwangmyeong', 'ilsan'],
  bakeryRegistrations: 15,
};

// Community posts
export interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  productId: string;
  storeId: string;
  title: string;
  content: string;
  image?: string;
  likes: number;
  createdAt: string;
}

export const communityPosts: CommunityPost[] = [
  {
    id: 'post1',
    userId: 'user1',
    userName: '코스트코 러버',
    productId: '1234567',
    storeId: 'yangpyeong',
    title: '크루아상 에어프라이어 활용법',
    content: '180도에서 3분만 돌리면 갓 구운 것처럼 바삭해져요!',
    likes: 42,
    createdAt: '2024-12-19',
  },
  {
    id: 'post2',
    userId: 'user2',
    userName: '맛집탐험가',
    productId: '2345678',
    storeId: 'yangjae',
    title: '등심 스테이크 완벽 굽기',
    content: '미디엄레어로 굽는 팁 공유합니다. 실온에 30분 두세요.',
    likes: 89,
    createdAt: '2024-12-18',
  },
];

// Utility function for formatting currency
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('ko-KR').format(price) + '원';
};

// Utility function for calculating discount percentage
// Formula: (할인가 / 판매가) * 100 = (discountAmount / sellingPrice) * 100
export const getDiscountPercent = (sellingPrice: number, discountAmount: number): number => {
  if (sellingPrice <= 0) return 0;
  return Math.round((discountAmount / sellingPrice) * 100);
};
