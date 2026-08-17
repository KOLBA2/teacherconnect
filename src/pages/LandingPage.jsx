import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search, MapPin, Video, Star, BadgeCheck, ArrowRight, ShieldCheck,
  Calendar, TrendingUp, Wallet, Crown, GraduationCap,
} from 'lucide-react';
import Reveal from '../components/Reveal';
import LocationSelector from '../components/LocationSelector';
import { apiFetch, mediaUrl } from '../utils/api';
import { SUBJECT_LABEL, TARGET_AUDIENCES, CITIES } from '../utils/premium';

const CITY_LABEL = Object.fromEntries(CITIES.map((c) => [c.key, c.label]));

// Quick subject categories (emoji + label → catalog search).
const CATEGORIES = [
  { icon: '📐', label: 'მათემატიკა', q: 'მათემატიკა' },
  { icon: '🌐', label: 'ინგლისური', q: 'ინგლისური' },
  { icon: '💻', label: 'პროგრამირება', q: 'პროგრამირება' },
  { icon: '🧪', label: 'ქიმია / ფიზიკა', q: 'ქიმია' },
  { icon: '🎨', label: 'ხელოვნება', q: 'ხელოვნება' },
  { icon: '🎯', label: 'ყველა საგანი', q: '' },
];

const STEPS = [
  { n: '1', icon: Search, title: 'მოძებნე', body: 'აირჩიე საგანი და გაფილტრე რეპეტიტორები შენს საჭიროებებზე.' },
  { n: '2', icon: Calendar, title: 'დაუკავშირდი', body: 'ნახე პროფილი, რეიტინგი და დაუკავშირდი პირდაპირ — ერთი შეხებით.' },
  { n: '3', icon: TrendingUp, title: 'ისწავლე', body: 'შეხვდი ონლაინ ან პირისპირ და შეაფასე გამოცდილება.' },
];

// Curated fallback tutors (shown only if the live catalog is empty/unreachable),
// so the marketing page never renders blank.
const DEMO_TUTORS = [
  { id: 'd1', teacherId: null, name: 'ნინო ბერიძე', avatar: null, subject: 'მათემატიკა', tier: 'vip_plus', verified: true, rating: 4.9, reviews: 128, price: 40, city: 'tbilisi', format: 'both' },
  { id: 'd2', teacherId: null, name: 'გიორგი კვარაცხელია', avatar: null, subject: 'ინგლისური / IELTS', tier: 'vip', verified: false, rating: 4.8, reviews: 74, price: 35, city: 'online', format: 'online' },
  { id: 'd3', teacherId: null, name: 'ანა მაისურაძე', avatar: null, subject: 'Frontend (React)', tier: 'vip_plus', verified: true, rating: 5.0, reviews: 96, price: 55, city: 'batumi', format: 'online' },
  { id: 'd4', teacherId: null, name: 'დავით ლომიძე', avatar: null, subject: 'ფიზიკა', tier: 'standard', verified: false, rating: 4.6, reviews: 41, price: 25, city: 'kutaisi', format: 'in_person' },
];

