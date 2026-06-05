import { useRef, useState, type ReactNode } from "react";
import { Loader2, ArrowDown } from "lucide-react";

const THRESHOLD = 70;

export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<unknown>;
  children: ReactNode;
}) {
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY > 0 || refreshing) return;
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setPull(Math.min(dy * 0.5, 100));
  };
  const onTouchEnd = async () => {
    if (startY.current == null) return;
    startY.current = null;
    if (pull >= THRESHOLD) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPull(0);
  };

  const shown = refreshing ? 56 : pull;

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="flex items-center justify-center overflow-hidden text-muted-foreground transition-[height] duration-150"
        style={{ height: shown }}
        aria-hidden={shown === 0}
      >
        {refreshing ? (
          <Loader2 className="size-5 animate-spin text-primary" />
        ) : (
          <ArrowDown
            className="size-5 transition-transform"
            style={{ transform: `rotate(${Math.min(pull / THRESHOLD, 1) * 180}deg)` }}
          />
        )}
      </div>
      {children}
    </div>
  );
}
