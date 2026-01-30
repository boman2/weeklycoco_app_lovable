import { useEffect, useState } from 'react';
import { Badge as BadgeType } from '@/data/mockData';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface BadgeCelebrationProps {
  badge: BadgeType | null;
  isOpen: boolean;
  onClose: () => void;
}

// Badge-specific design themes
const getBadgeTheme = (badgeId: string) => {
  const themes: Record<string, {
    bgGradient: string;
    iconBg: string;
    titleColor: string;
    buttonGradient: string;
    buttonShadow: string;
    confettiColors: string[];
    sparkleEmojis: string[];
  }> = {
    'bakery-master': {
      bgGradient: 'from-amber-100 via-orange-50 to-yellow-100 dark:from-amber-900/80 dark:via-orange-900/60 dark:to-yellow-900/80',
      iconBg: 'from-amber-400 to-orange-500',
      titleColor: 'text-amber-800 dark:text-amber-200',
      buttonGradient: 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
      buttonShadow: 'shadow-amber-500/30',
      confettiColors: ['#F59E0B', '#D97706', '#FBBF24', '#92400E', '#FDE68A'],
      sparkleEmojis: ['🍞', '🥐', '🥖', '🎉'],
    },
    'costco-nomad': {
      bgGradient: 'from-blue-100 via-cyan-50 to-teal-100 dark:from-blue-900/80 dark:via-cyan-900/60 dark:to-teal-900/80',
      iconBg: 'from-blue-400 to-teal-500',
      titleColor: 'text-blue-800 dark:text-blue-200',
      buttonGradient: 'from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600',
      buttonShadow: 'shadow-blue-500/30',
      confettiColors: ['#3B82F6', '#06B6D4', '#14B8A6', '#0EA5E9', '#22D3EE'],
      sparkleEmojis: ['🧭', '✈️', '🗺️', '🎊'],
    },
    'price-hunter': {
      bgGradient: 'from-red-100 via-rose-50 to-pink-100 dark:from-red-900/80 dark:via-rose-900/60 dark:to-pink-900/80',
      iconBg: 'from-red-400 to-rose-500',
      titleColor: 'text-red-800 dark:text-red-200',
      buttonGradient: 'from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600',
      buttonShadow: 'shadow-red-500/30',
      confettiColors: ['#EF4444', '#F43F5E', '#FB7185', '#DC2626', '#FDA4AF'],
      sparkleEmojis: ['🏹', '🎯', '💰', '🔥'],
    },
    'recipe-star': {
      bgGradient: 'from-purple-100 via-violet-50 to-fuchsia-100 dark:from-purple-900/80 dark:via-violet-900/60 dark:to-fuchsia-900/80',
      iconBg: 'from-purple-400 to-fuchsia-500',
      titleColor: 'text-purple-800 dark:text-purple-200',
      buttonGradient: 'from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600',
      buttonShadow: 'shadow-purple-500/30',
      confettiColors: ['#A855F7', '#D946EF', '#C084FC', '#7C3AED', '#E879F9'],
      sparkleEmojis: ['👨‍🍳', '⭐', '🍳', '✨'],
    },
    'communication-king': {
      bgGradient: 'from-green-100 via-emerald-50 to-lime-100 dark:from-green-900/80 dark:via-emerald-900/60 dark:to-lime-900/80',
      iconBg: 'from-green-400 to-emerald-500',
      titleColor: 'text-green-800 dark:text-green-200',
      buttonGradient: 'from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600',
      buttonShadow: 'shadow-green-500/30',
      confettiColors: ['#22C55E', '#10B981', '#34D399', '#16A34A', '#6EE7B7'],
      sparkleEmojis: ['💬', '🗣️', '💫', '🎉'],
    },
    'review-master': {
      bgGradient: 'from-indigo-100 via-blue-50 to-sky-100 dark:from-indigo-900/80 dark:via-blue-900/60 dark:to-sky-900/80',
      iconBg: 'from-indigo-400 to-blue-500',
      titleColor: 'text-indigo-800 dark:text-indigo-200',
      buttonGradient: 'from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600',
      buttonShadow: 'shadow-indigo-500/30',
      confettiColors: ['#6366F1', '#3B82F6', '#818CF8', '#4F46E5', '#93C5FD'],
      sparkleEmojis: ['📝', '✍️', '📖', '🌟'],
    },
    'point-starter': {
      bgGradient: 'from-gray-100 via-slate-50 to-zinc-100 dark:from-gray-800/80 dark:via-slate-800/60 dark:to-zinc-800/80',
      iconBg: 'from-gray-400 to-slate-500',
      titleColor: 'text-gray-800 dark:text-gray-200',
      buttonGradient: 'from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600',
      buttonShadow: 'shadow-gray-500/30',
      confettiColors: ['#9CA3AF', '#6B7280', '#D1D5DB', '#4B5563', '#E5E7EB'],
      sparkleEmojis: ['🥈', '💪', '🚀', '🎊'],
    },
  };

  return themes[badgeId] || themes['bakery-master'];
};

