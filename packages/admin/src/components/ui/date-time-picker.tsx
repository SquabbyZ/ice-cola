import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Input } from './input';

interface DateTimePickerProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function toLocalValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseLocalValue(value: string): Date | null {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthDays(month: Date): Array<Date | null> {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();
  const blanks = Array.from<Date | null>({ length: firstDay.getDay() }).fill(null);
  const days = Array.from({ length: dayCount }, (_, index) => new Date(year, monthIndex, index + 1));

  return [...blanks, ...days];
}

function formatDisplay(value: string, placeholder: string): string {
  const date = parseLocalValue(value);
  return date ? date.toLocaleString() : placeholder;
}

function parseTime(value: string): [number, number] | null {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;

  const [hours, minutes] = value.split(':').map(Number);
  if (hours > 23 || minutes > 59) return null;

  return [hours, minutes];
}

export function DateTimePicker({ id, value, onChange, placeholder = '选择过期时间' }: DateTimePickerProps) {
  const selectedDate = parseLocalValue(value);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate ?? new Date());
  const [timeValue, setTimeValue] = useState(() => selectedDate ? `${pad(selectedDate.getHours())}:${pad(selectedDate.getMinutes())}` : '23:59');
  const days = useMemo(() => monthDays(visibleMonth), [visibleMonth]);

  const selectDate = (date: Date) => {
    const parsedTime = parseTime(timeValue) ?? [23, 59];
    const [hours, minutes] = parsedTime;
    onChange(toLocalValue(new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes)));
  };

  const updateTime = (time: string) => {
    setTimeValue(time);
    const parsedTime = parseTime(time);
    if (!selectedDate || !parsedTime) return;

    const [hours, minutes] = parsedTime;
    onChange(toLocalValue(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hours, minutes)));
  };

  const changeMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  return (
    <div className="relative">
      <Button
        id={id}
        type="button"
        variant="outline"
        className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground')}
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <CalendarDays className="mr-2 h-4 w-4" />
        {formatDisplay(value, placeholder)}
      </Button>
      {isOpen && (
        <div className="absolute left-0 top-12 z-[60] w-full rounded-md border bg-popover p-3 text-popover-foreground shadow-md sm:w-[320px]">
          <div className="mb-3 flex items-center justify-between">
            <Button type="button" variant="ghost" size="icon" onClick={() => changeMonth(-1)} aria-label="上个月">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium">
              {visibleMonth.getFullYear()} 年 {visibleMonth.getMonth() + 1} 月
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => changeMonth(1)} aria-label="下个月">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {WEEK_DAYS.map((day) => <div key={day}>{day}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((date, index) => (
              date ? (
                <Button
                  key={date.toISOString()}
                  type="button"
                  variant={selectedDate?.toDateString() === date.toDateString() ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-0"
                  onClick={() => selectDate(date)}
                >
                  {date.getDate()}
                </Button>
              ) : <div key={`blank-${index}`} />
            ))}
          </div>
          <div className="mt-3 space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor={`${id}-time`}>时间</label>
            <Input id={`${id}-time`} type="time" value={timeValue} onChange={(event) => updateTime(event.target.value)} />
          </div>
          <div className="mt-3 flex justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>清除</Button>
            <Button type="button" size="sm" onClick={() => setIsOpen(false)}>完成</Button>
          </div>
        </div>
      )}
    </div>
  );
}
