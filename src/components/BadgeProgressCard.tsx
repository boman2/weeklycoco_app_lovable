import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface BadgeProgressCardProps {
  icon: string;
  name: string;
  current: number;
  target: number;
  isEarned: boolean;
}

const BadgeProgressCard = ({ icon, name, current, target, isEarned }: BadgeProgressCardProps) => {
  const progress = Math.min((current / target) * 100, 100);
  
  return (
    <div className={cn(
      "rounded-xl p-3 md:p-4 transition-all",
      isEarned 
        ? "bg-gradient-to-br from-amber-500/10 to-orange-500/15 border border-amber-500/30" 
        : "bg-card border border-border"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full text-xl md:text-2xl",
          isEarned ? "bg-accent" : "bg-muted opacity-50 grayscale"
        )}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={cn(
              "font-semibold text-sm md:text-base truncate",
              isEarned ? "text-foreground" : "text-muted-foreground"
            )}>
              {name}
            </p>
            <span className={cn(
              "text-xs md:text-sm font-medium whitespace-nowrap",
              isEarned ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
            )}>
              {current.toLocaleString()}/{target.toLocaleString()}
            </span>
          </div>
          <div className="mt-2">
            <Progress 
              value={progress} 
              className={cn(
                "h-2",
                isEarned && "[&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-500"
              )}
            />
          </div>
          {isEarned && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">✓ 달성 완료!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BadgeProgressCard;
