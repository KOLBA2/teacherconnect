// Weekly availability matrix (days × hours). day_of_week convention: 0 = Monday
// … 6 = Sunday (self-contained; not tied to Date.getDay).
export const DAYS_SHORT = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვ'];
export const DAYS_FULL = ['ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი', 'კვირა'];
export const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 08:00 … 21:00

const keyOf = (day, hour) => `${day}-${hour}`;

export default function AvailabilityMatrix({ slots = [], editable = false, onToggle, onPick }) {
  const set = new Set(slots.map((s) => keyOf(s.day, s.hour)));

  const cellClass = (on) => {
    if (editable) {
      return on
        ? 'bg-emerald-500 border-emerald-400 text-white'
        : 'bg-black/25 border-[#27272a] text-transparent hover:border-emerald-500/40';
    }
    // read-only (student): available cells are clickable, others are dim
    return on
      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30 cursor-pointer'
      : 'bg-black/10 border-[#1f1f22] text-[#3f3f46] cursor-default';
  };

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="min-w-[440px]">
        {/* Header */}
        <div className="grid grid-cols-[40px_repeat(7,1fr)] gap-1 mb-1">
          <div />
          {DAYS_SHORT.map((d) => (
            <div key={d} className="text-[10px] font-bold text-[#71717a] text-center uppercase">
              {d}
            </div>
          ))}
        </div>
        {/* Rows */}
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-[40px_repeat(7,1fr)] gap-1 mb-1">
            <div className="text-[10px] text-[#52525b] flex items-center justify-end pr-1">
              {String(hour).padStart(2, '0')}:00
            </div>
            {DAYS_SHORT.map((_, day) => {
              const on = set.has(keyOf(day, hour));
              return (
                <button
                  key={day}
                  type="button"
                  disabled={!editable && !on}
                  onClick={() => (editable ? onToggle?.(day, hour) : on && onPick?.(day, hour))}
                  className={`h-6 rounded-md border text-[9px] font-bold transition-colors ${cellClass(on)} ${
                    editable ? 'cursor-pointer' : ''
                  }`}
                  title={`${DAYS_FULL[day]} ${String(hour).padStart(2, '0')}:00`}
                >
                  {on ? '✓' : ''}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
