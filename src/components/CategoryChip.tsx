import { cn } from '@/lib/utils';

interface CategoryChipProps {
  icon: string;
  name: string;
  isActive?: boolean;
  onClick?: () => void;
}

const CategoryChip = ({ icon, name, isActive, onClick }: CategoryChipProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 rounded-2xl p-3 min-w-[72px] transition-all',
        isActive
          ? 'bg-primary text-primary-foreground shadow-glow'
          : 'bg-card text-foreground shadow-card hover:bg-accent'
      )}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-medium whitespace-nowrap">{name}</span>
    </button>
  );
};

export default CategoryChip;