function initialsOf(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

function normalizePost(p) {
  return {
    id: p.id,
    teacherId: p.teacherId,
    name: p.teacherName || 'რეპეტიტორი',
    avatar: p.teacherAvatar ? mediaUrl(p.teacherAvatar) : null,
    subject: SUBJECT_LABEL[p.subject] || p.subject || '',
    tier: p.effectivePackage || p.packageType || 'standard',
    verified: !!p.isVerified,
    rating: p.avgRating || 0,
    reviews: p.reviewCount || p.commentCount || 0,
    price: p.price,
    city: p.city,
    format: p.format,
    createdAt: p.createdAt,
  };
}

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState('');
  const [loc, setLoc] = useState('');
  const [lvl, setLvl] = useState('');
  const [tutors, setTutors] = useState(null); // null = loading

  useEffect(() => {
    let alive = true;
    apiFetch('/posts')
      .then((d) => alive && setTutors((d.posts || []).map(normalizePost)))
      .catch(() => alive && setTutors([]));
    return () => { alive = false; };
  }, []);

  // Smoothly scroll to a section when arriving via a hash link (e.g. footer → /#how).
  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }, [location.hash]);

  const onSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (loc) params.set('loc', loc);
    if (lvl) params.set('lvl', lvl);
    const qs = params.toString();
    navigate(qs ? `/feed?${qs}` : '/feed');
  };

  const source = tutors && tutors.length ? tutors : DEMO_TUTORS;
  const featured = source.filter((t) => t.tier === 'vip_plus' || t.tier === 'vip').slice(0, 4);
  const recent = [...source]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 4);

  return (
    <div className="lp">
      {/* ══════════ 1. HERO SEARCH PORTAL ══════════ */}
      <section className="border-b" style={{ background: 'var(--lp-bg)', borderColor: 'var(--lp-border)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-10 md:pt-16 md:pb-14 text-center">
          <Reveal>
            <h1 className="m-0 font-extrabold tracking-tight leading-[1.1] text-[clamp(1.7rem,4.4vw,2.9rem)]" style={{ color: 'var(--lp-text)' }}>
              იპოვე <span className="lp-grad-text">საუკეთესო რეპეტიტორი</span> შენთვის
            </h1>
          </Reveal>
          <Reveal delay={80}>
            <p className="mt-3 mb-0 mx-auto max-w-xl text-[15px]" style={{ color: 'var(--lp-text-dim)' }}>
              ასობით გადამოწმებული რეპეტიტორი — მათემატიკიდან პროგრამირებამდე. ონლაინ თუ პირისპირ.
            </p>
          </Reveal>

          {/* Interactive filter card */}
          <Reveal delay={140}>
            <form onSubmit={onSearch} className="lp-card mt-7 p-4 sm:p-5 max-w-4xl mx-auto text-left">
              <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1fr_auto] gap-2.5">
                <div className="relative min-w-0">
                  <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--lp-text-mute)' }} />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="რა საგანს ეძებ? მაგ. მათემატიკა…"
                    aria-label="საგანი"
                    className="tc-input !h-12 !pl-10 !text-[14px]"
                  />
                </div>
                <LocationSelector value={loc} onChange={setLoc} allowAll className="tc-input !h-12 !text-[14px]" />
                <select value={lvl} onChange={(e) => setLvl(e.target.value)} className="tc-input !h-12 !text-[14px]" aria-label="დონე">
                  <option value="">ყველა დონე</option>
                  {TARGET_AUDIENCES.map((a) => (<option key={a.key} value={a.key}>{a.label}</option>))}
                </select>
                <button type="submit" className="lp-btn lp-btn-primary !h-12 !px-6 shrink-0">
                  <Search size={17} /> ძებნა
                </button>
              </div>
            </form>
          </Reveal>
        </div>
      </section>

      {/* ══════════ 2. QUICK SUBJECT CATEGORIES ══════════ */}
      <section id="subjects" className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-12 scroll-mt-20">
        <Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CATEGORIES.map((c) => (
              <Link
                key={c.label}
                to={c.q ? `/feed?q=${encodeURIComponent(c.q)}` : '/feed'}
                className="lp-card flex flex-col items-center justify-center text-center gap-2 px-3 py-5 no-underline hover:border-indigo-500 hover:shadow-md transition-all"
                style={{ color: 'var(--lp-text)' }}
              >
                <span className="text-[26px] leading-none">{c.icon}</span>
                <span className="text-[13px] font-bold">{c.label}</span>
              </Link>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ══════════ 3. VIP+ FEATURED ══════════ */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-4">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h2 className="m-0 font-extrabold tracking-tight text-[clamp(1.3rem,2.6vw,1.8rem)] flex items-center gap-2.5" style={{ color: 'var(--lp-text)' }}>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-extrabold" style={{ background: '#f59e0b', color: '#3b2600' }}>
                <Crown size={13} /> VIP+
              </span>
              რჩეული რეპეტიტორები
            </h2>
            <Link to="/feed?subject=" className="text-[13.5px] font-bold no-underline inline-flex items-center gap-1" style={{ color: 'var(--lp-accent)' }}>
              ყველას ნახვა <ArrowRight size={15} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.map((t) => <MiniTutorCard key={t.id} t={t} />)}
          </div>
        </section>
      )}

      {/* ══════════ 4. RECENT LISTINGS ══════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-12">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="m-0 font-extrabold tracking-tight text-[clamp(1.3rem,2.6vw,1.8rem)]" style={{ color: 'var(--lp-text)' }}>
            ახალი დამატებული
          </h2>
          <Link to="/feed" className="text-[13.5px] font-bold no-underline inline-flex items-center gap-1" style={{ color: 'var(--lp-accent)' }}>
            კატალოგში გადასვლა <ArrowRight size={15} />
          </Link>
        </div>
        {tutors === null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="lp-card p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3"><div className="skeleton w-11 h-11 rounded-lg" /><div className="flex-1 flex flex-col gap-2"><div className="skeleton h-3 w-2/3" /><div className="skeleton h-2.5 w-1/2" /></div></div>
                <div className="skeleton h-8 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recent.map((t) => <MiniTutorCard key={t.id} t={t} />)}
          </div>
        )}
      </section>

      {/* ══════════ 5. HOW IT WORKS ══════════ */}
      <section id="how" className="max-w-5xl mx-auto px-4 sm:px-6 pb-12 md:pb-14 scroll-mt-20">
        <h2 className="text-center m-0 mb-8 font-extrabold tracking-tight text-[clamp(1.4rem,3vw,2rem)]" style={{ color: 'var(--lp-text)' }}>
          როგორ მუშაობს
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className="lp-card p-6">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-lg grid place-items-center text-white shrink-0" style={{ background: 'var(--lp-accent)' }}>
                    <Icon size={18} />
                  </span>
                  <span className="font-extrabold text-[26px] leading-none" style={{ color: 'var(--lp-border-strong)' }}>{s.n}</span>
                </div>
                <h3 className="mt-4 mb-1.5 font-bold text-[16px]" style={{ color: 'var(--lp-text)' }}>{s.title}</h3>
                <p className="m-0 text-[13.5px] leading-relaxed" style={{ color: 'var(--lp-text-dim)' }}>{s.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══════════ 6. TUTOR ONBOARDING BANNER ══════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-12 md:pb-16">
        <div className="rounded-2xl px-6 py-8 sm:px-10 sm:py-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left"
             style={{ background: 'var(--lp-accent)' }}>
          <div className="text-white">
            <h2 className="m-0 font-extrabold tracking-tight text-[clamp(1.4rem,3vw,2rem)] flex items-center justify-center md:justify-start gap-2.5">
              <GraduationCap size={26} /> ასწავლი? დაამატე შენი განცხადება უფასოდ
            </h2>
            <p className="mt-2 mb-0 text-[15px] text-white/90">
              მიიღე <span className="font-bold text-white">100% შენი შემოსავალი</span> — 0% საკომისიოთი.
            </p>
          </div>
          <Link to="/register" className="shrink-0 inline-flex items-center gap-2 bg-white text-[15px] font-bold px-6 py-3.5 rounded-lg no-underline hover:opacity-90 transition-opacity"
                style={{ color: 'var(--lp-accent)' }}>
            განცხადების განთავსება <ArrowRight size={17} />
          </Link>
        </div>
      </section>

    </div>
  );
}

