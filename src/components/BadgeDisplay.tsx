import { Badge as BadgeType } from '@/data/mockData';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface BadgeDisplayProps {
  badge: BadgeType;
  isEarned?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  progress?: { current: number; target: number };
}

// 배지별 상세 획득 조건
const getBadgeRequirementDetails = (badgeId: string): string => {
  const requirements: Record<string, string> = {
    'point-starter': '확정 포인트 50점 이상 획득하면 배지를 받을 수 있어요!',
    'costco-nomad': '서로 다른 코스트코 매장 5곳 이상 방문하면 배지를 받을 수 있어요!',
    'communication-king': '커뮤니티에 글을 100개 이상 작성하면 배지를 받을 수 있어요!',
    'review-master': '상품평을 100개 이상 작성하면 배지를 받을 수 있어요!',
    'recipe-star': '내가 작성한 레시피 글에 좋아요를 100개 이상 받으면 배지를 받을 수 있어요!',
    'price-hunter': '10개 이상의 상품에서 최초로 가격을 등록하면 배지를 받을 수 있어요!',
    'bakery-master': '베이커리 상품을 10개 이상 등록하면 배지를 받을 수 있어요!',
  };
  return requirements[badgeId] || '배지 획득 조건을 확인해보세요!';
};

const BadgeDisplay = ({ 
  badge, 
  isEarned = false, 
  size = 'md',
  showTooltip = true,
  progress
}: BadgeDisplayProps) => {
  const sizeClasses = {
    sm: 'h-12 w-12 text-xl',
    md: 'h-16 w-16 text-2xl md:h-20 md:w-20 md:text-3xl',
    lg: 'h-20 w-20 text-3xl md:h-24 md:w-24 md:text-4xl',
  };

  const badgeContent = (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-muted transition-all relative',
          sizeClasses[size],
          isEarned ? 'badge-earned bg-accent' : 'opacity-40 grayscale'
        )}
      >
        <span>{badge.icon}</span>
        {showTooltip && size !== 'sm' && (
          <div className="absolute -top-1 -right-1 bg-background rounded-full p-0.5 shadow-sm">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="text-center">
        <p className={cn(
          'font-semibold',
          size === 'sm' ? 'text-xs' : 'text-sm',
          !isEarned && 'text-muted-foreground'
        )}>
          {badge.nameKo}
        </p>
        {size !== 'sm' && (
          <p className="text-xs text-muted-foreground mt-0.5">{badge.requirement}</p>
        )}
      </div>
    </div>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className="cursor-help">
            {badgeContent}
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-[250px] p-3 bg-popover border shadow-lg"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{badge.icon}</span>
              <span className="font-semibold text-sm">{badge.nameKo}</span>
              {isEarned && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                  획득완료
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {getBadgeRequirementDetails(badge.id)}
            </p>
            {progress && !isEarned && (
              <div className="pt-1 border-t">
                <p className="text-xs text-primary font-medium">
                  현재 진행률: {progress.current}/{progress.target}
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default BadgeDisplay;
