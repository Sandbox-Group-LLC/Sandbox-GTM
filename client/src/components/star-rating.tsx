import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function StarRating({ 
  value, 
  onChange, 
  readOnly = false, 
  size = 'md',
  label,
}: StarRatingProps) {
  const sizeClass = sizeMap[size];
  
  const handleClick = (rating: number) => {
    if (!readOnly && onChange) {
      onChange(rating);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, rating: number) => {
    if (!readOnly && onChange && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onChange(rating);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-sm font-medium">{label}</span>}
      <div className="flex gap-1" role="group" aria-label={label || "Rating"}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onKeyDown={(e) => handleKeyDown(e, star)}
            disabled={readOnly}
            className={cn(
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm",
              !readOnly && "cursor-pointer",
              readOnly && "cursor-default"
            )}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            data-testid={`star-${star}`}
          >
            <Star
              className={cn(
                sizeClass,
                "transition-colors",
                star <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-transparent text-muted-foreground/50"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
