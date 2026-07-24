import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const DURATIONS = [
  { minutes: 30, label: '30 წუთი' },
  { minutes: 60, label: '1 საათი' },
  { minutes: 90, label: '1.5 საათი' },
  { minutes: 120, label: '2 საათი' },
];

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ka-GE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function SchedulePage({ addToast }) {
  const { token } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState(60);
  const [creating, setCreating] = useState(false);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/slots/mine', { headers: { Authorization: `Bearer ${token}` } });
      setSlots(data.slots || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!date || !time) {
      addToast?.('მიუთითეთ თარიღი და დრო', 'error');
      return;
    }
    const startTime = new Date(`${date}T${time}`);
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    setCreating(true);
    try {
      const data = await apiFetch('/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
      });
      addToast?.(data.message);
      loadSlots();
    } catch (err) {
      addToast?.(err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (slotId) => {
    if (!window.confirm('წაიშალოს ეს სლოტი?')) return;
    try {
      const data = await apiFetch(`/slots/${slotId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      addToast?.(data.message);
    } catch (err) {
      addToast?.(err.message, 'error');
    }
  };

  // Group upcoming slots by calendar day for a readable schedule.
  const grouped = slots.reduce((acc, slot) => {
    const key = new Date(slot.startTime).toDateString();
    (acc[key] = acc[key] || []).push(slot);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <i className="fas fa-calendar-alt text-emerald-400"></i>
        </div>
        <div>
          <h1 className="text-white font-bold text-xl m-0 leading-tight">ჩემი განრიგი</h1>
          <p className="text-[12px] text-[#71717a] m-0 mt-0.5">
            დაამატეთ თავისუფალი დროები — მოსწავლეები მათ დაჯავშნიან
          </p>
        </div>
      </div>

      {/* Create slot form */}
      <form
        onSubmit={handleCreate}
        className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 flex flex-col gap-3"
      >
        <p className="text-[13px] font-semibold text-[#a1a1aa] m-0">ახალი სლოტის დამატება</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-[#71717a] mb-1 font-medium">თარიღი</label>
            <input
              type="date"
              className="tc-input"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#71717a] mb-1 font-medium">დაწყების დრო</label>
            <input type="time" className="tc-input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] text-[#71717a] mb-1 font-medium">ხანგრძლივობა</label>
            <select className="tc-input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {DURATIONS.map((d) => (
                <option key={d.minutes} value={d.minutes}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" className="btn-brand" disabled={creating}>
          {creating ? 'ემატება...' : 'სლოტის დამატება'}
        </button>
      </form>

      {/* Slot list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <i className="fas fa-circle-notch fa-spin text-indigo-400 text-2xl mb-3"></i>
          <p className="text-[13px] text-[#71717a] m-0">იტვირთება...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-[13px] text-[#f87171] font-semibold m-0">{error}</p>
          <button
            onClick={loadSlots}
            className="mt-4 px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-[12px] font-semibold cursor-pointer"
          >
            ხელახლა ცდა
          </button>
        </div>
      ) : slots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-white/[0.03] border border-[#27272a] flex items-center justify-center mb-3">
            <i className="far fa-calendar text-[#3f3f46] text-xl"></i>
          </div>
          <p className="text-[13px] text-[#71717a] m-0">მომავალი სლოტები არ გაქვთ</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(grouped).map(([day, daySlots]) => (
            <div key={day} className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4">
              <p className="text-[12px] font-bold text-indigo-400 uppercase tracking-wide m-0 mb-3">
                {formatDate(daySlots[0].startTime)}
              </p>
              <div className="flex flex-col gap-2">
                {daySlots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${
                      slot.isBooked
                        ? 'border-indigo-500/25 bg-indigo-500/10'
                        : 'border-emerald-500/20 bg-emerald-500/5'
                    }`}
                  >
                    <i
                      className={`fas ${
                        slot.isBooked ? 'fa-user-check text-indigo-400' : 'fa-clock text-emerald-400'
                      } text-[13px]`}
                    ></i>
                    <span className="text-[13px] font-semibold text-white">
                      {formatTime(slot.startTime)} — {formatTime(slot.endTime)}
                    </span>
                    <span className="text-[12px] text-[#a1a1aa]">
                      {slot.isBooked ? (
                        <>
                          დაჯავშნილია: <span className="text-indigo-300 font-semibold">{slot.studentName}</span>
                        </>
                      ) : (
                        'თავისუფალია'
                      )}
                    </span>
                    {!slot.isBooked && (
                      <button
                        onClick={() => handleDelete(slot.id)}
                        title="სლოტის წაშლა"
                        className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg text-[#52525b] hover:text-red-400 hover:bg-red-500/10 bg-transparent border-none cursor-pointer transition-colors"
                      >
                        <i className="fas fa-trash text-[11px]"></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