/* ── MyAuto-style compact listing card ── */
function MiniTutorCard({ t }) {
  const vipPlus = t.tier === 'vip_plus';
  const vip = t.tier === 'vip';
  const online = t.format === 'online' || t.city === 'online';
  const cityLabel = t.city === 'online' ? 'ონლაინ' : (CITY_LABEL[t.city] || t.city || 'ონლაინ');
  const profileTo = t.teacherId ? `/teachers/${t.teacherId}` : '/feed';

  return (
    <article className="lp-card overflow-hidden flex flex-col">
      <div className="p-4 flex items-start gap-3">
        {t.avatar ? (
          <img src={t.avatar} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
        ) : (
          <span className="w-12 h-12 rounded-lg grid place-items-center text-white font-extrabold text-[16px] shrink-0" style={{ background: 'var(--lp-accent)' }}>
            {initialsOf(t.name) || '?'}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="m-0 font-bold text-[14.5px] truncate" style={{ color: 'var(--lp-text)' }}>{t.name}</h3>
            {t.verified && <BadgeCheck size={15} className="shrink-0" style={{ color: 'var(--lp-accent)' }} />}
          </div>
          <p className="m-0 mt-0.5 text-[12.5px] truncate" style={{ color: 'var(--lp-text-dim)' }}>{t.subject}</p>
        </div>
        {(vipPlus || vip) && (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide"
                style={vipPlus ? { background: '#f59e0b', color: '#3b2600' } : { background: '#fde68a', color: '#92400e' }}>
            <Crown size={11} />{vipPlus ? 'VIP+' : 'VIP'}
          </span>
        )}
      </div>

      <div className="px-4 pb-3 flex items-center gap-3 text-[12.5px]" style={{ color: 'var(--lp-text-mute)' }}>
        <span className="flex items-center gap-1 font-bold text-amber-500">
          <Star size={13} fill="currentColor" strokeWidth={0} /> {(t.rating || 0).toFixed(1)}
          <span className="font-normal" style={{ color: 'var(--lp-text-mute)' }}>({t.reviews})</span>
        </span>
        <span className="flex items-center gap-1 truncate">
          {online ? <Video size={13} /> : <MapPin size={13} />}{cityLabel}
        </span>
      </div>

      <div className="mt-auto px-4 py-3 border-t" style={{ borderColor: 'var(--lp-border)' }}>
        <span className="font-extrabold text-[17px]" style={{ color: 'var(--lp-accent-3)' }}>
          {t.price != null ? `${t.price} ₾` : '—'}
          <span className="text-[12px] font-semibold" style={{ color: 'var(--lp-text-mute)' }}> / გაკვეთილი</span>
        </span>
      </div>
      <div className="px-4 pb-4 flex gap-2">
        <Link to={profileTo} className="lp-btn lp-btn-ghost flex-1 !py-2 !px-2 !text-[12.5px] whitespace-nowrap">პროფილი</Link>
        <Link to={profileTo} className="lp-btn lp-btn-primary flex-1 !py-2 !px-2 !text-[12.5px] whitespace-nowrap">დაკავშირება</Link>
      </div>
    </article>
  );
}
