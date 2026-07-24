import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { DAYS_FULL } from './AvailabilityMatrix';

// Teacher dashboard — incoming student booking requests against weekly slots.
export default function TeacherBookings({ addToast }) {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/booking-requests/teacher', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings(data.bookings || []);
    } catch {
      /* keep empty */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const confirm = async (id) => {
    setBusyId(id);
    try {
      const data = await apiFetch(`/booking-requests/${id}/confirm`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'confirmed' } : b)));
      addToast?.(data.message);
    } catch (err) {
      addToast?.(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('წაიშალოს ეს ჯავშანი?')) return;
    setBusyId(id);
    try {
      const data = await apiFetch(`/booking-requests/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings((prev) => prev.filter((b) => b.id !== id));
      addToast?.(data.message);
    } catch (err) {
      addToast?.(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <i className="fas fa-calendar-check text-indigo-400"></i>
        <p className="text-[13px] font-bold text-white m-0">ჩემი ჯავშნები</p>
        {pendingCount > 0 && (
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-300">
            {pendingCount} ახალი
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-[12px] text-[#71717a] m-0 py-6 text-center">იტვირთება...</p>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-[#27272a] flex items-center justify-center mb-2">
            <i className="far fa-calendar text-[#3f3f46] text-lg"></i>
          </div>
          <p className="text-[13px] text-[#71717a] m-0">ჯავშნები ჯერ არ არის</p>
          <p className="text-[11px] text-[#52525b] m-0 mt-1">
            როცა მოსწავლე დაჯავშნის თქვენს დროს, ის აქ გამოჩნდება
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {bookings.map((b) => {
            const confirmed = b.status === 'confirmed';
            return (
              <div
                key={b.id}
                className="rounded-xl border border-[#27272a] bg-black/20 p-3 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-white m-0">{b.studentName}</p>
                    <p className="text-[12px] text-emerald-400 font-semibold m-0 mt-0.5">
                      <i className="far fa-clock mr-1"></i>
                      {DAYS_FULL[b.dayOfWeek]}, {String(b.hour).padStart(2, '0')}:00
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      confirmed
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {confirmed ? 'დადასტურებული' : 'მომლოდინე'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#a1a1aa]">
                  <a href={`tel:+${b.studentPhone.replace(/\D/g, '')}`} className="text-indigo-400 no-underline font-semibold">
                    <i className="fas fa-phone text-[10px] mr-1"></i>
                    {b.studentPhone}
                  </a>
                  {b.subject && (
                    <span>
                      <i className="fas fa-book text-[10px] mr-1 text-sky-400"></i>
                      {b.subject}
                    </span>
                  )}
                </div>
                {b.note && <p className="text-[12px] text-[#71717a] m-0 italic">„{b.note}"</p>}

                <div className="flex gap-2 mt-0.5">
                  {!confirmed && (
                    <button
                      onClick={() => confirm(b.id)}
                      disabled={busyId === b.id}
                      className="flex-1 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[12px] font-semibold cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <i className="fas fa-check mr-1.5 text-[10px]"></i>დადასტურება
                    </button>
                  )}
                  <button
                    onClick={() => remove(b.id)}
                    disabled={busyId === b.id}
                    className="flex-1 py-1.5 rounded-lg border border-red-500/25 bg-red-500/8 hover:bg-red-500/15 text-red-400 text-[12px] font-semibold cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <i className="fas fa-trash mr-1.5 text-[10px]"></i>წაშლა
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
