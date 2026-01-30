import { useState, useRef, ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableItemProps {
  children: ReactNode;
  onDelete: () => void;
  className?: string;
}

const SwipeableItem = ({ children, onDelete, className }: SwipeableItemProps) => {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const DELETE_THRESHOLD = -80;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    
    // Only allow left swipe (negative values)
    if (diff < 0) {
      setTranslateX(Math.max(diff, -100));
    } else if (translateX < 0) {
      // Allow swiping back to the right
      setTranslateX(Math.min(0, translateX + diff));
      startX.current = currentX.current;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    if (translateX < DELETE_THRESHOLD) {
      // Keep showing delete button
      setTranslateX(-80);
    } else {
      // Snap back
      setTranslateX(0);
    }
  };

  const handleDelete = () => {
    setTranslateX(-200);
    setTimeout(() => {
      onDelete();
    }, 200);
  };

  const handleClickOutside = () => {
    if (translateX < 0) {
      setTranslateX(0);
    }
  };

  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-border", className)}>
      {/* Delete button background */}
      <div 
        className="absolute inset-y-0 right-0 flex items-center justify-end bg-destructive"
        style={{ width: '80px' }}
      >
        <button
          onClick={handleDelete}
          className="flex items-center justify-center w-full h-full text-destructive-foreground"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
      
      {/* Swipeable content */}
      <div
        ref={containerRef}
        className={cn(
          "relative bg-card",
          !isDragging && "transition-transform duration-200"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClickOutside}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableItem;
