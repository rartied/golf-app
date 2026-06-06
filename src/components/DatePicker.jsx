import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function DatePicker({ value, onChange, max, className = '' }) {
  const [open, setOpen] = useState(false);

  const selected = value ? new Date(value + 'T00:00:00') : null;
  const maxDate = max ? new Date(max + 'T00:00:00') : new Date();

  const [view, setView] = useState(() => {
    const d = selected ?? new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const firstDow = new Date(view.year, view.month, 1).getDay();
  const monthLabel = new Date(view.year, view.month, 1)
    .toLocaleString('default', { month: 'long' });

  const atMaxMonth =
    view.year === maxDate.getFullYear() && view.month === maxDate.getMonth();
  const atMinMonth = view.year === 2020 && view.month === 0;

  function prev() {
    setView(v => v.month === 0
      ? { year: v.year - 1, month: 11 }
      : { ...v, month: v.month - 1 });
  }
  function next() {
    if (atMaxMonth) return;
    setView(v => v.month === 11
      ? { year: v.year + 1, month: 0 }
      : { ...v, month: v.month + 1 });
  }

  function pick(day) {
    const m = String(view.month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${view.year}-${m}-${d}`);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`w-full text-left flex items-center justify-between ${className}`}
      >
        <span className="text-gray-900 text-sm font-medium">
          {selected ? format(selected, 'MMMM d, yyyy') : 'Select date'}
        </span>
        <span className="text-shade-40 text-xs">tap to change</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-t-3xl px-4 pt-4 pb-8 safe-pb">
            <div className="w-10 h-1 bg-hairline rounded-full mx-auto mb-5" />

            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4 px-1">
              <button
                onClick={prev}
                disabled={atMinMonth}
                className="p-2 rounded-full active:bg-canvas-cream disabled:opacity-20"
              >
                <ChevronLeft size={20} className="text-ink" />
              </button>
              <p className="font-bold text-gray-900 text-base">
                {monthLabel} {view.year}
              </p>
              <button
                onClick={next}
                disabled={atMaxMonth}
                className="p-2 rounded-full active:bg-canvas-cream disabled:opacity-20"
              >
                <ChevronRight size={20} className="text-ink" />
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-semibold text-shade-40 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const thisDate = new Date(view.year, view.month, day);
                const isFuture = thisDate > maxDate;
                const isSelected =
                  selected &&
                  selected.getFullYear() === view.year &&
                  selected.getMonth() === view.month &&
                  selected.getDate() === day;
                const isToday =
                  !isSelected &&
                  thisDate.toDateString() === new Date().toDateString();

                return (
                  <div key={day} className="flex items-center justify-center py-0.5">
                    <button
                      onClick={() => !isFuture && pick(day)}
                      disabled={isFuture}
                      className={`w-9 h-9 flex items-center justify-center rounded-full text-sm transition-colors
                        ${isSelected ? 'bg-canvas-night text-white font-bold' : ''}
                        ${isToday ? 'ring-1 ring-ink font-bold text-ink' : ''}
                        ${!isSelected && !isToday && !isFuture ? 'text-gray-700 active:bg-canvas-cream font-medium' : ''}
                        ${isFuture ? 'text-shade-30' : ''}
                      `}
                    >
                      {day}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
