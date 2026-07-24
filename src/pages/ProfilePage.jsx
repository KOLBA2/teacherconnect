import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, mediaUrl } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { CONTACT_CHANNELS } from '../utils/premium';
import AvailabilityMatrix from '../components/AvailabilityMatrix';
import TeacherBookings from '../components/TeacherBookings';

function StatTile({ icon, color, label, value, sub }) {
  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 flex flex-col gap-1">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-1 ${color}`}>
        <i className={`fas ${icon} text-[14px]`}></i>
      </div>
      <span className="text-2xl font-bold text-white leading-none">{value}</span>
      <span className="text-[12px] text-[#71717a]">{label}</span>
      {sub && <span className="text-[11px] text-[#52525b]">{sub}</span>}
    </div>
  );
}

export default function ProfilePage({ addToast }) {
  const { user, token, refreshUser } = useAuth();
  const tier = user?.tier || 'standard';
  const isVipPlus = tier === 'vip_plus';

  const [phone, setPhone] = useState(user?.contact?.phone || '');
  const [whatsapp, setWhatsapp] = useState(user?.contact?.whatsapp || '');
  const [telegram, setTelegram] = useState(user?.contact?.telegram || '');
  const [messenger, setMessenger] = useState(user?.contact?.messenger || '');
  const [audioIntro, setAudioIntro] = useState(user?.contact?.audioIntroUrl || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [savingContact, setSavingContact] = useState(false);

  // Avatar + cover upload (native file input, any teacher) with instant preview.
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  const uploadImageTo = async (endpoint, file, setUploading, setPreview, inputRef) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file)); // instant local preview
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const data = await apiFetch(endpoint, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      await refreshUser();
      addToast?.(data.message);
    } catch (err) {
      addToast?.(err.message, 'error');
    } finally {
      setUploading(false);
      setPreview(null); // fall back to the canonical URL from refreshUser
      if (inputRef.current) inputRef.current.value = '';
    }
  };
  const uploadAvatar = (file) => uploadImageTo('/teachers/avatar', file, setAvatarUploading, setAvatarPreview, avatarInputRef);
  const uploadCover = (file) => uploadImageTo('/teachers/cover', file, setCoverUploading, setCoverPreview, coverInputRef);

  const avatarSrc = avatarPreview || (user?.avatarUrl ? mediaUrl(user.avatarUrl) : null);
  const coverSrc = coverPreview || (user?.coverImageUrl ? mediaUrl(user.coverImageUrl) : null);

  const [analytics, setAnalytics] = useState(null);
  const [loadingA, setLoadingA] = useState(true);
  const [errorA, setErrorA] = useState(null);

  // Weekly availability (Item 4)
  const [avail, setAvail] = useState([]);
  const [availTier, setAvailTier] = useState(null);
  const [loadingAvail, setLoadingAvail] = useState(true);
  const [savingAvail, setSavingAvail] = useState(false);

  const loadAvailability = useCallback(async () => {
    setLoadingAvail(true);
    try {
      const data = await apiFetch('/teachers/availability/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvail(data.slots || []);
      setAvailTier(data.tier);
    } catch {
      setAvailTier('standard');
    } finally {
      setLoadingAvail(false);
    }
  }, [token]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const toggleAvail = (day, hour) =>
    setAvail((prev) => {
      const exists = prev.some((s) => s.day === day && s.hour === hour);
      return exists ? prev.filter((s) => !(s.day === day && s.hour === hour)) : [...prev, { day, hour }];
    });

  const saveAvailability = async () => {
    setSavingAvail(true);
    try {
      const data = await apiFetch('/teachers/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slots: avail }),
      });
      setAvail(data.slots || []);
      addToast?.(data.message);
    } catch (err) {
      addToast?.(err.message, 'error');
    } finally {
      setSavingAvail(false);
    }
  };

  const loadAnalytics = useCallback(async () => {
    setLoadingA(true);
    setErrorA(null);
    try {
      const data = await apiFetch('/teachers/analytics', { headers: { Authorization: `Bearer ${token}` } });
      setAnalytics(data);
    } catch (err) {
      setErrorA(err.message);
    } finally {
      setLoadingA(false);
    }
  }, [token]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const saveContact = async () => {
    setSavingContact(true);
    try {
      const data = await apiFetch('/teachers/contact', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          phoneNum: phone,
          whatsappNum: whatsapp,
          telegramUsername: telegram,
          messengerUrl: messenger,
          audioIntroUrl: audioIntro,
          bio,
        }),
      });
      // Reflect normalized values back into the form.
      setPhone(data.contact.phone || '');
      setWhatsapp(data.contact.whatsapp || '');
      setTelegram(data.contact.telegram || '');
      setMessenger(data.contact.messenger || '');
      setAudioIntro(data.contact.audioIntroUrl || '');
      if (data.contact.bio !== undefined) setBio(data.contact.bio || '');
      await refreshUser();
      addToast?.(data.message);
    } catch (err) {
      addToast?.(err.message, 'error');
    } finally {
      setSavingContact(false);
    }
  };

  const convPct = analytics ? Math.round((analytics.conversionRate || 0) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Header — avatar upload (native, any tier) */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => avatarInputRef.current?.click()}
          title="ავატარის შეცვლა"
          className="relative w-12 h-12 rounded-full overflow-hidden border border-indigo-500/25 bg-indigo-500/15 flex items-center justify-center shrink-0 cursor-pointer group"
        >
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
          ) : (
            <i className="fas fa-user-gear text-indigo-400"></i>
          )}
          <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <i className={`fas ${avatarUploading ? 'fa-circle-notch fa-spin' : 'fa-camera'} text-white text-[13px]`}></i>
          </span>
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => uploadAvatar(e.target.files?.[0])}
        />
        <div className="min-w-0">
          <h1 className="text-white font-bold text-xl m-0 leading-tight flex items-center gap-2 flex-wrap">
            მასწავლებლის სტუდია
            {tier !== 'standard' && (
              <span className={`vip-badge ${isVipPlus ? 'vip-badge-vip-plus' : 'vip-badge-vip'}`}>
                <i className={`fas ${isVipPlus ? 'fa-crown' : 'fa-star'}`}></i>
                {isVipPlus ? 'VIP+' : 'VIP'}
              </span>
            )}
          </h1>
          <p className="text-[12px] text-[#71717a] m-0 mt-0.5">კონტაქტი, ბიო, განრიგი და ანალიტიკა</p>
        </div>
        {tier !== 'vip_plus' && (
          <Link
            to="/pricing"
            className="ml-auto shrink-0 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white text-[12px] font-bold no-underline"
          >
            <i className="fas fa-bolt mr-1.5"></i>განახლება
          </Link>
        )}
      </div>

      {/* Profile media — cover banner + avatar, with instant preview (any teacher) */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden">
        <div
          className="relative h-32 sm:h-44 bg-cover bg-center bg-gradient-to-r from-indigo-500/20 to-fuchsia-500/20"
          style={coverSrc ? { backgroundImage: `url("${coverSrc}")` } : undefined}
        >
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/55 hover:bg-black/70 text-white text-[12px] font-semibold flex items-center gap-1.5 border-none cursor-pointer backdrop-blur-sm transition-colors"
          >
            <i className={`fas ${coverUploading ? 'fa-circle-notch fa-spin' : 'fa-camera'}`}></i>
            ქავერის შეცვლა
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => uploadCover(e.target.files?.[0])}
          />

          {/* Avatar overlapping the cover — reuses the header's avatar input */}
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            title="ავატარის შეცვლა"
            className="group absolute -bottom-10 left-5 w-24 h-24 rounded-2xl overflow-hidden border-4 border-[#18181b] bg-indigo-500/15 flex items-center justify-center cursor-pointer"
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
            ) : (
              <i className="fas fa-user text-indigo-400 text-2xl"></i>
            )}
            <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <i className={`fas ${avatarUploading ? 'fa-circle-notch fa-spin' : 'fa-camera'} text-white`}></i>
            </span>
          </button>
        </div>
        <div className="pt-14 px-5 pb-4">
          <p className="text-[13px] font-bold text-white m-0">პროფილის ფოტო &amp; ქავერი</p>
          <p className="text-[12px] text-[#71717a] m-0 mt-0.5">
            დააჭირეთ ავატარს ან „ქავერის შეცვლას" ფოტოს ასატვირთად — ცვლილება მაშინვე ჩანს გადახედვაში.
          </p>
        </div>
      </div>

      {/* Quick access: bookings + schedule reachable from the Studio too */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/bookings"
          className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 flex items-center gap-3 no-underline hover:border-indigo-500/40 transition-colors"
        >
          <i className="fas fa-calendar-check text-indigo-400 text-lg"></i>
          <span className="text-[13px] font-semibold text-white">ჯავშნები</span>
          <i className="fas fa-chevron-right text-[#52525b] text-[11px] ml-auto"></i>
        </Link>
        <Link
          to="/schedule"
          className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 flex items-center gap-3 no-underline hover:border-emerald-500/40 transition-colors"
        >
          <i className="fas fa-calendar-alt text-emerald-400 text-lg"></i>
          <span className="text-[13px] font-semibold text-white">განრიგი (სლოტები)</span>
          <i className="fas fa-chevron-right text-[#52525b] text-[11px] ml-auto"></i>
        </Link>
      </div>

      {/* My Bookings — incoming student booking requests */}
      <TeacherBookings addToast={addToast} />

      {/* Feature 3: Recent Inquiries counter — VIP/VIP+ only */}
      {tier !== 'standard' && (
        <div className="bg-gradient-to-r from-indigo-500/10 to-fuchsia-500/10 border border-indigo-500/25 rounded-2xl p-4 flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <i className="fas fa-inbox text-indigo-300 text-lg"></i>
            </div>
            {analytics?.recentInquiries > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-fuchsia-500 text-white text-[10px] font-bold flex items-center justify-center">
                {analytics.recentInquiries}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-white m-0">ბოლო მოთხოვნები (Inquiries)</p>
            <p className="text-[12px] text-[#a1a1aa] m-0 mt-0.5">
              {loadingA
                ? 'იტვირთება...'
                : `${analytics?.recentInquiries || 0} საკონტაქტო მოთხოვნა ბოლო 7 დღეში`}
            </p>
          </div>
          {analytics?.recentInquiries > 0 && (
            <span className="ml-auto text-[11px] font-bold px-2 py-1 rounded-lg bg-fuchsia-500/15 text-fuchsia-300 shrink-0">
              ახალი
            </span>
          )}
        </div>
      )}

      {/* Contact channels editor */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 flex flex-col gap-4">
        <p className="text-[13px] font-bold text-white m-0">
          <i className="fas fa-comments text-indigo-400 mr-2"></i>საკონტაქტო არხები
        </p>

        <GeoPhoneField value={phone} onChange={setPhone} />
        <ContactField
          ch={CONTACT_CHANNELS.whatsapp}
          value={whatsapp}
          onChange={setWhatsapp}
          placeholder="+995 5XX XX XX XX"
        />
        <ContactField
          ch={CONTACT_CHANNELS.telegram}
          value={telegram}
          onChange={setTelegram}
          placeholder="username (ან @username)"
        />
        <ContactField
          ch={CONTACT_CHANNELS.messenger}
          value={messenger}
          onChange={setMessenger}
          placeholder="https://m.me/yourpage"
        />

        {/* Feature 5: senior-friendly audio greeting (any tier) */}
        <div>
          <label className="flex items-center gap-2 text-[12px] text-[#71717a] mb-1.5 font-medium">
            <i className="fas fa-microphone text-emerald-400 text-[14px]"></i>
            ხმოვანი მისალმება 🎧 (აუდიოს ბმული)
          </label>
          <input
            type="text"
            className="tc-input"
            placeholder="https://.../hello.mp3"
            value={audioIntro}
            onChange={(e) => setAudioIntro(e.target.value)}
          />
          <p className="text-[11px] text-[#52525b] mt-1 ml-1">
            ვიდეოს ნაცვლად — ჩაწერეთ მოკლე ხმოვანი მისალმება და მიუთითეთ ბმული.
          </p>
        </div>

        {/* Bio (any tier) */}
        <div>
          <label className="flex items-center gap-2 text-[12px] text-[#71717a] mb-1.5 font-medium">
            <i className="fas fa-address-card text-indigo-400 text-[14px]"></i>ბიო / შესახებ
          </label>
          <textarea
            className="tc-input resize-none"
            rows={3}
            maxLength={1000}
            placeholder="მოკლედ თქვენს შესახებ — გამოცდილება, მიდგომა, შედეგები..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <div className="flex justify-between text-[11px] mt-1 px-1">
            <span className="text-[#52525b]">{bio.trim() ? bio.trim().split(/\s+/).length : 0} სიტყვა</span>
            <span className={bio.length > 900 ? 'text-amber-400 font-semibold' : 'text-[#52525b]'}>
              {bio.length}/1000
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#71717a] bg-white/[0.02] border border-[#27272a] rounded-xl px-3 py-2">
          <i className="fas fa-circle-info text-emerald-400"></i>
          ტელეფონი და პირდაპირი კონტაქტი ჩანს თქვენს საჯარო პროფილზე დარეკვის, WhatsApp-ისა და Telegram-ის ღილაკებით.
        </div>

        <button
          onClick={saveContact}
          disabled={savingContact}
          className="btn-brand"
        >
          {savingContact ? 'ინახება...' : 'შენახვა'}
        </button>
      </div>

      {/* Weekly availability (Item 4) */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 flex flex-col gap-4">
        <p className="text-[13px] font-bold text-white m-0 flex items-center gap-2">
          <i className="fas fa-calendar-week text-emerald-400"></i>ხელმისაწვდომობის განრიგი
          <span className="vip-badge vip-badge-vip ml-1">
            <i className="fas fa-star"></i>VIP
          </span>
        </p>

        {loadingAvail ? (
          <div className="flex items-center justify-center py-8">
            <i className="fas fa-circle-notch fa-spin text-indigo-400"></i>
          </div>
        ) : availTier === 'standard' ? (
          <div className="bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 border border-emerald-500/25 rounded-2xl p-6 text-center flex flex-col items-center gap-3">
            <i className="fas fa-lock text-emerald-400 text-2xl"></i>
            <p className="text-[14px] font-bold text-white m-0">
              Upgrade to VIP to activate online schedule bookings
            </p>
            <p className="text-[12px] text-[#a1a1aa] m-0 max-w-sm">
              VIP/VIP+ პაკეტით მიიღებთ ინტერაქტიულ განრიგს — მონიშნეთ თავისუფალი საათები და
              მოსწავლეები დაგიკავშირდებიან WhatsApp-ით.
            </p>
            <Link
              to="/pricing"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white text-[12px] font-bold no-underline"
            >
              <i className="fas fa-bolt mr-1.5"></i>პაკეტების ნახვა
            </Link>
          </div>
        ) : (
          <>
            <p className="text-[12px] text-[#71717a] m-0">
              დააჭირეთ უჯრებს თავისუფალი საათების მოსანიშნად. მოსწავლეები ხედავენ ამ განრიგს თქვენს გვერდზე.
            </p>
            <AvailabilityMatrix slots={avail} editable onToggle={toggleAvail} />
            <button onClick={saveAvailability} disabled={savingAvail} className="btn-brand">
              {savingAvail ? 'ინახება...' : `განრიგის შენახვა (${avail.length} საათი)`}
            </button>
          </>
        )}
      </div>

      {/* Analytics */}
      <div className="flex flex-col gap-4">
        <p className="text-[13px] font-bold text-white m-0 flex items-center gap-2">
          <i className="fas fa-chart-line text-fuchsia-400"></i>პერფორმანსის ანალიტიკა
          <span className="vip-badge vip-badge-vip-plus ml-1">
            <i className="fas fa-crown"></i>VIP+
          </span>
        </p>

        {loadingA ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <i className="fas fa-circle-notch fa-spin text-indigo-400 text-xl mb-2"></i>
            <p className="text-[13px] text-[#71717a] m-0">იტვირთება...</p>
          </div>
        ) : errorA ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-[13px] text-[#f87171] font-semibold m-0">{errorA}</p>
            <button
              onClick={loadAnalytics}
              className="mt-3 px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-[12px] font-semibold cursor-pointer"
            >
              ხელახლა ცდა
            </button>
          </div>
        ) : !analytics.isPremium ? (
          <div className="bg-gradient-to-br from-fuchsia-500/10 to-indigo-500/10 border border-fuchsia-500/25 rounded-2xl p-6 text-center flex flex-col items-center gap-2">
            <i className="fas fa-lock text-fuchsia-400 text-2xl"></i>
            <p className="text-[14px] font-bold text-white m-0">ანალიტიკა VIP-ის ექსკლუზივია</p>
            <p className="text-[12px] text-[#a1a1aa] m-0 max-w-sm">
              განაახლეთ პოსტი VIP ან VIP+ პაკეტზე და მიიღეთ ნახვების, კონვერსიისა და საკონტაქტო
              დაკლიკებების დეტალური სტატისტიკა.
            </p>
          </div>
        ) : (
          <>
            {/* Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile icon="fa-eye" color="bg-sky-500/15 text-sky-400" label="ნახვები" value={analytics.totalViews} />
              <StatTile
                icon="fa-users"
                color="bg-indigo-500/15 text-indigo-400"
                label="უნიკალური"
                value={analytics.uniqueViewers}
              />
              <StatTile
                icon="fa-hand-pointer"
                color="bg-emerald-500/15 text-emerald-400"
                label="დაკლიკებები"
                value={analytics.totalClicks}
              />
              <StatTile
                icon="fa-bolt"
                color="bg-fuchsia-500/15 text-fuchsia-400"
                label="კონვერსია"
                value={`${convPct}%`}
              />
            </div>

            {/* Conversion bar */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] text-[#a1a1aa] font-semibold">ნახვა → კონტაქტი კონვერსია</span>
                <span className="text-[12px] text-fuchsia-400 font-bold">{convPct}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-black/40 border border-[#27272a] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-fuchsia-500 transition-all duration-500"
                  style={{ width: `${Math.min(convPct, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Channel breakdown */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 flex flex-col gap-2.5">
              <p className="text-[11px] uppercase tracking-widest text-[#52525b] font-semibold m-0">
                არხების მიხედვით
              </p>
              {['whatsapp', 'telegram', 'messenger'].map((k) => {
                const ch = CONTACT_CHANNELS[k];
                const clicks = analytics.byChannel[k] || 0;
                const max = Math.max(1, ...['whatsapp', 'telegram', 'messenger'].map((x) => analytics.byChannel[x] || 0));
                return (
                  <div key={k} className="flex items-center gap-3">
                    <i className={`fab ${ch.icon} text-[15px]`} style={{ color: ch.brand }}></i>
                    <span className="text-[12px] text-[#a1a1aa] w-20">{ch.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-black/40 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(clicks / max) * 100}%`, background: ch.brand }}
                      ></div>
                    </div>
                    <span className="text-[12px] text-white font-bold w-6 text-right">{clicks}</span>
                  </div>
                );
              })}
            </div>

            {/* Per-post */}
            {analytics.perPost.length > 0 && (
              <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4">
                <p className="text-[11px] uppercase tracking-widest text-[#52525b] font-semibold m-0 mb-2">
                  პოსტების მიხედვით
                </p>
                <div className="flex flex-col gap-1.5">
                  {analytics.perPost.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 text-[12px]">
                      <span className="text-[#a1a1aa] truncate flex-1">{p.title}</span>
                      <span className="text-sky-400 shrink-0">
                        <i className="fas fa-eye text-[10px] mr-1"></i>
                        {p.views}
                      </span>
                      <span className="text-emerald-400 shrink-0">
                        <i className="fas fa-hand-pointer text-[10px] mr-1"></i>
                        {p.clicks}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analytics.totalViews === 0 && (
              <p className="text-[12px] text-[#52525b] text-center m-0">
                ჯერ ტრაფიკი არ არის — გააზიარეთ თქვენი პოსტები ნახვების შესაგროვებლად.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ContactField({ ch, value, onChange, placeholder }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-[12px] text-[#71717a] mb-1.5 font-medium">
        <i className={`fab ${ch.icon} text-[14px]`} style={{ color: ch.brand }}></i>
        {ch.label}
      </label>
      <input
        type="text"
        className="tc-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// Groups up to 9 local digits as "5XX XX XX XX".
function formatLocalPhone(d) {
  if (!d) return '';
  return [d.slice(0, 3), d.slice(3, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
}

// Structured Georgia phone input: fixed +995 prefix, 9-digit local part.
// Stores the full "+995XXXXXXXXX" string (or '' when empty).
function GeoPhoneField({ value, onChange }) {
  const local = (value || '').replace(/\D/g, '').replace(/^995/, '').slice(0, 9);
  return (
    <div>
      <label className="flex items-center gap-2 text-[12px] text-[#71717a] mb-1.5 font-medium">
        <i className="fas fa-phone text-[14px] text-emerald-400"></i>
        ტელეფონი
      </label>
      <div className="flex items-stretch">
        <span className="inline-flex items-center px-3 rounded-l-[10px] border border-r-0 border-[#27272a] bg-white/[0.03] text-[#a1a1aa] text-[14px] font-semibold select-none">
          +995
        </span>
        <input
          type="tel"
          inputMode="numeric"
          className="tc-input flex-1 rounded-l-none"
          placeholder="5XX XX XX XX"
          value={formatLocalPhone(local)}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').slice(0, 9);
            onChange(d ? `+995${d}` : '');
          }}
        />
      </div>
    </div>
  );
}
