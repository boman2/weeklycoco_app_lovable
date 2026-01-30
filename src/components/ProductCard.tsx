import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Product, formatPrice, getDiscountPercent } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { isDiscountPeriodActiveKST } from '@/lib/discount';
import { getOptimizedImageUrl, THUMBNAIL_SIZES } from '@/lib/imageUtils';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact' | 'horizontal' | 'mini';
  reviewCount?: number;
}

const ProductCard = ({ product, variant = 'default', reviewCount }: ProductCardProps) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);

  // Check if product has active discount (already calculated in Index.tsx)
  // Use hasDiscount property if available, otherwise fallback to originalPrice check
  const hasActiveDiscount = 'hasDiscount' in product 
    ? (product as any).hasDiscount 
    : (!!product.originalPrice && product.originalPrice > product.currentPrice);

  // Calculate discount using discountPrice if available, otherwise fallback to originalPrice - currentPrice
  const discountAmount = product.discountPrice ?? (product.originalPrice ? product.originalPrice - product.currentPrice : 0);
  const discountPercent = hasActiveDiscount && product.originalPrice
    ? getDiscountPercent(product.originalPrice, discountAmount)
    : 0;

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  if (variant === 'horizontal') {
    return (
      <div
        onClick={() => navigate(`/product/${product.productId}`)}
        className="flex gap-4 p-4 bg-card rounded-xl shadow-card cursor-pointer transition-all hover:shadow-card-lg active:scale-[0.98]"
      >
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
          <img
            src={getOptimizedImageUrl(product.image, THUMBNAIL_SIZES.horizontal)}
            alt={product.nameKo}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          {hasActiveDiscount && (
            <div className="absolute left-0 top-0 rounded-br-lg bg-primary px-2 py-1">
              <span className="text-xs font-bold text-primary-foreground">{discountPercent}%</span>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-between min-w-0 overflow-hidden">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{product.productId}</p>
            <h3 className="font-semibold text-foreground truncate">
              {product.nameKo.length > 12 ? `${product.nameKo.slice(0, 12)}..` : product.nameKo}
              {reviewCount !== undefined && reviewCount > 0 && (
                <span className="text-muted-foreground text-[inherit] font-normal ml-1">({reviewCount})</span>
              )}
            </h3>
          </div>
          <div className="flex items-end justify-between">
            <div>
              {hasActiveDiscount && (
                <p className="price-original">{formatPrice(product.originalPrice!)}</p>
              )}
              <p className="price-tag text-lg">{formatPrice(product.currentPrice)}</p>
            </div>
            <button
              onClick={handleLike}
              className="rounded-full p-2 transition-all hover:scale-110"
            >
              <Heart 
                className={cn(
                  'h-5 w-5 transition-all',
                  isLiked 
                    ? 'text-pink-500 fill-pink-500' 
                    : 'text-pink-400 stroke-[2.5]'
                )} 
              />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        onClick={() => navigate(`/product/${product.productId}`)}
        className="group cursor-pointer"
      >
        <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
          <img
            src={getOptimizedImageUrl(product.image, THUMBNAIL_SIZES.compact)}
            alt={product.nameKo}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
          {hasActiveDiscount && (
            <div className="absolute left-2 top-2 rounded-lg bg-primary px-2 py-1">
              <span className="text-xs font-bold text-primary-foreground">{discountPercent}%</span>
            </div>
          )}
          <button
            onClick={handleLike}
            className="absolute right-1 top-1.5 transition-all hover:scale-110"
          >
            <Heart 
              className={cn(
                'h-5 w-5 transition-all',
                isLiked 
                  ? 'text-pink-500 fill-pink-500' 
                  : 'text-pink-400 stroke-[2.5]'
              )} 
            />
          </button>
        </div>
        <div className="mt-2">
          <h3 className="text-sm font-medium text-foreground truncate">
            {product.nameKo}
            {reviewCount !== undefined && reviewCount > 0 && (
              <span className="text-muted-foreground text-[inherit] ml-1">({reviewCount})</span>
            )}
          </h3>
          <p className="price-tag mt-1">{formatPrice(product.currentPrice)}</p>
        </div>
      </div>
    );
  }

  // Mini variant - smaller thumbnails for PC recent price changes
  if (variant === 'mini') {
    return (
      <div
        onClick={() => navigate(`/product/${product.productId}`)}
        className="group cursor-pointer"
      >
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
          <img
            src={getOptimizedImageUrl(product.image, THUMBNAIL_SIZES.mini)}
            alt={product.nameKo}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
          {hasActiveDiscount && (
            <div className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5">
              <span className="text-[10px] font-bold text-primary-foreground">{discountPercent}%</span>
            </div>
          )}
          <button
            onClick={handleLike}
            className="absolute right-1 top-1.5 transition-all hover:scale-110"
          >
            <Heart 
              className={cn(
                'h-4 w-4 transition-all',
                isLiked 
                  ? 'text-pink-500 fill-pink-500' 
                  : 'text-pink-400 stroke-[2.5]'
              )} 
            />
          </button>
        </div>
        <div className="mt-1.5">
          <h3 className="text-xs font-medium text-foreground truncate">
            {product.nameKo}
            {reviewCount !== undefined && reviewCount > 0 && (
              <span className="text-muted-foreground text-[inherit] ml-0.5">({reviewCount})</span>
            )}
          </h3>
          <p className="price-tag text-sm mt-0.5">{formatPrice(product.currentPrice)}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => navigate(`/product/${product.productId}`)}
      className="group cursor-pointer overflow-hidden rounded-2xl bg-card shadow-card transition-all hover:shadow-card-lg active:scale-[0.98]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={getOptimizedImageUrl(product.image, THUMBNAIL_SIZES.default)}
          alt={product.nameKo}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
        {hasActiveDiscount && (
          <div className="absolute left-3 top-3 rounded-lg bg-primary px-3 py-1.5 shadow-glow">
            <span className="text-sm font-bold text-primary-foreground">{discountPercent}%</span>
          </div>
        )}
        <button
          onClick={handleLike}
          className="absolute right-1.5 top-2 transition-all hover:scale-110"
        >
          <Heart 
            className={cn(
              'h-5 w-5 transition-all',
              isLiked 
                ? 'text-pink-500 fill-pink-500' 
                : 'text-pink-400 stroke-[2.5]'
            )} 
          />
        </button>
        {product.discountPeriod && hasActiveDiscount && (
          <div className="absolute bottom-3 left-3 rounded-lg bg-secondary/90 px-2 py-1 backdrop-blur-sm">
            <span className="text-xs font-medium text-secondary-foreground">{product.discountPeriod}</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs text-muted-foreground">#{product.productId}</p>
        <h3 className="mt-1 font-semibold text-foreground truncate">
          {product.nameKo}
          {reviewCount !== undefined && reviewCount > 0 && (
            <span className="text-muted-foreground text-[inherit] font-normal ml-1">({reviewCount})</span>
          )}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{product.unit}</p>
        <div className="mt-3 flex items-end gap-2">
          {hasActiveDiscount && (
            <p className="price-original">{formatPrice(product.originalPrice!)}</p>
          )}
          <p className="price-tag text-xl">{formatPrice(product.currentPrice)}</p>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
