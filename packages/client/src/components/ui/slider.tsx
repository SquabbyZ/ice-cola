import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, value, defaultValue = [0], onValueChange, min = 0, max = 100, step = 1 }, ref) => {
    const [internalValue] = React.useState(defaultValue);
    const currentValue = value ?? internalValue;
    const percentage = ((currentValue[0] - min) / (max - min)) * 100;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      onValueChange?.([newValue]);
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center h-6",
          className
        )}
      >
        <div className="relative h-2 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className="absolute h-full bg-primary rounded-full"
            style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue[0]}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div
          className="absolute h-5 w-5 rounded-full border-2 border-primary bg-background shadow-md transition-all duration-75"
          style={{ left: `${Math.max(0, Math.min(100, percentage))}%`, transform: 'translateX(-50%)' }}
        />
      </div>
    );
  }
)
Slider.displayName = "Slider"

export { Slider }