const BadgeCelebration = ({ badge, isOpen, onClose }: BadgeCelebrationProps) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen && badge) {
      const theme = getBadgeTheme(badge.id);
      
      // Trigger confetti with badge-specific colors
      const duration = 2500;
      const end = Date.now() + duration;

      (function frame() {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 60,
          origin: { x: 0, y: 0.7 },
          colors: theme.confettiColors
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 60,
          origin: { x: 1, y: 0.7 },
          colors: theme.confettiColors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();

      // Show content with delay for animation
      setTimeout(() => setShowContent(true), 100);
    } else {
      setShowContent(false);
    }
  }, [isOpen, badge]);

  if (!isOpen || !badge) return null;

  const theme = getBadgeTheme(badge.id);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className={cn(
          "relative mx-4 max-w-sm w-full rounded-3xl p-8 shadow-2xl",
          `bg-gradient-to-br ${theme.bgGradient}`,
          "transform transition-all duration-500 ease-out",
          showContent ? "scale-100 opacity-100" : "scale-50 opacity-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sparkle decorations with badge-specific emojis */}
        <div className="absolute -top-3 -left-3 text-2xl animate-bounce">{theme.sparkleEmojis[0]}</div>
        <div className="absolute -top-3 -right-3 text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>{theme.sparkleEmojis[1]}</div>
        <div className="absolute -bottom-3 -left-3 text-2xl animate-bounce" style={{ animationDelay: '0.4s' }}>{theme.sparkleEmojis[2]}</div>
        <div className="absolute -bottom-3 -right-3 text-2xl animate-bounce" style={{ animationDelay: '0.6s' }}>{theme.sparkleEmojis[3]}</div>

        <div className="text-center">
          {/* Trophy icon */}
          <div className="mb-4 text-6xl animate-pulse">🏆</div>

          {/* Badge icon with badge-specific glow effect */}
          <div className={cn(
            "mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full shadow-lg",
            `bg-gradient-to-br ${theme.iconBg}`,
            "animate-[pulse_1.5s_ease-in-out_infinite]"
          )}>
            <span className="text-5xl">{badge.icon}</span>
          </div>

          {/* Congratulations text with badge-specific color */}
          <h2 className={cn("mb-2 text-2xl font-bold", theme.titleColor)}>
            축하합니다! 🎊
          </h2>

          {/* Badge name */}
          <p className="mb-2 text-xl font-bold text-foreground">
            {badge.nameKo}
          </p>

          {/* Requirement */}
          <p className="mb-6 text-sm text-muted-foreground">
            {badge.requirement}
          </p>

          {/* Close button with badge-specific colors */}
          <button
            onClick={onClose}
            className={cn(
              "w-full rounded-xl py-3 font-bold text-white",
              `bg-gradient-to-r ${theme.buttonGradient}`,
              "transform transition-all duration-200 hover:scale-105",
              `shadow-lg ${theme.buttonShadow}`
            )}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default BadgeCelebration;