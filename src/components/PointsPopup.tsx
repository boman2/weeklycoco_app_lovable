import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Star } from 'lucide-react';

interface PointsPopupProps {
  points: number;
  trigger?: React.ReactNode;
}

const PointsPopup = ({ points, trigger }: PointsPopupProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <button className="flex items-center gap-1 text-sm font-bold text-amber-500">
            <Star className="h-4 w-4 fill-amber-500" />
            {points}P
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
            포인트 안내
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
            <p className="text-sm text-muted-foreground">내 포인트</p>
            <p className="text-3xl font-bold text-amber-500">{points}P</p>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">포인트 적립 방법</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <span className="text-sm">🏷️ 가격 등록</span>
                <span className="text-sm font-bold text-green-600">+5P</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm">📝 게시판 글 작성</span>
                <span className="text-sm font-bold text-primary">+1P</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm">🍳 레시피 글 작성</span>
                <span className="text-sm font-bold text-primary">+2P</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            <h4 className="text-sm font-semibold text-muted-foreground">포인트 차감</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                <span className="text-sm text-muted-foreground">🗑️ 등록 삭제</span>
                <span className="text-sm font-bold text-red-500">-5P</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            * 포인트는 검증 후 확정됩니다. 부정 등록 시 포인트가 취소될 수 있습니다.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PointsPopup;
