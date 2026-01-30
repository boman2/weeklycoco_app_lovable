import { useState } from 'react';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface LevelPopupProps {
  points: number;
}

const LEVELS = [
  { id: 'bronze', name: '브론즈', minPoints: 0, maxPoints: 999, color: 'bg-amber-600', textColor: 'text-amber-600', emoji: '🥉', description: '가격 등록을 시작한 새내기' },
  { id: 'silver', name: '실버', minPoints: 1000, maxPoints: 2999, color: 'bg-slate-400', textColor: 'text-slate-500', emoji: '🥈', description: '꾸준히 가격을 등록하는 활동가' },
  { id: 'gold', name: '골드', minPoints: 3000, maxPoints: 5999, color: 'bg-yellow-500', textColor: 'text-yellow-600', emoji: '🥇', description: '신뢰도 높은 가격 제보자' },
  { id: 'platinum', name: '플래티넘', minPoints: 6000, maxPoints: 8999, color: 'bg-cyan-400', textColor: 'text-cyan-500', emoji: '👑', description: '커뮤니티를 이끄는 핵심 멤버' },
  { id: 'diamond', name: '다이아몬드', minPoints: 9000, maxPoints: 999999, color: 'bg-purple-500', textColor: 'text-purple-600', emoji: '💎', description: '최고 등급의 전설적인 기여자' },
];

export const getCurrentLevel = (points: number) => {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
};

export const getNextLevel = (points: number) => {
  const currentLevel = getCurrentLevel(points);
  const currentIndex = LEVELS.findIndex(l => l.id === currentLevel.id);
  return currentIndex < LEVELS.length - 1 ? LEVELS[currentIndex + 1] : null;
};

const LevelPopup = ({ points }: LevelPopupProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentLevel = getCurrentLevel(points);
  const nextLevel = getNextLevel(points);
  const progressToNext = nextLevel 
    ? ((points - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints)) * 100
    : 100;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
          currentLevel.color,
          'text-white'
        )}>
          <span>{currentLevel.emoji}</span>
          <span>{currentLevel.name}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            회원 등급
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Current Level */}
          <div className="text-center p-4 rounded-xl bg-muted">
            <p className="text-4xl mb-2">{currentLevel.emoji}</p>
            <p className={cn('text-xl font-bold', currentLevel.textColor)}>{currentLevel.name}</p>
            <p className="text-sm text-muted-foreground mt-1">{points.toLocaleString()}점</p>
            
            {nextLevel && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>다음 등급까지</span>
                  <span>{(nextLevel.minPoints - points).toLocaleString()}점 필요</span>
                </div>
                <div className="h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
                  <div 
                    className={cn('h-full transition-all', currentLevel.color)}
                    style={{ width: `${Math.min(progressToNext, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Level Guide */}
          <div className="space-y-2">
            <p className="text-sm font-medium">등급 기준 (확정 포인트 기준)</p>
            {LEVELS.map((level) => (
              <div 
                key={level.id}
                className={cn(
                  'p-2 rounded-lg',
                  currentLevel.id === level.id ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{level.emoji}</span>
                    <span className={cn(
                      'font-medium text-sm',
                      currentLevel.id === level.id ? level.textColor : 'text-muted-foreground'
                    )}>
                      {level.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {level.id === 'diamond' 
                      ? `${level.minPoints.toLocaleString()}점+`
                      : `${level.minPoints.toLocaleString()} ~ ${level.maxPoints.toLocaleString()}점`
                    }
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-7">
                  {level.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LevelPopup;
