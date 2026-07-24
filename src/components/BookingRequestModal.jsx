import { useState } from 'react';
import { X } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { SUBJECT_GROUPS } from '../utils/premium';
import { DAYS_FULL } from './AvailabilityMatrix';

// Student booking-request modal for a specific weekly slot (day + hour).
// Captures Name, Phone (+995), Subject, and an optional Note.
export default function BookingRequestModal({ teacherId, teacherName, day, hour, onClose, addToast, onBooked }) {
  const [name, setName] = useState('');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [subject, setSubject] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const time = `${String(hour).padStart(2, '0')}:00`;

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return addToast?.('გთხოვთ მიუთითოთ სახელი', 'error');
    const digits = phoneLocal.replace(/\D/g, '');
    if (digits.length < 9) return addToast?.('გთხოვთ მიუთითოთ სწორი ტელეფონის ნომერი', 'error');
    setSubmitting(true);
    try {
      await apiFetch('/booking-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          dayOfWeek: day,
          hour,
          studentName: name.trim(),
          studentPhone: `+995${digits}`,
          subject: subject || null,
          note: note.trim() || null,
        }),
      });
      addToast?.('ჯავშნის მოთხოვნა გაიგზავნა ✓ მასწავლებელი მალე დაგიკავშირდებათ');
      onBooked?.();
      onClose?.();
    } catch (err) {
      addToast?.(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const localFmt = (() => {
    const d = phoneLocal.replace(/\D/g, '').slice(0, 9);
    return [d.slice(0, 3), d.slice(3, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={() => !submitting && onClose?.()}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#111113] border border-[#27272a] p-6 animate-fade-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-[#71717a] hover:text-white hover:bg-white/5 border-none bg-transparent cursor-pointer"
        >
          <X size={16} />
        </button>

        <h2 className="text-lg font-bold text-white m-0">გაკვეთილის დაჯავშნა</h2>
        <p className="text-[13px] text-[#a1a1aa] m-0 mt-1 mb-5">
          {teacherName} ·{' '}
          <span className="text-emerald-400 font-semibold">
            {DAYS_FULL[day]}, {time}
          </span>
        </p>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <label className="block text-[12px] text-[#71717a] font-semibold mb-1.5">სახელი *</label>
            <input
              className="tc-input"
              placeholder="თქვენი სახელი"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[12px] text-[#71717a] font-semibold mb-1.5">ტელეფონი *</label>
            <div className="flex items-stretch">
              <span className="inline-flex items-center px-3 rounded-l-[10px] border border-r-0 border-[#27272a] bg-white/[0.03] text-[#a1a1aa] text-[14px] font-semibold select-none">
                +995
              </span>
              <input
                type="tel"
                inputMode="numeric"
                className="tc-input flex-1 rounded-l-none"
                placeholder="5XX XX XX XX"
                value={localFmt}
                onChange={(e) => setPhoneLocal(e.target.value.replace(/\D/g, '').slice(0, 9))}
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] text-[#71717a] font-semibold mb-1.5">საგანი</label>
            <select className="tc-input" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">— აირჩიე —</option>
              {SUBJECT_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.subjects.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12px] text-[#71717a] font-semibold mb-1.5">
              შენიშვნა (არასავალდებულო)
            </label>
            <textarea
              className="tc-input resize-none"
              rows={2}
              maxLength={500}
              placeholder="დამატებითი ინფორმაცია მასწავლებლისთვის..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-brand" disabled={submitting}>
            {submitting ? 'იგზავნება...' : 'ჯავშნის გაგზავნა'}
          </button>
        </form>
      </div>
    </div>
  );
}
