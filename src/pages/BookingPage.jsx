import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { BANNER_CSS, toEmbedUrl } from '../utils/premium';
import AvailabilityMatrix, { DAYS_FULL } from '../components/AvailabilityMatrix';
import CallBackModal from '../components/CallBackModal';
import ContactButtons from '../components/ContactButtons';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' });
}

function dayLabel(dateKey) {
  const d = new Date(dateKey);
  return {
    weekday: d.toLocaleDateString('ka-GE', { weekday: 'short' }),
    day: d.getDate(),
    month: d.toLocaleDateString('ka-GE', { month: 'short' }),
  };
}

export default function BookingPage({ addToast }) {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [teacherName, setTeacherName] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [booking, setBooking] = useState(false);

  // Weekly availability + WhatsApp booking (Item 4) + VIP+ profile extras
  const [availSlots, setAvailSlots] = useState([]);
  const [availWhatsapp, setAvailWhatsapp] = useState(null);
  const [contactPhone, setContactPhone] = useState(null);
  const [contactTelegram, setContactTelegram] = useState(null);
  const [videoIntro, setVideoIntro] = useState(null);
  const [profileBanner, setProfileBanner] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [audioIntro, setAudioIntro] = useState(null);
  const [tier, setTier] = useState('standard');
  const [callBackOpen, setCallBackOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    apiFetch(`/teachers/${teacherId}/availability`)
      .then((data) => {
        if (!alive) return;
        setAvailSlots(data.slots || []);
        setAvailWhatsapp(data.whatsapp || null);
        setContactPhone(data.phone || null);
        setContactTelegram(data.telegram || null);
        setVideoIntro(data.videoIntroUrl || null);
        setProfileBanner(data.profileBanner || null);
        setCoverImage(data.coverImageUrl || null);
        setAudioIntro(data.audioIntroUrl || null);
        setTier(data.tier || 'standard');
        if (data.teacherName) setTeacherName((n) => n || data.teacherName);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [teacherId]);

  const handlePickAvailability = (day, hour) => {
    const time = `${String(hour).padStart(2, '0')}:00`;
    const msg = `გამარჯობა! მინდა გაკვეთილის დაჯავშნა ${DAYS_FULL[day]}, ${time} საათზე`;
    if (!availWhatsapp) {
      addToast?.('ამ მასწავლებელს WhatsApp არ აქვს მითითებული', 'error');
      return;
    }
    const url = `https://wa.me/${String(availWhatsapp).replace(/[^\d]/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/slots/teacher/${teacherId}`);
      setTeacherName(data.teacherName || '');
      setSlots(data.slots || []);
      const firstDate = (data.slots || [])[0];
      if (firstDate) setSelectedDate(new Date(firstDate.startTime).toDateString());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // date key -> slots of that day
  const grouped = slots.reduce((acc, slot) => {
    const key = new Date(slot.startTime).toDateString();
    (acc[key] = acc[key] || []).push(slot);
    return acc;
  }, {});
  const dateKeys = Object.keys(grouped);
  const daySlots = selectedDate ? grouped[selectedDate] || [] : [];

  const handleBook = async () => {
    if (!selectedSlot) return;
    setBooking(true);
    try {
      const data = await apiFetch('/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slotId: selectedSlot.id }),
      });
      addToast?.(data.message);
      navigate('/bookings');
    } catch (err) {
      addToast?.(err.message, 'error');
      // The slot may have been taken concurrently — refresh availability.
      setSelectedSlot(null);
      loadSlots();
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
          <i className="fas fa-calendar-check text-indigo-400"></i>
        </div>
        <div>
          <h1 className="text-white font-bold text-xl m-0 leading-tight">გაკვეთილის დაჯავშნა</h1>
          <p className="text-[12px] text-[#71717a] m-0 mt-0.5">
            {teacherName ? (
              <>
                მასწავლებელი: <span className="text-indigo-400 font-semibold">{teacherName}</span>
              </>
            ) : (
              'აირჩიეთ თავისუფალი დრო'
            )}
          </p>
        </div>
      </div>

      {/* Feature 5: prominent, senior-friendly Call Back button */}
      <button
        onClick={() => setCallBackOpen(true)}
        className="w-full py-3.5 rounded-2xl text-white text-[15px] font-bold border-none cursor-pointer flex items-center justify-center gap-2.5 shadow-lg"
        style={{ background: 'linear-gradient(90deg, #10b981, #059669)' }}
      >
        <i className="fas fa-phone-volume text-[17px]"></i>
        📞 ზარის მოთხოვნა (Call Back)
      </button>

      {/* Direct contact — phone + Call for all; WhatsApp / Telegram for VIP+ */}
      <ContactButtons
        phone={contactPhone}
        whatsapp={availWhatsapp}
        telegram={contactTelegram}
        premium={tier !== 'standard'}
      />

      {/* Feature 5: audio greeting (any tier) */}
      {audioIntro && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-[13px] font-bold text-white m-0">🎧 მოუსმინეთ მასწავლებლის მისალმებას</p>
          <audio controls src={audioIntro} className="w-full">
            თქვენი ბრაუზერი არ უჭერს მხარს აუდიოს.
          </audio>
        </div>
      )}

      {/* Feature 4: VIP+ Hero header — cover photo (with gradient fallback) +
          embedded video intro. Absent gracefully for non-VIP+ teachers. */}
      {(coverImage || (profileBanner && BANNER_CSS[profileBanner]) || (videoIntro && toEmbedUrl(videoIntro))) && (
        <div className="rounded-2xl border border-[#27272a] overflow-hidden">
          {(coverImage || (profileBanner && BANNER_CSS[profileBanner])) && (
            <div
              className="relative h-36 sm:h-44 bg-cover bg-center flex items-end"
              style={
                coverImage
                  ? { backgroundImage: `url("${coverImage}")` }
                  : { background: BANNER_CSS[profileBanner] }
              }
            >
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(9,9,11,0.85), transparent 70%)' }}
              ></div>
              <div className="relative p-4 flex items-center gap-2">
                <span className="text-white font-bold text-lg drop-shadow">{teacherName}</span>
                <span className="verified-badge">
                  <i className="fas fa-circle-check"></i>Verified Expert
                </span>
              </div>
            </div>
          )}
          {videoIntro && toEmbedUrl(videoIntro) && (
            <div className="p-4 flex flex-col gap-2 bg-[#18181b]">
              <div className="flex items-center gap-2">
                <i className="fas fa-clapperboard text-fuchsia-400"></i>
                <p className="text-[13px] font-bold text-white m-0">ვიდეო-პრეზენტაცია</p>
              </div>
              <div className="rounded-xl overflow-hidden border border-[#27272a] aspect-video">
                <iframe
                  src={toEmbedUrl(videoIntro)}
                  title="teacher intro"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Weekly availability → WhatsApp booking (VIP/VIP+ teachers) */}
      {availSlots.length > 0 && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <i className="fas fa-calendar-week text-emerald-400"></i>
            <p className="text-[13px] font-bold text-white m-0">ყოველკვირეული ხელმისაწვდომობა</p>
          </div>
          <p className="text-[12px] text-[#71717a] m-0">
            {availWhatsapp
              ? 'დააჭირეთ თავისუფალ საათს — გაიხსნება WhatsApp მზა შეტყობინებით.'
              : 'თავისუფალი საათები (WhatsApp მითითებული არ არის).'}
          </p>
          <AvailabilityMatrix slots={availSlots} onPick={handlePickAvailability} />
          {availWhatsapp && (
            <p className="text-[11px] text-emerald-400/80 m-0 flex items-center gap-1.5">
              <i className="fab fa-whatsapp"></i>
              მწვანე უჯრები დაჯავშნადია WhatsApp-ით
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <i className="fas fa-circle-notch fa-spin text-indigo-400 text-2xl mb-3"></i>
          <p className="text-[13px] text-[#71717a] m-0">იტვირთება...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[13px] text-[#f87171] font-semibold m-0">{error}</p>
          <button
            onClick={loadSlots}
            className="mt-4 px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-[12px] font-semibold cursor-pointer"
          >
            ხელახლა ცდა
          </button>
        </div>
      ) : dateKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-white/[0.03] border border-[#27272a] flex items-center justify-center mb-3">
            <i className="far fa-calendar-times text-[#3f3f46] text-xl"></i>
          </div>
          <p className="text-[13px] text-[#71717a] m-0">ამ მასწავლებელს თავისუფალი დროები არ აქვს</p>
          <p className="text-[11px] text-[#3f3f46] m-0 mt-1">შეამოწმეთ მოგვიანებით</p>
        </div>
      ) : (
        <>
          {/* Date picker row */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {dateKeys.map((key) => {
              const l = dayLabel(key);
              const active = key === selectedDate;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedDate(key);
                    setSelectedSlot(null);
                  }}
                  className={`shrink-0 w-[74px] py-2.5 rounded-xl border flex flex-col items-center gap-0.5 cursor-pointer transition-all ${
                    active
                      ? 'border-indigo-500 bg-indigo-500/15 text-white'
                      : 'border-[#27272a] bg-[#18181b] text-[#a1a1aa] hover:border-[#3f3f46]'
                  }`}
                >
                  <span className={`text-[10px] uppercase ${active ? 'text-indigo-400' : 'text-[#52525b]'}`}>
                    {l.weekday}
                  </span>
                  <span className="text-[17px] font-bold leading-none">{l.day}</span>
                  <span className="text-[10px]">{l.month}</span>
                </button>
              );
            })}
          </div>

          {/* Time grid for the selected day */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4">
            <p className="text-[11px] uppercase tracking-widest text-[#52525b] font-semibold m-0 mb-3">
              თავისუფალი დროები
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {daySlots.map((slot) => {
                const active = selectedSlot?.id === slot.id;
                return (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(active ? null : slot)}
                    className={`py-2.5 px-2 rounded-xl border text-[13px] font-semibold cursor-pointer transition-all ${
                      active
                        ? 'border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-900/40'
                        : 'border-[#27272a] bg-black/25 text-[#a1a1aa] hover:border-indigo-500/50 hover:text-white'
                    }`}
                  >
                    {formatTime(slot.startTime)} — {formatTime(slot.endTime)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confirm bar */}
          {selectedSlot && (
            <div className="bg-indigo-500/10 border border-indigo-500/25 rounded-2xl p-4 flex items-center gap-3 flex-wrap">
              <i className="fas fa-info-circle text-indigo-400"></i>
              <span className="text-[13px] text-[#e4e4e7]">
                არჩეულია:{' '}
                <span className="font-bold text-white">
                  {new Date(selectedSlot.startTime).toLocaleDateString('ka-GE', {
                    day: 'numeric',
                    month: 'long',
                  })}
                  , {formatTime(selectedSlot.startTime)} — {formatTime(selectedSlot.endTime)}
                </span>
              </span>
              <button
                onClick={handleBook}
                disabled={booking}
                className="ml-auto px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-[13px] font-bold border-none cursor-pointer transition-colors disabled:opacity-50"
              >
                {booking ? 'იჯავშნება...' : 'დაჯავშნა ✓'}
              </button>
            </div>
          )}
        </>
      )}

      {callBackOpen && (
        <CallBackModal
          teacherName={teacherName}
          teacherWhatsapp={availWhatsapp}
          onClose={() => setCallBackOpen(false)}
          addToast={addToast}
        />
      )}
    </div>
  );
}
