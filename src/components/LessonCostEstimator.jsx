import { useState } from 'react';

// Feature 2: interactive, client-side monthly-cost calculator. Group lessons
// are priced at 50% of the teacher's individual base rate.
const GROUP_FACTOR = 0.5;
const WEEKS_PER_MONTH = 4;

export default function LessonCostEstimator({ basePrice }) {
  const [hours, setHours] = useState(2);
  const [mode, setMode] = useState('individual'); // 'individual' | 'group'

  const rate = mode === 'group' ? Math.round(basePrice * GROUP_FACTOR) : basePrice;
  const monthly = rate * hours * WEEKS_PER_MONTH;

  return (
    <div className="bg-black/25 border border-[#27272a] rounded-xl p-4 flex flex-col gap-3">
      <p className="text-[12px] font-bold text-white m-0 flex items-center gap-2">
        <i className="fas fa-calculator text-emerald-400"></i>ღირებულების კალკულატორი
      </p>

      {/* Hours / week */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12px] text-[#a1a1aa]">საათი / კვირაში</span>
          <span className="text-[12px] font-bold text-white">{hours} სთ</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="w-full accent-indigo-500 cursor-pointer"
        />
      </div>

      {/* Format */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: 'individual', label: 'ინდივიდუალური', icon: 'fa-user' },
          { key: 'group', label: 'ჯგუფური', icon: 'fa-users' },
        ].map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            className={`py-2 rounded-lg border text-[12px] font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
              mode === m.key
                ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                : 'border-[#27272a] bg-black/20 text-[#71717a] hover:border-[#3f3f46]'
            }`}
          >
            <i className={`fas ${m.icon} text-[11px]`}></i>
            {m.label}
          </button>
        ))}
      </div>

      {/* Result */}
      <div className="flex items-center justify-between pt-2 border-t border-[#27272a]">
        <span className="text-[12px] text-[#71717a]">
          სავარაუდო თვიური{' '}
          <span className="text-[10px] text-[#52525b]">
            (₾{rate}/სთ × {hours} × {WEEKS_PER_MONTH} კვ.)
          </span>
        </span>
        <span className="text-emerald-400 font-bold text-lg">₾{monthly}</span>
      </div>
    </div>
  );
}
