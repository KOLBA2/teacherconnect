import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch, mediaUrl } from '../utils/api';
import { SUBJECT_LABEL, LOCATION_LABEL, BANNER_CSS, toEmbedUrl } from '../utils/premium';
import PostCard from '../components/PostCard';
import CallBackModal from '../components/CallBackModal';
import ContactButtons from '../components/ContactButtons';
import AdminGrantVipMenu from '../components/AdminGrantVipMenu';
import AvailabilityMatrix from '../components/AvailabilityMatrix';
import BookingRequestModal from '../components/BookingRequestModal';

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

export default function PublicProfilePage({ addToast }) {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [callBackOpen, setCallBackOpen] = useState(false);
  const [availSlots, setAvailSlots] = useState([]);
  const [bookingSlot, setBookingSlot] = useState(null); // { day, hour }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, avail] = await Promise.all([
        apiFetch(`/teachers/${id}/profile`),
        apiFetch(`/teachers/${id}/availability`).catch(() => ({ slots: [] })),
      ]);
      setProfile(data);
      setPosts(data.posts || []);
      setAvailSlots(avail.slots || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onPostUpdated = (postId, fields) =>
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...fields } : p)));
  const onPostRemoved = (postId) => setPosts((prev) => prev.filter((p) => p.id !== postId));

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center text-center">
        <i className="fas fa-circle-notch fa-spin text-indigo-400 text-2xl mb-3"></i>
        <p className="text-[13px] text-[#71717a] m-0">იტვირთება...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center text-center">
        <p className="text-[13px] text-[#f87171] font-semibold m-0">{error}</p>
        <button
          onClick={load}
          className="mt-4 px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-[12px] font-semibold cursor-pointer"
        >
          ხელახლა ცდა
        </button>
      </div>
    );
  }

  const isVipPlus = profile.tier === 'vip_plus';
  const cover = profile.coverImageUrl;
  const bannerCss = null; // covers replace banners on the public profile

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Hero */}
      <div className="rounded-2xl border border-[#27272a] overflow-hidden bg-[#18181b]">
        {(cover || (bannerCss && BANNER_CSS[bannerCss])) && (
          <div
            className="h-32 sm:h-40 bg-cover bg-center"
            style={cover ? { backgroundImage: `url("${mediaUrl(cover)}")` } : { background: BANNER_CSS[bannerCss] }}
          ></div>
        )}
        <div className="p-5 flex items-start gap-4 flex-wrap">
          <div className={`w-20 h-20 rounded-2xl overflow-hidden bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold text-2xl shrink-0 ${cover ? '-mt-16 border-4 border-[#18181b]' : ''}`}>
            {profile.avatarUrl ? (
              <img src={mediaUrl(profile.avatarUrl)} alt="" className="w-full h-full object-cover" />
            ) : (
              initials(profile.name) || '?'
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-white font-bold text-xl m-0 leading-tight flex items-center gap-2 flex-wrap">
              {profile.name}
              {profile.tier !== 'standard' && (
                <span className={`vip-badge ${isVipPlus ? 'vip-badge-vip-plus' : 'vip-badge-vip'}`}>
                  <i className={`fas ${isVipPlus ? 'fa-crown' : 'fa-star'}`}></i>
                  {isVipPlus ? 'VIP+' : 'VIP'}
                </span>
              )}
              {profile.isVerified && (
                <span className="verified-badge">
                  <i className="fas fa-circle-check"></i>Verified Expert
                </span>
              )}
            </h1>
            {profile.bio && (
              <p className="text-[13px] text-[#a1a1aa] m-0 mt-2 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
            )}

            {/* Subjects + locations */}
            {(profile.subjects.length > 0 || profile.cities.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {profile.subjects.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-[11px] font-semibold text-indigo-300">
                    <i className="fas fa-book text-[10px]"></i>
                    {SUBJECT_LABEL[s] || s}
                  </span>
                ))}
                {profile.cities.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-[#27272a] text-[11px] font-semibold text-[#a1a1aa]">
                    <i className={`fas ${c === 'online' ? 'fa-wifi' : 'fa-location-dot'} text-[10px] text-emerald-400`}></i>
                    {c === 'online' ? 'ონლაინ' : LOCATION_LABEL[c] || c}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Admin-only 3-dots quick actions (Grant VIP / VIP+) */}
          <AdminGrantVipMenu teacherId={profile.id} addToast={addToast} onGranted={load} />
        </div>

        {/* Call Back */}
        <div className="px-5 pb-5">
          <button
            onClick={() => setCallBackOpen(true)}
            className="w-full py-3 rounded-xl text-white text-[14px] font-bold border-none cursor-pointer flex items-center justify-center gap-2.5"
            style={{ background: 'linear-gradient(90deg, #10b981, #059669)' }}
          >
            <i className="fas fa-phone-volume text-[16px]"></i>
            📞 ზარის მოთხოვნა (Call Back)
          </button>
        </div>
      </div>

      {/* Direct contact — phone + Call for all; WhatsApp / Telegram for VIP+ */}
      <ContactButtons
        phone={profile.phone}
        whatsapp={profile.whatsapp}
        telegram={profile.telegram}
        premium={profile.tier !== 'standard'}
      />

      {/* Weekly availability — students click a free (green) slot to request a booking */}
      {availSlots.length > 0 && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <i className="fas fa-calendar-week text-emerald-400"></i>
            <p className="text-[13px] font-bold text-white m-0">ხელმისაწვდომი დროები</p>
          </div>
          <p className="text-[12px] text-[#71717a] m-0">
            დააჭირეთ თავისუფალ საათს (მწვანე) გაკვეთილის დასაჯავშნად.
          </p>
          <AvailabilityMatrix slots={availSlots} onPick={(day, hour) => setBookingSlot({ day, hour })} />
        </div>
      )}

      {/* Audio greeting (any tier) */}
      {profile.audioIntroUrl && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-[13px] font-bold text-white m-0">🎧 მოუსმინეთ მასწავლებლის მისალმებას</p>
          <audio controls src={mediaUrl(profile.audioIntroUrl)} className="w-full">
            თქვენი ბრაუზერი არ უჭერს მხარს აუდიოს.
          </audio>
        </div>
      )}

      {/* Video intro (VIP+) */}
      {profile.videoIntroUrl && toEmbedUrl(profile.videoIntroUrl) && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-[13px] font-bold text-white m-0">
            <i className="fas fa-clapperboard text-fuchsia-400 mr-2"></i>ვიდეო-პრეზენტაცია
          </p>
          <div className="rounded-xl overflow-hidden border border-[#27272a] aspect-video">
            <iframe
              src={toEmbedUrl(profile.videoIntroUrl)}
              title="intro"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      {/* Listings */}
      <div className="flex items-center gap-2 mt-1">
        <i className="fas fa-rectangle-list text-indigo-400"></i>
        <h2 className="text-white font-bold text-[15px] m-0">განცხადებები ({posts.length})</h2>
      </div>
      {posts.length === 0 ? (
        <p className="text-[13px] text-[#71717a] text-center py-6 m-0">აქტიური განცხადებები არ არის</p>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              addToast={addToast}
              onPostUpdated={onPostUpdated}
              onPostRemoved={onPostRemoved}
            />
          ))}
        </div>
      )}

      {callBackOpen && (
        <CallBackModal
          teacherName={profile.name}
          teacherWhatsapp={profile.whatsapp}
          onClose={() => setCallBackOpen(false)}
          addToast={addToast}
        />
      )}

      {bookingSlot && (
        <BookingRequestModal
          teacherId={profile.id}
          teacherName={profile.name}
          day={bookingSlot.day}
          hour={bookingSlot.hour}
          onClose={() => setBookingSlot(null)}
          addToast={addToast}
        />
      )}
    </div>
  );
}
