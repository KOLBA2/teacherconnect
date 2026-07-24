import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

function formatRange(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const date = start.toLocaleDateString('ka-GE', { weekday: 'long', day: 'numeric', month: 'long' });
  const t = (d) => d.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${t(start)} — ${t(end)}`;
}

export default function BookingsPage({ addToast }) {
  const { token, user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const isTeacher = user?.role === 'teacher';

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/bookings/mine', { headers: { Authorization: `Bearer ${token}` } });
      setBookings(data.bookings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleCancel = async (bookingId) => {
    if (!window.confirm('გაუქმდეს ეს ჯავშანი?')) return;
    setCancellingId(bookingId);
    try {
      const data = await apiFetch(`/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      addToast?.(data.message);
    } catch (err) {
      addToast?.(err.message, 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const now = Date.now();
  const upcoming = bookings.filter((b) => new Date(b.endTime).getTime() >= now);
  const past = bookings.filter((b) => new Date(b.endTime).getTime() < now);

  const renderBooking = (b, isPast) => (
    <div
      key={b.id}
      className={`bg-[#18181b] border border-[#27272a] rounded-2xl p-4 flex items-center gap-3 flex-wrap ${
        isPast ? 'opacity-60' : ''
      }`}
    >
      <div className="w-9 h-9 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
        <i className={`fas ${isTeacher ? 'fa-user-graduate' : 'fa-chalkboard-teacher'} text-[13px]`}></i>
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-white m-0">
          {isTeacher ? 'მოსწავლე' : 'მასწავლებელი'}: {b.otherName}
        </p>
        <p className="text-[12px] text-[#a1a1aa] m-0 mt-0.5">{formatRange(b.startTime, b.endTime)}</p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {!isPast && (
          <button
            onClick={() => handleCancel(b.id)}
            disabled={cancellingId === b.id}
            title="ჯავშნის გაუქმება"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#52525b] hover:text-red-400 hover:bg-red-500/10 bg-transparent border-none cursor-pointer transition-colors disabled:opacity-50"
          >
            <i className={`fas ${cancellingId === b.id ? 'fa-circle-notch fa-spin' : 'fa-times'} text-[12px]`}></i>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
          <i className="fas fa-calendar-check text-indigo-400"></i>
        </div>
        <div>
          <h1 className="text-white font-bold text-xl m-0 leading-tight">
            {isTeacher ? 'დაჯავშნილი გაკვეთილები' : 'ჩემი ჯავშნები'}
          </h1>
          <p className="text-[12px] text-[#71717a] m-0 mt-0.5">
            {upcoming.length > 0 ? `${upcoming.length} მომავალი გაკვეთილი` : 'მომავალი გაკვეთილები არ არის'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <i className="fas fa-circle-notch fa-spin text-indigo-400 text-2xl mb-3"></i>
          <p className="text-[13px] text-[#71717a] m-0">იტვირთება...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[13px] text-[#f87171] font-semibold m-0">{error}</p>
          <button
            onClick={loadBookings}
            className="mt-4 px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-[12px] font-semibold cursor-pointer"
          >
            ხელახლა ცდა
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-white/[0.03] border border-[#27272a] flex items-center justify-center mb-3">
            <i className="far fa-calendar text-[#3f3f46] text-xl"></i>
          </div>
          <p className="text-[13px] text-[#71717a] m-0">ჯავშნები არ არის</p>
          {!isTeacher && (
            <p className="text-[11px] text-[#3f3f46] m-0 mt-1">
              კატალოგში მასწავლებლის პოსტზე დააჭირეთ დაჯავშნის ღილაკს
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {upcoming.length > 0 && <div className="flex flex-col gap-3">{upcoming.map((b) => renderBooking(b, false))}</div>}
          {past.length > 0 && (
            <>
              <p className="text-[11px] uppercase tracking-widest text-[#52525b] font-semibold m-0 mt-2">
                გასული გაკვეთილები
              </p>
              <div className="flex flex-col gap-3">{past.map((b) => renderBooking(b, true))}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
