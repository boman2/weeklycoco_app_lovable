import { cn } from '@/lib/utils';

interface MedalDisplayProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
}

// Medal tiers based on confirmed points - synced with LevelPopup.tsx
export const getMedalTier = (points: number) => {
  if (points >= 9000) {
    return {
      tier: 'diamond',
      name: '다이아몬드',
      min: 9000,
      max: Infinity,
      emoji: '💎',
      description: '최고 등급의 전설적인 기여자',
      bgColor: 'bg-gradient-to-br from-purple-300 via-violet-400 to-purple-500 dark:from-purple-500 dark:via-violet-500 dark:to-purple-600',
      borderColor: 'border-purple-400 dark:border-purple-500',
      textColor: 'text-purple-700 dark:text-purple-200',
    };
  } else if (points >= 6000) {
    return {
      tier: 'platinum',
      name: '플래티넘',
      min: 6000,
      max: 8999,
      emoji: '👑',
      description: '커뮤니티를 이끄는 핵심 멤버',
      bgColor: 'bg-gradient-to-br from-cyan-200 via-teal-300 to-cyan-400 dark:from-cyan-400 dark:via-teal-400 dark:to-cyan-500',
      borderColor: 'border-cyan-400 dark:border-cyan-500',
      textColor: 'text-cyan-700 dark:text-cyan-200',
    };
  } else if (points >= 3000) {
    return {
      tier: 'gold',
      name: '골드',
      min: 3000,
      max: 5999,
      emoji: '🥇',
      description: '신뢰도 높은 가격 제보자',
      bgColor: 'bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 dark:from-yellow-500 dark:via-amber-500 dark:to-yellow-600',
      borderColor: 'border-yellow-500 dark:border-yellow-600',
      textColor: 'text-yellow-800 dark:text-yellow-100',
    };
  } else if (points >= 1000) {
    return {
      tier: 'silver',
      name: '실버',
      min: 1000,
      max: 2999,
      emoji: '🥈',
      description: '꾸준히 가격을 등록하는 활동가',
      bgColor: 'bg-gradient-to-br from-gray-200 via-gray-300 to-slate-400 dark:from-gray-400 dark:via-gray-500 dark:to-slate-600',
      borderColor: 'border-gray-400 dark:border-gray-500',
      textColor: 'text-gray-700 dark:text-gray-200',
    };
  } else {
    return {
      tier: 'bronze',
      name: '브론즈',
      min: 0,
      max: 999,
      emoji: '🥉',
      description: '가격 등록을 시작한 새내기',
      bgColor: 'bg-gradient-to-br from-orange-300 via-amber-500 to-orange-600 dark:from-orange-500 dark:via-amber-600 dark:to-orange-700',
      borderColor: 'border-orange-500 dark:border-orange-600',
      textColor: 'text-orange-800 dark:text-orange-100',
    };
  }
};

const MedalDisplay = ({ points, size = 'md' }: MedalDisplayProps) => {
  const medal = getMedalTier(points);
  
  const sizeClasses = {
    sm: 'h-10 w-10 text-lg',
    md: 'h-14 w-14 text-2xl',
    lg: 'h-20 w-20 text-3xl',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full border-2 shadow-lg',
          sizeClasses[size],
          medal.bgColor,
          medal.borderColor
        )}
      >
        <span>{medal.emoji}</span>
      </div>
      <div className="text-center">
        <p className={cn('font-semibold text-sm', medal.textColor)}>
          {medal.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {points.toLocaleString()}P
        </p>
      </div>
    </div>
  );
};

export default MedalDisplay;
